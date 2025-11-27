import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { ProposedGroup } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ManualPlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantName: string;
  participantEmail: string;
  courseCode: string;
  onSelectGroup: (groupId: string) => void;
  isLoading?: boolean;
}

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

export function ManualPlacementModal({
  isOpen,
  onClose,
  participantName,
  participantEmail,
  courseCode,
  onSelectGroup,
  isLoading,
}: ManualPlacementModalProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const { data: groupsData } = useQuery<{ success: boolean; groups: ProposedGroup[] }>({
    queryKey: ['/api/groups'],
    enabled: isOpen,
  });

  // Filter groups by course code - show both pending and approved
  const availableGroups = (groupsData?.groups || []).filter(
    (group) => group.courseCode === courseCode
  );

  const handleSelectGroup = () => {
    if (selectedGroupId) {
      onSelectGroup(selectedGroupId);
      setSelectedGroupId(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="modal-manual-placement">
        <DialogHeader>
          <DialogTitle>Manually Add to Group</DialogTitle>
          <DialogDescription>
            Add {participantName} to an existing group
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <p className="text-sm">
              <span className="font-medium">Participant:</span> {participantName} ({participantEmail})
            </p>
            <p className="text-sm">
              <span className="font-medium">Course:</span> {courseCode}
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-3">Available Groups for {courseCode}</h3>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading groups...
              </div>
            ) : availableGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No groups available for {courseCode}
              </div>
            ) : (
              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <div className="space-y-2" data-testid="list-available-groups">
                  {availableGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                        selectedGroupId === group.id
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                      data-testid={`button-group-${group.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{group.peerName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimeSlot(group)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {group.learners.length} learner{group.learners.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Badge 
                          variant={group.status === 'approved' ? 'default' : 'secondary'}
                          data-testid={`badge-status-${group.id}`}
                        >
                          {group.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSelectGroup}
              disabled={!selectedGroupId}
              data-testid="button-confirm-placement"
            >
              Add to Group
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
