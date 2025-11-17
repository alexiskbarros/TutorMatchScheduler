import { MatchingRunPanel } from "@/components/MatchingRunPanel";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function RunMatching() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastRun] = useState(new Date('2024-01-15T14:30:00'));
  const [dataSourceSynced, setDataSourceSynced] = useState(new Date('2024-01-17T09:15:00'));
  const { toast } = useToast();

  const handleStartRun = () => {
    console.log('Starting matching run');
    setIsRunning(true);
    setProgress(0);
    
    toast({
      title: "Matching Run Started",
      description: "Processing student and tutor data...",
    });
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRunning(false);
          toast({
            title: "Matching Complete",
            description: "Successfully matched 45 new groups. Review proposed matches.",
          });
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleSyncData = () => {
    console.log('Syncing Google Sheets data');
    setDataSourceSynced(new Date());
    toast({
      title: "Data Synced",
      description: "Successfully synced data from Google Sheets.",
    });
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
