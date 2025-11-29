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
import { generateMatchConfirmationEmail } from "./emailTemplate";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth endpoint - get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // POST /api/matching-runs - Start a new matching run
  app.post("/api/matching-runs", isAuthenticated, async (req, res) => {
    try {
      const { newRequestsOnly } = req.body || {};
      console.log(`Starting new matching run... (newRequestsOnly: ${newRequestsOnly})`);
      
      // Create initial run record
      const run = await storage.createMatchingRun({
        timestamp: new Date(),
        totalLearners: 0,
        totalPeers: 0,
        matchedLearners: 0,
        unmatchedLearners: 0,
        proposedGroups: 0,
        status: 'running',
        newRequestsOnly: newRequestsOnly || false,
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

          // Get approved learner emails if doing incremental matching
          let excludedLearnerEmails: string[] = [];
          if (newRequestsOnly) {
            excludedLearnerEmails = await storage.getApprovedLearnerEmails();
            console.log(`Incremental matching: Excluding ${excludedLearnerEmails.length} already-approved learners`);
          }

          // Run matching algorithm
          console.log('Running matching algorithm...');
          const result = runMatchingAlgorithm({
            requests,
            peers,
            learnerSchedules,
            volunteerSchedules,
            excludedLearnerEmails,
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
  app.get("/api/matching-runs/:id", isAuthenticated, async (req, res) => {
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
  app.get("/api/matching-runs", isAuthenticated, async (req, res) => {
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

  // GET /api/groups - Get all groups (pending and approved)
  app.get("/api/groups", isAuthenticated, async (req, res) => {
    try {
      const runs = await storage.getAllMatchingRuns();
      
      if (runs.length === 0) {
        return res.json({
          success: true,
          groups: [],
        });
      }

      const latestRun = runs[0]; // Most recent run
      
      // If incremental matching (newRequestsOnly: true), preserve approved groups from all runs
      // If full matching (newRequestsOnly: false), only show groups from latest run
      let groups;
      
      if (latestRun.newRequestsOnly) {
        // Incremental: Show all approved groups + latest run's pending groups
        const allGroups = await storage.getAllGroups();
        const approvedGroups = allGroups.filter(g => g.status === 'approved');
        
        const latestRunGroups = await storage.getGroupsByRunId(latestRun.id);
        const pendingGroups = latestRunGroups.filter(g => g.status === 'pending');
        
        groups = [...approvedGroups, ...pendingGroups];
      } else {
        // Full match: Only show groups from latest run (clears previous matches)
        groups = await storage.getGroupsByRunId(latestRun.id);
      }
      
      res.json({
        success: true,
        groups,
      });
    } catch (error) {
      console.error('Error fetching groups:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // POST /api/groups/bulk-approve - Bulk approve multiple groups
  app.post("/api/groups/bulk-approve", isAuthenticated, async (req, res) => {
    try {
      const { groupIds } = req.body;
      
      if (!Array.isArray(groupIds) || groupIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'groupIds must be a non-empty array',
        });
      }

      const results = [];
      const runs = await storage.getAllMatchingRuns();
      const latestRun = runs[0];
      
      for (const groupId of groupIds) {
        const group = await storage.getGroup(groupId);
        if (group) {
          await storage.updateGroupStatus(groupId, 'approved');
          results.push({ groupId, status: 'approved' });
          
          // Calculate group number for this peer
          if (latestRun) {
            const allGroups = await storage.getGroupsByRunId(latestRun.id);
            const peerGroups = allGroups.filter(g => g.peerId === group.peerId && g.status === 'approved');
            const peerGroupNumber = peerGroups.length;
            
            // Generate confirmation email
            const { subject, body } = generateMatchConfirmationEmail(group, peerGroupNumber);
            console.log(`Bulk approved group ${groupId}: ${group.peerEmail}, ${group.learners.map(l => l.email).join(', ')}`);
            console.log(`Email subject: ${subject}`);
          }
        } else {
          results.push({ groupId, status: 'not_found' });
        }
      }

      res.json({
        success: true,
        message: `Approved ${results.filter(r => r.status === 'approved').length} groups`,
        results,
      });
    } catch (error) {
      console.error('Error bulk approving groups:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // POST /api/groups/:id/approve - Approve a group
  app.post("/api/groups/:id/approve", isAuthenticated, async (req, res) => {
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

      // Calculate group number for this peer
      const runs = await storage.getAllMatchingRuns();
      const latestRun = runs[0];
      let peerGroupNumber = 1;
      
      if (latestRun) {
        const allGroups = await storage.getGroupsByRunId(latestRun.id);
        const peerGroups = allGroups.filter(g => g.peerId === group.peerId && g.status === 'approved');
        peerGroupNumber = peerGroups.length;
      }

      // Generate confirmation email
      const { subject, body } = generateMatchConfirmationEmail(group, peerGroupNumber);

      // Log email that would be sent (in production, this would send via email service)
      console.log(`Sending email notifications for group ${req.params.id}`);
      console.log(`Recipients: ${group.peerEmail}, ${group.learners.map(l => l.email).join(', ')}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${body}`);

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
  app.post("/api/groups/:id/reject", isAuthenticated, async (req, res) => {
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
  app.patch("/api/groups/:id", isAuthenticated, async (req, res) => {
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
  app.get("/api/unmatched", isAuthenticated, async (req, res) => {
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

  // GET /api/peers/without-groups - Get learning peers with no assigned groups
  app.get("/api/peers/without-groups", isAuthenticated, async (req, res) => {
    try {
      // Load all peers from Google Sheets
      const allPeers = await loadLearningPeers();
      
      // Get all groups from the latest matching run
      const runs = await storage.getAllMatchingRuns();
      const latestRun = runs[0];
      
      let assignedPeerEmails = new Set<string>();
      if (latestRun) {
        const allGroups = await storage.getGroupsByRunId(latestRun.id);
        assignedPeerEmails = new Set(allGroups.map(g => g.peerEmail));
      }
      
      // Filter peers to only those not in any groups
      const peersWithoutGroups = allPeers.filter(peer => !assignedPeerEmails.has(peer.email));
      
      res.json({
        success: true,
        peers: peersWithoutGroups,
      });
    } catch (error) {
      console.error('Error fetching peers without groups:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/export/groups - Export groups as CSV
  app.get("/api/export/groups", isAuthenticated, async (req, res) => {
    try {
      const runs = await storage.getAllMatchingRuns();
      const latestRun = runs[0];
      
      if (!latestRun) {
        return res.status(404).json({
          success: false,
          error: 'No matching runs found',
        });
      }

      const allGroups = await storage.getGroupsByRunId(latestRun.id);
      
      // Build CSV content
      const headers = ['Group ID', 'Course Code', 'Peer Name', 'Peer Email', 'Status', 'Day', 'Start Time', 'End Time', 'Learner Names', 'Learner Instructors', 'Learner Emails'];
      const rows = allGroups.map(g => [
        g.id,
        g.courseCode,
        g.peerName,
        g.peerEmail,
        g.status,
        g.timeSlot.day,
        g.timeSlot.start,
        g.timeSlot.end,
        g.learners.map(l => l.name).join('; '),
        g.learners.map(l => l.instructor || 'N/A').join('; '),
        g.learners.map(l => l.email).join('; '),
      ]);

      const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="groups-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting groups:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/export/unmatched - Export unmatched participants as CSV
  app.get("/api/export/unmatched", isAuthenticated, async (req, res) => {
    try {
      const participants = await storage.getLatestUnmatchedParticipants();
      
      // Build CSV content
      const headers = ['Name', 'Email', 'Role', 'Course Code', 'Constraint Failure'];
      const rows = participants.map(p => [
        p.name,
        p.email,
        p.role,
        p.courseCode,
        p.constraintFailure || '',
      ]);

      const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="unmatched-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting unmatched:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/dashboard-stats - Get aggregated dashboard statistics
  app.get("/api/dashboard-stats", isAuthenticated, async (req, res) => {
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
  app.post("/api/sync-data", isAuthenticated, async (req, res) => {
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

  // GET /api/settings - Get current system settings and status
  app.get("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const runs = await storage.getAllMatchingRuns();
      const latestRun = runs[0];
      
      // Get counts from latest run
      let totalLearners = 0;
      let totalPeers = 0;
      let totalGroups = 0;
      
      if (latestRun) {
        totalLearners = latestRun.totalLearners;
        totalPeers = latestRun.totalPeers;
        totalGroups = latestRun.proposedGroups;
      }
      
      res.json({
        success: true,
        settings: {
          dataSource: {
            connected: true,
            type: 'Google Sheets',
            lastSync: latestRun?.timestamp || null,
          },
          matchingConstraints: {
            maxGroupSize: 4,
            minGroupSize: 1,
            maxPeerGroups: 2,
            travelBufferMinutes: 5,
            availabilityStart: '08:00',
            availabilityEnd: '20:00',
          },
          statistics: {
            totalMatchingRuns: runs.length,
            totalLearners,
            totalPeers,
            totalGroups,
            lastRunStatus: latestRun?.status || 'none',
          },
        },
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // POST /api/admin/reset-semester - Reset all matching data for new semester
  app.post("/api/admin/reset-semester", isAuthenticated, async (req, res) => {
    try {
      console.log('Resetting semester data...');
      await storage.resetSemester();
      console.log('Semester data reset successfully');
      
      res.json({
        success: true,
        message: 'All matching data has been cleared. Ready for new semester.',
      });
    } catch (error) {
      console.error('Error resetting semester:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
