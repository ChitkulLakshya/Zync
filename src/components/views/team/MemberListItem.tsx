import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MoreVertical, MessageSquare, Crown, Shield, ShieldOff, UserMinus, ArrowRightLeft, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getFullUrl, getUserName, getUserInitials, API_BASE_URL, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function MemberListItem({
  user,
  currentUser,
  teamInfo,
  statusData,
  onChat,
  refreshTeamQueries,
  setTeamsData,
}: any) {
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferPin, setTransferPin] = useState('');

  const status = statusData?.status || 'offline';
  const lastSeenDate = statusData?.lastSeen ? new Date(statusData.lastSeen) : null;
  let statusText = status;
  if (lastSeenDate && !isNaN(lastSeenDate.getTime())) {
    try {
      const duration = formatDistanceToNow(lastSeenDate, { addSuffix: false })
        .replace('less than a minute', '1m')
        .replace(' minutes', 'm')
        .replace(' minute', 'm')
        .replace(' hours', 'h')
        .replace(' hour', 'h')
        .replace(' days', 'd')
        .replace(' day', 'd');
      statusText = status === 'online' ? `Online (${duration})` : `Offline ${duration}`;
    } catch (e) {}
  }

  const displayName = getUserName(user);
  const isMemberOwner = user.uid === teamInfo?.ownerId;
  const isMemberAdmin = teamInfo?.admins?.includes(user.uid);
  const isYou = user.uid === currentUser?.uid;
  const amITheOwner = teamInfo?.ownerId === currentUser?.uid;
  const amIAdmin = teamInfo?.admins?.includes(currentUser?.uid);

  const canManage = (amITheOwner || amIAdmin) && !isMemberOwner && !isYou;

  const handleRemoveMember = async () => {
    if (!window.confirm('Remove this member from the team?')) {return;}
    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamInfo.id}/remove-member`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });
      if (!res.ok) {throw new Error('Failed to remove member');}
      toast({ title: 'Member Removed', description: 'Successfully removed from the team.' });
      setTeamsData((prev: any[]) => prev.map((t) => t.id === teamInfo.id ? { ...t, members: t.members.filter((uid: string) => uid !== user.uid) } : t));
      refreshTeamQueries();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAdmin = async () => {
    setActionLoading(true);
    try {
      const endpoint = isMemberAdmin ? 'demote-admin' : 'promote-admin';
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamInfo.id}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      if (!res.ok) {throw new Error(`Failed to ${isMemberAdmin ? 'demote' : 'promote'} member`);}
      toast({ title: 'Success', description: `Member ${isMemberAdmin ? 'demoted from' : 'promoted to'} admin.` });
      refreshTeamQueries();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (transferPin.length < 4) {return;}
    setActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamInfo.id}/transfer-ownership`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId: user.uid, pin: transferPin }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to transfer ownership');
      }
      toast({ title: 'Success', description: 'Ownership transferred successfully' });
      setTransferDialogOpen(false);
      refreshTeamQueries();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-xl border border-border/10 bg-card/50 hover:bg-card/80 transition-all shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-12 w-12 border border-transparent ring-1 ring-border/10 transition-all">
              <AvatarImage src={getFullUrl(user.photoURL)} className="object-cover" referrerPolicy="no-referrer" />
              <AvatarFallback className="bg-muted text-foreground font-bold">{getUserInitials(user)}</AvatarFallback>
            </Avatar>
            <span
              className={cn(
                'absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-background shadow-none',
                status === 'online' ? 'bg-green-500' : status === 'away' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
              )}
            />
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">{displayName}</span>
              {isYou && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full font-semibold">You</span>}
              {isMemberOwner && (
                <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Crown className="h-3 w-3" /> Owner
                </span>
              )}
              {isMemberAdmin && !isMemberOwner && (
                <span className="text-[10px] text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Admin
                </span>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end gap-1 text-right">
            <Badge
              variant="secondary"
              className={cn(
                'text-[10px] px-2 h-5 font-medium capitalize border-0',
                status === 'online' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-card/50 border border-border/10 text-muted-foreground'
              )}
            >
              {statusText}
            </Badge>
          </div>

          <div className="flex items-center gap-2 border-l border-border/10 pl-4 ml-2">
            {!isYou && (
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={() => onChat(user)}>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {amITheOwner && (
                    <DropdownMenuItem onClick={() => setTransferDialogOpen(true)} className="cursor-pointer text-amber-600 dark:text-amber-500">
                      <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer Ownership
                    </DropdownMenuItem>
                  )}
                  {amITheOwner && (
                    <DropdownMenuItem onClick={handleToggleAdmin} className="cursor-pointer">
                      {isMemberAdmin ? <ShieldOff className="mr-2 h-4 w-4" /> : <Shield className="mr-2 h-4 w-4" />}
                      {isMemberAdmin ? 'Demote Admin' : 'Make Admin'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleRemoveMember} className="cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground">
                    <UserMinus className="mr-2 h-4 w-4" /> Remove Member
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Transfer Ownership PIN Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Transfer Ownership</DialogTitle>
            <DialogDescription>
              Are you sure you want to make <strong>{displayName}</strong> the owner of this team?
              You will be demoted to an admin.
              <br/><br/>
              Please enter your Security PIN to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="Enter Security PIN"
              value={transferPin}
              onChange={(e) => setTransferPin(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              className="text-center tracking-[0.5em] text-lg font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTransferDialogOpen(false); setTransferPin(''); }} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleTransferOwnership} disabled={actionLoading || transferPin.length < 4}>
              {actionLoading ? 'Transferring...' : 'Transfer Ownership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
