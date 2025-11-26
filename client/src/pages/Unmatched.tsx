import { UnmatchedTable } from "@/components/UnmatchedTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { UnmatchedParticipant } from "@shared/schema";
import { Download } from "lucide-react";

export default function Unmatched() {
  const { toast } = useToast();

  const { data: unmatchedData, isLoading } = useQuery<{ success: boolean; participants: UnmatchedParticipant[] }>({
    queryKey: ['/api/unmatched'],
  });

  const participants: UnmatchedParticipant[] = unmatchedData?.participants || [] as UnmatchedParticipant[];

  const handleManualPlace = (id: string) => {
    console.log('Manual placement for:', id);
    toast({
      title: "Manual Placement",
      description: "This feature allows administrators to manually assign participants to groups.",
    });
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
    </div>
  );
}
