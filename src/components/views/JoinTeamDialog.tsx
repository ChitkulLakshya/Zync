import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/firebase";
import { API_BASE_URL } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface JoinTeamDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export const JoinTeamDialog = ({ open, onOpenChange, onSuccess }: JoinTeamDialogProps) => {
    const [inviteCode, setInviteCode] = useState("");
    const [loading, setLoading] = useState(false);

    const handleJoinTeam = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
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
            onOpenChange(false);
            setInviteCode("");
        } catch (error: any) {
            console.error("Error joining team:", error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Join an Existing Team</DialogTitle>
                    <DialogDescription>
                        Enter the 6-digit invite code shared by your team admin to join their team.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleJoinTeam} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="inviteCode">Invite Code</Label>
                        <Input
                            id="inviteCode"
                            placeholder="123456"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            maxLength={6}
                            disabled={loading}
                            className="h-12 text-center tracking-[0.5em] text-lg font-mono uppercase"
                        />
                        <p className="text-xs text-muted-foreground text-center">
                            Ask your team admin for the invite code found in the "People" tab.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Joining..." : "Join Team"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
