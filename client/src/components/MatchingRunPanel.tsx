import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, RefreshCw, CheckCircle, Database, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface MatchingRunPanelProps {
  lastRun?: Date;
  dataSourceSynced?: Date;
  isRunning?: boolean;
  progress?: number;
  newRequestsOnly?: boolean;
  onStartRun: (newRequestsOnly: boolean) => void;
  onSyncData: () => void;
}

export function MatchingRunPanel({
  lastRun,
  dataSourceSynced,
  isRunning = false,
  progress = 0,
  newRequestsOnly = false,
  onStartRun,
  onSyncData
}: MatchingRunPanelProps) {
  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <Card data-testid="card-matching-run">
      <CardHeader>
        <CardTitle className="text-xl">Matching Run</CardTitle>
        <CardDescription>
          Trigger a new matching run to process current student and Learning Peer data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Last Run
            </p>
            <p className="text-sm font-mono" data-testid="text-last-run">
              {formatDate(lastRun)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Data Source Sync
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono" data-testid="text-data-sync">
                {formatDate(dataSourceSynced)}
              </p>
              {dataSourceSynced && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Synced
                </Badge>
              )}
            </div>
          </div>
        </div>

        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Processing...</p>
              <p className="text-sm text-muted-foreground">{progress}%</p>
            </div>
            <Progress value={progress} data-testid="progress-matching" />
          </div>
        )}

        <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
          <Checkbox
            id="new-requests-only"
            checked={newRequestsOnly}
            onCheckedChange={(checked) => {
              // This will be handled by parent component
            }}
            disabled={isRunning}
            data-testid="checkbox-new-requests-only"
          />
          <div className="flex-1">
            <Label htmlFor="new-requests-only" className="cursor-pointer font-medium">
              Match New Requests Only
            </Label>
            <p className="text-xs text-muted-foreground">
              Skip already-matched learners and process only new requests
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => onStartRun(newRequestsOnly)}
            disabled={isRunning}
            className="flex-1"
            data-testid="button-start-matching"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Start New Matching Run
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onSyncData}
            disabled={isRunning}
            data-testid="button-sync-data"
          >
            <Database className="h-4 w-4 mr-2" />
            Sync Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
