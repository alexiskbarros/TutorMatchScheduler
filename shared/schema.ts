import { z } from "zod";

// Time slot format: "0830-0950"
export const timeSlotSchema = z.object({
  start: z.string(), // "08:30"
  end: z.string(),   // "09:50"
});

export type TimeSlot = z.infer<typeof timeSlotSchema>;

// Learner Request from Google Sheets
export const learnerRequestSchema = z.object({
  timestamp: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  courseCode: z.string(),
  instructor: z.string(),
  instructorMatchRequired: z.boolean(),
  sectionNumber: z.string().optional(),
});

export type LearnerRequest = z.infer<typeof learnerRequestSchema>;

// Learning Peer from Google Sheets
export const learningPeerSchema = z.object({
  email: z.string().email(),
  preferredName: z.string(),
  lastName: z.string(),
  groups: z.number().default(0), // Current number of assigned groups
  courseCode1: z.string().optional(),
  instructor1: z.string().optional(),
  courseCode2: z.string().optional(),
  instructor2: z.string().optional(),
  courseCode3: z.string().optional(),
  instructor3: z.string().optional(),
  otherCourses: z.array(z.object({
    courseCode: z.string(),
    instructor: z.string(),
  })).default([]),
});

export type LearningPeer = z.infer<typeof learningPeerSchema>;

// Class Schedule (used for both volunteers and learners)
export const classScheduleSchema = z.object({
  email: z.string().email(),
  firstName: z.string(),
  monday: z.array(timeSlotSchema).default([]),
  tuesday: z.array(timeSlotSchema).default([]),
  wednesday: z.array(timeSlotSchema).default([]),
  thursday: z.array(timeSlotSchema).default([]),
  friday: z.array(timeSlotSchema).default([]),
});

export type ClassSchedule = z.infer<typeof classScheduleSchema>;

// Proposed Group (result of matching algorithm)
export const proposedGroupSchema = z.object({
  id: z.string(),
  courseCode: z.string(),
  instructor: z.string(),
  peerId: z.string(),
  peerName: z.string(),
  peerEmail: z.string(),
  learners: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  })),
  timeSlot: z.object({
    day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
    start: z.string(),
    end: z.string(),
  }),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
});

export type ProposedGroup = z.infer<typeof proposedGroupSchema>;

// Matching Run
export const matchingRunSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  totalLearners: z.number(),
  totalPeers: z.number(),
  matchedLearners: z.number(),
  unmatchedLearners: z.number(),
  proposedGroups: z.number(),
  status: z.enum(['running', 'completed', 'failed']),
});

export type MatchingRun = z.infer<typeof matchingRunSchema>;

// Unmatched Participant
export const unmatchedParticipantSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['Learner', 'Peer']),
  courseCode: z.string(),
  constraintFailure: z.string(),
  suggestedAlternative: z.string().optional(),
});

export type UnmatchedParticipant = z.infer<typeof unmatchedParticipantSchema>;

// Export types for insert operations
export const insertProposedGroupSchema = proposedGroupSchema.omit({ id: true, status: true });
export const insertMatchingRunSchema = matchingRunSchema.omit({ id: true });

export type InsertProposedGroup = z.infer<typeof insertProposedGroupSchema>;
export type InsertMatchingRun = z.infer<typeof insertMatchingRunSchema>;
