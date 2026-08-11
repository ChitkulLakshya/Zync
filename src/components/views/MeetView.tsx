/**
 * @fileoverview MeetView.tsx
 * @module MeetView
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
 * @license AGPL-3.0-only
 * ============================================================================
 */
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User } from 'firebase/auth';
import {
  Video,
  Calendar,
  Clock,
  Link as LinkIcon,
  MoreHorizontal,
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Users,
  Building2,
  Trash2,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getFullUrl, getUserInitials, getUserName, API_BASE_URL } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { TeamLogoDisplay } from '@/components/ui/TeamLogoDisplay';
import { useMe } from '@/hooks/useMe';
import { useConfirm } from '@/hooks/use-confirm';

interface MeetViewProps {
  currentUser: User | null;
  usersList: any[];
  userStatuses?: Record<string, any>;
  isPreview?: boolean;
  mockTeams?: any[];
  mockMe?: any;
}

interface Meeting {
  id: string;
  title: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  startTime: string;
  endTime?: string;
  meetLink: string;
  participants: any[];
  organizerName: string;
  organizerId: string;
}

interface Team {
  id: string;
  name: string;
  type?: string;
  members: string[];
  ownerId: string;
}

export default function MeetView({
  currentUser: realCurrentUser,
  usersList,
  userStatuses = {},
  isPreview,
  mockTeams,
  mockMe,
}: MeetViewProps) {
  const currentUser = isPreview && mockMe ? mockMe : realCurrentUser;
  const { data: realUserData } = useMe();
  const { confirm } = useConfirm();
  const userData = isPreview && mockMe ? mockMe : realUserData;
  const closeFriendsIds = userData?.closeFriends || [];

  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    title: '',
    date: '',
    time: '',
  });

  const [isTeamSelectDialogOpen, setIsTeamSelectDialogOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const { data: fetchedTeams = [], isLoading: isLoadingTeams } = useQuery<Team[]>({
    queryKey: ['myTeams', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser?.uid) {
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
    enabled: !isPreview && !!currentUser?.uid,
    refetchOnMount: false,
  });

  const teams = isPreview && mockTeams ? mockTeams : fetchedTeams;

  useEffect(() => {
    if (isPreview) {
      setMeetings([
        {
          id: '1',
          title: 'Daily Standup',
          status: 'scheduled',
          startTime: new Date().toISOString(),
          meetLink: '#',
          participants: [],
          organizerName: mockMe?.displayName || 'Alex',
          organizerId: '1',
        },
        {
          id: '2',
          title: 'Design Sync',
          status: 'live',
          startTime: new Date().toISOString(),
          meetLink: '#',
          participants: [],
          organizerName: 'Sarah Connor',
          organizerId: '2',
        },
        {
          id: '3',
          title: 'Project Kickoff',
          status: 'ended',
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date().toISOString(),
          meetLink: '#',
          participants: [],
          organizerName: 'John Doe',
          organizerId: '3',
        },
      ]);
      return;
    }
    if (currentUser?.uid) {
      fetchMeetings();
      const interval = setInterval(fetchMeetings, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.uid, isPreview]);

  const fetchMeetings = async () => {
    if (!currentUser?.uid) {
      return;
    }
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/meet/user/${currentUser.uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      }
    } catch (err) {
      console.error('Failed to fetch meetings', err);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!currentUser?.uid) {
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/meet/${meetingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast({ title: 'Deleted', description: 'Meeting removed successfully.' });
        setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete meeting');
      }
    } catch (err: any) {
      console.error('Failed to delete meeting', err);
      toast({
        title: 'Error',
        description: err.message || 'Could not delete meeting.',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = usersList
    .filter((u) => u.uid !== currentUser?.uid)
    .filter(
      (u) =>
        getUserName(u).toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aIsFriend = closeFriendsIds.includes(a.uid);
      const bIsFriend = closeFriendsIds.includes(b.uid);
      if (aIsFriend && !bIsFriend) {return -1;}
      if (!aIsFriend && bIsFriend) {return 1;}
      return 0;
    });

  const toggleInviteUser = (uid: string) => {
    setInvitedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleStartInstantMeeting = async (
    teamId: string | null = null,
    customReceiverIds: string[] | null = null
  ) => {
    setIsGenerating(true);
    try {
      let receiverIds: string[] = [];
      if (customReceiverIds && customReceiverIds.length > 0) {
        receiverIds = customReceiverIds;
      } else if (teamId) {
        const selectedTeam = teams.find((t) => t.id === teamId);
        if (selectedTeam) {
          receiverIds = selectedTeam.members.filter((uid: any) => uid !== currentUser?.uid);
        }
      }

      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <style>
            body { background: #111; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
            .dot { width: 8px; height: 8px; background: #2563eb; border-radius: 50%; margin-bottom: 20px; animation: pulse 1.5s ease-in-out infinite; }
            @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
            h2 { font-weight: 500; font-size: 1.25rem; }
          </style>
          <div class="dot"></div>
          <h2>Creating your secure meeting...</h2>
        `);
      }

      const idToken = await currentUser?.getIdToken();
      const body: any = {
        senderId: currentUser?.uid,
        receiverIds: receiverIds,
      };

      const res = await fetch(`${API_BASE_URL}/api/meet/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.meetingUrl) {
        if (newWindow) {
          newWindow.location.href = data.meetingUrl;
        } else {
          window.open(data.meetingUrl, '_blank');
        }

        const teamName = teamId ? teams.find((t) => t.id === teamId)?.name : null;
        toast({
          title: 'Meeting Started',
          description: teamName
            ? `Invites sent to ${teamName} team members.`
            : 'Instant meeting ready.',
        });
        setInvitedUserIds([]);
        setIsInviteDialogOpen(false);
        setIsTeamSelectDialogOpen(false);
        setSelectedTeamId(null);
        fetchMeetings();
      } else {
        if (newWindow) {
          newWindow.close();
        }
        throw new Error(data.message || 'Failed to create meeting');
      }
    } catch (error: any) {
      console.error('Meeting error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!scheduleData.title || !scheduleData.date || !scheduleData.time) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const idToken = await currentUser?.getIdToken();

      const startTime = new Date(`${scheduleData.date}T${scheduleData.time}`);

      const res = await fetch(`${API_BASE_URL}/api/meet/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: scheduleData.title,
          description: 'Scheduled via Dashboard',
          startTime: startTime.toISOString(),
          organizerId: currentUser?.uid,
          participantIds: invitedUserIds,
        }),
      });

      if (res.ok) {
        toast({ title: 'Scheduled', description: 'Meeting scheduled successfully.' });
        setIsScheduling(false);
        setScheduleData({ title: '', date: '', time: '' });
        setInvitedUserIds([]);
        fetchMeetings();
      } else {
        throw new Error('Failed to schedule');
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Could not schedule meeting.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'live':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 rounded-full border border-red-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">
              Live
            </span>
          </div>
        );
      case 'scheduled':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">
              Scheduled
            </span>
          </div>
        );
      case 'ended':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-card rounded-full border border-border/20">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Ended
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  const formatMeetingTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const day = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

    if (date.getTime() - today.getTime() > 7 * 24 * 60 * 60 * 1000) {
      return `${day}, ${time}`;
    }

    return isToday ? `Today, ${time}` : `${day}, ${time}`;
  };

  return (
    <div className="max-w-7xl mx-auto w-full p-6 md:p-8 space-y-8 h-full flex flex-col">
      {}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-muted-foreground max-w-lg">
            Start or schedule high-quality video meetings with your team. Secure, encrypted, and
            integrated with your workflow.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isScheduling} onOpenChange={setIsScheduling}>
            <DialogContent className="sm:max-w-[425px] bg-card/50 backdrop-blur-xl border-border/10 text-foreground rounded-2xl">
              <DialogHeader>
                <DialogTitle>Schedule Meeting</DialogTitle>
                <DialogDescription>Set a date and time for your team sync.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Meeting Title</Label>
                  <Input
                    placeholder="e.g. Weekly Sync"
                    className="bg-card/50 backdrop-blur-md border-border/10 text-foreground"
                    value={scheduleData.title}
                    onChange={(e) => setScheduleData({ ...scheduleData, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      className="bg-card/50 backdrop-blur-md border-border/10 text-foreground block"
                      value={scheduleData.date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      className="bg-card/50 backdrop-blur-md border-border/10 text-foreground block"
                      value={scheduleData.time}
                      onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Invite Participants</Label>
                  <div className="max-h-[150px] overflow-y-auto border border-border/10 rounded-xl p-2 space-y-2">
                    {usersList
                      .filter((u) => u.uid !== currentUser?.uid)
                      .map((user) => (
                        <div key={user.uid} className="flex items-center gap-2">
                          <Checkbox
                            checked={invitedUserIds.includes(user.uid)}
                            onCheckedChange={() => toggleInviteUser(user.uid)}
                            className="border-border/50 data-[state=checked]:bg-foreground data-[state=checked]:text-background"
                          />
                          <span className="text-sm">{getUserName(user)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsScheduling(false)}
                  className="border-border/10 text-foreground hover:bg-foreground/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleScheduleMeeting}
                  disabled={isGenerating}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  {!isGenerating && <Calendar className="w-4 h-4 mr-2" />}
                  {isGenerating ? 'Scheduling...' : 'Schedule'}
                </Button>
              </DialogFooter>
            </DialogContent>

            <Button
              variant="outline"
              className="h-12 px-6 border-border/10 hover:bg-foreground/5 text-foreground hover:text-foreground"
              onClick={() => setIsScheduling(true)}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </Button>
          </Dialog>

          {}
          <Dialog
            open={isTeamSelectDialogOpen}
            onOpenChange={(open) => {
              setIsTeamSelectDialogOpen(open);
              if (!open) {
                setSelectedTeamId(null);
              }
            }}
          >
            <DialogContent className="sm:max-w-[480px] bg-card/50 backdrop-blur-xl border-border/10 text-foreground rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-foreground" />
                  Start Instant Meeting
                </DialogTitle>
                <DialogDescription>
                  Select a team to invite all members, or start a meeting alone.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {isLoadingTeams ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground animate-pulse">
                    <Building2 className="w-6 h-6" />
                    <span className="ml-2 text-sm">Loading teams...</span>
                  </div>
                ) : teams.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">You're not a member of any teams yet.</p>
                    <p className="text-muted-foreground/70 text-sm mt-1">
                      Create or join a team to invite members.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                      Select a Team
                    </Label>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {teams.map((team) => {
                        const memberCount = team.members.filter(
                          (uid: any) => uid !== currentUser?.uid
                        ).length;
                        const isSelected = selectedTeamId === team.id;
                        const teamMembers = usersList.filter(
                          (u: any) => team.members.includes(u.uid) && u.uid !== currentUser?.uid
                        );

                        return (
                          <div
                            key={team.id}
                            onClick={() => setSelectedTeamId(isSelected ? null : team.id)}
                            className={cn(
                              'p-4 rounded-xl border cursor-pointer transition-all',
                              isSelected
                                ? 'bg-foreground/10 border-foreground/20'
                                : 'bg-card/50 backdrop-blur-md border-border/10 hover:bg-card/80 hover:border-border/30'
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <TeamLogoDisplay
                                  logoId={team.logoId}
                                  teamName={team.name}
                                  className={cn(
                                    'w-10 h-10 rounded-lg',
                                    isSelected ? 'bg-foreground/20' : 'bg-card/50 backdrop-blur-sm'
                                  )}
                                />
                                <div>
                                  <h4
                                    className={cn(
                                      'font-medium',
                                      isSelected ? 'text-foreground' : 'text-foreground/80'
                                    )}
                                  >
                                    {team.name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {memberCount} member{memberCount !== 1 ? 's' : ''} will receive
                                    invite
                                  </p>
                                </div>
                              </div>
                              <div
                                className={cn(
                                  'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                                  isSelected
                                    ? 'border-foreground bg-foreground'
                                    : 'border-border/50'
                                )}
                              >
                                {isSelected && <CheckCircle2 className="w-3 h-3 text-background" />}
                              </div>
                            </div>

                            {/* Team Members Preview */}
                            {isSelected && teamMembers.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border/10">
                                <div className="flex items-center gap-2">
                                  <div className="flex -space-x-2">
                                    {teamMembers.slice(0, 5).map((user) => (
                                      <Avatar
                                        key={user.uid}
                                        className="w-7 h-7 border-2 border-background"
                                      >
                                        <AvatarImage src={getFullUrl(user.photoURL)} />
                                        <AvatarFallback className="bg-muted text-[10px]">
                                          {getUserInitials(user)}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                    {teamMembers.length > 5 && (
                                      <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] text-muted-foreground">
                                        +{teamMembers.length - 5}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {teamMembers
                                      .map((u) => getUserName(u).split(' ')[0])
                                      .slice(0, 3)
                                      .join(', ')}
                                    {teamMembers.length > 3 && ` +${teamMembers.length - 3} more`}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsTeamSelectDialogOpen(false);
                    handleStartInstantMeeting(null);
                  }}
                  className="border-border/10 text-foreground hover:bg-foreground/10 flex-1"
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Starting...' : 'Start Alone'}
                </Button>
                <Button
                  onClick={() => handleStartInstantMeeting(selectedTeamId)}
                  disabled={isGenerating || !selectedTeamId}
                  className="bg-foreground hover:bg-foreground/90 text-background flex-1"
                >
                  {!isGenerating && <Users className="w-4 h-4 mr-2" />}
                  {isGenerating ? 'Inviting...' : 'Invite Team'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            size="lg"
            className="h-12 px-6 bg-foreground hover:bg-foreground/90 text-background shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all"
            onClick={() => setIsTeamSelectDialogOpen(true)}
            disabled={isGenerating}
          >
            {!isGenerating && <Video className="w-5 h-5 mr-2" />}
            {isGenerating ? 'Starting...' : 'Start Instant Meeting'}
          </Button>
        </div>
      </div>

      {/* Recent Meetings Grid */}
      <section className="space-y-4 flex-1">
        <h2 className="text-lg font-semibold text-foreground">Recent Meetings</h2>
        {meetings.length === 0 ? (
          <div className="w-full h-48 border border-dashed border-border/10 rounded-2xl flex flex-col items-center justify-center text-muted-foreground">
            <Video className="w-8 h-8 mb-2 opacity-50" />
            <p>No recent meetings found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="group relative flex flex-col justify-between p-5 bg-card/50 backdrop-blur-md hover:bg-card/80 border border-border/10 hover:border-border/30 rounded-2xl transition-all duration-300 min-h-[180px]"
              >
                {/* Top Row: Badge & Meta */}
                <div className="flex items-start justify-between mb-4">
                  <StatusBadge status={meeting.status} />
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatMeetingTime(meeting.startTime)}
                  </span>
                </div>

                {/* Content */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-foreground/80 transition-colors line-clamp-1">
                    {meeting.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>Organized by {meeting.organizerName || 'Unknown'}</span>
                  </div>
                </div>

                {/* Bottom Row: Avatars & Actions */}
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex -space-x-2">
                    {meeting.participants?.map((p: any, i: number) => (
                      <Avatar
                        key={i}
                        className="w-7 h-7 border-2 border-background ring-1 ring-border/10"
                      >
                        <AvatarImage
                          src={getFullUrl(usersList.find((u) => u.uid === p.uid)?.photoURL)}
                        />
                        <AvatarFallback className="text-[9px] bg-muted">
                          {p.name ? p.name.substring(0, 2).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {meeting.participants && meeting.participants.length > 3 && (
                      <div className="w-7 h-7 flex items-center justify-center rounded-full bg-muted border-2 border-background text-[9px] text-muted-foreground">
                        +{meeting.participants.length - 3}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Delete button - only show for organizer and ended meetings */}
                    {meeting.organizerId === currentUser?.uid && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const isConfirmed = await confirm({
                            title: 'Delete Meeting',
                            description: 'Are you sure you want to delete this meeting?',
                            checkboxLabel: 'I confirm I want to delete this meeting'
                          });
                          if (isConfirmed) {
                            handleDeleteMeeting(meeting.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        navigator.clipboard.writeText(meeting.meetLink);
                        toast({
                          title: 'Link Copied',
                          description: 'Meeting link copied to clipboard.',
                        });
                      }}
                    >
                      Copy Link
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 px-4 bg-primary hover:bg-primary/90 text-primary-foreground border border-border/10"
                      onClick={() => {
                        if (meeting.meetLink) {
                          const newWindow = window.open(meeting.meetLink, '_blank');
                          if (
                            !newWindow ||
                            newWindow.closed ||
                            typeof newWindow.closed === 'undefined'
                          ) {

                            navigator.clipboard.writeText(meeting.meetLink);
                            toast({
                              title: 'Popup Blocked',
                              description:
                                'Meeting link copied to clipboard. Please allow popups or paste the link manually.',
                              variant: 'destructive',
                            });
                          }
                        } else {
                          toast({
                            title: 'Error',
                            description: 'Meeting link not available.',
                            variant: 'destructive',
                          });
                        }
                      }}
                    >
                      Join
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Invite Section */}
      <section className="space-y-4 mt-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Quick Invite</h2>
          {invitedUserIds.length > 0 && (
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 animate-in fade-in zoom-in duration-200"
              onClick={() => handleStartInstantMeeting(null, invitedUserIds)}
              disabled={isGenerating}
            >
              {!isGenerating && <Video className="w-3 h-3 mr-2" />}
              {isGenerating ? 'Starting...' : `Start with ${invitedUserIds.length} People`}
            </Button>
          )}
        </div>

        <div className="bg-foreground/[0.02] border border-border rounded-2xl overflow-hidden p-1">
          {/* Search Bar */}
          <div className="relative px-3 py-2 border-b border-border">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search people to invite..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground h-10 outline-none"
            />
          </div>

          {/* Users List */}
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No users found.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <tbody>
                  {filteredUsers.map((user) => {
                    const isSelected = invitedUserIds.includes(user.uid);
                    const isCloseFriend = closeFriendsIds.includes(user.uid);
                    const status = userStatuses[user.uid]?.state || 'offline';

                    return (
                      <tr
                        key={user.uid}
                        className={cn(
                          'group border-b border-border/50 last:border-none transition-colors cursor-pointer',
                          isSelected
                            ? 'bg-blue-500/5 hover:bg-blue-500/10'
                            : 'hover:bg-foreground/[0.02]'
                        )}
                        onClick={() => toggleInviteUser(user.uid)}
                      >
                        <td className="py-3 px-4 w-12">
                          <Checkbox
                            checked={isSelected}
                            className={cn(
                              'border-zinc-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600',
                              isSelected ? 'opacity-100' : 'opacity-30 group-hover:opacity-100'
                            )}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border">
                              <AvatarImage src={getFullUrl(user.photoURL)} />
                              <AvatarFallback className="bg-muted text-muted-foreground">
                                {getUserInitials(user)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div
                                className={cn(
                                  'font-medium flex items-center gap-1.5',
                                  isSelected ? 'text-primary' : 'text-foreground'
                                )}
                              >
                                {getUserName(user)}
                                {isCloseFriend && (
                                  <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full',
                                status === 'online'
                                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                  : status === 'away'
                                    ? 'bg-amber-500'
                                    : 'bg-muted-foreground'
                              )}
                            />
                            <span className="text-xs text-muted-foreground capitalize">
                              {status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
