import { pgTable, text, integer, timestamp, uuid, jsonb, pgEnum } from "drizzle-orm/pg-core";

// Enums
export const statusEnum = pgEnum('status', ['running', 'completed', 'failed']);
export const groupStatusEnum = pgEnum('group_status', ['pending', 'approved', 'rejected']);
export const roleEnum = pgEnum('role', ['Learner', 'Peer']);
export const dayEnum = pgEnum('day', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);

// Matching Runs table
export const matchingRuns = pgTable('matching_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  totalLearners: integer('total_learners').notNull().default(0),
  totalPeers: integer('total_peers').notNull().default(0),
  matchedLearners: integer('matched_learners').notNull().default(0),
  unmatchedLearners: integer('unmatched_learners').notNull().default(0),
  proposedGroups: integer('proposed_groups').notNull().default(0),
  status: statusEnum('status').notNull().default('running'),
});

// Proposed Groups table
export const proposedGroups = pgTable('proposed_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').references(() => matchingRuns.id).notNull(),
  courseCode: text('course_code').notNull(),
  instructor: text('instructor').notNull(),
  peerId: text('peer_id').notNull(),
  peerName: text('peer_name').notNull(),
  peerEmail: text('peer_email').notNull(),
  learners: jsonb('learners').notNull(), // Array of {id, name, email}
  timeSlotDay: dayEnum('time_slot_day').notNull(),
  timeSlotStart: text('time_slot_start').notNull(),
  timeSlotEnd: text('time_slot_end').notNull(),
  status: groupStatusEnum('status').notNull().default('pending'),
});

// Unmatched Participants table
export const unmatchedParticipants = pgTable('unmatched_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').references(() => matchingRuns.id).notNull(),
  participantId: text('participant_id').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: roleEnum('role').notNull(),
  courseCode: text('course_code').notNull(),
  constraintFailure: text('constraint_failure').notNull(),
  suggestedAlternative: text('suggested_alternative'),
});

export type MatchingRun = typeof matchingRuns.$inferSelect;
export type InsertMatchingRun = typeof matchingRuns.$inferInsert;
export type ProposedGroup = typeof proposedGroups.$inferSelect;
export type InsertProposedGroup = typeof proposedGroups.$inferInsert;
export type UnmatchedParticipant = typeof unmatchedParticipants.$inferSelect;
export type InsertUnmatchedParticipant = typeof unmatchedParticipants.$inferInsert;
