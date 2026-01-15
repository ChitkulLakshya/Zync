import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/firebase";
import { API_BASE_URL, getFullUrl } from "@/lib/utils";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Check } from "lucide-react";

interface TeamOnboardingProps {
    onSuccess: () => void;
}

// User Mockup shows: Name, Team Type (Select), Invite Team Member (Input + List)
const TEAM_TYPES = [
    { value: "Product", label: "Product", color: "bg-blue-500" },
    { value: "Engineering", label: "Engineering", color: "bg-purple-500" },
    { value: "Management", label: "Management", color: "bg-green-500" },
    { value: "Marketing", label: "Marketing", color: "bg-orange-500" },
    { value: "Sales", label: "Sales", color: "bg-yellow-500" },
    { value: "Design", label: "Design", color: "bg-pink-500" },
    { value: "Other", label: "Other", color: "bg-gray-500" },
];

const TeamOnboarding = ({ onSuccess }: TeamOnboardingProps) => {
    const [teamName, setTeamName] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [teamType, setTeamType] = useState("Product");
    const [invites, setInvites] = useState<{ email: string }[]>([]);
    const [currentInvite, setCurrentInvite] = useState("");
    const [loading, setLoading] = useState(false);

    const currentUser = auth.currentUser;

    const handleAddInvite = (e: React.KeyboardEvent | React.MouseEvent) => {
        if ((e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') || !currentInvite.trim()) return;
        e.preventDefault();

        if (invites.some(i => i.email === currentInvite)) {
            toast.error("User already added");
            return;
        }

        setInvites([...invites, { email: currentInvite }]);
        setCurrentInvite("");
    };

    const removeInvite = (email: string) => {
        setInvites(invites.filter(i => i.email !== email));
    };

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamName.trim()) {
            toast.error("Please enter a team name");
            return;
        }

        setLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/teams/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: teamName,
                    type: teamType,
                    initialInvites: invites.map(i => i.email)
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to create team");
            }

            toast.success("Team created successfully!");
            onSuccess();
        } catch (error: any) {
            console.error("Error creating team:", error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode.trim() || inviteCode.length !== 6) {
            toast.error("Please enter a valid 6-digit invite code");
            return;
        }

        setLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/teams/join`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ inviteCode }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to join team");
            }

            toast.success("Joined team successfully!");
            onSuccess();
        } catch (error: any) {
            console.error("Error joining team:", error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 bg-background/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl space-y-8">
                <Tabs defaultValue="create" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="create">Create Team</TabsTrigger>
                        <TabsTrigger value="join">Join Team</TabsTrigger>
                    </TabsList>

                    <TabsContent value="create">
                        <Card className="border-none shadow-xl">
                            <CardHeader>
                                <CardTitle className="text-2xl">Create a Team</CardTitle>
                                <CardDescription>
                                    Collaborate with your team in a shared workspace.
                                </CardDescription>
                            </CardHeader>
                            <form onSubmit={handleCreateTeam}>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="teamName">Name</Label>
                                            <Input
                                                id="teamName"
                                                placeholder="Team Title"
                                                value={teamName}
                                                onChange={(e) => setTeamName(e.target.value)}
                                                disabled={loading}
                                                className="h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Team Type</Label>
                                            <Select value={teamType} onValueChange={setTeamType} disabled={loading}>
                                                <SelectTrigger className="h-10">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TEAM_TYPES.map(type => (
                                                        <SelectItem key={type.value} value={type.value}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${type.color}`} />
                                                                {type.label}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Invite Team Member</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Email or Username"
                                                    value={currentInvite}
                                                    onChange={(e) => setCurrentInvite(e.target.value)}
                                                    onKeyDown={handleAddInvite}
                                                    disabled={loading}
                                                    className="h-10"
                                                />
                                                <Button type="button" onClick={handleAddInvite} variant="secondary" className="h-10">
                                                    Add
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Press Enter to add to list</p>
                                        </div>

                                        <div className="space-y-2 pt-2">
                                            <p className="text-sm text-muted-foreground">Only people in this list can access</p>
                                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                                {/* Current User */}
                                                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={getFullUrl(currentUser?.photoURL)} />
                                                            <AvatarFallback>{currentUser?.displayName?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm font-medium">{currentUser?.displayName} (you)</span>
                                                    </div>
                                                </div>

                                                {/* Pending Invites */}
                                                {invites.map((invite, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarFallback>{invite.email.charAt(0).toUpperCase()}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm font-medium">{invite.email}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">Member</span>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => removeInvite(invite.email)}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-3 pt-6">
                                    <Button type="button" variant="outline" onClick={() => window.location.reload()}>Cancel</Button>
                                    <Button type="submit" disabled={loading || !teamName} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
                                        {loading ? "Creating..." : "Add List"}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </TabsContent>

                    <TabsContent value="join">
                        <Card className="border-none shadow-xl">
                            <CardHeader>
                                <CardTitle>Join an Existing Team</CardTitle>
                                <CardDescription>
                                    Enter the invite code shared by your team admin.
                                </CardDescription>
                            </CardHeader>
                            <form onSubmit={handleJoinTeam}>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="inviteCode">Invite Code</Label>
                                        <Input
                                            id="inviteCode"
                                            placeholder="123456"
                                            value={inviteCode}
                                            onChange={(e) => setInviteCode(e.target.value)}
                                            maxLength={6}
                                            disabled={loading}
                                            className="h-10 text-center tracking-widest text-lg font-mono"
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" className="w-full h-10" disabled={loading}>
                                        {loading ? "Joining..." : "Join Team"}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default TeamOnboarding;
