import { UnmatchedTable } from '../UnmatchedTable';

export default function UnmatchedTableExample() {
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
  ];

  const handleManualPlace = (id: string) => {
    console.log('Manual placement for:', id);
  };

  return (
    <div className="p-4">
      <UnmatchedTable
        participants={mockParticipants}
        onManualPlace={handleManualPlace}
      />
    </div>
  );
}
