import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface UnmatchedParticipant {
  id: string;
  name: string;
  email: string;
  role: 'Learner' | 'Peer';
  course: string;
  constraintFailure: string;
  suggestedAlternative?: string;
}

interface UnmatchedTableProps {
  participants: UnmatchedParticipant[];
  onManualPlace?: (id: string) => void;
}

export function UnmatchedTable({ participants, onManualPlace }: UnmatchedTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.constraintFailure.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4" data-testid="container-unmatched-table">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by name, course, or constraint..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
          data-testid="input-search-unmatched"
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Constraint Failure</TableHead>
              <TableHead>Suggested Alternative</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredParticipants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No unmatched participants found
                </TableCell>
              </TableRow>
            ) : (
              filteredParticipants.map((participant) => (
                <TableRow key={participant.id} data-testid={`row-participant-${participant.id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm" data-testid={`text-name-${participant.id}`}>
                        {participant.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{participant.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={participant.role === 'Peer' ? 'default' : 'secondary'}>
                      {participant.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{participant.course}</TableCell>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{participant.constraintFailure}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {participant.suggestedAlternative || (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onManualPlace?.(participant.id)}
                      data-testid={`button-place-${participant.id}`}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
