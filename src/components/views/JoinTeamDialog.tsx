import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/firebase';
import { API_BASE_URL } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTeamPersistence } from '@/hooks/useTeamPersistence';

interface JoinTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const JoinTeamDialog = ({ open, onOpenChange, onSuccess }: JoinTeamDialogProps) => {
  const [inviteCode, setInviteCode] = useState('');
  const { joinTeamSync } = useTeamPersistence(auth.currentUser?.uid);
  const queryClient = useQueryClient();

  const joinTeamMutation = useMutation({
    mutationFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/teams/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteCode }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to join team');
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success('Joined team successfully!');

      // Sync to Firestore for persistent analytics
      if (auth.currentUser) {
        joinTeamSync(data || inviteCode, auth.currentUser.uid);
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['me', auth.currentUser?.uid] });
      queryClient.invalidateQueries({ queryKey: ['myTeams', auth.currentUser?.uid] });

      if (onSuccess) {
        onSuccess();
      }
      onOpenChange(false);
      setInviteCode('');
    },
    onError: (error: any) => {
      console.error('Error joining team:', error);
      toast.error(error.message);
    },
  });

  const handleJoinTeam = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteCode.trim() || inviteCode.length !== 6) {
      toast.error('Please enter a valid 6-digit invite code');
      return;
    }

    joinTeamMutation.mutate();
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
              disabled={joinTeamMutation.isPending}
              className="h-12 text-center tracking-[0.5em] text-lg font-mono uppercase"
            />
            <p className="text-xs text-muted-foreground text-center">
              Ask your team admin for the invite code found in the "People" tab.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={joinTeamMutation.isPending}>
              {joinTeamMutation.isPending ? 'Joining...' : 'Join Team'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
