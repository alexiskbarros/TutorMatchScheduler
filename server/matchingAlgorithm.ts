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
  normalizeInstructorName,
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

// Generate combinations of items with a given size
// Limits the number of combinations returned for efficiency
function generateCombinations<T>(items: T[], size: number, maxCombinations: number = 20): T[][] {
  const combinations: T[][] = [];
  
  function backtrack(start: number, current: T[]) {
    if (combinations.length >= maxCombinations) {
      return;
    }
    
    if (current.length === size) {
      combinations.push([...current]);
      return;
    }
    
    for (let i = start; i < items.length; i++) {
      current.push(items[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  
  backtrack(0, []);
  return combinations;
}

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
    assignedGroups: 0, // Track groups assigned in this run
  }));
  
  // Diagnostic logging
  
  const groups: InsertProposedGroup[] = [];
  const matched = new Set<string>(); // Track matched learner emails
  const unmatched: UnmatchedParticipant[] = [];
  
  // Group learners by course code and instructor match requirement
  const learnersByCourse = groupLearnersByCourse(learnersWithSchedules);
  
  // Sort course keys to prioritize instructor-required matches FIRST
  // This ensures peers who can teach specific instructors are reserved for those learners
  const sortedCourseKeys = Object.keys(learnersByCourse).sort((a, b) => {
    const [, aRequired] = a.split('::');
    const [, bRequired] = b.split('::');
    // Process 'true' (instructor required) before 'false'
    if (aRequired === 'true' && bRequired === 'false') return -1;
    if (aRequired === 'false' && bRequired === 'true') return 1;
    return 0;
  });
  
  // Process each course group in priority order
  for (const courseKey of sortedCourseKeys) {
    const courseLearners = learnersByCourse[courseKey];
    const [courseCode, instructorMatchRequired] = courseKey.split('::');
    
    if (instructorMatchRequired === 'true') {
      // Group by instructor when match is required
      const learnersByInstructor = groupByInstructor(courseLearners);
      
      // Get all instructor-flexible learners for this course to allow mixing
      const flexibleKey = `${courseCode}::false`;
      const flexibleLearners = learnersByCourse[flexibleKey] || [];
      
      for (const [instructor, instructorLearners] of Object.entries(learnersByInstructor)) {
        // Combine instructor-required learners with instructor-flexible learners
        // This allows flexible learners to fill out instructor-specific groups
        const combinedLearners = [...instructorLearners, ...flexibleLearners.filter(l => !matched.has(l.email))];
        
        matchLearnersWithPeers(
          combinedLearners,
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
    // Normalize instructor name to handle case sensitivity
    const normalizedInstructor = normalizeInstructorName(learner.instructor);
    if (!grouped[normalizedInstructor]) {
      grouped[normalizedInstructor] = [];
    }
    grouped[normalizedInstructor].push(learner);
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
    // Check if peer has capacity based on their Groups column value
    const maxGroups = peer.groups || 2; // Default to 2 if not specified
    if (peer.assignedGroups >= maxGroups) {
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
    const maxGroups = peer.groups || 2; // Default to 2 if not specified
    if (peer.assignedGroups >= maxGroups) {
      continue;
    }
    
    // Try to form the largest possible group (up to 4 learners)
    const currentAvailable = availableLearners.filter(l => !matched.has(l.email));
    
    if (currentAvailable.length === 0) {
      break;
    }
    
    // Try forming groups of size 4, 3, 2, 1 in that order
    // Use true combinatorial search to explore different learner subsets
    let groupFormed = false;
    
    for (let groupSize = Math.min(4, currentAvailable.length); groupSize >= 1 && !groupFormed; groupSize--) {
      // Generate combinations of learners
      // Limit total combinations tried per group size for efficiency
      const combinations = generateCombinations(currentAvailable, groupSize, 20);
      
      for (const candidateLearners of combinations) {
        // Normalize instructor name to prevent duplicate groups from case sensitivity
        const instructorName = requiredInstructor || peer.instructor1 || '';
        const normalizedInstructor = normalizeInstructorName(instructorName);
        
        const group = tryFormGroup(
          candidateLearners,
          peer,
          courseCode,
          normalizedInstructor
        );
        
        if (group) {
          groups.push(group);
          peer.assignedGroups++;
          
          // Mark learners as matched
          for (const learner of group.learners) {
            matched.add(learner.email);
          }
          
          groupFormed = true;
          break; // Found a group, move to next peer
        }
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
