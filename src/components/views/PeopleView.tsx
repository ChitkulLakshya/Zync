import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, Loader2, Mail } from "lucide-react";
import { getFullUrl, API_BASE_URL, getUserName, getUserInitials } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import TeamOnboarding from "./TeamOnboarding";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface PeopleViewProps {
    users?: any[]; // Making optional as we fetch internally
    userStatuses: Record<string, any>;
    onChat: (user: any) => void;
    isPreview?: boolean;
}

const PeopleView = ({ users: propUsers, userStatuses, onChat, isPreview }: PeopleViewProps) => {
    const [users, setUsers] = useState<any[]>(propUsers || []);
    const [loading, setLoading] = useState(true);
    const [hasTeam, setHasTeam] = useState<boolean>(true); // Default to true to prevent flash
    const [teamInfo, setTeamInfo] = useState<any>(null);
    const currentUser = auth.currentUser;
    const { toast } = useToast();

    // Invite State
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteLoading, setInviteLoading] = useState(false);

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
    return (
        <div className="flex-1 w-full p-6 space-y-6 h-full">
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">People</h2>
                    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                        <DialogTrigger asChild>
                            <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                                <Plus className="mr-2 h-4 w-4" /> Invite Member
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
                {teamInfo && (
                    <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between border">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Current Team</p>
                            <h3 className="text-lg font-bold">{teamInfo.name}</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-muted-foreground">Invite Code</p>
                            <div className="flex items-center gap-2">
                                <code className="bg-background px-2 py-1 rounded border font-mono text-lg tracking-widest">{teamInfo.inviteCode}</code>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                                    navigator.clipboard.writeText(teamInfo.inviteCode);
                                    // You might want to import toast and use it here, but keeping it simple for now to avoid unused import error if not imported
                                    alert("Code copied!");
                                }}>
                                    <span className="sr-only">Copy</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {users.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <p className="text-muted-foreground text-lg">No other members found.</p>
                    <p className="text-sm text-muted-foreground">Invite people to see them here.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {users.map((user) => {
                        const status = !isPreview && userStatuses[user.uid]
                            ? userStatuses[user.uid].state
                            : user.status;

                        // Name Resolution Logic
                        const displayName = getUserName(user);

                        return (
                            <Card key={user._id || user.id} className="hover:shadow-md transition-shadow min-h-[320px] flex flex-col items-center justify-center text-center p-6">
                                <CardHeader className="flex flex-col items-center justify-center gap-4 w-full p-0 pb-4">
                                    <div className="relative">
                                        <Avatar className="h-24 w-24 ring-4 ring-background border shadow-sm">
                                            <AvatarImage src={getFullUrl(user.photoURL)} className="object-cover" referrerPolicy="no-referrer" />
                                            <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                                                {getUserInitials(user)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-background ${status === "online" ? "bg-green-500" :
                                            status === "away" ? "bg-yellow-500" : "bg-gray-400"
                                            }`} />
                                    </div>
                                    <div className="flex flex-col items-center w-full space-y-1">
                                        <CardTitle className="text-xl font-semibold truncate w-full px-2">{displayName}</CardTitle>
                                        <CardDescription className="text-sm truncate w-full px-2">{user.email}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="w-full p-0 pt-2">
                                    <div className="flex items-center justify-between w-full px-4">
                                        <Badge variant={status === "online" ? "default" : "secondary"} className="capitalize px-3 py-1">
                                            {status}
                                        </Badge>
                                        <Button size="sm" variant="outline" onClick={() => onChat(user)} className="gap-2">
                                            <MessageSquare className="w-4 h-4" />
                                            Chat
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default PeopleView;
