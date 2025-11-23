import { MatchingRunPanel } from "@/components/MatchingRunPanel";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function RunMatching() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastRun] = useState(new Date('2024-01-15T14:30:00'));
  const [dataSourceSynced, setDataSourceSynced] = useState(new Date('2024-01-17T09:15:00'));
  const { toast } = useToast();

  const startRunMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/matching-runs');
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log('Matching run started:', data);
      toast({
        title: "Matching Run Started",
        description: "Processing student and tutor data from Google Sheets...",
      });
      
      const runId = data.runId;
      
      const checkProgress = setInterval(async () => {
        try {
          const response = await fetch(`/api/matching-runs/${runId}`);
          const result = await response.json();
          
          if (result.success && result.run) {
            if (result.run.status === 'completed') {
              clearInterval(checkProgress);
              setIsRunning(false);
              setProgress(100);
              toast({
                title: "Matching Complete",
                description: `Successfully matched ${result.run.matchedLearners} learners into ${result.run.proposedGroups} groups.`,
              });
            } else if (result.run.status === 'failed') {
              clearInterval(checkProgress);
              setIsRunning(false);
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
          console.error('Error checking progress:', error);
        }
      }, 1000);
      
      setTimeout(() => {
        clearInterval(checkProgress);
      }, 60000);
    },
    onError: (error) => {
      console.error('Error starting matching run:', error);
      setIsRunning(false);
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
      setDataSourceSynced(new Date());
      toast({
        title: "Data Synced",
        description: `Successfully synced ${data.data.requests} requests, ${data.data.peers} peers.`,
      });
    },
    onError: (error) => {
      console.error('Error syncing data:', error);
      toast({
        title: "Error",
        description: "Failed to sync data from Google Sheets.",
        variant: "destructive",
      });
    },
  });

  const handleStartRun = () => {
    setIsRunning(true);
    setProgress(0);
    startRunMutation.mutate();
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
          onStartRun={handleStartRun}
          onSyncData={handleSyncData}
        />
      </div>
    </div>
  );
}
