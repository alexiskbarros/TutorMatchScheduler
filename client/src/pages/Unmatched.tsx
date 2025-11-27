import { UnmatchedTable } from "@/components/UnmatchedTable";
import { ManualPlacementModal } from "@/components/ManualPlacementModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { UnmatchedParticipant } from "@shared/schema";
import { Download } from "lucide-react";
import { useState } from "react";

export default function Unmatched() {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<UnmatchedParticipant | null>(null);

  const { data: unmatchedData, isLoading } = useQuery<{ success: boolean; participants: UnmatchedParticipant[] }>({
    queryKey: ['/api/unmatched'],
  });

  const participants: UnmatchedParticipant[] = unmatchedData?.participants || [] as UnmatchedParticipant[];

  const addToGroupMutation = useMutation({
    mutationFn: async ({ groupId, participantId }: { groupId: string; participantId: string }) => {
      const response = await apiRequest('PATCH', `/api/groups/${groupId}`, { 
        addParticipantId: participantId 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/unmatched'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard-stats'] });
      toast({
        title: "Success",
        description: "Participant added to group successfully.",
      });
      setModalOpen(false);
      setSelectedParticipant(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add participant to group.",
        variant: "destructive",
      });
    },
  });

  const handleManualPlace = (id: string) => {
    const participant = participants.find(p => p.id === id);
    if (participant) {
      setSelectedParticipant(participant);
      setModalOpen(true);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    if (selectedParticipant) {
      addToGroupMutation.mutate({ groupId, participantId: selectedParticipant.id });
    }
  };

  const handleExportCSV = () => {
    window.open('/api/export/unmatched', '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Unmatched Report</h1>
          <p className="text-muted-foreground mt-1">
            Participants who could not be matched with constraint failure details
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={participants.length === 0}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Badge variant="destructive" className="text-sm" data-testid="badge-unmatched-count">
            {participants.length} Unmatched
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : participants.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No unmatched participants. All learners and peers have been successfully matched.</p>
        </div>
      ) : (
        <UnmatchedTable
          participants={participants as any[]}
          onManualPlace={handleManualPlace}
        />
      )}

      <ManualPlacementModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedParticipant(null);
        }}
        participantName={selectedParticipant?.name || ''}
        participantEmail={selectedParticipant?.email || ''}
        courseCode={selectedParticipant?.courseCode || ''}
        onSelectGroup={handleSelectGroup}
        isLoading={addToGroupMutation.isPending}
      />
    </div>
  );
}
