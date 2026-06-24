import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
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
  currentPermissions = {},
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('editor');
  const [loading, setLoading] = useState(false);

  const publicLink = `${window.location.origin}/notes/${noteId}`;

  const handleInvite = async () => {
    if (!email) {
      return;
    }
    setLoading(true);
    try {
      toast.info('Invite by email coming soon! Please share the link.');
    } catch (e: any) {
      toast.error('Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!currentPermissions) {
      return;
    }

    const newPermissions = { ...currentPermissions };
    delete newPermissions[userId];

    try {
      await updateNotePermissions(noteId, newPermissions);
      toast.success('Collaborator removed');
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to remove collaborator');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink);
    toast.success('Link copied to clipboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Note</DialogTitle>
          <DialogDescription>Collaborate with others on this note.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {}
          <div className="space-y-2">
            <Label>Note Link</Label>
            <div className="flex gap-2">
              <Input readOnly value={publicLink} className="flex-1" />
              <Button variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {}
          <div className="space-y-2">
            <Label>Invite by Email (Coming Soon)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button disabled={loading || !email} onClick={handleInvite}>
                {loading ? 'Inviting...' : 'Invite'}
              </Button>
            </div>
          </div>

          {}
          {Object.keys(currentPermissions).length > 0 && (
            <div className="space-y-2">
              <Label>People with access</Label>
              <div className="text-sm text-muted-foreground border border-border/10 rounded-xl bg-secondary/5 p-2">
                {}
                {Object.entries(currentPermissions).map(([uid, role]) => (
                  <div
                    key={uid}
                    className="flex justify-between items-center py-2 border-b border-border/10 last:border-0"
                  >
                    <span className="font-mono text-xs">{uid.slice(0, 8)}...</span>
                    <div className="flex items-center gap-2">
                      <span className="capitalize text-xs bg-secondary px-2 py-0.5 rounded">
                        {role}
                      </span>
                      {role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveCollaborator(uid)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
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
