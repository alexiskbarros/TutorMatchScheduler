import { MatchingRunPanel } from '../MatchingRunPanel';
import { useState } from 'react';

export default function MatchingRunPanelExample() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleStartRun = () => {
    console.log('Start matching run');
    setIsRunning(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRunning(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleSyncData = () => {
    console.log('Sync Google Sheets data');
  };

  return (
    <div className="p-4 max-w-3xl">
      <MatchingRunPanel
        lastRun={new Date('2024-01-15T14:30:00')}
        dataSourceSynced={new Date('2024-01-17T09:15:00')}
        isRunning={isRunning}
        progress={progress}
        onStartRun={handleStartRun}
        onSyncData={handleSyncData}
      />
    </div>
  );
}
