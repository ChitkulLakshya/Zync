import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, Loader2, Mail, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { getFullUrl, API_BASE_URL, getUserName, getUserInitials, cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import TeamOnboarding from "./TeamOnboarding";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface PeopleViewProps {
    users?: any[];
    userStatuses: Record<string, any>;
    onChat: (user: any) => void;
    isPreview?: boolean;
}

const PeopleView = ({ users: propUsers, userStatuses, onChat, isPreview }: PeopleViewProps) => {
    const [users, setUsers] = useState<any[]>(propUsers || []);
    const [loading, setLoading] = useState(true);
    const [hasTeam, setHasTeam] = useState<boolean>(true);
    const [teamInfo, setTeamInfo] = useState<any>(null);
    const currentUser = auth.currentUser;
    const { toast } = useToast();

    // Invite State
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteLoading, setInviteLoading] = useState(false);

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
                localStorage.setItem('zync-people-sidebar-width', sidebarWidth.toString());
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
        localStorage.setItem('zync-people-sidebar-collapsed', newState.toString());
        if (!newState) setIsHovered(false);
    };

    // Check if user has team
    useEffect(() => {
        const checkTeam = async () => {
            if (!currentUser) return;
            try {
                const token = await currentUser.getIdToken();
                const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setHasTeam(!!data.teamId);
                    if (data.teamId) {
                        setTeamInfo(data.teamId);
                    }
                }
            } catch (err) {
                console.error("Error checking team:", err);
            }
        };

        if (!isPreview) {
            checkTeam();
        }
    }, [currentUser, isPreview]);

    // Fetch users if has team
    useEffect(() => {
        if (!isPreview && hasTeam) {
            const fetchUsers = async () => {
                try {
                    const token = await currentUser?.getIdToken();
                    const response = await fetch(`${API_BASE_URL}/api/users`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        // Filter out current user
                        const filteredUsers = data.filter((u: any) => u.uid !== currentUser?.uid);
                        setUsers(filteredUsers);
                    }
                } catch (error) {
                    console.error("Error fetching users:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchUsers();
        } else if (propUsers) {
            setUsers(propUsers);
            setLoading(false);
        } else {
            setLoading(false);
        }
    }, [isPreview, currentUser?.uid, hasTeam, propUsers]);

    if (!hasTeam && !isPreview) {
        return <TeamOnboarding onSuccess={() => {
            setHasTeam(true);
            window.location.reload(); // Reload to refresh global state if needed
        }} />;
    }

    if (loading) {
        return (
            <div className="flex-1 w-full p-6 h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const effectiveCollapsed = isCollapsed && !isHovered;
    const isFloating = isCollapsed && isHovered;

    return (
        <div className="flex-1 w-full h-full overflow-hidden flex flex-col select-none relative">
            <div className="flex h-full gap-0">
                {/* Sidebar */}
                <div
                    ref={sidebarRef}
                    className={cn("relative h-full shrink-0 group/sidebar bg-secondary/30 border-r border-border/50")}
                    style={{ width: isCollapsed ? 64 : sidebarWidth }}
                >
                    <div
                        className={cn(
                            "h-full flex flex-col bg-secondary/30 border-r border-border/50 text-foreground overflow-hidden",
                            isFloating ? "absolute inset-y-0 left-0 z-50 shadow-2xl w-[width]px border-r bg-background/95 backdrop-blur-sm" : "w-full"
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

                        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide space-y-1">
                            <div className="px-2 text-xs font-bold uppercase mb-2 tracking-wider text-gray-500/80 dark:text-muted-foreground/70 mt-4">
                                {!effectiveCollapsed && "My Team"}
                            </div>
                            {effectiveCollapsed && <div className="h-px bg-border/50 w-8 mx-auto my-2" />}

                            {teamInfo ? (
                                <div className={cn(
                                    "flex items-center rounded-md text-gray-600 dark:text-muted-foreground transition-all cursor-default select-none",
                                    effectiveCollapsed ? "justify-center px-0 py-2 bg-secondary/50 text-foreground" : "px-2 py-1.5 text-sm bg-secondary/50 border border-border/50"
                                )}>
                                    {!effectiveCollapsed && <span className="font-medium truncate">{teamInfo.name}</span>}
                                    {effectiveCollapsed && <span className="text-xs font-bold">{teamInfo.name.substring(0, 2).toUpperCase()}</span>}
                                </div>
                            ) : (
                                <div className="p-2 text-sm text-muted-foreground text-center">
                                    {effectiveCollapsed ? "-" : "No team"}
                                </div>
                            )}
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
                <div className="flex-1 overflow-y-auto p-6 md:pl-8 space-y-8">
                    {/* Team Action Header */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm text-muted-foreground mb-1">Team Owner</h3>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border shadow-sm">
                                        <AvatarImage src={getFullUrl(currentUser?.photoURL || "")} referrerPolicy="no-referrer" />
                                        <AvatarFallback>{getUserInitials(currentUser)}</AvatarFallback>
                                    </Avatar>

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

                        <div className="border rounded-lg bg-card p-4 shadow-sm">
                            <h1 className="text-2xl font-bold tracking-tight mb-2">{teamInfo?.name || "Your Team"}</h1>
                            {teamInfo && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>Invite Code:</span>
                                    <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground font-semibold">{teamInfo.inviteCode}</code>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Members Grid */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Members</h3>
                        </div>

                        {users.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 border rounded-lg border-dashed bg-muted/10 text-center">
                                <div className="bg-muted p-4 rounded-full mb-3">
                                    <Plus className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold">No members yet</h3>
                                <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                                    Use the (+) button above to invite members to your team.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {users.map((user) => {
                                    const status = !isPreview && userStatuses[user.uid]
                                        ? userStatuses[user.uid].state
                                        : user.status;
                                    const displayName = getUserName(user);

                                    return (
                                        <Card key={user._id || user.id} className="hover:shadow-md transition-shadow flex flex-row items-center p-4 gap-4 h-auto">
                                            <div className="relative shrink-0">
                                                <Avatar className="h-12 w-12 border">
                                                    <AvatarImage src={getFullUrl(user.photoURL)} className="object-cover" referrerPolicy="no-referrer" />
                                                    <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                                                </Avatar>
                                                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${status === "online" ? "bg-green-500" :
                                                    status === "away" ? "bg-yellow-500" : "bg-gray-400"
                                                    }`} />
                                            </div>

                                            <div className="flex-1 min-w-0 text-left">
                                                <h4 className="font-semibold truncate">{displayName}</h4>
                                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>

                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-normal capitalize">
                                                        {status}
                                                    </Badge>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => onChat(user)}>
                                                        <MessageSquare className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PeopleView;
