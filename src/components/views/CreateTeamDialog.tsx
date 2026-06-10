import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/firebase";
import { API_BASE_URL } from "@/lib/utils";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTeamPersistence } from "@/hooks/useTeamPersistence";
import { TEAM_LOGOS, TeamLogoId, getRandomLogoId } from "@/lib/team-logos";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface CreateTeamDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const TEAM_TYPES = [
    { value: "Product", label: "Product" },
    { value: "Engineering", label: "Engineering" },
    { value: "Management", label: "Management" },
    { value: "Marketing", label: "Marketing" },
    { value: "Sales", label: "Sales" },
    { value: "Design", label: "Design" },
    { value: "Other", label: "Other" },
];

export const CreateTeamDialog = ({ open, onOpenChange, onSuccess }: CreateTeamDialogProps) => {
    const [teamName, setTeamName] = useState("");
    const [teamType, setTeamType] = useState("Product");
    const [selectedLogoId, setSelectedLogoId] = useState<TeamLogoId>(getRandomLogoId());
    const [invites, setInvites] = useState<{ email: string }[]>([]);
    const [currentInvite, setCurrentInvite] = useState("");
    
    const { createTeamSync } = useTeamPersistence(auth.currentUser?.uid);
    const queryClient = useQueryClient();

    const createTeamMutation = useMutation({
        mutationFn: async () => {
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
            return data;
        },
        onSuccess: (data) => {
            toast.success("Team created successfully!");
            
            // Sync to Firestore for persistent analytics
            if (data && auth.currentUser) {
                createTeamSync(
                    data.id || data._id, 
                    data.name, 
                    auth.currentUser.uid, 
                    data.inviteCode,
                    selectedLogoId
                );
            }
            
            // Invalidate queries to refresh UI
            queryClient.invalidateQueries({ queryKey: ['me', auth.currentUser?.uid] });
            queryClient.invalidateQueries({ queryKey: ['myTeams', auth.currentUser?.uid] });
            
            if (onSuccess) {onSuccess();}
            onOpenChange(false);
            setTeamName("");
            setInvites([]);
        },
        onError: (error: any) => {
            console.error("Error creating team:", error);
            toast.error(error.message);
        }
    });

    const handleAddInvite = (e: React.KeyboardEvent | React.MouseEvent) => {
        if ((e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') || !currentInvite.trim()) {return;}
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

    const handleCreateTeam = (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamName.trim()) {
            toast.error("Please enter a team name");
            return;
        }
        createTeamMutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Team</DialogTitle>
                    <DialogDescription>
                        Start a new team to collaborate with others.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="teamName">Team Name</Label>
                        <Input
                            id="teamName"
                            placeholder="e.g. Engineering Alpha"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Team Type</Label>
                        <Select value={teamType} onValueChange={setTeamType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                {TEAM_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Team Logo</Label>
                        <ScrollArea className="h-[200px] w-full rounded-2xl border border-border/10 p-4 bg-card/50 backdrop-blur-md">
                            <div className="grid grid-cols-6 gap-3">
                                {TEAM_LOGOS.map((logo) => {
                                    const Icon = logo.icon;
                                    return (
                                        <Button
                                            key={logo.id}
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-10 w-10 p-0 transition-all hover:bg-white/10",
                                                selectedLogoId === logo.id ? "bg-white/15 ring-2 ring-white/20" : ""
                                            )}
                                            onClick={() => setSelectedLogoId(logo.id)}
                                            title={logo.label}
                                        >
                                            <span
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border"
                                                style={{
                                                    color: logo.fgColor,
                                                    backgroundColor: logo.bgColor,
                                                    borderColor: logo.borderColor
                                                }}
                                            >
                                                <Icon className="h-4 w-4" />
                                            </span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="space-y-2">
                        <Label>Invite Members (Optional)</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="colleague@example.com"
                                value={currentInvite}
                                onChange={(e) => setCurrentInvite(e.target.value)}
                                onKeyDown={handleAddInvite}
                            />
                            <Button type="button" onClick={handleAddInvite} variant="secondary">Add</Button>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-2">
                            {invites.map((invite) => (
                                <div key={invite.email} className="bg-card/50 border border-border/10 backdrop-blur-md text-foreground px-2 py-1 rounded-lg text-sm flex items-center gap-1">
                                    {invite.email}
                                    <button onClick={() => removeInvite(invite.email)} className="hover:text-destructive">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleCreateTeam} disabled={createTeamMutation.isPending}>
                        {createTeamMutation.isPending ? "Creating..." : "Create Team"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
