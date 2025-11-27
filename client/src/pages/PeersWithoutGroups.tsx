import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { LearningPeer } from "@shared/schema";
import { Users, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface PeerWithoutGroupsResponse {
  success: boolean;
  peers: LearningPeer[];
}

export default function PeersWithoutGroups() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery<PeerWithoutGroupsResponse>({
    queryKey: ['/api/peers/without-groups'],
  });

  const peers = data?.peers || [];
  const filteredPeers = peers.filter(peer =>
    peer.preferredName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    peer.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    peer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCourses = (peer: LearningPeer): string => {
    const courses: string[] = [];
    if (peer.courseCode1) courses.push(peer.courseCode1);
    if (peer.courseCode2) courses.push(peer.courseCode2);
    if (peer.courseCode3) courses.push(peer.courseCode3);
    return courses.join(', ') || 'No courses listed';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Peers Without Groups</h1>
        <p className="text-muted-foreground mt-1">
          Learning peers who have not been assigned to any groups
        </p>
      </div>

      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm font-medium">
          {filteredPeers.length} peer{filteredPeers.length !== 1 ? 's' : ''} available
        </span>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-5 bg-muted rounded w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-60" />
                  <div className="h-4 bg-muted rounded w-48" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : peers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">All learning peers have been assigned to groups!</p>
        </div>
      ) : (
        <>
          <div>
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
              data-testid="input-search-peers"
            />
          </div>

          {filteredPeers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No peers match your search
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPeers.map((peer) => (
                <Card key={peer.email} data-testid={`card-peer-${peer.email}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg" data-testid={`text-peer-name-${peer.email}`}>
                          {peer.preferredName} {peer.lastName}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1" data-testid={`text-peer-email-${peer.email}`}>
                          {peer.email}
                        </p>
                      </div>
                      <Badge variant="outline" data-testid={`badge-availability-${peer.email}`}>
                        Available
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Courses Teaching:</p>
                      <p className="text-sm" data-testid={`text-courses-${peer.email}`}>
                        {getCourses(peer)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Max Groups:</p>
                      <p className="text-sm" data-testid={`text-max-groups-${peer.email}`}>
                        {peer.groups || 0} group{(peer.groups || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
