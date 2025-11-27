import { GroupCard } from "@/components/GroupCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { ProposedGroup } from "@shared/schema";
import { Users, Mail } from "lucide-react";

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

function getGroupEmailLink(group: any): string {
  const emails: string[] = [];
  
  // Add peer email
  if (group.peerEmail) {
    emails.push(group.peerEmail);
  }
  
  // Add learner emails
  group.learners.forEach((learner: any) => {
    if (learner.email) {
      emails.push(learner.email);
    }
  });
  
  const to = emails.join(',');
  const subject = encodeURIComponent(`${group.courseCode} - ${group.peerName} Group ${group.peerGroupNumber}`);
  
  return `mailto:${to}?subject=${subject}`;
}

export default function Matched() {
  const { data: groupsData, isLoading } = useQuery<{ success: boolean; groups: ProposedGroup[] }>({
    queryKey: ['/api/groups'],
  });

  const approvedGroups = (groupsData?.groups || []).filter(group => group.status === 'approved');

  // Calculate group number for each peer
  const peerGroupCounts = new Map<string, number>();
  const groupsWithNumbers = approvedGroups.map((g: ProposedGroup) => {
    const peerKey = g.peerId;
    const groupNumber = (peerGroupCounts.get(peerKey) || 0) + 1;
    peerGroupCounts.set(peerKey, groupNumber);
    return {
      ...g,
      peerGroupNumber: groupNumber,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Matched Groups</h1>
        <p className="text-muted-foreground mt-1">
          Approved groups ready for Learning Peer sessions
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Users className="w-5 h-5" />
        <span className="text-sm font-medium">
          {groupsWithNumbers.length} approved group{groupsWithNumbers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : groupsWithNumbers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No approved groups yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve groups from the Review Groups page to see them here
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {groupsWithNumbers.map((group: any) => (
            <div
              key={group.id}
              className="border rounded-lg p-4 space-y-3"
              data-testid={`matched-group-${group.id}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold" data-testid={`text-peer-${group.id}`}>
                    {group.peerName} - Group {group.peerGroupNumber}
                  </h3>
                  <p className="text-sm text-muted-foreground" data-testid={`text-course-${group.id}`}>
                    {group.courseCode}
                  </p>
                </div>
                <Badge variant="secondary" data-testid={`badge-status-${group.id}`}>
                  Approved
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  <p className="font-medium mb-1">Learners:</p>
                  <ul className="space-y-1 ml-2">
                    {group.learners.map((learner: any, idx: number) => (
                      <li key={idx} className="text-sm" data-testid={`text-learner-${group.id}-${idx}`}>
                        {learner.name}
                        {learner.instructor && (
                          <span className="text-muted-foreground text-xs ml-2">
                            ({learner.instructor})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t space-y-3">
                <p className="text-xs text-muted-foreground" data-testid={`text-time-${group.id}`}>
                  {formatTimeSlot(group)}
                </p>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.location.href = getGroupEmailLink(group);
                  }}
                  data-testid={`button-email-group-${group.id}`}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email Group
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
