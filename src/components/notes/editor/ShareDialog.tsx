import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Copy } from "lucide-react";
import { updateNotePermissions } from '../../../services/notesService';

interface ShareDialogProps {
    noteId: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    currentPermissions?: Record<string, 'viewer' | 'editor' | 'owner'>;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
    noteId,
    isOpen,
    onOpenChange,
    currentPermissions = {}
}) => {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<'viewer' | 'editor'>('editor');
    const [loading, setLoading] = useState(false);

    // Deriving public link (simple approach for now)
    const publicLink = `${window.location.origin}/notes/${noteId}`;

    const handleInvite = async () => {
        if (!email) return;
        setLoading(true);
        try {
            // Since we don't have a backend "search user by email" endpoint readily available here,
            // we might need to assume we add by email via backend logic or just simulate for now if SDK allows.
            // BUT, better approach: The service `updateNotePermissions` likely takes a userId. 
            // We'll ask the User to input User ID for now OR we assume the backend handles email lookups (feature gap).
            // Let's assume for this step we need to implement the backend/service part later if missing.
            // Wait, `updateNotePermissions` takes `userId`. We don't have the ID from email here.
            // For MVP/Demo: Just copy link.

            // Actually, let's just implement "Copy Link" mainly, and maybe a placeholder for "Invite by Email".
            // Real invites need a user lookup.

            toast.info("Invite by email coming soon! Please share the link.");

        } catch (e: any) {
            toast.error("Failed to invite user");
        } finally {
            setLoading(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(publicLink);
        toast.success("Link copied to clipboard");
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Share Note</DialogTitle>
                    <DialogDescription>
                        Collaborate with others on this note.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">

                    {/* Public Link Section */}
                    <div className="space-y-2">
                        <Label>Note Link</Label>
                        <div className="flex gap-2">
                            <Input readOnly value={publicLink} className="flex-1" />
                            <Button variant="outline" onClick={copyLink}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Invite Section (Placeholder/UI only until user search implemented) */}
                    <div className="space-y-2">
                        <Label>Invite by Email (Coming Soon)</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="colleague@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <Button disabled={loading || !email} onClick={handleInvite}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
                            </Button>
                        </div>
                    </div>

                    {/* Existing Collaborators List could go here */}
                    {Object.keys(currentPermissions).length > 0 && (
                        <div className="space-y-2">
                            <Label>People with access</Label>
                            <div className="text-sm text-muted-foreground">
                                {/* Iterate and show avatars/names if available */}
                                {Object.entries(currentPermissions).map(([uid, role]) => (
                                    <div key={uid} className="flex justify-between items-center py-1">
                                        <span>{uid.slice(0, 8)}...</span>
                                        <span className="capitalize text-xs bg-secondary px-2 py-0.5 rounded">{role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </DialogContent>
        </Dialog>
    );
};
