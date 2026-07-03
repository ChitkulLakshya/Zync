/**
 * @fileoverview MobileTeamView.tsx
 * @module MobileTeamView
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Client-Side Presentation & Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Crown, Copy, CheckCircle2, MessageSquare, Plus } from "lucide-react";
import { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { API_BASE_URL, getFullUrl } from "@/lib/utils";
import { useMe } from "@/hooks/useMe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { CreateTeamDialog } from "@/components/views/CreateTeamDialog";
import { JoinTeamDialog } from "@/components/views/JoinTeamDialog";

interface MobileTeamViewProps {
  currentUser: User | null;
  onChat?: (user: any) => void;
}

const MobileTeamView = ({ currentUser, onChat }: MobileTeamViewProps) => {
  const { toast } = useToast();
  const { data: me } = useMe();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [joinTeamOpen, setJoinTeamOpen] = useState(false);

  const { data: myTeams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ["mobileMyTeams", currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) { return []; }
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { return []; }
      return res.json();
    },
    enabled: !!currentUser,
  });

  const activeTeamId = useMemo(() => {
    if (selectedTeamId) { return selectedTeamId; }
    const teamIdFromMe = typeof me?.teamId === "object" ? me?.teamId?.id || me?.teamId?._id : me?.teamId;
    return (teamIdFromMe as string) || myTeams?.[0]?.id || myTeams?.[0]?._id || null;
  }, [selectedTeamId, me?.teamId, myTeams]);

  const activeTeam = useMemo(
    () => myTeams.find((team: any) => (team.id || team._id) === activeTeamId) || null,
    [myTeams, activeTeamId],
  );

  const { data: teamUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["mobileTeamUsers", activeTeamId],
    queryFn: async () => {
      if (!currentUser || !activeTeamId) { return []; }
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/users?teamId=${activeTeamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { return []; }
      return res.json();
    },
    enabled: !!currentUser && !!activeTeamId,
  });

  const ownerUser = useMemo(() => {
    if (!activeTeam) { return null; }
    return teamUsers.find((u: any) => u.uid === activeTeam.ownerId || u.uid === activeTeam.ownerUid) || null;
  }, [activeTeam, teamUsers]);

  const handleCopyInviteCode = async () => {
    if (!activeTeam?.inviteCode) { return; }
    try {
      await navigator.clipboard.writeText(activeTeam.inviteCode);
      toast({ title: "Copied", description: "Invite code copied." });
    } catch {
      toast({ title: "Error", description: "Could not copy invite code.", variant: "destructive" });
    }
  };

  if (loadingTeams) {
    return <div className="p-4 text-sm text-muted-foreground">Loading teams…</div>;
  }

  if (!myTeams.length) {
    return (
      <div className="p-4">
        <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-sm">
          <CardContent className="py-8 text-center space-y-2">
            <Users className="h-8 w-8 mx-auto text-foreground" />
            <p className="font-medium">No teams yet</p>
            <p className="text-sm text-muted-foreground">Join or create a team from Settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span>My Teams</span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => setJoinTeamOpen(true)}>
                Join
              </Button>
              <Button size="icon" onClick={() => setCreateTeamOpen(true)} title="Create Team">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {myTeams.map((team: any) => {
            const id = team.id || team._id;
            const isActive = id === activeTeamId;
            return (
              <Button
                key={id}
                variant={isActive ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => setSelectedTeamId(id)}
              >
                {team.name}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {activeTeam && (
        <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{activeTeam.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Crown className="h-4 w-4 text-foreground" />
              Team Owner
            </div>
            <div className="rounded-xl border border-border/10 bg-background/50 backdrop-blur-md p-2.5 flex items-center gap-2.5 shadow-sm">
              <Avatar className="h-8 w-8">
                <AvatarImage src={getFullUrl(ownerUser?.photoURL)} />
                <AvatarFallback>{(ownerUser?.displayName || "U").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{ownerUser?.displayName || "Owner"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{ownerUser?.email || activeTeam.ownerId}</p>
              </div>
            </div>

            {activeTeam?.inviteCode && (
              <div className="rounded-xl border border-border/10 bg-background/50 backdrop-blur-md p-2.5 flex items-center gap-2 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">Invite Code</p>
                  <p className="text-sm font-semibold tracking-wider">{activeTeam.inviteCode}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={handleCopyInviteCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingUsers ? (
            <p className="text-sm text-muted-foreground">Loading members…</p>
          ) : teamUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members found.</p>
          ) : (
            teamUsers.map((member: any) => (
              <div key={member.uid} className="rounded-xl border border-border/10 bg-background/50 backdrop-blur-md p-2.5 flex items-center gap-2.5 shadow-sm">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getFullUrl(member.photoURL)} />
                  <AvatarFallback>{(member.displayName || "U").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{member.displayName || member.email}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                </div>
                {member.uid !== currentUser?.uid && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onChat && onChat(member)}
                    title="Chat"
                  >
                    <MessageSquare className="h-4 w-4 text-foreground" />
                  </Button>
                )}
                {member.uid === currentUser?.uid && <CheckCircle2 className="h-4 w-4 text-foreground" />}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <CreateTeamDialog open={createTeamOpen} onOpenChange={setCreateTeamOpen} />
      <JoinTeamDialog open={joinTeamOpen} onOpenChange={setJoinTeamOpen} />
    </div>
  );
};

export default MobileTeamView;
