import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, PlayCircle, XCircle, Database } from "lucide-react";

interface Activity {
  id: string;
  type: 'run' | 'approval' | 'rejection' | 'sync';
  description: string;
  timestamp: Date;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'run':
        return <PlayCircle className="h-4 w-4 text-primary" />;
      case 'approval':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejection':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'sync':
        return <Database className="h-4 w-4 text-blue-600" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  return (
    <Card data-testid="card-activity-timeline">
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity
            </p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex gap-3" data-testid={`activity-${activity.id}`}>
                <div className="mt-0.5">
                  {getIcon(activity.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
