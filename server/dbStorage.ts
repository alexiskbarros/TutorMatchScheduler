import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";
import type {
  ProposedGroup,
  MatchingRun,
  UnmatchedParticipant,
  InsertProposedGroup,
  InsertMatchingRun,
} from "@shared/schema";
import { 
  matchingRunsTable, 
  proposedGroupsTable, 
  unmatchedParticipantsTable 
} from "@shared/schema";
import type { IStorage } from "./storage";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

export class DbStorage implements IStorage {
  private db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool);
  }

  // Matching Runs
  async createMatchingRun(insertRun: InsertMatchingRun): Promise<MatchingRun> {
    const dbValues = {
      ...insertRun,
      newRequestsOnly: insertRun.newRequestsOnly ? 1 : 0,
    };
    const [run] = await this.db
      .insert(matchingRunsTable)
      .values(dbValues)
      .returning();
    
    return {
      id: run.id,
      timestamp: run.timestamp,
      totalLearners: run.totalLearners,
      totalPeers: run.totalPeers,
      matchedLearners: run.matchedLearners,
      unmatchedLearners: run.unmatchedLearners,
      proposedGroups: run.proposedGroups,
      status: run.status,
      newRequestsOnly: Boolean(run.newRequestsOnly),
    };
  }

  async getMatchingRun(id: string): Promise<MatchingRun | undefined> {
    const [run] = await this.db
      .select()
      .from(matchingRunsTable)
      .where(eq(matchingRunsTable.id, id));
    
    if (!run) return undefined;

    return {
      id: run.id,
      timestamp: run.timestamp,
      totalLearners: run.totalLearners,
      totalPeers: run.totalPeers,
      matchedLearners: run.matchedLearners,
      unmatchedLearners: run.unmatchedLearners,
      proposedGroups: run.proposedGroups,
      status: run.status,
      newRequestsOnly: Boolean(run.newRequestsOnly),
    };
  }

  async getAllMatchingRuns(): Promise<MatchingRun[]> {
    const runs = await this.db
      .select()
      .from(matchingRunsTable)
      .orderBy(desc(matchingRunsTable.timestamp));

    return runs.map(run => ({
      id: run.id,
      timestamp: run.timestamp,
      totalLearners: run.totalLearners,
      totalPeers: run.totalPeers,
      matchedLearners: run.matchedLearners,
      unmatchedLearners: run.unmatchedLearners,
      proposedGroups: run.proposedGroups,
      status: run.status,
      newRequestsOnly: Boolean(run.newRequestsOnly),
    }));
  }

  async getLatestMatchingRun(): Promise<MatchingRun | undefined> {
    const runs = await this.getAllMatchingRuns();
    return runs[0];
  }

  async updateMatchingRunStatus(id: string, status: 'running' | 'completed' | 'failed'): Promise<void> {
    await this.db
      .update(matchingRunsTable)
      .set({ status })
      .where(eq(matchingRunsTable.id, id));
  }

  async updateMatchingRunMetrics(id: string, metrics: {
    totalLearners: number;
    totalPeers: number;
    matchedLearners: number;
    unmatchedLearners: number;
    proposedGroups: number;
  }): Promise<void> {
    await this.db
      .update(matchingRunsTable)
      .set(metrics)
      .where(eq(matchingRunsTable.id, id));
  }

  // Proposed Groups
  async createGroup(runId: string, insertGroup: InsertProposedGroup): Promise<ProposedGroup> {
    const [group] = await this.db
      .insert(proposedGroupsTable)
      .values({
        courseCode: insertGroup.courseCode,
        instructor: insertGroup.instructor,
        peerId: insertGroup.peerId,
        peerName: insertGroup.peerName,
        peerEmail: insertGroup.peerEmail,
        learners: insertGroup.learners,
        timeSlotDay: insertGroup.timeSlot.day,
        timeSlotStart: insertGroup.timeSlot.start,
        timeSlotEnd: insertGroup.timeSlot.end,
        runId: runId,
      })
      .returning();

    return {
      id: group.id,
      courseCode: group.courseCode,
      instructor: group.instructor,
      peerId: group.peerId,
      peerName: group.peerName,
      peerEmail: group.peerEmail,
      learners: group.learners as Array<{id: string; name: string; email: string; instructor?: string}>,
      timeSlot: {
        day: group.timeSlotDay,
        start: group.timeSlotStart,
        end: group.timeSlotEnd,
      },
      status: group.status,
    };
  }

  async getGroup(id: string): Promise<ProposedGroup | undefined> {
    const [group] = await this.db
      .select()
      .from(proposedGroupsTable)
      .where(eq(proposedGroupsTable.id, id));

    if (!group) return undefined;

    return {
      id: group.id,
      courseCode: group.courseCode,
      instructor: group.instructor,
      peerId: group.peerId,
      peerName: group.peerName,
      peerEmail: group.peerEmail,
      learners: group.learners as Array<{id: string; name: string; email: string; instructor?: string}>,
      timeSlot: {
        day: group.timeSlotDay,
        start: group.timeSlotStart,
        end: group.timeSlotEnd,
      },
      status: group.status,
    };
  }

  async getGroupsByRunId(runId: string): Promise<ProposedGroup[]> {
    const groups = await this.db
      .select()
      .from(proposedGroupsTable)
      .where(eq(proposedGroupsTable.runId, runId));

    return groups.map(group => ({
      id: group.id,
      courseCode: group.courseCode,
      instructor: group.instructor,
      peerId: group.peerId,
      peerName: group.peerName,
      peerEmail: group.peerEmail,
      learners: group.learners as Array<{id: string; name: string; email: string; instructor?: string}>,
      timeSlot: {
        day: group.timeSlotDay,
        start: group.timeSlotStart,
        end: group.timeSlotEnd,
      },
      status: group.status,
    }));
  }

  async updateGroupStatus(id: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> {
    await this.db
      .update(proposedGroupsTable)
      .set({ status })
      .where(eq(proposedGroupsTable.id, id));
  }

  async updateGroup(id: string, updates: Partial<Omit<ProposedGroup, 'id' | 'status'>>): Promise<void> {
    const dbUpdates: any = {};
    
    if (updates.courseCode) dbUpdates.courseCode = updates.courseCode;
    if (updates.instructor) dbUpdates.instructor = updates.instructor;
    if (updates.peerId) dbUpdates.peerId = updates.peerId;
    if (updates.peerName) dbUpdates.peerName = updates.peerName;
    if (updates.peerEmail) dbUpdates.peerEmail = updates.peerEmail;
    if (updates.learners) dbUpdates.learners = updates.learners;
    if (updates.timeSlot) {
      dbUpdates.timeSlotDay = updates.timeSlot.day;
      dbUpdates.timeSlotStart = updates.timeSlot.start;
      dbUpdates.timeSlotEnd = updates.timeSlot.end;
    }

    await this.db
      .update(proposedGroupsTable)
      .set(dbUpdates)
      .where(eq(proposedGroupsTable.id, id));
  }

  async deleteGroup(id: string): Promise<void> {
    await this.db
      .delete(proposedGroupsTable)
      .where(eq(proposedGroupsTable.id, id));
  }

  // Unmatched Participants
  async setUnmatchedParticipants(runId: string, participants: UnmatchedParticipant[]): Promise<void> {
    // Delete existing unmatched participants for this run
    await this.db
      .delete(unmatchedParticipantsTable)
      .where(eq(unmatchedParticipantsTable.runId, runId));

    // Insert new unmatched participants
    if (participants.length > 0) {
      await this.db
        .insert(unmatchedParticipantsTable)
        .values(
          participants.map(p => ({
            runId,
            participantId: p.id,
            name: p.name,
            email: p.email,
            role: p.role,
            courseCode: p.courseCode,
            constraintFailure: p.constraintFailure,
            suggestedAlternative: p.suggestedAlternative || null,
          }))
        );
    }
  }

  async getUnmatchedParticipants(runId: string): Promise<UnmatchedParticipant[]> {
    const participants = await this.db
      .select()
      .from(unmatchedParticipantsTable)
      .where(eq(unmatchedParticipantsTable.runId, runId));

    return participants.map(p => ({
      id: p.participantId,
      name: p.name,
      email: p.email,
      role: p.role,
      courseCode: p.courseCode,
      constraintFailure: p.constraintFailure,
      suggestedAlternative: p.suggestedAlternative || undefined,
    }));
  }

  async getLatestUnmatchedParticipants(): Promise<UnmatchedParticipant[]> {
    const latestRun = await this.getLatestMatchingRun();
    if (!latestRun) return [];
    return this.getUnmatchedParticipants(latestRun.id);
  }

  async getApprovedLearnerEmails(): Promise<string[]> {
    const approvedGroups = await this.db
      .select()
      .from(proposedGroupsTable)
      .where(eq(proposedGroupsTable.status, 'approved'));

    const emails = new Set<string>();
    for (const group of approvedGroups) {
      const learners = group.learners as any[];
      if (Array.isArray(learners)) {
        for (const learner of learners) {
          if (learner.email) {
            emails.add(learner.email);
          }
        }
      }
    }
    return Array.from(emails);
  }
}
