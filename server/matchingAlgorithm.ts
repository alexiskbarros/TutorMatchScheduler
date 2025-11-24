import type {
  LearnerRequest,
  LearningPeer,
  ClassSchedule,
  ProposedGroup,
  InsertProposedGroup,
  UnmatchedParticipant,
  TimeSlot,
} from '@shared/schema';
import {
  findAvailableSlots,
  getScheduleForDay,
  isWithinPreferredProximity,
  instructorsMatch,
  peerCanTeach,
} from './matchingUtils';

interface MatchingInput {
  requests: LearnerRequest[];
  peers: LearningPeer[];
  learnerSchedules: ClassSchedule[];
  volunteerSchedules: ClassSchedule[];
}

interface MatchingResult {
  groups: InsertProposedGroup[];
  unmatched: UnmatchedParticipant[];
}

interface LearnerWithSchedule extends LearnerRequest {
  schedule?: ClassSchedule;
}

interface PeerWithSchedule extends LearningPeer {
  schedule?: ClassSchedule;
  assignedGroups: number; // Track groups assigned in this run
}

const DAYS: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'> = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday'
];

export function runMatchingAlgorithm(input: MatchingInput): MatchingResult {
  const { requests, peers, learnerSchedules, volunteerSchedules } = input;
  
  // Attach schedules to learners and peers
  const learnersWithSchedules: LearnerWithSchedule[] = requests.map(req => ({
    ...req,
    schedule: learnerSchedules.find(s => s.email === req.email),
  }));
  
  const peersWithSchedules: PeerWithSchedule[] = peers.map(peer => ({
    ...peer,
    schedule: volunteerSchedules.find(s => s.email === peer.email),
    assignedGroups: peer.groups || 0, // Start with existing group count
  }));
  
  const groups: InsertProposedGroup[] = [];
  const matched = new Set<string>(); // Track matched learner emails
  const unmatched: UnmatchedParticipant[] = [];
  
  // Group learners by course code and instructor match requirement
  const learnersByCourse = groupLearnersByCourse(learnersWithSchedules);
  
  // Process each course group
  for (const [courseKey, courseLearners] of Object.entries(learnersByCourse)) {
    const [courseCode, instructorMatchRequired] = courseKey.split('::');
    
    if (instructorMatchRequired === 'true') {
      // Group by instructor when match is required
      const learnersByInstructor = groupByInstructor(courseLearners);
      
      for (const [instructor, instructorLearners] of Object.entries(learnersByInstructor)) {
        matchLearnersWithPeers(
          instructorLearners,
          peersWithSchedules,
          courseCode,
          instructor,
          true,
          groups,
          matched,
          unmatched
        );
      }
    } else {
      // All learners can be mixed regardless of instructor
      matchLearnersWithPeers(
        courseLearners,
        peersWithSchedules,
        courseCode,
        null,
        false,
        groups,
        matched,
        unmatched
      );
    }
  }
  
  return { groups, unmatched };
}

function groupLearnersByCourse(
  learners: LearnerWithSchedule[]
): Record<string, LearnerWithSchedule[]> {
  const grouped: Record<string, LearnerWithSchedule[]> = {};
  
  for (const learner of learners) {
    // If instructor field is blank/empty, treat as instructor match NOT required
    // regardless of what the instructorMatchRequired flag says
    const hasInstructor = learner.instructor && learner.instructor.trim() !== '';
    const effectiveMatchRequired = hasInstructor && learner.instructorMatchRequired;
    
    const key = `${learner.courseCode}::${effectiveMatchRequired}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(learner);
  }
  
  return grouped;
}

function groupByInstructor(
  learners: LearnerWithSchedule[]
): Record<string, LearnerWithSchedule[]> {
  const grouped: Record<string, LearnerWithSchedule[]> = {};
  
  for (const learner of learners) {
    const instructor = learner.instructor;
    if (!grouped[instructor]) {
      grouped[instructor] = [];
    }
    grouped[instructor].push(learner);
  }
  
  return grouped;
}

function matchLearnersWithPeers(
  learners: LearnerWithSchedule[],
  peers: PeerWithSchedule[],
  courseCode: string,
  requiredInstructor: string | null,
  instructorMatchRequired: boolean,
  groups: InsertProposedGroup[],
  matched: Set<string>,
  unmatched: UnmatchedParticipant[]
): void {
  // Filter available learners (not yet matched)
  const availableLearners = learners.filter(l => !matched.has(l.email));
  
  if (availableLearners.length === 0) {
    return;
  }
  
  // Find eligible peers for this course/instructor
  const eligiblePeers = peers.filter(peer => {
    // Check if peer has capacity (≤2 groups total)
    if (peer.assignedGroups >= 2) {
      return false;
    }
    
    // Check if peer can teach this course
    if (instructorMatchRequired && requiredInstructor) {
      return peerCanTeach(peer, courseCode, requiredInstructor);
    } else {
      // For non-instructor-match-required, peer just needs to teach the course (any instructor)
      return peerCanTeach(peer, courseCode, requiredInstructor || '');
    }
  });
  
  if (eligiblePeers.length === 0) {
    // No peers available - mark all as unmatched
    for (const learner of availableLearners) {
      if (!matched.has(learner.email)) {
        unmatched.push({
          id: `learner-${learner.email}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: `${learner.firstName} ${learner.lastName}`,
          email: learner.email,
          role: 'Learner',
          courseCode: learner.courseCode,
          constraintFailure: instructorMatchRequired
            ? `Instructor Match Required - No peer available for instructor: ${requiredInstructor}`
            : `No peers available for course: ${courseCode}`,
        });
      }
    }
    return;
  }
  
  // Try to form groups with each peer
  for (const peer of eligiblePeers) {
    if (peer.assignedGroups >= 2) {
      continue;
    }
    
    // Try to form the largest possible group (up to 4 learners)
    const currentAvailable = availableLearners.filter(l => !matched.has(l.email));
    
    if (currentAvailable.length === 0) {
      break;
    }
    
    // Try forming groups of size 4, 3, 2, 1 in that order
    for (let groupSize = Math.min(4, currentAvailable.length); groupSize >= 1; groupSize--) {
      const group = tryFormGroup(
        currentAvailable.slice(0, groupSize),
        peer,
        courseCode,
        requiredInstructor || peer.instructor1 || ''
      );
      
      if (group) {
        groups.push(group);
        peer.assignedGroups++;
        
        // Mark learners as matched
        for (const learner of group.learners) {
          matched.add(learner.email);
        }
        
        break; // Move to next peer
      }
    }
  }
  
  // Any remaining learners are unmatched
  for (const learner of availableLearners) {
    if (!matched.has(learner.email)) {
      unmatched.push({
        id: `learner-${learner.email}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${learner.firstName} ${learner.lastName}`,
        email: learner.email,
        role: 'Learner',
        courseCode: learner.courseCode,
        constraintFailure: 'No available time slots - Schedule conflicts with all available peers',
      });
    }
  }
}

function tryFormGroup(
  learners: LearnerWithSchedule[],
  peer: PeerWithSchedule,
  courseCode: string,
  instructor: string
): InsertProposedGroup | null {
  // Collect all schedules
  const allSchedules: ClassSchedule[] = [];
  
  // Add peer schedule
  if (peer.schedule) {
    allSchedules.push(peer.schedule);
  } else {
    return null; // Can't match without peer schedule
  }
  
  // Add learner schedules
  for (const learner of learners) {
    if (learner.schedule) {
      allSchedules.push(learner.schedule);
    } else {
      return null; // Can't match without all learner schedules
    }
  }
  
  // Find common available time slots across all days
  const bestSlot = findBestTimeSlot(allSchedules);
  
  if (!bestSlot) {
    return null; // No common time slot found
  }
  
  // Create the proposed group (without id and status - those are added by storage)
  return {
    courseCode,
    instructor,
    peerId: peer.email,
    peerName: `${peer.preferredName} ${peer.lastName}`,
    peerEmail: peer.email,
    learners: learners.map(l => ({
      id: l.email,
      name: `${l.firstName} ${l.lastName}`,
      email: l.email,
    })),
    timeSlot: bestSlot,
  };
}

function findBestTimeSlot(schedules: ClassSchedule[]): {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  start: string;
  end: string;
} | null {
  let bestSlot: {
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
    slot: TimeSlot;
    score: number;
  } | null = null;
  
  // Try each day
  for (const day of DAYS) {
    const availableSlots = findAvailableSlots(schedules, day);
    
    for (const slot of availableSlots) {
      // Calculate preference score (prefer slots within 2 hours of classes)
      const withinPreferred = isWithinPreferredProximity(slot, schedules, day);
      const score = withinPreferred ? 1 : 0;
      
      if (!bestSlot || score > bestSlot.score) {
        bestSlot = { day, slot, score };
      }
    }
  }
  
  if (!bestSlot) {
    return null;
  }
  
  return {
    day: bestSlot.day,
    start: bestSlot.slot.start,
    end: bestSlot.slot.end,
  };
}
