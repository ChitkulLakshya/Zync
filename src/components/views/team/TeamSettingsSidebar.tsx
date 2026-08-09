import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Camera, Pencil, Check, Copy, ShieldAlert, Plus } from 'lucide-react';
import { TeamLogoDisplay } from '@/components/ui/TeamLogoDisplay';
import ProfilePhotoCropper from '@/components/ProfilePhotoCropper';
import { API_BASE_URL } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function TeamSettingsSidebar({
  teamInfo,
  currentUser,
  refreshTeamQueries,
  setTeamInfo,
  className,
}: any) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [teamNameDraft, setTeamNameDraft] = useState('');
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const teamNameInputRef = useRef<HTMLInputElement>(null);

  const teamFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingTeamPhoto, setIsUploadingTeamPhoto] = useState(false);
  const [teamCropperOpen, setTeamCropperOpen] = useState(false);
  const [teamCropperImage, setTeamCropperImage] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePin, setDeletePin] = useState('');
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    setTeamNameDraft(teamInfo?.name || '');
    setIsEditingTeamName(false);
  }, [teamInfo?.name]);

  useEffect(() => {
    if (isEditingTeamName) {
      setTimeout(() => {
        teamNameInputRef.current?.focus();
        teamNameInputRef.current?.select();
      }, 0);
    }
  }, [isEditingTeamName]);

  if (!teamInfo || !currentUser) {return null;}
  const amITheOwner = teamInfo.ownerId === currentUser.uid;

  const handleTeamFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setTeamCropperImage(reader.result as string);
        setTeamCropperOpen(true);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleTeamCroppedUpload = async (croppedBlob: Blob) => {
    setTeamCropperOpen(false);
    setIsUploadingTeamPhoto(true);
    try {
      const token = await currentUser.getIdToken();
      const formData = new FormData();
      formData.append('file', croppedBlob, 'team-photo.jpg');

      const response = await fetch(`${API_BASE_URL}/api/upload/team-photo/${teamInfo.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Upload failed');
      }

      const data = await response.json();
      setTeamInfo((prev: any) => (prev ? { ...prev, logoId: data.logoId } : null));
      queryClient.invalidateQueries({ queryKey: ['myTeams', currentUser.uid] });
      toast({ title: 'Success', description: 'Team photo updated successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploadingTeamPhoto(false);
    }
  };

  const handleUpdateTeamName = async () => {
    if (!teamNameDraft.trim() || teamNameDraft === teamInfo.name) {
      setIsEditingTeamName(false);
      return;
    }
    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamInfo.id}/name`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamNameDraft.trim() }),
      });
      if (!res.ok) {throw new Error('Failed to update name');}

      setTeamInfo((prev: any) => (prev ? { ...prev, name: teamNameDraft.trim() } : null));
      toast({ title: 'Saved', description: 'Team name updated.' });
      refreshTeamQueries();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
      setIsEditingTeamName(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (deletePin.length < 4) {
      toast({ title: 'Error', description: 'Invalid PIN length', variant: 'destructive' });
      return;
    }
    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamInfo.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: deletePin }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete team');
      }

      toast({ title: 'Team Deleted', description: 'The team has been permanently deleted.' });
      setDeleteDialogOpen(false);
      setTeamInfo(null);
      await refreshTeamQueries();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={cn("hidden lg:flex lg:w-80 shrink-0 flex-col bg-[#121212] p-6", className)}>
      <div className="space-y-4">
        {/* Team Photo */}
        <div className="flex flex-col items-center justify-center">
          <div
            className="relative group cursor-pointer mb-2"
            onClick={() => amITheOwner && teamFileInputRef.current?.click()}
          >
            <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-border/20 shadow-xl group-hover:border-primary/50 transition-colors">
              <TeamLogoDisplay 
                logoId={teamInfo.logoId} 
                teamName={teamInfo.name} 
                className="h-full w-full rounded-none" 
              />
            </div>
            {amITheOwner && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                {isUploadingTeamPhoto ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-white mb-1" />
                    <span className="text-[10px] text-white font-medium">Update Photo</span>
                  </>
                )}
              </div>
            )}
          </div>
          <input
            type="file"
            ref={teamFileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleTeamFileSelect}
          />
        </div>

        {/* Team Name */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Team Name</Label>
          <div className="flex items-center gap-2">
            {isEditingTeamName ? (
              <div className="flex items-center gap-2 w-full">
                <Input
                  ref={teamNameInputRef}
                  value={teamNameDraft}
                  onChange={(e) => setTeamNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {handleUpdateTeamName();}
                    if (e.key === 'Escape') {
                      setTeamNameDraft(teamInfo.name);
                      setIsEditingTeamName(false);
                    }
                  }}
                  className="h-9"
                />
                <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleUpdateTeamName} disabled={actionLoading}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full bg-card/50 px-3 py-2 rounded-md border border-border/10">
                <span className="font-semibold truncate">{teamInfo.name}</span>
                {amITheOwner && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setIsEditingTeamName(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Invite Code */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Invite Code</Label>
          <div 
            className="flex items-center justify-between w-full bg-card/50 px-3 py-2 rounded-md border border-border/10 cursor-pointer hover:border-primary/30 transition-colors group"
            onClick={() => {
              navigator.clipboard.writeText(teamInfo.inviteCode);
              toast({ description: 'Invite code copied to clipboard' });
            }}
          >
            <code className="font-mono font-bold text-lg tracking-widest">{teamInfo.inviteCode}</code>
            <Copy className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>

        {/* Invite Member Button */}
        {amITheOwner && (
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 border-border/20 bg-card/50 hover:bg-foreground hover:text-background transition-colors"
              onClick={() => setInviteOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Invite Member
            </Button>
          </div>
        )}

        {/* Delete Team */}
        {amITheOwner && (
          <div className="pt-4 border-t border-border/10 mt-4">
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-4 flex flex-col items-start gap-3">
                <div className="flex items-center gap-2 text-destructive font-semibold">
                  <ShieldAlert className="h-4 w-4" />
                  Danger Zone
                </div>
                <p className="text-xs text-muted-foreground">
                  Permanently delete this team and all its data. This action cannot be undone.
                </p>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-full font-bold"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete Team
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <ProfilePhotoCropper
        open={teamCropperOpen}
        imageSrc={teamCropperImage}
        title="Adjust Team Photo"
        onClose={() => setTeamCropperOpen(false)}
        onCropComplete={handleTeamCroppedUpload}
      />

      {/* Delete PIN Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{teamInfo.name}</strong>? This action cannot be undone.
              <br/><br/>
              Please enter your Security PIN to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              type="password"
              placeholder="Enter Security PIN"
              value={deletePin}
              onChange={(e) => setDeletePin(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              className="text-center tracking-[0.5em] text-lg font-mono"
            />
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="delete-confirm-checkbox" 
                checked={deleteConfirmChecked} 
                onCheckedChange={(checked) => setDeleteConfirmChecked(checked === true)} 
              />
              <Label htmlFor="delete-confirm-checkbox" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I confirm I want to delete this team
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeletePin(''); setDeleteConfirmChecked(false); }} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTeam} disabled={actionLoading || deletePin.length < 4 || !deleteConfirmChecked}>
              {actionLoading ? 'Deleting...' : 'Delete Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
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
            <Button
              type="submit"
              disabled={inviteLoading}
              onClick={async () => {
                if (!inviteEmail) {return;}
                setInviteLoading(true);
                try {
                  const token = await currentUser?.getIdToken();
                  const res = await fetch(`${API_BASE_URL}/api/teams/invite`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ email: inviteEmail }),
                  });

                  if (res.ok) {
                    toast({
                      title: 'Invitation Sent',
                      description: `Invite sent to ${inviteEmail}`,
                    });
                    setInviteOpen(false);
                    setInviteEmail('');
                  } else {
                    const err = await res.json();
                    toast({
                      title: 'Error',
                      description: err.message,
                      variant: 'destructive',
                    });
                    if (err.message.includes('Invited user already exists')) {
                      alert('User already in team');
                    }
                  }
                } catch (e) {
                  console.error(e);
                  toast({
                    title: 'Error',
                    description: 'Failed to send invite',
                    variant: 'destructive',
                  });
                } finally {
                  setInviteLoading(false);
                }
              }}
            >
              {inviteLoading ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
