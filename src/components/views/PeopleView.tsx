/**
 * @fileoverview PeopleView.tsx
 * @module PeopleView
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
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageSquare, PanelLeftClose, PanelLeftOpen, Check, Clock } from 'lucide-react';
import { getFullUrl, API_BASE_URL, getUserName, getUserInitials, cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import TeamOnboarding from './TeamOnboarding';
import { CreateTeamDialog } from './CreateTeamDialog';
import { JoinTeamDialog } from './JoinTeamDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import MessagesPage from './MessagesPage';
import ChatView from './ChatView';
import { getLogoById, getDeterministicLogoId } from '@/lib/team-logos';
import { TeamSettingsSidebar } from './team/TeamSettingsSidebar';
import { MemberListItem } from './team/MemberListItem';
import { TeamLogoDisplay } from '@/components/ui/TeamLogoDisplay';

/** Format current time in a given IANA timezone (e.g. "America/New_York") */
function formatLocalTime(timezone: string | null | undefined): string | null {
  if (!timezone) {
    return null;
  }
  try {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return null;
  }
}

interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  [key: string]: any;
}

interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  teamId?: Team | string;
  closeFriends?: string[];
  timezone?: string | null;
  country?: string | null;
  city?: string | null;
  [key: string]: any;
}

interface PeopleViewProps {
  users?: User[];
  userStatuses: Record<string, any>;
  onChat: (user: User) => void;
  onMessages?: () => void;
  isPreview?: boolean;
  mockTeams?: any[];
  mockMe?: any;
}

import { useMe } from '@/hooks/useMe';

const PeopleView = ({
  users: propUsers,
  userStatuses,
  onChat,
  isPreview,
  mockTeams,
  mockMe,
}: PeopleViewProps) => {
  const currentUser = isPreview && mockMe ? mockMe : auth.currentUser;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: realUserData } = useMe();
  const userData = isPreview && mockMe ? mockMe : realUserData;

  const { data: myTeamsData, isLoading: myTeamsLoading } = useQuery({
    queryKey: ['myTeams', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) {
        return [];
      }
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch teams');
      }
      return res.json();
    },
    enabled: !!currentUser && !isPreview,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: allUsersData } = useQuery({
    queryKey: ['allUsers', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) {
        return [];
      }
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      return res.json();
    },
    enabled: !!currentUser && !isPreview,
  });

  const [teamInfo, setTeamInfo] = useState<Team | null>(null);
  const [quickChatUser, setQuickChatUser] = useState<User | null>(null);
  const [hasTeam, setHasTeam] = useState<boolean>(true);

  const myTeams: Team[] = isPreview && mockTeams ? mockTeams : myTeamsData || [];

  useEffect(() => {
    if (myTeams.length > 0) {
      setHasTeam(true);
      const matchingTeam = teamInfo ? myTeams.find((t) => t.id === teamInfo.id) : null;
      if (!teamInfo || !matchingTeam) {
        const activeTeam = myTeams.find((t) => t.id === (userData?.teamId as string)) || myTeams[0];
        setTeamInfo(activeTeam);
      } else if (JSON.stringify(matchingTeam) !== JSON.stringify(teamInfo)) {
        setTeamInfo(matchingTeam);
      }
    } else if (!myTeamsLoading && myTeams.length === 0 && !isPreview) {
      setHasTeam(false);
    }
  }, [myTeams, teamInfo, userData, myTeamsLoading, isPreview]);

  const { data: teamUsersData, isLoading: usersLoading } = useQuery({
    queryKey: ['teamUsers', teamInfo?.id],
    queryFn: async () => {
      if (!teamInfo?.id || !currentUser) {
        return [];
      }
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/users?teamId=${teamInfo.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch team users');
      }
      return res.json();
    },
    enabled: !!teamInfo?.id && !isPreview,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const users: User[] = isPreview ? propUsers || [] : teamUsersData || [];

  const loading = !isPreview && (myTeamsLoading || (hasTeam && (!teamInfo || usersLoading)));

  const localCloseFriendsIds = userData?.closeFriends || [];
  const allKnownUsers: User[] = isPreview && propUsers ? propUsers : allUsersData || [];
  const closeFriendUsers: User[] = allKnownUsers.filter((u) =>
    localCloseFriendsIds.includes(u.uid)
  );

  const toggleCloseFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const token = await currentUser?.getIdToken();
      if (!token) {
        throw new Error('No token');
      }
      const res = await fetch(`${API_BASE_URL}/api/users/close-friends/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId }),
      });
      if (!res.ok) {
        throw new Error('Failed');
      }
      return res.json();
    },
    onMutate: async (friendId) => {
      await queryClient.cancelQueries({ queryKey: ['me', currentUser?.uid] });
      const previousUserData = queryClient.getQueryData(['me', currentUser?.uid]);
      queryClient.setQueryData(['me', currentUser?.uid], (old: any) => {
        if (!old) {
          return old;
        }
        const isFriend = old.closeFriends?.includes(friendId);
        const newFriends = isFriend
          ? old.closeFriends.filter((id: string) => id !== friendId)
          : [...(old.closeFriends || []), friendId];
        return { ...old, closeFriends: newFriends };
      });
      return { previousUserData };
    },
    onError: (_err, _newTodo, context: any) => {
      if (context?.previousUserData) {
        queryClient.setQueryData(['me', currentUser?.uid], context.previousUserData);
      }
      toast({
        title: 'Error',
        description: 'Failed to update close friend.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['me', currentUser?.uid] });
    },
  });

  const toggleCloseFriend = async (friendId: string) => {
    if (isPreview) {
      return;
    }
    toggleCloseFriendMutation.mutate(friendId);
  };

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [joinTeamOpen, setJoinTeamOpen] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const storedWidth = localStorage.getItem('ZYNC-people-sidebar-width');
    if (storedWidth) {
      setSidebarWidth(parseInt(storedWidth));
    }
    const storedCollapsed = localStorage.getItem('ZYNC-people-sidebar-collapsed');
    if (storedCollapsed) {
      setIsCollapsed(storedCollapsed === 'true');
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) {
        return;
      }
      const newWidth = Math.min(
        Math.max(e.clientX - (sidebarRef.current?.getBoundingClientRect().left || 0), 160),
        480
      );
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('ZYNC-people-sidebar-width', sidebarWidth.toString());
      }
    };
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.cursor = 'default';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isResizing, sidebarWidth]);

  const toggleCollapse = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('ZYNC-people-sidebar-collapsed', newState.toString());
    if (!newState) {
      setIsHovered(false);
    }
  };

  if (!hasTeam && !isPreview) {
    return (
      <TeamOnboarding
        onSuccess={() => {
          setHasTeam(true);
          window.location.reload();
        }}
      />
    );
  }



  const effectiveCollapsed = isCollapsed && !isHovered;
  const isFloating = isCollapsed && isHovered;

  return (
    <div className="flex-1 w-full h-full overflow-hidden flex flex-col select-none relative bg-transparent">
      <div className="flex h-full gap-0">
        {}
        <div
          ref={sidebarRef}
          className={cn(
            'relative h-full shrink-0 group/sidebar bg-[#121212] border-r border-white/[0.04] z-[60]'
          )}
          style={{ width: isCollapsed ? 64 : sidebarWidth }}
        >
          <div
            className={cn(
              'h-full flex flex-col bg-transparent text-foreground overflow-hidden',
              isFloating
                ? 'absolute inset-y-0 left-0 z-50 shadow-elevation4 border-r border-border/5 bg-background'
                : 'w-full'
            )}
            style={{ width: isFloating ? sidebarWidth : '100%', transition: 'width 0.2s ease-out' }}
            onMouseEnter={() => {
              if (isCollapsed) {
                hoverTimeoutRef.current = setTimeout(() => {
                  setIsHovered(true);
                }, 300);
              }
            }}
            onMouseLeave={() => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
              if (isCollapsed) {
                setIsHovered(false);
              }
            }}
          >
            <div
              className={cn(
                'p-4 border-b flex items-center sticky top-0 z-10 bg-[#121212] border-white/[0.04]',
                effectiveCollapsed ? 'justify-center' : 'justify-between'
              )}
            >
              {!effectiveCollapsed && (
                <span className="font-semibold text-sm tracking-wide font-serif-elegant text-foreground truncate">
                  Manage Teams
                </span>
              )}

              <div className="flex items-center gap-1">
                <button
                  onClick={toggleCollapse}
                  className="p-1 rounded hover:bg-foreground/5 text-muted-foreground hover:text-foreground"
                  title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                  {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              {}
              <div className="flex-1 overflow-y-auto p-2 scrollbar-hide space-y-1">
                <div className="space-y-1 mt-4">
                  {myTeams.map((team) =>
                    (() => {
                      const logoId = team.logoId || getDeterministicLogoId(team.id);
                      const {
                        icon: TeamLogoIcon,
                        fgColor,
                        bgColor,
                        borderColor,
                      } = getLogoById(logoId);
                      return (
                        <div
                          key={team.id}
                          onClick={() => {
                            setTeamInfo(team);
                            setQuickChatUser(null);
                            setShowMessages(false);
                          }}
                          className={cn(
                            'flex items-center rounded-md transition-all cursor-pointer select-none border border-transparent',
                            effectiveCollapsed ? 'justify-center px-0 py-2' : 'px-2 py-1.5 text-sm',
                            teamInfo?.id === team.id
                              ? 'bg-card/50 backdrop-blur-sm text-foreground border-border/10 shadow-sm'
                              : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
                          )}
                        >
                          <TeamLogoDisplay
                            logoId={team.logoId}
                            teamName={team.name}
                            className={effectiveCollapsed ? 'w-10 h-10 shrink-0' : 'w-10 h-10 shrink-0'}
                          />
                          {!effectiveCollapsed && (
                            <div className="min-w-0 flex-1 ml-2">
                              <p className="font-medium truncate text-sm">{team.name}</p>
                            </div>
                          )}
                          {effectiveCollapsed && (
                            <span className="text-xs font-bold">
                              {team.name.substring(0, 2).toUpperCase()}
                            </span>
                          )}

                          {!effectiveCollapsed && teamInfo?.id === team.id && (
                            <div className="w-1.5 h-1.5 rounded-full bg-foreground ml-2" />
                          )}
                        </div>
                      );
                    })()
                  )}

                  {myTeams.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {effectiveCollapsed ? '-' : 'No teams'}
                    </div>
                  )}
                </div>
              </div>

              {}
              <div className="flex-1 overflow-y-auto p-2 scrollbar-hide border-t border-border/10">
                <div className="px-2 text-xs font-bold uppercase mb-2 tracking-wider text-muted-foreground flex justify-between items-center group/section mt-2">
                  {!effectiveCollapsed && <span>Close Friends</span>}
                  {!effectiveCollapsed && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="text-white opacity-100 transition-opacity p-1 rounded">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Manage Close Friends</DialogTitle>
                          <DialogDescription>
                            Add or remove people from your close friends list.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto mt-2 pr-1">
                          {allKnownUsers
                            .filter((u) => u.uid !== currentUser?.uid)
                            .map((user) => {
                              const isSelected = localCloseFriendsIds.includes(user.uid);
                              return (
                                <div
                                  key={user.uid}
                                  className="flex items-center justify-between p-2 rounded-lg hover:bg-card/50 border border-transparent hover:border-border/10 transition-colors"
                                >
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <Avatar className="w-8 h-8 shrink-0">
                                      <AvatarImage
                                        src={getFullUrl(user.photoURL)}
                                        referrerPolicy="no-referrer"
                                      />
                                      <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-sm font-medium truncate">
                                        {getUserName(user)}
                                      </span>
                                      <span className="text-xs text-muted-foreground truncate">
                                        {user.email}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => toggleCloseFriend(user.uid)}
                                    className={cn(
                                      'p-1.5 rounded-full transition-all shrink-0 ml-2',
                                      isSelected
                                        ? 'bg-foreground text-background hover:opacity-90'
                                        : 'bg-card/50 border border-border/10 hover:bg-card/80 text-foreground'
                                    )}
                                  >
                                    {isSelected ? (
                                      <Check className="w-3.5 h-3.5" />
                                    ) : (
                                      <Plus className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          {allKnownUsers.length <= 1 && (
                            <p className="text-center text-sm text-muted-foreground py-4">
                              No other users found to add.
                            </p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                {effectiveCollapsed && <div className="h-px bg-border/10 w-8 mx-auto my-2" />}

                <div className="space-y-1">
                  {closeFriendUsers.map((friend) => (
                    <div
                      key={friend.uid}
                      onClick={() => setQuickChatUser(friend)}
                      className={cn(
                        'flex items-center rounded-md transition-all select-none border border-transparent cursor-pointer',
                        effectiveCollapsed ? 'justify-center px-0 py-2' : 'px-2 py-1.5 text-sm',

                        'text-foreground hover:bg-card/50 border-border/10'
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar
                          className={cn(
                            'ring-2 ring-transparent transition-all',

                            effectiveCollapsed ? 'w-10 h-10' : 'w-10 h-10'
                          )}
                        >
                          <AvatarImage
                            src={getFullUrl(friend.photoURL)}
                            referrerPolicy="no-referrer"
                          />
                          <AvatarFallback className="text-[10px]">
                            {getUserInitials(friend)}
                          </AvatarFallback>
                        </Avatar>
                        {userStatuses[friend.uid]?.status === 'online' && (
                          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-background bg-green-500" />
                        )}
                      </div>

                      {!effectiveCollapsed && (
                        <span className="font-medium truncate flex-1 ml-2">
                          {getUserName(friend)}
                        </span>
                      )}
                    </div>
                  ))}
                  {closeFriendUsers.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {effectiveCollapsed ? '-' : 'No close friends'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {}
          {!isCollapsed && (
            <div
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-foreground/10 hover:w-1.5 transition-all z-20"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
              }}
            />
          )}
        </div>

        {}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Middle Column: Main Content */}
          <div className="flex-1 relative flex flex-col overflow-hidden border-r border-white/[0.04] bg-[#121212]">
            {/* Top Header */}
            <div className="flex items-center justify-between p-6 md:pl-8 pb-0 shrink-0 z-10">
              <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                {teamInfo?.name || 'Your Team'}
              </h1>
              <Button
                className="gap-2 bg-foreground text-background hover:bg-foreground/90 border border-border/10"
                onClick={() => setShowMessages(true)}
              >
                <MessageSquare className="w-4 h-4" />
                All Messages
              </Button>
            </div>

            <div className="flex-1 w-full overflow-y-auto">
              <div className="max-w-4xl mx-auto w-full p-6 md:pl-8 pt-6 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Members</h3>
                  </div>

                  {usersLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center p-4 h-24 border border-border/10 rounded-xl bg-card/50 backdrop-blur-sm animate-pulse" />
                      ))}
                    </div>
                  ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 border border-border/10 rounded-xl border-dashed bg-card/50 backdrop-blur-md text-center">
                      <h3 className="text-lg font-semibold">No members yet</h3>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {users.map((user, index) => (
                        <MemberListItem
                          key={user.uid}
                          user={user}
                          currentUser={currentUser}
                          teamInfo={teamInfo}
                          statusData={!isPreview && userStatuses[user.uid] ? userStatuses[user.uid] : { status: user.status, lastSeen: user.lastSeen }}
                          onChat={onChat}
                          refreshTeamQueries={async () => {
                            await queryClient.invalidateQueries({ queryKey: ['teamUsers'] });
                            await queryClient.invalidateQueries({ queryKey: ['myTeams', currentUser?.uid] });
                          }}
                          setTeamsData={() => {}}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>


          </div>

        <div className="hidden lg:flex lg:w-80 shrink-0 relative overflow-hidden bg-[#121212]">
          <div className={cn("w-full h-full transition-opacity duration-300", quickChatUser ? "opacity-0 pointer-events-none" : "opacity-100")}>
            <TeamSettingsSidebar
              teamInfo={teamInfo}
              currentUser={currentUser}
              refreshTeamQueries={async () => {
                await queryClient.invalidateQueries({ queryKey: ['myTeams', currentUser?.uid] });
                await queryClient.invalidateQueries({ queryKey: ['me', currentUser?.uid] });
              }}
              setTeamInfo={setTeamInfo}
              className="w-full h-full"
            />
          </div>
          
          <div 
            className={cn(
              "absolute inset-0 z-50 flex flex-col bg-[#121212] transition-transform duration-300 ease-in-out",
              quickChatUser ? "translate-x-0" : "translate-x-full"
            )}
          >
            {quickChatUser && (
              <ChatView
                selectedUser={quickChatUser}
                currentUserData={userData}
                isQuickChat={true}
                onOpenFullChat={() => {
                  onChat(quickChatUser);
                  setQuickChatUser(null);
                }}
              />
            )}
          </div>
        </div>

          {/* Messages Overlay */}
          <div
            className={cn(
              'absolute inset-0 bg-background/50 backdrop-blur-xl z-50 transition-transform duration-300 ease-in-out will-change-transform shadow-elevation5',
              showMessages
                ? 'translate-x-0 pointer-events-auto'
                : 'translate-x-full pointer-events-none'
            )}
          >
            <MessagesPage
              users={users}
              currentUser={currentUser}
              userStatuses={userStatuses}
              onNavigateBack={() => setShowMessages(false)}
            />
          </div>
        </div>
      </div>

      <div className={cn("absolute bottom-6 z-50 transition-all duration-300 ease-in-out", quickChatUser ? "right-[344px]" : "right-6")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-none transition-transform hover:scale-105 bg-foreground text-background"
            >
              <Plus className="h-6 w-6 text-background" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="mb-2 w-48">
            <DropdownMenuItem onClick={() => setCreateTeamOpen(true)} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Create New Team
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setJoinTeamOpen(true)} className="cursor-pointer">
              <div className="flex items-center">
                <span className="mr-2 text-lg leading-none">#</span>
                Join Existing Team
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CreateTeamDialog
        open={createTeamOpen}
        onOpenChange={setCreateTeamOpen}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      <JoinTeamDialog
        open={joinTeamOpen}
        onOpenChange={setJoinTeamOpen}
        onSuccess={() => {

          window.location.reload();
        }}
      />
    </div>
  );
};

export default PeopleView;
