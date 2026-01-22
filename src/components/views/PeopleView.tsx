import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, Loader2, Mail, PanelLeftClose, PanelLeftOpen, Star, Check } from "lucide-react";
import { getFullUrl, API_BASE_URL, getUserName, getUserInitials, cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import TeamOnboarding from "./TeamOnboarding";
import { CreateTeamDialog } from "./CreateTeamDialog";
import { JoinTeamDialog } from "./JoinTeamDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import MessagesPage from "./MessagesPage";

interface PeopleViewProps {
    users?: any[];
    userStatuses: Record<string, any>;
    onChat: (user: any) => void;
    onMessages?: () => void;
    isPreview?: boolean;
}

const PeopleView = ({ users: propUsers, userStatuses, onChat, onMessages, isPreview }: PeopleViewProps) => {
    const currentUser = auth.currentUser;
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Queries
    const { data: userData } = useQuery({
        queryKey: ['me', currentUser?.uid],
        queryFn: async () => {
            if (!currentUser) return null;
            const token = await currentUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch user');
            return res.json();
        },
        enabled: !!currentUser && !isPreview,
        staleTime: 300000
    });

    const { data: myTeamsData, isLoading: myTeamsLoading } = useQuery({
        queryKey: ['myTeams', currentUser?.uid],
        queryFn: async () => {
             if (!currentUser) return [];
             const token = await currentUser.getIdToken();
             const res = await fetch(`${API_BASE_URL}/api/teams/mine`, {
                 headers: { Authorization: `Bearer ${token}` }
             });
             if (!res.ok) throw new Error('Failed to fetch teams');
             return res.json();
        },
        enabled: !!currentUser && !isPreview,
        staleTime: 300000
    });

    const { data: allUsersData } = useQuery({
        queryKey: ['allUsers', currentUser?.uid],
        queryFn: async () => {
              if (!currentUser) return [];
              const token = await currentUser.getIdToken();
              const res = await fetch(`${API_BASE_URL}/api/users`, {
                  headers: { Authorization: `Bearer ${token}` }
              });
              if (!res.ok) throw new Error('Failed to fetch users');
              return res.json();
        },
        enabled: !!currentUser && !isPreview,
        staleTime: 300000
    });

    const [teamInfo, setTeamInfo] = useState<any>(null);
    const [hasTeam, setHasTeam] = useState<boolean>(true);

    const myTeams = myTeamsData || [];
    
    useEffect(() => {
        if (myTeams.length > 0) {
            setHasTeam(true);
            if (!teamInfo || !myTeams.find((t: any) => t._id === teamInfo._id)) {
                const activeTeam = myTeams.find((t: any) => t._id === userData?.teamId) || myTeams[0];
                setTeamInfo(activeTeam);
            }
        } else if (!myTeamsLoading && myTeams.length === 0 && !isPreview) {
            setHasTeam(false);
        }
    }, [myTeams, teamInfo, userData, myTeamsLoading, isPreview]);

    const { data: teamUsersData, isLoading: usersLoading } = useQuery({
        queryKey: ['teamUsers', teamInfo?._id],
        queryFn: async () => {
             if (!teamInfo?._id || !currentUser) return [];
             const token = await currentUser.getIdToken();
             const res = await fetch(`${API_BASE_URL}/api/users?teamId=${teamInfo._id}`, {
                 headers: { Authorization: `Bearer ${token}` }
             });
             if (!res.ok) throw new Error('Failed to fetch team users');
             return res.json();
        },
        enabled: !!teamInfo?._id && !isPreview,
        staleTime: 300000
    });

    const users = isPreview ? (propUsers || []) : (teamUsersData || []);
    const loading = !isPreview && (myTeamsLoading || (hasTeam && teamUsersData === undefined && usersLoading));

    const localCloseFriendsIds = userData?.closeFriends || [];
    const allKnownUsers = allUsersData || [];
    const closeFriendUsers = allKnownUsers.filter((u: any) => localCloseFriendsIds.includes(u.uid));

    const toggleCloseFriendMutation = useMutation({
        mutationFn: async (friendId: string) => {
             const token = await currentUser?.getIdToken();
             if (!token) throw new Error("No token");
             const res = await fetch(`${API_BASE_URL}/api/users/close-friends/toggle`, {
                 method: 'POST',
                 headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                 },
                 body: JSON.stringify({ friendId })
             });
             if (!res.ok) throw new Error("Failed");
             return res.json();
        },
        onMutate: async (friendId) => {
            await queryClient.cancelQueries({ queryKey: ['me', currentUser?.uid] });
            const previousUserData = queryClient.getQueryData(['me', currentUser?.uid]);
            queryClient.setQueryData(['me', currentUser?.uid], (old: any) => {
                 if (!old) return old;
                 const isFriend = old.closeFriends?.includes(friendId);
                 const newFriends = isFriend 
                     ? old.closeFriends.filter((id: string) => id !== friendId)
                     : [...(old.closeFriends || []), friendId];
                 return { ...old, closeFriends: newFriends };
            });
            return { previousUserData };
        },
        onError: (err, newTodo, context: any) => {
             queryClient.setQueryData(['me', currentUser?.uid], context.previousUserData);
             toast({
                 title: "Error",
                 description: "Failed to update close friend.",
                 variant: "destructive"
             });
        },
        onSettled: () => {
             queryClient.invalidateQueries({ queryKey: ['me', currentUser?.uid] });
        }
    });

    const toggleCloseFriend = async (friendId: string) => {
         if (isPreview) return;
         toggleCloseFriendMutation.mutate(friendId);
    };



    // Invite State
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteLoading, setInviteLoading] = useState(false);
    const [createTeamOpen, setCreateTeamOpen] = useState(false);
    const [joinTeamOpen, setJoinTeamOpen] = useState(false);
    const [showMessages, setShowMessages] = useState(false);

    // Sidebar State
    const [sidebarWidth, setSidebarWidth] = useState(256);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load Preferences
    useEffect(() => {
        const storedWidth = localStorage.getItem('zync-people-sidebar-width');
        if (storedWidth) setSidebarWidth(parseInt(storedWidth));
        const storedCollapsed = localStorage.getItem('zync-people-sidebar-collapsed');
        if (storedCollapsed) setIsCollapsed(storedCollapsed === 'true');
    }, []);

    // Resize Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = Math.min(Math.max(e.clientX - (sidebarRef.current?.getBoundingClientRect().left || 0), 160), 480);
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
        if (!newState) setIsHovered(false);
    };





    if (!hasTeam && !isPreview) {
        return <TeamOnboarding onSuccess={() => {
            setHasTeam(true);
            window.location.reload(); // Reload to refresh global state if needed
        }} />;
    }

    // Removed global loading check to prevent sidebar unmount
    // if (loading) { return ... }

    const effectiveCollapsed = isCollapsed && !isHovered;
    const isFloating = isCollapsed && isHovered;

    return (
        <div className="flex-1 w-full h-full overflow-hidden flex flex-col select-none relative">
            <div className="flex h-full gap-0">
                {/* Sidebar */}
                <div
                    ref={sidebarRef}
                    className={cn("relative h-full shrink-0 group/sidebar bg-background/60 backdrop-blur-xl border-r border-border/50 supports-[backdrop-filter]:bg-background/60 z-50")}
                    style={{ width: isCollapsed ? 64 : sidebarWidth }}
                >
                    <div
                        className={cn(
                            "h-full flex flex-col bg-transparent text-foreground overflow-hidden",
                            isFloating ? "absolute inset-y-0 left-0 z-50 shadow-xl w-[width]px border-r bg-background" : "w-full"
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
                        <div className={cn("p-4 border-b flex items-center sticky top-0 backdrop-blur-sm z-10 bg-secondary/30 border-border/50", effectiveCollapsed ? "justify-center" : "justify-between")}>
                            {!effectiveCollapsed && <span className="font-semibold text-sm tracking-wide font-serif-elegant text-foreground truncate">Manage Teams</span>}

                            <div className="flex items-center gap-1">
                                <button onClick={toggleCollapse} className="p-1 rounded hover:bg-black/5 text-gray-500 hover:text-black dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white" title={isCollapsed ? "Expand" : "Collapse"}>
                                    {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0">
                            {/* My Teams Section */}
                            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide space-y-1">
                                <div className="px-2 text-xs font-bold uppercase mb-2 tracking-wider text-gray-500/80 dark:text-muted-foreground/70 mt-4">
                                    {!effectiveCollapsed && "My Team"}
                                </div>
                                {effectiveCollapsed && <div className="h-px bg-border/50 w-8 mx-auto my-2" />}

                                <div className="space-y-1">
                                    {myTeams.map((team) => (
                                        <div
                                            key={team._id}
                                            onClick={() => {
                                                setTeamInfo(team);
                                                setShowMessages(false);
                                            }}
                                            className={cn(
                                                "flex items-center rounded-md transition-all cursor-pointer select-none border border-transparent",
                                                effectiveCollapsed ? "justify-center px-0 py-2" : "px-2 py-1.5 text-sm",
                                                teamInfo?._id === team._id
                                                    ? "bg-secondary/80 text-foreground border-border/50 shadow-sm"
                                                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                            )}
                                        >
                                            {!effectiveCollapsed && <span className="font-medium truncate flex-1">{team.name}</span>}
                                            {effectiveCollapsed && <span className="text-xs font-bold">{team.name.substring(0, 2).toUpperCase()}</span>}

                                            {!effectiveCollapsed && teamInfo?._id === team._id && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary ml-2" />
                                            )}
                                        </div>
                                    ))}

                                    {myTeams.length === 0 && (
                                        <div className="p-2 text-sm text-muted-foreground text-center">
                                            {effectiveCollapsed ? "-" : "No teams"}
                                        </div>
                                    )}
                                </div>
                            </div>

                             {/* Close Friends Section */}
                             <div className="flex-1 overflow-y-auto p-2 scrollbar-hide border-t border-border/20">
                                <div className="px-2 text-xs font-bold uppercase mb-2 tracking-wider text-gray-500/80 dark:text-muted-foreground/70 flex justify-between items-center group/section mt-2">
                                    {!effectiveCollapsed && <span>Close Friends</span>}
                                    {!effectiveCollapsed && (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <button className="text-primary hover:text-primary/80 opacity-0 group-hover/section:opacity-100 transition-opacity p-0.5 rounded hover:bg-secondary">
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>Manage Close Friends</DialogTitle>
                                                    <DialogDescription>Add or remove people from your close friends list.</DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-2 max-h-[60vh] overflow-y-auto mt-2 pr-1">
                                                    {allKnownUsers.filter(u => u.uid !== currentUser?.uid).map(user => {
                                                        const isSelected = localCloseFriendsIds.includes(user.uid);
                                                        return (
                                                            <div key={user.uid} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/20 border border-transparent hover:border-border/30 transition-colors">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <Avatar className="w-8 h-8 shrink-0">
                                                                        <AvatarImage src={getFullUrl(user.photoURL)} referrerPolicy="no-referrer"/>
                                                                        <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="text-sm font-medium truncate">{getUserName(user)}</span>
                                                                        <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                                                                    </div>
                                                                </div>
                                                                <button 
                                                                    onClick={() => toggleCloseFriend(user.uid)}
                                                                    className={cn("p-1.5 rounded-full transition-all shrink-0 ml-2", isSelected 
                                                                        ? 'bg-primary text-primary-foreground hover:opacity-90' 
                                                                        : 'bg-secondary hover:bg-secondary/80 text-muted-foreground')}
                                                                >
                                                                    {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                    {allKnownUsers.length <= 1 && (
                                                        <p className="text-center text-sm text-muted-foreground py-4">No other users found to add.</p>
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </div>
                                {effectiveCollapsed && <div className="h-px bg-border/50 w-8 mx-auto my-2" />}

                                <div className="space-y-1">
                                    {closeFriendUsers.map((friend) => (
                                        <div
                                            key={friend.uid}
                                            className={cn(
                                                "flex items-center rounded-md transition-all select-none border border-transparent",
                                                effectiveCollapsed ? "justify-center px-0 py-2" : "px-2 py-1.5 text-sm",
                                                /* -------------------------------------------------------------------------- */
                                                /*                          CUSTOMIZE TEXT COLOR HERE                         */
                                                /* -------------------------------------------------------------------------- */
                                                "text-white hover:bg-secondary/50" 
                                            )}
                                        >
                                            <div className="relative shrink-0">
                                                 <Avatar className={cn(
                                                    "ring-2 ring-transparent transition-all", 
                                                    /* -------------------------------------------------------------------------- */
                                                    /*                            CUSTOMIZE SIZE HERE                             */
                                                    /* -------------------------------------------------------------------------- */
                                                    effectiveCollapsed ? "w-10 h-10" : "w-10 h-10" 
                                                  )}>
                                                    <AvatarImage src={getFullUrl(friend.photoURL)} referrerPolicy="no-referrer" />
                                                    <AvatarFallback className="text-[10px]">{getUserInitials(friend)}</AvatarFallback>
                                                </Avatar>
                                                 {userStatuses[friend.uid]?.status === "online" && (
                                                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-background bg-green-500" />
                                                )}
                                            </div>
                                            
                                            {!effectiveCollapsed && <span className="font-medium truncate flex-1 ml-2">{getUserName(friend)}</span>}
                                        </div>
                                    ))}
                                    {closeFriendUsers.length === 0 && (
                                        <div className="p-2 text-sm text-muted-foreground text-center">
                                            {effectiveCollapsed ? "-" : "No close friends"}
                                        </div>
                                    )}
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Resize Handle */}
                    {!isCollapsed && (
                        <div
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/50 hover:w-1.5 transition-all z-20"
                            onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
                        />
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 relative flex flex-col overflow-hidden">
                    {/* Fixed Header */}
                    <div className="flex justify-between items-center p-6 md:pl-8 pb-4 shrink-0 bg-background border-b border-border/40 z-10">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">People</h1>
                            <p className="text-sm text-muted-foreground">Manage your team</p>
                        </div>
                        <Button variant="outline" className="gap-2" onClick={() => setShowMessages(true)}>
                            <MessageSquare className="w-4 h-4" />
                            All Messages
                        </Button>
                    </div>

                    {/* People Content - Scrollable Area */}
                    <div className="flex-1 w-full overflow-y-auto p-6 md:pl-8 space-y-8">

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm text-muted-foreground mb-1">Team Owner</h3>
                                    <div className="flex items-center gap-3">
                                        {(() => {
                                            // Resolve Team Owner
                                            let ownerUser = null;
                                            if (teamInfo?.ownerId) {
                                                if (currentUser?.uid === teamInfo.ownerId) {
                                                    ownerUser = currentUser;
                                                } else {
                                                    ownerUser = users.find(u => u.uid === teamInfo.ownerId);
                                                }
                                            }
                                            // Fallback to current user if logic fails or data missing (safe default)
                                            const displayUser = ownerUser || currentUser;

                                            return (
                                                <>
                                                    <Avatar className="h-10 w-10 border shadow-sm">
                                                        <AvatarImage src={getFullUrl(displayUser?.photoURL || "")} referrerPolicy="no-referrer" />
                                                        <AvatarFallback>{getUserInitials(displayUser)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm">{getUserName(displayUser)}</span>
                                                        <span className="text-xs text-muted-foreground">{displayUser?.email}</span>
                                                    </div>
                                                </>
                                            );
                                        })()}

                                        {/* Invite Dialog Trigger */}
                                        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                                            <DialogTrigger asChild>
                                                <Button size="icon" className="rounded-full h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>Invite to Team</DialogTitle>
                                                    <DialogDescription>
                                                        Send an invitation email to add a new member to your team.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="email" className="text-right">
                                                            Email
                                                        </Label>
                                                        <Input
                                                            id="email"
                                                            placeholder="colleague@example.com"
                                                            className="col-span-3"
                                                            value={inviteEmail}
                                                            onChange={(e) => setInviteEmail(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button type="submit" disabled={inviteLoading} onClick={async () => {
                                                        if (!inviteEmail) return;
                                                        setInviteLoading(true);
                                                        try {
                                                            const token = await currentUser?.getIdToken();
                                                            const res = await fetch(`${API_BASE_URL}/api/teams/invite`, {
                                                                method: 'POST',
                                                                headers: {
                                                                    'Content-Type': 'application/json',
                                                                    'Authorization': `Bearer ${token}`
                                                                },
                                                                body: JSON.stringify({ email: inviteEmail })
                                                            });

                                                            if (res.ok) {
                                                                toast({ title: "Invitation Sent", description: `Invite sent to ${inviteEmail}` });
                                                                setInviteOpen(false);
                                                                setInviteEmail("");
                                                            } else {
                                                                const err = await res.json();
                                                                toast({ title: "Error", description: err.message, variant: "destructive" });
                                                                if (err.message.includes("Invited user already exists")) {
                                                                    alert("User already in team");
                                                                }
                                                            }
                                                        } catch (e) {
                                                            console.error(e);
                                                            toast({ title: "Error", description: "Failed to send invite", variant: "destructive" });
                                                        } finally {
                                                            setInviteLoading(false);
                                                        }
                                                    }}>
                                                        {inviteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Send Invite
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            </div>

                            <div className="border rounded-xl bg-gradient-to-br from-card to-secondary/10 p-6 shadow-sm border-border/50 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors duration-500" />

                                <div className="relative z-10">
                                    <h1 className="text-3xl font-bold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">{teamInfo?.name || "Your Team"}</h1>
                                    {teamInfo && (
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                <span>Invite Code:</span>
                                                <div
                                                    className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-md border border-border/50 cursor-pointer hover:border-primary/50 transition-colors group/code"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(teamInfo.inviteCode);
                                                        toast({ description: "Invite code copied to clipboard" });
                                                    }}
                                                >
                                                    <code className="font-mono font-bold tracking-wider text-primary">{teamInfo.inviteCode}</code>
                                                    <div className="bg-primary/10 p-1 rounded-md ml-1 group-hover/code:bg-primary/20 transition-colors">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Members Grid */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Members</h3>
                            </div>

                            {loading ? (
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <div key={i} className="flex flex-row items-center p-4 gap-4 h-24 border rounded-xl bg-secondary/20 animate-pulse">
                                            <div className="h-14 w-14 rounded-full bg-secondary/50" />
                                            <div className="space-y-2 flex-1">
                                                <div className="h-4 w-1/3 bg-secondary/50 rounded" />
                                                <div className="h-3 w-1/2 bg-secondary/30 rounded" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : users.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 border rounded-lg border-dashed bg-muted/10 text-center">
                                    <div className="bg-muted p-4 rounded-full mb-3">
                                        <div className="bg-muted p-4 rounded-full mb-3">
                                            <Plus className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-semibold">No members yet</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                                        Use the (+) button above to invite members to your team.
                                    </p>
                                </div>
                            ) : (
                                <div key={teamInfo?._id || 'members-list'} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {users.map((user, index) => {
                                        const statusData = !isPreview && userStatuses[user.uid]
                                            ? userStatuses[user.uid]
                                            : { status: user.status, lastSeen: user.lastSeen };

                                        const status = statusData.status || 'offline';
                                        const lastSeenDate = statusData.lastSeen ? new Date(statusData.lastSeen) : null;

                                        let statusText = status;
                                        if (lastSeenDate && !isNaN(lastSeenDate.getTime())) {
                                            try {
                                                // Shorten the status text
                                                const duration = formatDistanceToNow(lastSeenDate, { addSuffix: false })
                                                    .replace('less than a minute', '1m')
                                                    .replace(' minutes', 'm')
                                                    .replace(' minute', 'm')
                                                    .replace(' hours', 'h')
                                                    .replace(' hour', 'h')
                                                    .replace(' days', 'd')
                                                    .replace(' day', 'd');

                                                if (status === 'online') {
                                                    statusText = `Online (${duration})`;
                                                } else {
                                                    statusText = `Offline ${duration}`;
                                                }
                                            } catch (e) {
                                                // Fallback
                                            }
                                        }

                                        const displayName = getUserName(user);

                                        return (
                                            <Card 
                                                key={user._id || user.id} 
                                                className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-row items-center p-4 gap-4 h-auto border-border/50 bg-gradient-to-br from-card to-card/50 overflow-hidden relative animate-fade-in-up opacity-0"
                                                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                                            >
                                                {/* Glow Effect */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />

                                                <div className="relative shrink-0">
                                                    <Avatar className="h-14 w-14 border-2 border-background ring-2 ring-border/20 group-hover:ring-primary/20 transition-all">
                                                        <AvatarImage src={getFullUrl(user.photoURL)} className="object-cover" referrerPolicy="no-referrer" />
                                                        <AvatarFallback className="bg-primary/5 text-primary font-bold">{getUserInitials(user)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className={cn("absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background shadow-sm",
                                                        status === "online" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" :
                                                            status === "away" ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"
                                                    )} />
                                                </div>

                                                <div className="flex-1 min-w-0 text-left z-10">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-bold truncate text-base group-hover:text-primary transition-colors">{displayName}</h4>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -mr-2" onClick={() => onChat(user)}>
                                                            <MessageSquare className="w-4 h-4 text-primary" />
                                                        </Button>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate font-medium opacity-80">{user.email}</p>

                                                    <div className="flex items-center gap-2 mt-3">
                                                        <Badge variant="secondary" className={cn("text-[10px] px-2 h-5 font-medium capitalize border-0",
                                                            status === 'online' ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                                                                "bg-secondary text-muted-foreground"
                                                        )}>
                                                            {statusText}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </Card>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sliding Messages Panel */}
                    <div className={cn(
                        "absolute inset-0 bg-background z-50 transition-transform duration-300 ease-in-out will-change-transform shadow-2xl",
                        showMessages ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"
                    )}>
                        <MessagesPage
                            users={users}
                            currentUser={currentUser}
                            userStatuses={userStatuses}
                            onNavigateBack={() => setShowMessages(false)}
                        />
                    </div>
                </div>
            </div>


            {/* Create/Join Team FAB */}
            <div className="absolute bottom-6 right-6 z-50">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="icon"
                            className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 transition-transform hover:scale-105"
                        >
                            <Plus className="h-6 w-6 text-white" />
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
                    // Refresh data
                    window.location.reload();
                }}
            />

            <JoinTeamDialog
                open={joinTeamOpen}
                onOpenChange={setJoinTeamOpen}
                onSuccess={() => {
                    // Refresh data
                    window.location.reload();
                }}
            />
        </div >
    );
};

export default PeopleView;
