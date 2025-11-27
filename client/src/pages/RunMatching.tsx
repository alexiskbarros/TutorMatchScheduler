import { MatchingRunPanel } from "@/components/MatchingRunPanel";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function RunMatching() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [newRequestsOnly, setNewRequestsOnly] = useState(false);
  const [dataSourceSynced, setDataSourceSynced] = useState<Date | undefined>(undefined);
  const { toast } = useToast();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: latestRunData } = useQuery<{ success: boolean; runs: any[] }>({
    queryKey: ['/api/matching-runs'],
  });

  const latestRun = latestRunData?.runs?.[0];
  const lastRun = latestRun ? new Date(latestRun.timestamp) : undefined;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  const startRunMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/matching-runs', {
        newRequestsOnly,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log('Matching run started:', data);
      toast({
        title: "Matching Run Started",
        description: "Processing student and Learning Peer data from Google Sheets...",
      });
      
      const runId = data.runId;
      
      // Clear any existing polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
      
      const cleanupPolling = () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        if (pollTimeoutRef.current) {
          clearTimeout(pollTimeoutRef.current);
          pollTimeoutRef.current = null;
        }
      };
      
      let failureCount = 0;
      const MAX_FAILURES = 3;
      
      pollIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/matching-runs/${runId}`);
          
          if (!response.ok) {
            failureCount++;
            console.error(`Failed to fetch run status (${failureCount}/${MAX_FAILURES}):`, response.statusText);
            
            if (failureCount >= MAX_FAILURES) {
              cleanupPolling();
              setIsRunning(false);
              setProgress(0);
              toast({
                title: "Error",
                description: "Failed to check matching run status. Please refresh the page.",
                variant: "destructive",
              });
            }
            return;
          }
          
          // Reset failure count on success
          failureCount = 0;
          
          const result = await response.json();
          
          if (result.success && result.run) {
            if (result.run.status === 'completed') {
              cleanupPolling();
              setIsRunning(false);
              setProgress(100);
              queryClient.invalidateQueries({ queryKey: ['/api/matching-runs'] });
              queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
              queryClient.invalidateQueries({ queryKey: ['/api/unmatched'] });
              toast({
                title: "Matching Complete",
                description: `Successfully matched ${result.run.matchedLearners} learners into ${result.run.proposedGroups} groups.`,
              });
            } else if (result.run.status === 'failed') {
              cleanupPolling();
              setIsRunning(false);
              setProgress(0);
              toast({
                title: "Matching Failed",
                description: "An error occurred during the matching process.",
                variant: "destructive",
              });
            } else {
              setProgress((prev) => Math.min(prev + 15, 90));
            }
          }
        } catch (error) {
          failureCount++;
          console.error(`Error checking progress (${failureCount}/${MAX_FAILURES}):`, error);
          
          if (failureCount >= MAX_FAILURES) {
            cleanupPolling();
            setIsRunning(false);
            setProgress(0);
            toast({
              title: "Error",
              description: "Failed to check matching run status. Please refresh the page.",
              variant: "destructive",
            });
          }
        }
      }, 1000);
      
      pollTimeoutRef.current = setTimeout(() => {
        cleanupPolling();
        setIsRunning(false);
        setProgress(0);
        toast({
          title: "Timeout",
          description: "Matching run is taking longer than expected. Please check the status manually.",
          variant: "destructive",
        });
      }, 60000);
    },
    onError: (error) => {
      console.error('Error starting matching run:', error);
      setIsRunning(false);
      setProgress(0);
      toast({
        title: "Error",
        description: "Failed to start matching run. Please try again.",
        variant: "destructive",
      });
    },
  });

  const syncDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/sync-data');
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log('Data synced:', data);
      setDataSourceSynced(new Date(data.timestamp));
      toast({
        title: "Data Synced",
        description: `Successfully synced ${data.data.requests} requests, ${data.data.peers} peers.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/matching-runs'] });
    },
    onError: (error) => {
      console.error('Error syncing data:', error);
      setProgress(0);
      setIsRunning(false);
      toast({
        title: "Error",
        description: "Failed to sync data from Google Sheets.",
        variant: "destructive",
      });
    },
  });

  const handleStartRun = (newReqOnly: boolean) => {
    setNewRequestsOnly(newReqOnly);
    setIsRunning(true);
    setProgress(0);
    // Use newReqOnly directly instead of state
    const response = apiRequest('POST', '/api/matching-runs', {
      newRequestsOnly: newReqOnly,
    }).then(r => r.json());
    response.then((data: any) => {
      console.log('Matching run started:', data);
      toast({
        title: "Matching Run Started",
        description: newReqOnly ? 
          "Processing only new requests (skipping already-matched learners)..." :
          "Processing all student and Learning Peer data from Google Sheets...",
      });
      
      const runId = data.runId;
      
      // Clear any existing polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
      
      const cleanupPolling = () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        if (pollTimeoutRef.current) {
          clearTimeout(pollTimeoutRef.current);
          pollTimeoutRef.current = null;
        }
      };
      
      let failureCount = 0;
      const MAX_FAILURES = 3;
      
      pollIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/matching-runs/${runId}`);
          
          if (!response.ok) {
            failureCount++;
            console.error(`Failed to fetch run status (${failureCount}/${MAX_FAILURES}):`, response.statusText);
            
            if (failureCount >= MAX_FAILURES) {
              cleanupPolling();
              setIsRunning(false);
              setProgress(0);
              toast({
                title: "Error",
                description: "Failed to check matching run status. Please refresh the page.",
                variant: "destructive",
              });
            }
            return;
          }
          
          // Reset failure count on success
          failureCount = 0;
          
          const result = await response.json();
          
          if (result.success && result.run) {
            if (result.run.status === 'completed') {
              cleanupPolling();
              setIsRunning(false);
              setProgress(100);
              queryClient.invalidateQueries({ queryKey: ['/api/matching-runs'] });
              queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
              queryClient.invalidateQueries({ queryKey: ['/api/unmatched'] });
              toast({
                title: "Matching Complete",
                description: `Successfully matched ${result.run.matchedLearners} learners into ${result.run.proposedGroups} groups.`,
              });
            } else if (result.run.status === 'failed') {
              cleanupPolling();
              setIsRunning(false);
              setProgress(0);
              toast({
                title: "Matching Failed",
                description: "An error occurred during the matching process.",
                variant: "destructive",
              });
            } else {
              setProgress((prev) => Math.min(prev + 15, 90));
            }
          }
        } catch (error) {
          failureCount++;
          console.error(`Error checking progress (${failureCount}/${MAX_FAILURES}):`, error);
          
          if (failureCount >= MAX_FAILURES) {
            cleanupPolling();
            setIsRunning(false);
            setProgress(0);
            toast({
              title: "Error",
              description: "Failed to check matching run status. Please refresh the page.",
              variant: "destructive",
            });
          }
        }
      }, 1000);
      
      pollTimeoutRef.current = setTimeout(() => {
        cleanupPolling();
        setIsRunning(false);
        setProgress(0);
        toast({
          title: "Timeout",
          description: "Matching run is taking longer than expected. Please check the status manually.",
          variant: "destructive",
        });
      }, 60000);
    }).catch((error) => {
      console.error('Error starting matching run:', error);
      setIsRunning(false);
      setProgress(0);
      toast({
        title: "Error",
        description: "Failed to start matching run. Please try again.",
        variant: "destructive",
      });
    });
  };

  const handleSyncData = () => {
    syncDataMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Run Matching</h1>
        <p className="text-muted-foreground mt-1">
          Initiate a new matching run to process current data
        </p>
      </div>

      <div className="max-w-3xl">
        <MatchingRunPanel
          lastRun={lastRun}
          dataSourceSynced={dataSourceSynced}
          isRunning={isRunning}
          progress={progress}
          newRequestsOnly={newRequestsOnly}
          onNewRequestsOnlyChange={setNewRequestsOnly}
          onStartRun={handleStartRun}
          onSyncData={handleSyncData}
        />
      </div>
    </div>
  );
}
