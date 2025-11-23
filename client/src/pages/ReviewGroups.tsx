import { GroupCard } from "@/components/GroupCard";
import { EmailPreviewModal } from "@/components/EmailPreviewModal";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProposedGroup } from "@shared/schema";

function formatTimeSlot(group: ProposedGroup): string {
  const dayMap: Record<string, string> = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
  };
  
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  return `${dayMap[group.timeSlot.day]} ${formatTime(group.timeSlot.start)} - ${formatTime(group.timeSlot.end)}`;
}

export default function ReviewGroups() {
  const { toast } = useToast();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  
  const { data: groupsData, isLoading } = useQuery<{ success: boolean; groups: ProposedGroup[] }>({
    queryKey: ['/api/groups'],
  });

  const approveMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await apiRequest('POST', `/api/groups/${groupId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await apiRequest('POST', `/api/groups/${groupId}/reject`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      toast({
        title: "Group Rejected",
        description: "Participants have been re-queued for future matching runs.",
        variant: "destructive"
      });
    },
  });

  const groups = groupsData?.groups || [] as ProposedGroup[];

  const transformedGroups = groups.map((g: ProposedGroup) => ({
    groupId: g.id,
    course: `${g.courseCode} - ${g.instructor}`,
    timeSlot: formatTimeSlot(g),
    peer: {
      id: g.peerId,
      name: g.peerName,
      email: g.peerEmail,
    },
    learners: g.learners.map((l: { id: string; name: string; email: string }) => ({
      id: l.id,
      name: l.name,
      email: l.email,
    })),
  }));

  const handleApprove = (groupId: string) => {
    const group = transformedGroups.find(g => g.groupId === groupId);
    if (group) {
      setSelectedGroup(group);
      setEmailModalOpen(true);
    }
  };

  const handleReject = (groupId: string) => {
    rejectMutation.mutate(groupId);
  };

  const handleEmailConfirm = (sendCopy: boolean) => {
    console.log('Sending emails, send copy:', sendCopy);
    if (selectedGroup) {
      approveMutation.mutate(selectedGroup.groupId, {
        onSuccess: () => {
          setEmailModalOpen(false);
          toast({
            title: "Group Approved",
            description: `Email notifications sent to all ${selectedGroup.learners.length + 1} participants.`,
          });
        },
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
          {transformedGroups.length} Pending
        </Badge>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : transformedGroups.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground" data-testid="text-no-groups">
            No pending groups to review. Start a matching run to generate new groups.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {transformedGroups.map((group: any) => (
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
