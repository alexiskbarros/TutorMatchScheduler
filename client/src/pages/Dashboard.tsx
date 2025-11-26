import { StatCard } from "@/components/StatCard";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, CheckCircle, PlayCircle, FileText, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface DashboardStats {
  totalLearners: number;
  totalPeers: number;
  matchedLearners: number;
  matchRate: number;
  pendingGroups: number;
  approvedGroups: number;
  unmatchedCount: number;
}

interface RecentActivity {
  id: string;
  type: 'run' | 'approval' | 'rejection';
  description: string;
  timestamp: string;
  status: string;
}

interface DashboardResponse {
  success: boolean;
  stats: DashboardStats;
  recentActivity: RecentActivity[];
  lastRunTimestamp?: string;
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardResponse>({
    queryKey: ['/api/dashboard-stats'],
    refetchInterval: 30000,
  });

  const stats = data?.stats || {
    totalLearners: 0,
    totalPeers: 0,
    matchedLearners: 0,
    matchRate: 0,
    pendingGroups: 0,
    approvedGroups: 0,
    unmatchedCount: 0,
  };

  const activities = (data?.recentActivity || []).map(activity => ({
    id: activity.id,
    type: activity.type,
    description: activity.description,
    timestamp: new Date(activity.timestamp),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of matching activity and system status
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Learners"
            value={stats.totalLearners}
            subtitle="Requesting tutoring"
            icon={GraduationCap}
          />
          <StatCard
            title="Total Peers"
            value={stats.totalPeers}
            subtitle="Available tutors"
            icon={Users}
          />
          <StatCard
            title="Matched"
            value={stats.matchedLearners}
            subtitle={`${stats.matchRate}% match rate`}
            icon={CheckCircle}
          />
          <StatCard
            title="Unmatched"
            value={stats.unmatchedCount}
            subtitle="Need attention"
            icon={AlertCircle}
            variant={stats.unmatchedCount > 0 ? "warning" : "default"}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Pending Review"
          value={stats.pendingGroups}
          subtitle="Groups awaiting approval"
          icon={FileText}
        />
        <StatCard
          title="Approved Groups"
          value={stats.approvedGroups}
          subtitle="Ready for notifications"
          icon={CheckCircle}
        />
        <Card data-testid="card-last-run">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Run</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold" data-testid="text-last-run">
              {data?.lastRunTimestamp 
                ? new Date(data.lastRunTimestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'No runs yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ActivityTimeline activities={activities} />
        
        <Card data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/run-matching">
              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-run-matching">
                <PlayCircle className="h-4 w-4 mr-2" />
                Start New Matching Run
              </Button>
            </Link>
            <Link href="/review-groups">
              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-review-groups">
                <CheckCircle className="h-4 w-4 mr-2" />
                Review Proposed Groups ({stats.pendingGroups} pending)
              </Button>
            </Link>
            <Link href="/unmatched">
              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-unmatched">
                <AlertCircle className="h-4 w-4 mr-2" />
                View Unmatched Report ({stats.unmatchedCount} participants)
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
