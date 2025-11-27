import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Database, Clock, Users, GraduationCap, Layers, Settings2 } from "lucide-react";

interface SettingsResponse {
  success: boolean;
  settings: {
    dataSource: {
      connected: boolean;
      type: string;
      lastSync: string | null;
    };
    matchingConstraints: {
      maxGroupSize: number;
      minGroupSize: number;
      maxPeerGroups: number;
      travelBufferMinutes: number;
      availabilityStart: string;
      availabilityEnd: string;
    };
    statistics: {
      totalMatchingRuns: number;
      totalLearners: number;
      totalPeers: number;
      totalGroups: number;
      lastRunStatus: string;
    };
  };
}

export default function Settings() {
  const { data, isLoading } = useQuery<SettingsResponse>({
    queryKey: ['/api/settings'],
  });

  const settings = data?.settings;

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Settings</h1>
        <p className="text-muted-foreground mt-1">
          System configuration and connection status
        </p>
      </div>

      {isLoading ? (
        <div className="max-w-3xl space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-32" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="max-w-3xl space-y-6">
          <Card data-testid="card-data-source">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Data Source</CardTitle>
                </div>
                <Badge variant={settings?.dataSource.connected ? "default" : "destructive"}>
                  {settings?.dataSource.connected ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </>
                  ) : (
                    'Disconnected'
                  )}
                </Badge>
              </div>
              <CardDescription>
                Connection to participant data source
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Source Type</p>
                  <p className="text-sm">{settings?.dataSource.type || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Sync</p>
                  <p className="text-sm">{formatDate(settings?.dataSource.lastSync || null)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Data source connection is managed through Replit Connectors. Contact your administrator to modify connection settings.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-matching-constraints">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Matching Constraints</CardTitle>
              </div>
              <CardDescription>
                Algorithm parameters for group matching
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Group Size</p>
                  <p className="text-lg font-semibold">
                    {settings?.matchingConstraints.minGroupSize} - {settings?.matchingConstraints.maxGroupSize} learners
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Max Peer Groups</p>
                  <p className="text-lg font-semibold">{settings?.matchingConstraints.maxPeerGroups} groups</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Travel Buffer</p>
                  <p className="text-lg font-semibold">{settings?.matchingConstraints.travelBufferMinutes} minutes</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Availability Window</p>
                  <p className="text-lg font-semibold">
                    {formatTime(settings?.matchingConstraints.availabilityStart || '08:00')} - {formatTime(settings?.matchingConstraints.availabilityEnd || '20:00')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-statistics">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-muted-foreground" />
                <CardTitle>System Statistics</CardTitle>
              </div>
              <CardDescription>
                Cumulative usage and performance data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{settings?.statistics.totalMatchingRuns || 0}</p>
                    <p className="text-xs text-muted-foreground">Matching Runs</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <GraduationCap className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{settings?.statistics.totalLearners || 0}</p>
                    <p className="text-xs text-muted-foreground">Learners (Latest)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Users className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{settings?.statistics.totalPeers || 0}</p>
                    <p className="text-xs text-muted-foreground">Learning Peers (Latest)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Layers className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{settings?.statistics.totalGroups || 0}</p>
                    <p className="text-xs text-muted-foreground">Groups (Latest)</p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Last Run Status</p>
                <Badge variant={settings?.statistics.lastRunStatus === 'completed' ? 'default' : 'secondary'}>
                  {settings?.statistics.lastRunStatus === 'completed' ? 'Completed' : 
                   settings?.statistics.lastRunStatus === 'running' ? 'Running' :
                   settings?.statistics.lastRunStatus === 'failed' ? 'Failed' : 'No runs yet'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-about">
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>
                System information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <p className="text-sm text-muted-foreground">Application</p>
                <p className="text-sm font-medium">Semester Volunteer Matching System</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-muted-foreground">Organization</p>
                <p className="text-sm font-medium">Mount Royal University</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="text-sm font-medium">1.0.0</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
