import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Clock3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MobileActivityLogViewProps {
  activityLogs: any[];
  tasks: any[];
  users?: any[];
  teamSessions?: any[];
  ownedTeams?: any[];
  myTeams?: any[];
  currentUserId?: string;
  currentUserProfile?: {
    displayName?: string;
    email?: string;
    photoURL?: string;
  } | null;
  teamTasks?: any[];
  elapsedTime: string;
  onClearLogs: () => void;
  onDeleteLog: (id: string) => void;
}

const normalizeStatus = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .trim();

const isCompleted = (task: any) => {
  const status = normalizeStatus(task?.status);
  return status.includes('complete') || status === 'done';
};

const isInProgress = (task: any) => {
  if (isCompleted(task)) {
    return false;
  }
  const status = normalizeStatus(task?.status);
  return status.includes('progress') || status === 'active' || status === 'in review';
};

const isOverdue = (task: any) => {
  if (isCompleted(task)) {
    return false;
  }
  const due = task?.dueDate || task?.deadline;
  if (!due) {
    return false;
  }
  return new Date(due).getTime() < Date.now();
};

const MobileActivityLogView = ({
  activityLogs,
  tasks,
  users = [],
  teamSessions = [],
  ownedTeams = [],
  myTeams = [],
  currentUserId,
  currentUserProfile,
  teamTasks = [],
  elapsedTime,
  onClearLogs,
  onDeleteLog,
}: MobileActivityLogViewProps) => {
  const totalTasks = tasks.length;
  const completed = tasks.filter(isCompleted).length;
  const inProgress = tasks.filter(isInProgress).length;
  const overdue = tasks.filter(isOverdue).length;
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const elapsedSeconds = (() => {
    const [h, m, s] = elapsedTime.split(':').map((part) => Number(part) || 0);
    return h * 3600 + m * 60 + s;
  })();

  const ownedTeamIds = new Set(
    (Array.isArray(ownedTeams) ? ownedTeams : [])
      .map((team: any) => String(team?.id || team?._id || team?.teamId || ''))
      .filter(Boolean)
  );

  const fallbackOwnedFromMyTeams = (Array.isArray(myTeams) ? myTeams : []).filter((team: any) => {
    const owner = String(
      team?.ownerId || team?.ownerUid || team?.leaderId || team?.createdBy || ''
    );
    return Boolean(owner) && owner === currentUserId;
  });

  fallbackOwnedFromMyTeams.forEach((team: any) => {
    const id = String(team?.id || team?._id || team?.teamId || '');
    if (id) {
      ownedTeamIds.add(id);
    }
  });

  const isLeader = ownedTeamIds.size > 0;

  const teamMemberStats = (() => {
    if (!isLeader) {
      return [];
    }

    const members = new Map<
      string,
      { uid: string; displayName: string; email?: string; photoURL?: string }
    >();
    const teamList = [...(ownedTeams || []), ...fallbackOwnedFromMyTeams];

    teamList.forEach((team: any) => {
      (team?.members || []).forEach((member: any) => {
        const uid = String(
          typeof member === 'string' ? member : member?.uid || member?.id || member?._id || ''
        );
        if (!uid) {
          return;
        }
        const profileFromUsers = users.find((user: any) => user.uid === uid);
        members.set(uid, {
          uid,
          displayName:
            profileFromUsers?.displayName ||
            (typeof member === 'object' ? member?.displayName || member?.name : '') ||
            uid,
          email:
            profileFromUsers?.email || (typeof member === 'object' ? member?.email : undefined),
          photoURL:
            profileFromUsers?.photoURL ||
            (typeof member === 'object' ? member?.photoURL : undefined),
        });
      });
    });

    users.forEach((user: any) => {
      const memberships = Array.isArray(user?.teamMemberships)
        ? user.teamMemberships.map(String)
        : [];
      if (memberships.some((teamId: string) => ownedTeamIds.has(teamId))) {
        members.set(user.uid, {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || user.uid,
          email: user.email,
          photoURL: user.photoURL,
        });
      }
    });

    const totals = new Map<string, number>();
    (teamSessions || []).forEach((session: any) => {
      const uid = String(session?.userId || '');
      if (!uid || !members.has(uid)) {
        return;
      }
      const secs = Number(session?.activeDuration || 0);
      totals.set(uid, (totals.get(uid) || 0) + secs);
    });

    if (currentUserId && members.has(currentUserId)) {
      totals.set(currentUserId, (totals.get(currentUserId) || 0) + elapsedSeconds);
    }

    return Array.from(members.values())
      .map((member) => ({
        ...member,
        activeSeconds: totals.get(member.uid) || 0,
      }))
      .sort((a, b) => b.activeSeconds - a.activeSeconds);
  })();

  const toTimeLabel = (totalSeconds: number) => {
    const safe = Math.max(0, totalSeconds);
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const memberTaskStats = useMemo(() => {
    const statsMap = new Map<
      string,
      { total: number; completed: number; inProgress: number; overdue: number }
    >();

    (Array.isArray(teamTasks) ? teamTasks : []).forEach((task: any) => {
      const assignees = new Set<string>();
      if (task?.assignedTo) {
        assignees.add(String(task.assignedTo));
      }
      if (Array.isArray(task?.assignedUserIds)) {
        task.assignedUserIds.forEach((uid: any) => assignees.add(String(uid)));
      }
      if (assignees.size === 0) {
        return;
      }

      assignees.forEach((uid) => {
        const current = statsMap.get(uid) || { total: 0, completed: 0, inProgress: 0, overdue: 0 };
        current.total += 1;
        if (isCompleted(task)) {
          current.completed += 1;
        } else if (isInProgress(task)) {
          current.inProgress += 1;
        } else if (isOverdue(task)) {
          current.overdue += 1;
        }
        statsMap.set(uid, current);
      });
    });

    return statsMap;
  }, [teamTasks]);

  return (
    <div className="p-4 space-y-4">
      <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-foreground" />
            Activity Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-border/10 bg-background/50 backdrop-blur-md p-2.5 flex items-center gap-2.5 shadow-sm">
            <Avatar className="h-9 w-9">
              <AvatarImage src={currentUserProfile?.photoURL} />
              <AvatarFallback>
                {currentUserProfile?.displayName?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {currentUserProfile?.displayName || 'Your Profile'}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {currentUserProfile?.email || currentUserId || ''}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Current session: {elapsedTime}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border/10 bg-background/50 backdrop-blur-md p-2 shadow-sm">
              <p className="text-[11px] text-muted-foreground">Total Tasks</p>
              <p className="text-lg font-semibold">{totalTasks}</p>
            </div>
            <div className="rounded-xl border border-border/10 bg-background/50 backdrop-blur-md p-2 shadow-sm">
              <p className="text-[11px] text-muted-foreground">Completed</p>
              <p className="text-lg font-semibold">{completed}</p>
            </div>
            <div className="rounded-xl border border-border/10 bg-background/50 backdrop-blur-md p-2 shadow-sm">
              <p className="text-[11px] text-muted-foreground">In Progress</p>
              <p className="text-lg font-semibold">{inProgress}</p>
            </div>
            <div className="rounded-xl border border-border/10 bg-background/50 backdrop-blur-md p-2 shadow-sm">
              <p className="text-[11px] text-muted-foreground">Overdue</p>
              <p className="text-lg font-semibold">{overdue}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLeader && (
        <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Team Member Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {teamMemberStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No team activity found yet.
              </p>
            ) : (
              teamMemberStats.slice(0, 12).map((member) => {
                const memberLabel = member.uid === currentUserId ? 'You' : member.displayName;
                const stats = memberTaskStats.get(member.uid) || {
                  total: 0,
                  completed: 0,
                  inProgress: 0,
                  overdue: 0,
                };
                const isExpanded = expandedMemberId === member.uid;

                return (
                  <div key={`member-${member.uid}`} className="space-y-1.5">
                    <button
                      type="button"
                      className="w-full rounded-xl border border-border/10 bg-background/50 backdrop-blur-md p-2.5 flex items-center gap-2.5 text-left shadow-sm active:scale-[0.98] transition-transform"
                      onClick={() =>
                        setExpandedMemberId((prev) => (prev === member.uid ? null : member.uid))
                      }
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.photoURL} />
                        <AvatarFallback>
                          {member.displayName?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{memberLabel}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {member.email || member.uid}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">{toTimeLabel(member.activeSeconds)}</p>
                    </button>

                    {isExpanded && (
                      <div className="rounded-xl border border-border/10 bg-background/30 backdrop-blur-sm p-2.5 grid grid-cols-2 gap-2 animate-in slide-in-from-top-1 duration-200">
                        <div className="rounded-lg border border-border/10 bg-background/50 backdrop-blur-sm px-2 py-1.5 shadow-sm">
                          <p className="text-[10px] text-muted-foreground">Total Tasks</p>
                          <p className="text-sm font-semibold">{stats.total}</p>
                        </div>
                        <div className="rounded-lg border border-border/10 bg-background/50 backdrop-blur-sm px-2 py-1.5 shadow-sm">
                          <p className="text-[10px] text-muted-foreground">Completed</p>
                          <p className="text-sm font-semibold">{stats.completed}</p>
                        </div>
                        <div className="rounded-lg border border-border/10 bg-background/50 backdrop-blur-sm px-2 py-1.5 shadow-sm">
                          <p className="text-[10px] text-muted-foreground">In Progress</p>
                          <p className="text-sm font-semibold">{stats.inProgress}</p>
                        </div>
                        <div className="rounded-lg border border-border/10 bg-background/50 backdrop-blur-sm px-2 py-1.5 shadow-sm">
                          <p className="text-[10px] text-muted-foreground">Overdue</p>
                          <p className="text-sm font-semibold">{stats.overdue}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          {activityLogs.length > 0 && (
            <Button size="sm" variant="outline" onClick={onClearLogs}>
              Clear
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {activityLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No activity yet.</p>
          ) : (
            activityLogs.slice(0, 20).map((log, index) => {
              const start = new Date(log.startTime);
              const title = log.title || log.eventType || 'Activity session';
              const logKey =
                log._id ||
                `${log.startTime || 'no-start'}-${log.eventType || title}-${log.userId || 'no-user'}-${index}`;
              return (
                <div
                  key={logKey}
                  className="rounded-xl border border-border/10 bg-background/50 backdrop-blur-md p-3 flex items-start gap-2 shadow-sm"
                >
                  <Clock3 className="h-4 w-4 text-foreground mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(start, { addSuffix: true })}
                    </p>
                  </div>
                  {log._id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => onDeleteLog(log._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileActivityLogView;
