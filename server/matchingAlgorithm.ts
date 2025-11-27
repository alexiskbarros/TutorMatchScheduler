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
  isBetweenClasses,
  isBetweenClassesForGroup,
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

// Track specific failure reasons for each learner
type FailureReason = {
  reason: string;
  details: string;
};

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
  
  // Track failure reasons for unmatched learners
  const failureReasons = new Map<string, FailureReason>();
  
  // Initialize failure reasons - check for missing schedules first
  for (const learner of learnersWithSchedules) {
    if (!learner.schedule) {
      failureReasons.set(learner.email, {
        reason: 'Missing schedule',
        details: `No class schedule found for ${learner.firstName} ${learner.lastName}. Please ensure their schedule is entered in the Learner Class Schedule sheet.`
      });
    }
  }
  
  const groups: InsertProposedGroup[] = [];
  const matched = new Set<string>(); // Track matched learner emails
  
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
          failureReasons
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
        failureReasons
      );
    }
  }
  
  // Build unmatched list AFTER all matching is complete
  const unmatched: UnmatchedParticipant[] = [];
  for (const learner of learnersWithSchedules) {
    if (!matched.has(learner.email)) {
      // Get the specific failure reason, or use a default
      const failure = failureReasons.get(learner.email);
      let constraintFailure: string;
      
      if (failure) {
        constraintFailure = `${failure.reason}: ${failure.details}`;
      } else {
        // This shouldn't happen, but provide a fallback
        constraintFailure = 'Unable to find a suitable match. Please review manually.';
      }
      
      unmatched.push({
        id: `learner-${learner.email}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${learner.firstName} ${learner.lastName}`,
        email: learner.email,
        role: 'Learner',
        courseCode: learner.courseCode,
        constraintFailure,
      });
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
  failureReasons: Map<string, FailureReason>
): void {
  // Filter available learners (not yet matched)
  const availableLearners = learners.filter(l => !matched.has(l.email));
  
  if (availableLearners.length === 0) {
    return;
  }
  
  // Find all peers who teach this course (regardless of capacity)
  const peersForCourse = peers.filter(peer => {
    if (instructorMatchRequired && requiredInstructor) {
      return peerCanTeach(peer, courseCode, requiredInstructor);
    } else {
      return peerCanTeach(peer, courseCode, requiredInstructor || '');
    }
  });
  
  // Check if no peers exist at all for this course/instructor
  if (peersForCourse.length === 0) {
    const reason = instructorMatchRequired && requiredInstructor
      ? `No peers available for ${courseCode} with instructor ${requiredInstructor}`
      : `No peers available for ${courseCode}`;
    
    for (const learner of availableLearners) {
      if (!failureReasons.has(learner.email)) {
        failureReasons.set(learner.email, {
          reason: 'No eligible peers',
          details: reason
        });
      }
    }
    return;
  }
  
  // Find eligible peers (has capacity)
  const eligiblePeers = peersForCourse.filter(peer => {
    const maxGroups = peer.groups || 2;
    return peer.assignedGroups < maxGroups;
  });
  
  if (eligiblePeers.length === 0) {
    // Peers exist but all at capacity
    const peerNames = peersForCourse.map(p => `${p.preferredName} ${p.lastName}`).join(', ');
    for (const learner of availableLearners) {
      if (!failureReasons.has(learner.email)) {
        failureReasons.set(learner.email, {
          reason: 'Peer capacity exhausted',
          details: `All peers for ${courseCode} have reached their maximum group limit. Available peers (at capacity): ${peerNames}`
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
        // Only use instructor if it's required by the learners
        // If instructorMatchRequired is false, use empty string so all learners mix freely
        let instructorName = '';
        if (instructorMatchRequired && requiredInstructor) {
          instructorName = requiredInstructor;
        } else if (instructorMatchRequired) {
          instructorName = peer.instructor1 || '';
        }
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
  
  // After all matching attempts, set schedule conflict reasons for remaining unmatched learners
  const stillUnmatched = availableLearners.filter(l => !matched.has(l.email));
  for (const learner of stillUnmatched) {
    if (!failureReasons.has(learner.email)) {
      // Build a list of peers that were tried
      const triedPeers = eligiblePeers.map(p => `${p.preferredName} ${p.lastName}`).join(', ');
      failureReasons.set(learner.email, {
        reason: 'Schedule conflict',
        details: `No common available time slot found between ${learner.firstName} ${learner.lastName} and any eligible peer for ${courseCode}. Peers tried: ${triedPeers}`
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
      instructor: l.instructor,
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
      // Calculate preference score with improved prioritization:
      // Score 3: Between classes (gap) - students prefer being already on campus
      // Score 2: Within 1 hour of classes - convenient
      // Score 1: Within 2 hours of classes - acceptable
      // Score 0: Far from classes - requires special trip
      let score = 0;
      
      // Check at GROUP level: Is this between classes for the group?
      // (Anyone has class before AND anyone has class after)
      if (isBetweenClassesForGroup(slot, schedules, day)) {
        score = 3; // BEST: Gap between classes
      } else if (isWithinPreferredProximity(slot, schedules, day, 60)) {
        score = 2; // Within 1 hour of classes
      } else if (isWithinPreferredProximity(slot, schedules, day, 120)) {
        score = 1; // Within 2 hours of classes
      }
      
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
