import { ActivityTimeline } from '../ActivityTimeline';

export default function ActivityTimelineExample() {
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
    {
      id: 'a5',
      type: 'sync' as const,
      description: 'Synced data from Google Sheets',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3)
    }
  ];

  return (
    <div className="p-4 max-w-md">
      <ActivityTimeline activities={mockActivities} />
    </div>
  );
}
