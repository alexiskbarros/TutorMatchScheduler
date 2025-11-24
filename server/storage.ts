import type {
  ProposedGroup,
  MatchingRun,
  UnmatchedParticipant,
  InsertProposedGroup,
  InsertMatchingRun,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Matching Runs
  createMatchingRun(run: InsertMatchingRun): Promise<MatchingRun>;
  getMatchingRun(id: string): Promise<MatchingRun | undefined>;
  getAllMatchingRuns(): Promise<MatchingRun[]>;
  getLatestMatchingRun(): Promise<MatchingRun | undefined>;
  updateMatchingRunStatus(id: string, status: 'running' | 'completed' | 'failed'): Promise<void>;
  updateMatchingRunMetrics(id: string, metrics: {
    totalLearners: number;
    totalPeers: number;
    matchedLearners: number;
    unmatchedLearners: number;
    proposedGroups: number;
  }): Promise<void>;
  
  // Proposed Groups
  createGroup(group: InsertProposedGroup): Promise<ProposedGroup>;
  getGroup(id: string): Promise<ProposedGroup | undefined>;
  getGroupsByRunId(runId: string): Promise<ProposedGroup[]>;
  updateGroupStatus(id: string, status: 'pending' | 'approved' | 'rejected'): Promise<void>;
  updateGroup(id: string, updates: Partial<Omit<ProposedGroup, 'id' | 'status'>>): Promise<void>;
  deleteGroup(id: string): Promise<void>;
  
  // Unmatched Participants
  setUnmatchedParticipants(runId: string, participants: UnmatchedParticipant[]): Promise<void>;
  getUnmatchedParticipants(runId: string): Promise<UnmatchedParticipant[]>;
  getLatestUnmatchedParticipants(): Promise<UnmatchedParticipant[]>;
}

export class MemStorage implements IStorage {
  private matchingRuns: Map<string, MatchingRun>;
  private proposedGroups: Map<string, ProposedGroup>;
  private unmatchedByRun: Map<string, UnmatchedParticipant[]>;
  private groupsByRun: Map<string, string[]>; // runId -> groupIds[]
  private latestRunId: string | null;

  constructor() {
    this.matchingRuns = new Map();
    this.proposedGroups = new Map();
    this.unmatchedByRun = new Map();
    this.groupsByRun = new Map();
    this.latestRunId = null;
  }

  // Matching Runs
  async createMatchingRun(insertRun: InsertMatchingRun): Promise<MatchingRun> {
    const id = randomUUID();
    const run: MatchingRun = { ...insertRun, id };
    this.matchingRuns.set(id, run);
    this.latestRunId = id;
    this.groupsByRun.set(id, []);
    return run;
  }

  async getMatchingRun(id: string): Promise<MatchingRun | undefined> {
    return this.matchingRuns.get(id);
  }

  async getAllMatchingRuns(): Promise<MatchingRun[]> {
    return Array.from(this.matchingRuns.values()).sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async getLatestMatchingRun(): Promise<MatchingRun | undefined> {
    const runs = await this.getAllMatchingRuns();
    return runs[0];
  }

  async updateMatchingRunStatus(id: string, status: 'running' | 'completed' | 'failed'): Promise<void> {
    const run = this.matchingRuns.get(id);
    if (run) {
      run.status = status;
      this.matchingRuns.set(id, run);
    }
  }

  async updateMatchingRunMetrics(id: string, metrics: {
    totalLearners: number;
    totalPeers: number;
    matchedLearners: number;
    unmatchedLearners: number;
    proposedGroups: number;
  }): Promise<void> {
    const run = this.matchingRuns.get(id);
    if (run) {
      run.totalLearners = metrics.totalLearners;
      run.totalPeers = metrics.totalPeers;
      run.matchedLearners = metrics.matchedLearners;
      run.unmatchedLearners = metrics.unmatchedLearners;
      run.proposedGroups = metrics.proposedGroups;
      this.matchingRuns.set(id, run);
    }
  }

  // Proposed Groups
  async createGroup(insertGroup: InsertProposedGroup): Promise<ProposedGroup> {
    const id = randomUUID();
    const group: ProposedGroup = { ...insertGroup, id, status: 'pending' };
    this.proposedGroups.set(id, group);
    
    // Associate with latest run if available
    if (this.latestRunId) {
      const runGroups = this.groupsByRun.get(this.latestRunId) || [];
      runGroups.push(id);
      this.groupsByRun.set(this.latestRunId, runGroups);
    }
    
    return group;
  }

  async getGroup(id: string): Promise<ProposedGroup | undefined> {
    return this.proposedGroups.get(id);
  }

  async getGroupsByRunId(runId: string): Promise<ProposedGroup[]> {
    const groupIds = this.groupsByRun.get(runId) || [];
    return groupIds
      .map(id => this.proposedGroups.get(id))
      .filter((g): g is ProposedGroup => g !== undefined);
  }

  async updateGroupStatus(id: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> {
    const group = this.proposedGroups.get(id);
    if (group) {
      group.status = status;
      this.proposedGroups.set(id, group);
    }
  }

  async updateGroup(id: string, updates: Partial<Omit<ProposedGroup, 'id' | 'status'>>): Promise<void> {
    const group = this.proposedGroups.get(id);
    if (group) {
      const updatedGroup = { ...group, ...updates };
      this.proposedGroups.set(id, updatedGroup);
    }
  }

  async deleteGroup(id: string): Promise<void> {
    this.proposedGroups.delete(id);
    
    // Remove from run associations
    for (const [runId, groupIds] of Array.from(this.groupsByRun.entries())) {
      const filtered = groupIds.filter((gid: string) => gid !== id);
      this.groupsByRun.set(runId, filtered);
    }
  }

  // Unmatched Participants
  async setUnmatchedParticipants(runId: string, participants: UnmatchedParticipant[]): Promise<void> {
    this.unmatchedByRun.set(runId, participants);
  }

  async getUnmatchedParticipants(runId: string): Promise<UnmatchedParticipant[]> {
    return this.unmatchedByRun.get(runId) || [];
  }

  async getLatestUnmatchedParticipants(): Promise<UnmatchedParticipant[]> {
    if (!this.latestRunId) {
      return [];
    }
    return this.unmatchedByRun.get(this.latestRunId) || [];
  }
}

export const storage = new MemStorage();
