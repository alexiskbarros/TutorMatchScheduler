import { GroupCard } from '../GroupCard';

export default function GroupCardExample() {
  const handleApprove = (groupId: string) => {
    console.log('Approve group:', groupId);
  };

  const handleReject = (groupId: string) => {
    console.log('Reject group:', groupId);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 max-w-5xl">
      <GroupCard
        groupId="group-1"
        course="MATH 1505 - Calculus I"
        timeSlot="Mon 2:00 PM - 3:00 PM"
        peer={{
          id: "peer-1",
          name: "Sarah Johnson",
          email: "sarah.johnson@mtroyal.ca"
        }}
        learners={[
          { id: "l1", name: "Alex Chen", email: "alex.chen@mtroyal.ca" },
          { id: "l2", name: "Emma Wilson", email: "emma.wilson@mtroyal.ca" },
          { id: "l3", name: "Marcus Brown", email: "marcus.brown@mtroyal.ca" }
        ]}
        onApprove={handleApprove}
        onReject={handleReject}
      />
      <GroupCard
        groupId="group-2"
        course="COMP 1501 - Introduction to Programming"
        timeSlot="Wed 10:00 AM - 11:00 AM"
        peer={{
          id: "peer-2",
          name: "David Martinez",
          email: "david.martinez@mtroyal.ca"
        }}
        learners={[
          { id: "l4", name: "Sophie Taylor", email: "sophie.taylor@mtroyal.ca" },
          { id: "l5", name: "James Anderson", email: "james.anderson@mtroyal.ca" }
        ]}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
