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
import { Users, Crown, Copy, CheckCircle2, MessageSquare, Plus, ChevronDown, Heart, Globe } from "lucide-react";
import { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { API_BASE_URL, getFullUrl, cn } from "@/lib/utils";
import { useMe } from "@/hooks/useMe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { CreateTeamDialog } from "@/components/views/CreateTeamDialog";
import { JoinTeamDialog } from "@/components/views/JoinTeamDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { TeamLogoDisplay } from "@/components/ui/TeamLogoDisplay";

interface MobileTeamViewProps {
  currentUser: User | null;
  onChat?: (user: any) => void;
}

type PeopleFilterMode = 'team' | 'friends' | 'all';

const MobileTeamView = ({ currentUser, onChat }: MobileTeamViewProps) => {
  const { toast } = useToast();
  const { data: me } = useMe();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [joinTeamOpen, setJoinTeamOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<PeopleFilterMode>('team');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

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

  const { data: allUsers = [] } = useQuery({
    queryKey: ["mobileAllUsers", currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) { return []; }
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { return []; }
      return res.json();
    },
    enabled: !!currentUser && filterMode !== 'team',
  });

  const closeFriendIds = me?.closeFriends || [];
  const closeFriendUsers = useMemo(
    () => allUsers.filter((u: any) => closeFriendIds.includes(u.uid)),
    [allUsers, closeFriendIds],
  );

  const filteredUsers = useMemo(() => {
    if (filterMode === 'friends') { return closeFriendUsers; }
    if (filterMode === 'all') { return allUsers; }
    return teamUsers;
  }, [filterMode, closeFriendUsers, allUsers, teamUsers]);

  const filterLabel = filterMode === 'team'
    ? activeTeam?.name || 'Select team'
    : filterMode === 'friends'
    ? `Close Friends (${closeFriendUsers.length})`
    : `All Users (${allUsers.length})`;

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
    <div className="flex flex-col h-full">
      {/* Header with filter */}
      <div className="pl-4 pr-14 py-3 shrink-0 space-y-2 border-b border-border/10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">People</h2>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => setJoinTeamOpen(true)}>
              Join
            </Button>
            <Button size="icon" onClick={() => setCreateTeamOpen(true)} title="Create Team">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter selector */}
        <button
          onClick={() => setFilterSheetOpen(true)}
          className="flex items-center justify-between w-full p-2.5 bg-secondary/30 rounded-lg text-sm"
        >
          <span className="flex items-center gap-2 truncate">
            {filterMode === 'team' && <Users className="w-4 h-4 text-muted-foreground" />}
            {filterMode === 'friends' && <Heart className="w-4 h-4 text-muted-foreground" />}
            {filterMode === 'all' && <Globe className="w-4 h-4 text-muted-foreground" />}
            <span className="truncate">{filterLabel}</span>
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Team selector — only in team mode */}
        {filterMode === 'team' && (
          <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">My Teams</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {myTeams.map((team: any) => {
                const id = team.id || team._id;
                const isActive = id === activeTeamId;
                return (
                  <Button
                    key={id}
                    variant={isActive ? "default" : "outline"}
                    className="w-full justify-start gap-2"
                    onClick={() => setSelectedTeamId(id)}
                  >
                    <TeamLogoDisplay logoId={team.logoId} teamName={team.name} className="h-6 w-6" />
                    {team.name}
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Team info — only in team mode */}
        {filterMode === 'team' && activeTeam && (
          <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TeamLogoDisplay logoId={activeTeam.logoId} teamName={activeTeam.name} className="h-8 w-8" />
                {activeTeam.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Crown className="h-4 w-4 text-foreground" />
                Team Owner
              </div>
              <div className="rounded-xl border border-border/10 bg-background/50 backdrop-blur-md p-2.5 flex items-center gap-2.5 shadow-sm">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getFullUrl(ownerUser?.photoURL) || undefined} />
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

        {/* Members / People list */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{filterMode === 'team' ? 'Members' : filterMode === 'friends' ? 'Close Friends' : 'All Users'}</span>
              <Badge variant="secondary" className="text-[10px] h-5">{filteredUsers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filterMode === 'team' && loadingUsers ? (
              <p className="text-sm text-muted-foreground">Loading members…</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {filterMode === 'friends' ? 'No close friends yet.' : filterMode === 'all' ? 'No users found.' : 'No members found.'}
              </p>
            ) : (
              filteredUsers.map((member: any) => (
                <div key={member.uid} className="rounded-xl border border-border/10 bg-background/50 backdrop-blur-md p-2.5 flex items-center gap-2.5 shadow-sm">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getFullUrl(member.photoURL) || undefined} />
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
      </div>

      {/* Filter Selection Sheet */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="p-0 [&>button]:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Filter People</SheetTitle>
            <SheetDescription>Choose how to filter people.</SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <div className="flex gap-2">
              {[
                { mode: 'team' as PeopleFilterMode, label: 'Team', icon: Users },
                { mode: 'friends' as PeopleFilterMode, label: 'Friends', icon: Heart },
                { mode: 'all' as PeopleFilterMode, label: 'All', icon: Globe },
              ].map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => {
                    setFilterMode(mode);
                    setFilterSheetOpen(false);
                  }}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border text-xs transition-colors',
                    filterMode === mode ? 'border-foreground/20 bg-secondary/50 text-foreground' : 'border-border/10 text-muted-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <CreateTeamDialog open={createTeamOpen} onOpenChange={setCreateTeamOpen} />
      <JoinTeamDialog open={joinTeamOpen} onOpenChange={setJoinTeamOpen} />
    </div>
  );
};

export default MobileTeamView;
