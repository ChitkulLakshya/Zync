import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User } from 'firebase/auth';
import { Video, Clock, Plus, Users, Link as LinkIcon, Trash2, Loader2, Circle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/utils';
import { useMe } from '@/hooks/useMe';
import { useConfirm } from '@/hooks/use-confirm';
import { format } from 'date-fns';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';

interface Meeting {
  id: string;
  title: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  startTime: string;
  endTime?: string;
  meetLink: string;
  participants: any[];
  organizerName: string;
  organizerId: string;
}

interface MobileMeetProps {
  currentUser: User | null;
  usersList: any[];
  userStatuses?: Record<string, any>;
}

const MobileMeet = ({ currentUser, usersList }: MobileMeetProps) => {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { data: userData } = useMe();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: meetings = [], refetch, isLoading } = useQuery<Meeting[]>({
    queryKey: ['meetings', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) {return [];}
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/meetings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {return [];}
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!currentUser,
    refetchInterval: 30000,
  });

  const handleCreateMeeting = async () => {
    if (!newTitle.trim()) {return;}
    setIsCreating(true);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: newTitle,
          organizerId: currentUser?.uid,
          organizerName: currentUser?.displayName || 'Unknown',
        }),
      });
      if (!res.ok) {throw new Error('Failed');}
      const meeting = await res.json();
      toast({ title: 'Meeting created', description: 'Share the link to invite others.' });
      setCreateOpen(false);
      setNewTitle('');
      refetch();
    } catch {
      toast({ title: 'Error', description: 'Failed to create meeting.', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Meeting',
      description: 'Are you sure you want to delete this meeting?',
    });
    if (!isConfirmed) {return;}
    try {
      const token = await currentUser?.getIdToken();
      await fetch(`${API_BASE_URL}/api/meetings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      refetch();
      toast({ title: 'Meeting deleted' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete meeting.', variant: 'destructive' });
    }
  };

  const liveMeetings = meetings.filter(m => m.status === 'live');
  const scheduledMeetings = meetings.filter(m => m.status === 'scheduled');
  const pastMeetings = meetings.filter(m => m.status === 'ended' || m.status === 'cancelled');

  if (!userData?.teamId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
          <Video className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">Team Required</h3>
        <p className="text-sm text-muted-foreground">Join a team to start video meetings.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="pl-4 pr-14 py-3 shrink-0 border-b border-border/10 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Meet</h2>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> New
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
              <Video className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No meetings</h3>
            <p className="text-sm text-muted-foreground mb-4">Create a meeting to get started.</p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Create Meeting
            </Button>
          </div>
        ) : (
          <>
            {liveMeetings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Now
                </p>
                {liveMeetings.map(m => <MeetingCard key={m.id} meeting={m} onDelete={() => handleDeleteMeeting(m.id)} />)}
              </div>
            )}
            {scheduledMeetings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scheduled</p>
                {scheduledMeetings.map(m => <MeetingCard key={m.id} meeting={m} onDelete={() => handleDeleteMeeting(m.id)} />)}
              </div>
            )}
            {pastMeetings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Past</p>
                {pastMeetings.slice(0, 10).map(m => <MeetingCard key={m.id} meeting={m} onDelete={() => handleDeleteMeeting(m.id)} />)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Meeting Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom" className="p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>New Meeting</SheetTitle>
            <SheetDescription>Create a new video meeting.</SheetDescription>
          </SheetHeader>
          <div className="px-4 py-3 border-b border-border/10">
            <h2 className="font-semibold text-lg">New Meeting</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Meeting Title</Label>
              <Input
                placeholder="Team standup"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="h-10"
              />
            </div>
            <Button className="w-full" disabled={isCreating || !newTitle.trim()} onClick={handleCreateMeeting}>
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Video className="w-4 h-4 mr-2" />}
              Create Meeting
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

const MeetingCard = ({ meeting, onDelete }: { meeting: Meeting; onDelete: () => void }) => {
  const isLive = meeting.status === 'live';
  return (
    <Card className="border border-border/10 p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isLive ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span className="text-sm font-medium truncate">{meeting.title}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{format(new Date(meeting.startTime), 'MMM d, h:mm a')}</span>
          </div>
        </div>
        <Badge variant={isLive ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
          {meeting.status}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{meeting.participants?.length || 0}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { navigator.clipboard?.writeText(meeting.meetLink); }}
          >
            <LinkIcon className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default MobileMeet;
