import type { TimeSlot, ClassSchedule } from '@shared/schema';

// Convert time string "HH:MM" to minutes since midnight
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert minutes since midnight back to "HH:MM"
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Check if two time slots overlap
export function slotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  const start1 = timeToMinutes(slot1.start);
  const end1 = timeToMinutes(slot1.end);
  const start2 = timeToMinutes(slot2.start);
  const end2 = timeToMinutes(slot2.end);
  
  return start1 < end2 && start2 < end1;
}

// Check if a proposed session conflicts with any class times
// Includes travel buffer (default 5 minutes before and after)
export function hasScheduleConflict(
  sessionSlot: TimeSlot,
  classSlots: TimeSlot[],
  bufferMinutes: number = 5
): boolean {
  const sessionStart = timeToMinutes(sessionSlot.start);
  const sessionEnd = timeToMinutes(sessionSlot.end);
  
  for (const classSlot of classSlots) {
    const classStart = timeToMinutes(classSlot.start);
    const classEnd = timeToMinutes(classSlot.end);
    
    // Check if session conflicts with class + buffer
    const sessionStartWithBuffer = sessionStart - bufferMinutes;
    const sessionEndWithBuffer = sessionEnd + bufferMinutes;
    
    if (sessionStartWithBuffer < classEnd && sessionEndWithBuffer > classStart) {
      return true;
    }
  }
  
  return false;
}

// Get schedule for a specific day
export function getScheduleForDay(
  schedule: ClassSchedule,
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'
): TimeSlot[] {
  return schedule[day] || [];
}

// Find all possible 1-hour time slots in a day that don't conflict with schedules
// Returns slots within the availability window (08:00 - 20:00 by default)
export function findAvailableSlots(
  participantSchedules: ClassSchedule[],
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday',
  startHour: number = 8,
  endHour: number = 20,
  sessionDurationMinutes: number = 60,
  bufferMinutes: number = 5
): TimeSlot[] {
  const availableSlots: TimeSlot[] = [];
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  
  // Try every 30-minute increment for potential session starts
  for (let slotStart = startMinutes; slotStart + sessionDurationMinutes <= endMinutes; slotStart += 30) {
    const slotEnd = slotStart + sessionDurationMinutes;
    const proposedSlot: TimeSlot = {
      start: minutesToTime(slotStart),
      end: minutesToTime(slotEnd),
    };
    
    // Check if this slot conflicts with any participant's schedule
    let hasConflict = false;
    for (const schedule of participantSchedules) {
      const daySchedule = getScheduleForDay(schedule, day);
      if (hasScheduleConflict(proposedSlot, daySchedule, bufferMinutes)) {
        hasConflict = true;
        break;
      }
    }
    
    if (!hasConflict) {
      availableSlots.push(proposedSlot);
    }
  }
  
  return availableSlots;
}

// Calculate how close a time slot is to existing classes (for optimization)
// Returns minimum distance in minutes to nearest class
export function calculateClassProximity(
  sessionSlot: TimeSlot,
  classSlots: TimeSlot[]
): number {
  if (classSlots.length === 0) {
    return Infinity;
  }
  
  const sessionStart = timeToMinutes(sessionSlot.start);
  const sessionEnd = timeToMinutes(sessionSlot.end);
  
  let minDistance = Infinity;
  
  for (const classSlot of classSlots) {
    const classStart = timeToMinutes(classSlot.start);
    const classEnd = timeToMinutes(classSlot.end);
    
    // Calculate distance to this class
    let distance: number;
    if (sessionEnd <= classStart) {
      // Session is before class
      distance = classStart - sessionEnd;
    } else if (sessionStart >= classEnd) {
      // Session is after class
      distance = sessionStart - classEnd;
    } else {
      // Should not happen if we filtered conflicts properly
      distance = 0;
    }
    
    minDistance = Math.min(minDistance, distance);
  }
  
  return minDistance;
}

// Check if a time slot is between classes for a single participant
// This is the most preferred slot type - student is already on campus
export function isBetweenClasses(
  sessionSlot: TimeSlot,
  classSlots: TimeSlot[]
): boolean {
  if (classSlots.length < 2) {
    return false;
  }
  
  const sessionStart = timeToMinutes(sessionSlot.start);
  const sessionEnd = timeToMinutes(sessionSlot.end);
  
  let hasClassBefore = false;
  let hasClassAfter = false;
  
  for (const classSlot of classSlots) {
    const classStart = timeToMinutes(classSlot.start);
    const classEnd = timeToMinutes(classSlot.end);
    
    if (classEnd <= sessionStart) {
      hasClassBefore = true;
    }
    if (classStart >= sessionEnd) {
      hasClassAfter = true;
    }
  }
  
  return hasClassBefore && hasClassAfter;
}

// Check if a time slot is between classes at the GROUP level
// Returns true if:
// - At least ONE person has it between their own classes (individual gap), OR
// - The group has classes before AND after, AND those classes are close enough (within 90 min)
//   to make it genuinely convenient (some arrive from class, others stay for next class)
export function isBetweenClassesForGroup(
  sessionSlot: TimeSlot,
  allParticipantSchedules: ClassSchedule[],
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'
): boolean {
  const sessionStart = timeToMinutes(sessionSlot.start);
  const sessionEnd = timeToMinutes(sessionSlot.end);
  
  // First, check if ANY individual has this between their own classes
  for (const schedule of allParticipantSchedules) {
    const daySchedule = getScheduleForDay(schedule, day);
    if (isBetweenClasses(sessionSlot, daySchedule)) {
      return true; // Someone has it as a personal gap
    }
  }
  
  // If no individual gap, check for group-level convenience:
  // Someone has class ending within 90 min before AND someone has class starting within 90 min after
  let hasRecentClassBefore = false;
  let hasUpcomingClassAfter = false;
  const proximityWindow = 90; // minutes
  
  for (const schedule of allParticipantSchedules) {
    const daySchedule = getScheduleForDay(schedule, day);
    
    for (const classSlot of daySchedule) {
      const classStart = timeToMinutes(classSlot.start);
      const classEnd = timeToMinutes(classSlot.end);
      
      // Class ends before session and within proximity window
      if (classEnd <= sessionStart && (sessionStart - classEnd) <= proximityWindow) {
        hasRecentClassBefore = true;
      }
      
      // Class starts after session and within proximity window
      if (classStart >= sessionEnd && (classStart - sessionEnd) <= proximityWindow) {
        hasUpcomingClassAfter = true;
      }
    }
  }
  
  return hasRecentClassBefore && hasUpcomingClassAfter;
}

// Check if a time slot is within preferred proximity (2 hours) of any class
export function isWithinPreferredProximity(
  sessionSlot: TimeSlot,
  allParticipantSchedules: ClassSchedule[],
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday',
  preferredProximityMinutes: number = 120
): boolean {
  for (const schedule of allParticipantSchedules) {
    const daySchedule = getScheduleForDay(schedule, day);
    const proximity = calculateClassProximity(sessionSlot, daySchedule);
    
    if (proximity <= preferredProximityMinutes) {
      return true;
    }
  }
  
  return false;
}

// Normalize instructor name for matching
// Handles variations like "Marina Elliot" vs "Marina Elliott" vs "Dr. Elliott"
export function normalizeInstructorName(name: string): string {
  if (!name) return '';
  
  // Remove common titles and trim
  let normalized = name
    .replace(/^(Dr\.|Professor|Prof\.|Mr\.|Mrs\.|Ms\.|Miss)\s+/gi, '')
    .replace(/,?\s+(Ph\.?D\.?|M\.?A\.?|B\.?A\.?|M\.?Sc\.?|B\.?Sc\.?)$/gi, '')
    .trim()
    .toLowerCase();
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
}

// Check if two instructor names match (accounting for variations)
export function instructorsMatch(name1: string, name2: string): boolean {
  const norm1 = normalizeInstructorName(name1);
  const norm2 = normalizeInstructorName(name2);
  
  if (norm1 === norm2) {
    return true;
  }
  
  // Check if one is a subset of the other (e.g., "elliott" matches "marina elliott")
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  
  // If last names match, consider it a match
  if (words1.length > 0 && words2.length > 0) {
    const lastName1 = words1[words1.length - 1];
    const lastName2 = words2[words2.length - 1];
    
    // Handle slight spelling variations (edit distance of 1)
    if (lastName1 === lastName2 || 
        Math.abs(lastName1.length - lastName2.length) <= 1 &&
        (lastName1.includes(lastName2) || lastName2.includes(lastName1))) {
      return true;
    }
  }
  
  return false;
}

// Check if a peer can teach a specific course/instructor combination
export function peerCanTeach(
  peer: {
    courseCode1?: string;
    instructor1?: string;
    courseCode2?: string;
    instructor2?: string;
    courseCode3?: string;
    instructor3?: string;
    otherCourses: Array<{ courseCode: string; instructor: string }>;
  },
  courseCode: string,
  instructor: string
): boolean {
  // Check main course slots
  const slots = [
    { courseCode: peer.courseCode1, instructor: peer.instructor1 },
    { courseCode: peer.courseCode2, instructor: peer.instructor2 },
    { courseCode: peer.courseCode3, instructor: peer.instructor3 },
    ...peer.otherCourses,
  ];
  
  // If instructor is empty/blank, match ANY instructor for this course
  const anyInstructorOk = !instructor || instructor.trim() === '';
  
  for (const slot of slots) {
    if (slot.courseCode) {
      const courseMatches = slot.courseCode.trim() === courseCode.trim();
      
      if (courseMatches) {
        // If we don't care about instructor, just need course match
        if (anyInstructorOk) {
          return true;
        }
        
        // Otherwise check if instructor matches
        if (slot.instructor && instructorsMatch(slot.instructor, instructor)) {
          return true;
        }
      }
    }
  }
  
  return false;
}
