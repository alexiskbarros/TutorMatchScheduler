import { StatCard } from "@/components/StatCard";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, CheckCircle, PlayCircle, FileText } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const mockActivities = [
    {
      id: 'a1',
      type: 'approval' as const,
      description: 'Approved group for MATH 1505 (3 learners)',
      timestamp: new Date(Date.now() - 1000 * 60 * 5)
    },
    {
      id: 'a2',
      type: 'approval' as const,
      description: 'Approved group for COMP 1501 (2 learners)',
      timestamp: new Date(Date.now() - 1000 * 60 * 12)
    },
    {
      id: 'a3',
      type: 'rejection' as const,
      description: 'Rejected and re-queued group for PHYS 2201',
      timestamp: new Date(Date.now() - 1000 * 60 * 45)
    },
    {
      id: 'a4',
      type: 'run' as const,
      description: 'Started matching run for Fall 2024',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2)
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of matching activity and system status
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Learners"
          value={342}
          subtitle="Active this semester"
          icon={GraduationCap}
          trend={{ value: "12% from last semester", positive: true }}
        />
        <StatCard
          title="Total Peers"
          value={89}
          subtitle="Available tutors"
          icon={Users}
        />
        <StatCard
          title="Matched This Semester"
          value={287}
          subtitle="84% match rate"
          icon={CheckCircle}
          trend={{ value: "8% from last semester", positive: true }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ActivityTimeline activities={mockActivities} />
        
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
                Review Proposed Groups
              </Button>
            </Link>
            <Link href="/unmatched">
              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-unmatched">
                <FileText className="h-4 w-4 mr-2" />
                View Unmatched Report
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
