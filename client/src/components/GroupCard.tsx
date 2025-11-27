import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock } from "lucide-react";

interface Learner {
  id: string;
  name: string;
  email: string;
  instructor?: string;
}

interface Peer {
  id: string;
  name: string;
  email: string;
}

interface GroupCardProps {
  groupId: string;
  course: string;
  courseCode: string;
  timeSlot: string;
  learners: Learner[];
  peer: Peer;
  onApprove: (groupId: string) => void;
  onReject: (groupId: string) => void;
  selected?: boolean;
  onSelectChange?: (groupId: string, selected: boolean) => void;
  selectionMode?: boolean;
  peerGroupNumber?: number;
}

export function GroupCard({ groupId, course, courseCode, timeSlot, learners, peer, onApprove, onReject, selected = false, onSelectChange, selectionMode = false, peerGroupNumber = 1 }: GroupCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card data-testid={`card-group-${groupId}`} className={selected ? 'ring-2 ring-primary' : ''}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-3">
          {selectionMode && (
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelectChange?.(groupId, !!checked)}
              data-testid={`checkbox-select-${groupId}`}
            />
          )}
          <h3 className="text-base font-semibold" data-testid={`text-course-${groupId}`}>{peer.name} - {courseCode} - Group {peerGroupNumber}</h3>
        </div>
        <Badge variant="secondary" className="text-xs" data-testid={`badge-timeslot-${groupId}`}>
          <Clock className="h-3 w-3 mr-1" />
          {timeSlot}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Learning Peer
          </p>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getInitials(peer.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium" data-testid={`text-peer-name-${groupId}`}>{peer.name}</p>
              <p className="text-xs text-muted-foreground">{peer.email}</p>
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Learners ({learners.length})
          </p>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="px-3 py-2 text-left font-medium text-xs">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-xs">Instructor</th>
                </tr>
              </thead>
              <tbody>
                {learners.map((learner, idx) => (
                  <tr key={learner.id} className={idx !== learners.length - 1 ? 'border-b' : ''}>
                    <td className="px-3 py-2">
                      <p className="text-sm" data-testid={`text-learner-name-${learner.id}`}>{learner.name}</p>
                      <p className="text-xs text-muted-foreground">{learner.email}</p>
                    </td>
                    <td className="px-3 py-2">
                      {learner.instructor ? (
                        <p className="text-sm" data-testid={`text-instructor-${learner.id}`}>{learner.instructor}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="default"
          className="flex-1"
          onClick={() => onApprove(groupId)}
          data-testid={`button-approve-${groupId}`}
        >
          Approve
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={() => onReject(groupId)}
          data-testid={`button-reject-${groupId}`}
        >
          Reject & Re-queue
        </Button>
      </CardFooter>
    </Card>
  );
}
