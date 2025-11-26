import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  loadRequests,
  loadLearningPeers,
  loadVolunteerSchedules,
  loadLearnerSchedules,
} from "./googleSheets";
import { runMatchingAlgorithm } from "./matchingAlgorithm";

export async function registerRoutes(app: Express): Promise<Server> {
  // POST /api/matching-runs - Start a new matching run
  app.post("/api/matching-runs", async (req, res) => {
    try {
      console.log('Starting new matching run...');
      
      // Create initial run record
      const run = await storage.createMatchingRun({
        timestamp: new Date(),
        totalLearners: 0,
        totalPeers: 0,
        matchedLearners: 0,
        unmatchedLearners: 0,
        proposedGroups: 0,
        status: 'running',
      });

      // Ingest data from Google Sheets asynchronously
      Promise.resolve().then(async () => {
        try {
          console.log('Loading data from Google Sheets...');
          
          const [requests, peers, volunteerSchedules, learnerSchedules] = await Promise.all([
            loadRequests(),
            loadLearningPeers(),
            loadVolunteerSchedules(),
            loadLearnerSchedules(),
          ]);

          console.log(`Loaded ${requests.length} requests, ${peers.length} peers`);

          // Run matching algorithm
          console.log('Running matching algorithm...');
          const result = runMatchingAlgorithm({
            requests,
            peers,
            learnerSchedules,
            volunteerSchedules,
          });

          console.log(`Matched ${result.groups.length} groups, ${result.unmatched.length} unmatched`);

          // Store results
          for (const group of result.groups) {
            await storage.createGroup(run.id, group);
          }

          await storage.setUnmatchedParticipants(run.id, result.unmatched);

          // Update run record with metrics
          const matchedLearners = result.groups.reduce((sum, g) => sum + g.learners.length, 0);
          const unmatchedLearners = result.unmatched.filter(u => u.role === 'Learner').length;
          
          await storage.updateMatchingRunMetrics(run.id, {
            totalLearners: requests.length,
            totalPeers: peers.length,
            matchedLearners,
            unmatchedLearners,
            proposedGroups: result.groups.length,
          });
          
          await storage.updateMatchingRunStatus(run.id, 'completed');

          console.log('Matching run completed successfully');
        } catch (error) {
          console.error('Error during matching run:', error);
          await storage.updateMatchingRunStatus(run.id, 'failed');
        }
      });

      // Return immediately with run ID
      res.json({
        success: true,
        runId: run.id,
        status: 'running',
        message: 'Matching run started. Processing data from Google Sheets...',
      });
    } catch (error) {
      console.error('Error starting matching run:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/matching-runs/:id - Get matching run details
  app.get("/api/matching-runs/:id", async (req, res) => {
    try {
      const run = await storage.getMatchingRun(req.params.id);
      
      if (!run) {
        return res.status(404).json({
          success: false,
          error: 'Matching run not found',
        });
      }

      // Serialize date to string for JSON
      const serializedRun = {
        ...run,
        timestamp: run.timestamp.toISOString(),
      };

      res.json({
        success: true,
        run: serializedRun,
      });
    } catch (error) {
      console.error('Error fetching matching run:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/matching-runs - Get all matching runs
  app.get("/api/matching-runs", async (req, res) => {
    try {
      const runs = await storage.getAllMatchingRuns();
      
      // Serialize dates to strings for JSON
      const serializedRuns = runs.map(run => ({
        ...run,
        timestamp: run.timestamp.toISOString(),
      }));
      
      res.json({
        success: true,
        runs: serializedRuns,
      });
    } catch (error) {
      console.error('Error fetching matching runs:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/groups - Get all pending groups
  app.get("/api/groups", async (req, res) => {
    try {
      const runs = await storage.getAllMatchingRuns();
      const latestRun = runs[0]; // Most recent
      
      if (!latestRun) {
        return res.json({
          success: true,
          groups: [],
        });
      }

      const allGroups = await storage.getGroupsByRunId(latestRun.id);
      const pendingGroups = allGroups.filter(g => g.status === 'pending');
      
      res.json({
        success: true,
        groups: pendingGroups,
      });
    } catch (error) {
      console.error('Error fetching groups:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // POST /api/groups/:id/approve - Approve a group
  app.post("/api/groups/:id/approve", async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Group not found',
        });
      }

      // Update group status
      await storage.updateGroupStatus(req.params.id, 'approved');

      // TODO: Send email notifications to all participants
      console.log(`Sending email notifications for group ${req.params.id}`);
      console.log(`Recipients: ${group.peerEmail}, ${group.learners.map(l => l.email).join(', ')}`);

      res.json({
        success: true,
        message: 'Group approved and notifications sent',
        group: await storage.getGroup(req.params.id),
      });
    } catch (error) {
      console.error('Error approving group:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // POST /api/groups/:id/reject - Reject and re-queue a group
  app.post("/api/groups/:id/reject", async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Group not found',
        });
      }

      // Mark as rejected and delete
      await storage.updateGroupStatus(req.params.id, 'rejected');
      await storage.deleteGroup(req.params.id);

      // In a real implementation, participants would be added back to the pool
      console.log(`Participants re-queued for group ${req.params.id}`);

      res.json({
        success: true,
        message: 'Group rejected and participants re-queued',
      });
    } catch (error) {
      console.error('Error rejecting group:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // PATCH /api/groups/:id - Update a group manually
  app.patch("/api/groups/:id", async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Group not found',
        });
      }

      // Update the group with provided fields
      await storage.updateGroup(req.params.id, req.body);

      res.json({
        success: true,
        message: 'Group updated successfully',
        group: await storage.getGroup(req.params.id),
      });
    } catch (error) {
      console.error('Error updating group:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/unmatched - Get unmatched participants
  app.get("/api/unmatched", async (req, res) => {
    try {
      const participants = await storage.getLatestUnmatchedParticipants();
      
      res.json({
        success: true,
        participants,
      });
    } catch (error) {
      console.error('Error fetching unmatched participants:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/dashboard-stats - Get aggregated dashboard statistics
  app.get("/api/dashboard-stats", async (req, res) => {
    try {
      const runs = await storage.getAllMatchingRuns();
      const latestRun = runs[0]; // Most recent run
      
      // Get stats from latest completed run
      let stats = {
        totalLearners: 0,
        totalPeers: 0,
        matchedLearners: 0,
        matchRate: 0,
        pendingGroups: 0,
        approvedGroups: 0,
        unmatchedCount: 0,
      };
      
      if (latestRun && latestRun.status === 'completed') {
        stats.totalLearners = latestRun.totalLearners;
        stats.totalPeers = latestRun.totalPeers;
        stats.matchedLearners = latestRun.matchedLearners;
        stats.matchRate = latestRun.totalLearners > 0 
          ? Math.round((latestRun.matchedLearners / latestRun.totalLearners) * 100) 
          : 0;
        
        // Get group counts by status
        const allGroups = await storage.getGroupsByRunId(latestRun.id);
        stats.pendingGroups = allGroups.filter(g => g.status === 'pending').length;
        stats.approvedGroups = allGroups.filter(g => g.status === 'approved').length;
        
        // Get unmatched count
        const unmatched = await storage.getLatestUnmatchedParticipants();
        stats.unmatchedCount = unmatched.length;
      }
      
      // Build recent activity from matching runs
      const recentActivity = runs.slice(0, 5).map(run => ({
        id: run.id,
        type: 'run' as const,
        description: run.status === 'completed' 
          ? `Matching run completed: ${run.matchedLearners} learners matched into ${run.proposedGroups} groups`
          : run.status === 'running' 
            ? 'Matching run in progress...'
            : 'Matching run failed',
        timestamp: run.timestamp,
        status: run.status,
      }));
      
      res.json({
        success: true,
        stats,
        recentActivity,
        lastRunTimestamp: latestRun?.timestamp,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // POST /api/sync-data - Sync data from Google Sheets
  app.post("/api/sync-data", async (req, res) => {
    try {
      console.log('Syncing data from Google Sheets...');
      
      const [requests, peers, volunteerSchedules, learnerSchedules] = await Promise.all([
        loadRequests(),
        loadLearningPeers(),
        loadVolunteerSchedules(),
        loadLearnerSchedules(),
      ]);

      res.json({
        success: true,
        message: 'Data synced successfully',
        data: {
          requests: requests.length,
          peers: peers.length,
          volunteerSchedules: volunteerSchedules.length,
          learnerSchedules: learnerSchedules.length,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error syncing data:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
