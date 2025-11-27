import { GroupCard } from "@/components/GroupCard";
import { EmailPreviewModal } from "@/components/EmailPreviewModal";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProposedGroup } from "@shared/schema";
import { Download, CheckCircle } from "lucide-react";

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
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
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
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard-stats'] });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (groupIds: string[]) => {
      const response = await apiRequest('POST', '/api/groups/bulk-approve', { groupIds });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard-stats'] });
      setSelectedIds(new Set());
      setSelectionMode(false);
      toast({
        title: "Groups Approved",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve groups. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await apiRequest('POST', `/api/groups/${groupId}/reject`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard-stats'] });
      toast({
        title: "Group Rejected",
        description: "Participants have been re-queued for future matching runs.",
        variant: "destructive"
      });
    },
  });

  const groups = groupsData?.groups || [] as ProposedGroup[];

  // Calculate group number for each peer
  const peerGroupCounts = new Map<string, number>();
  const transformedGroups = groups.map((g: ProposedGroup) => {
    const peerKey = g.peerId;
    const groupNumber = (peerGroupCounts.get(peerKey) || 0) + 1;
    peerGroupCounts.set(peerKey, groupNumber);
    
    return {
      groupId: g.id,
      courseCode: g.courseCode,
      course: `${g.courseCode} - ${g.instructor}`,
      timeSlot: formatTimeSlot(g),
      peer: {
        id: g.peerId,
        name: g.peerName,
        email: g.peerEmail,
      },
      learners: g.learners.map((l: any) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        instructor: l.instructor,
      })),
      peerGroupNumber: groupNumber,
    };
  });

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

  const handleSelectChange = (groupId: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(groupId);
      } else {
        next.delete(groupId);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(transformedGroups.map(g => g.groupId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.size > 0) {
      bulkApproveMutation.mutate(Array.from(selectedIds));
    }
  };

  const handleExportCSV = () => {
    window.open('/api/export/groups', '_blank');
  };

  const allSelected = transformedGroups.length > 0 && selectedIds.size === transformedGroups.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < transformedGroups.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Review Groups</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve proposed group matches
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Badge variant="secondary" className="text-sm" data-testid="badge-pending-count">
            {transformedGroups.length} Pending
          </Badge>
        </div>
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
        <>
          <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                data-testid="checkbox-select-all"
                ref={(ref) => {
                  if (ref && someSelected) {
                    (ref as unknown as HTMLButtonElement).dataset.state = 'indeterminate';
                  }
                }}
              />
              <span className="text-sm font-medium">
                {selectionMode ? (
                  selectedIds.size > 0 
                    ? `${selectedIds.size} of ${transformedGroups.length} selected`
                    : 'Select groups for bulk actions'
                ) : (
                  'Select groups for bulk actions'
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  onClick={handleBulkApprove}
                  disabled={bulkApproveMutation.isPending}
                  data-testid="button-bulk-approve"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve {selectedIds.size} Groups
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  if (selectionMode) {
                    setSelectedIds(new Set());
                  }
                }}
                data-testid="button-toggle-selection"
              >
                {selectionMode ? 'Cancel Selection' : 'Bulk Select'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {transformedGroups.map((group: any) => (
              <GroupCard
                key={group.groupId}
                groupId={group.groupId}
                course={group.course}
                courseCode={group.courseCode}
                timeSlot={group.timeSlot}
                peer={group.peer}
                learners={group.learners}
                onApprove={handleApprove}
                onReject={handleReject}
                selected={selectedIds.has(group.groupId)}
                onSelectChange={handleSelectChange}
                selectionMode={selectionMode}
                peerGroupNumber={group.peerGroupNumber}
              />
            ))}
          </div>
        </>
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
