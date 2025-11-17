import { UnmatchedTable } from "@/components/UnmatchedTable";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function Unmatched() {
  const { toast } = useToast();

  const mockParticipants = [
    {
      id: 'u1',
      name: 'Jessica Williams',
      email: 'jessica.williams@mtroyal.ca',
      role: 'Learner' as const,
      course: 'MATH 1505',
      constraintFailure: 'Instructor Match Required - No peer available with same instructor',
      suggestedAlternative: 'Tue 3:00 PM with different instructor'
    },
    {
      id: 'u2',
      name: 'Ryan Thompson',
      email: 'ryan.thompson@mtroyal.ca',
      role: 'Learner' as const,
      course: 'COMP 1501',
      constraintFailure: 'No available time slots - Schedule conflicts with all peers',
    },
    {
      id: 'u3',
      name: 'Maria Garcia',
      email: 'maria.garcia@mtroyal.ca',
      role: 'Peer' as const,
      course: 'PHYS 2201',
      constraintFailure: 'Maximum group capacity reached (2 groups)',
    },
    {
      id: 'u4',
      name: 'Kevin Lee',
      email: 'kevin.lee@mtroyal.ca',
      role: 'Learner' as const,
      course: 'CHEM 2101',
      constraintFailure: 'Travel buffer violation - Cannot fit 1-hour session between classes',
      suggestedAlternative: 'Thu 4:00 PM (requires extending availability window)'
    },
    {
      id: 'u5',
      name: 'Amanda Roberts',
      email: 'amanda.roberts@mtroyal.ca',
      role: 'Learner' as const,
      course: 'ECON 1101',
      constraintFailure: 'No peers available for this course',
    },
  ];

  const handleManualPlace = (id: string) => {
    console.log('Manual placement for:', id);
    toast({
      title: "Manual Placement",
      description: "This feature allows administrators to manually assign participants to groups.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Unmatched Report</h1>
          <p className="text-muted-foreground mt-1">
            Participants who could not be matched with constraint failure details
          </p>
        </div>
        <Badge variant="destructive" className="text-sm" data-testid="badge-unmatched-count">
          {mockParticipants.length} Unmatched
        </Badge>
      </div>

      <UnmatchedTable
        participants={mockParticipants}
        onManualPlace={handleManualPlace}
      />
    </div>
  );
}
