import { GroupCard } from "@/components/GroupCard";
import { EmailPreviewModal } from "@/components/EmailPreviewModal";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function ReviewGroups() {
  const { toast } = useToast();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  
  const [groups, setGroups] = useState([
    {
      groupId: "group-1",
      course: "MATH 1505 - Calculus I",
      timeSlot: "Mon 2:00 PM - 3:00 PM",
      peer: {
        id: "peer-1",
        name: "Sarah Johnson",
        email: "sarah.johnson@mtroyal.ca"
      },
      learners: [
        { id: "l1", name: "Alex Chen", email: "alex.chen@mtroyal.ca" },
        { id: "l2", name: "Emma Wilson", email: "emma.wilson@mtroyal.ca" },
        { id: "l3", name: "Marcus Brown", email: "marcus.brown@mtroyal.ca" }
      ]
    },
    {
      groupId: "group-2",
      course: "COMP 1501 - Introduction to Programming",
      timeSlot: "Wed 10:00 AM - 11:00 AM",
      peer: {
        id: "peer-2",
        name: "David Martinez",
        email: "david.martinez@mtroyal.ca"
      },
      learners: [
        { id: "l4", name: "Sophie Taylor", email: "sophie.taylor@mtroyal.ca" },
        { id: "l5", name: "James Anderson", email: "james.anderson@mtroyal.ca" }
      ]
    },
    {
      groupId: "group-3",
      course: "PHYS 2201 - University Physics",
      timeSlot: "Fri 1:00 PM - 2:00 PM",
      peer: {
        id: "peer-3",
        name: "Lisa Wang",
        email: "lisa.wang@mtroyal.ca"
      },
      learners: [
        { id: "l6", name: "Daniel Kim", email: "daniel.kim@mtroyal.ca" },
        { id: "l7", name: "Olivia Davis", email: "olivia.davis@mtroyal.ca" },
        { id: "l8", name: "Noah Rodriguez", email: "noah.rodriguez@mtroyal.ca" },
        { id: "l9", name: "Ava Martinez", email: "ava.martinez@mtroyal.ca" }
      ]
    },
  ]);

  const handleApprove = (groupId: string) => {
    const group = groups.find(g => g.groupId === groupId);
    if (group) {
      setSelectedGroup(group);
      setEmailModalOpen(true);
    }
  };

  const handleReject = (groupId: string) => {
    console.log('Rejecting group:', groupId);
    setGroups(groups.filter(g => g.groupId !== groupId));
    toast({
      title: "Group Rejected",
      description: "Participants have been re-queued for future matching runs.",
      variant: "destructive"
    });
  };

  const handleEmailConfirm = (sendCopy: boolean) => {
    console.log('Sending emails, send copy:', sendCopy);
    if (selectedGroup) {
      setGroups(groups.filter(g => g.groupId !== selectedGroup.groupId));
      toast({
        title: "Group Approved",
        description: `Email notifications sent to all ${selectedGroup.learners.length + 1} participants.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Review Groups</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve proposed group matches
          </p>
        </div>
        <Badge variant="secondary" className="text-sm" data-testid="badge-pending-count">
          {groups.length} Pending
        </Badge>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground" data-testid="text-no-groups">
            No pending groups to review. Start a matching run to generate new groups.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <GroupCard
              key={group.groupId}
              {...group}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {selectedGroup && (
        <EmailPreviewModal
          open={emailModalOpen}
          onOpenChange={setEmailModalOpen}
          recipients={[
            { ...selectedGroup.peer, role: 'Peer' as const },
            ...selectedGroup.learners.map((l: any) => ({ ...l, role: 'Learner' as const }))
          ]}
          course={selectedGroup.course}
          timeSlot={selectedGroup.timeSlot}
          onConfirm={handleEmailConfirm}
        />
      )}
    </div>
  );
}
