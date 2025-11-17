import { StatCard } from '../StatCard';
import { Users, GraduationCap, CheckCircle } from 'lucide-react';

export default function StatCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
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
  );
}
