import { z } from "zod";
import { pgTable, text, integer, timestamp, uuid, jsonb, pgEnum, index, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Allowed emails table for access control
export const allowedEmails = pgTable("allowed_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  addedBy: varchar("added_by"),
  addedAt: timestamp("added_at").defaultNow(),
});

export type AllowedEmail = typeof allowedEmails.$inferSelect;
export type InsertAllowedEmail = typeof allowedEmails.$inferInsert;

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
    instructor: z.string().optional(),
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
  newRequestsOnly: z.boolean().default(false),
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

// Drizzle Database Schema
export const statusEnum = pgEnum('status', ['running', 'completed', 'failed']);
export const groupStatusEnum = pgEnum('group_status', ['pending', 'approved', 'rejected']);
export const roleEnum = pgEnum('role', ['Learner', 'Peer']);
export const dayEnum = pgEnum('day', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);

export const matchingRunsTable = pgTable('matching_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  totalLearners: integer('total_learners').notNull().default(0),
  totalPeers: integer('total_peers').notNull().default(0),
  matchedLearners: integer('matched_learners').notNull().default(0),
  unmatchedLearners: integer('unmatched_learners').notNull().default(0),
  proposedGroups: integer('proposed_groups').notNull().default(0),
  status: statusEnum('status').notNull().default('running'),
  newRequestsOnly: integer('new_requests_only').notNull().default(0), // Boolean stored as 0/1
});

export const proposedGroupsTable = pgTable('proposed_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').references(() => matchingRunsTable.id).notNull(),
  courseCode: text('course_code').notNull(),
  instructor: text('instructor').notNull(),
  peerId: text('peer_id').notNull(),
  peerName: text('peer_name').notNull(),
  peerEmail: text('peer_email').notNull(),
  learners: jsonb('learners').notNull(),
  timeSlotDay: dayEnum('time_slot_day').notNull(),
  timeSlotStart: text('time_slot_start').notNull(),
  timeSlotEnd: text('time_slot_end').notNull(),
  status: groupStatusEnum('status').notNull().default('pending'),
}, (table) => ({
  runIdIdx: index('proposed_groups_run_id_idx').on(table.runId),
  statusIdx: index('proposed_groups_status_idx').on(table.status),
  courseCodeIdx: index('proposed_groups_course_code_idx').on(table.courseCode),
}));

export const unmatchedParticipantsTable = pgTable('unmatched_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').references(() => matchingRunsTable.id).notNull(),
  participantId: text('participant_id').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: roleEnum('role').notNull(),
  courseCode: text('course_code').notNull(),
  constraintFailure: text('constraint_failure').notNull(),
  suggestedAlternative: text('suggested_alternative'),
}, (table) => ({
  runIdIdx: index('unmatched_participants_run_id_idx').on(table.runId),
}));
