/** Central data hook for the Activity Log page.
 *  Owns all derived state (useMemo) and the two persistence side effects, so
 *  the presentational components stay pure. */

import { useEffect, useMemo, useState } from 'react';
import {
  format,
  formatDistanceToNow,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';
import { ListTodo, PlayCircle, CheckSquare, Calendar } from 'lucide-react';
import { useTaskPersistence } from '@/hooks/useTaskPersistence';
import { useTeamPersistence } from '@/hooks/useTeamPersistence';
import { getLogoById, getDeterministicLogoId } from '@/lib/team-logos';
import { ActivityLog, ActivityLogViewProps, FeedItem } from './activityTypes';
import {
  normStatus,
  normalizeUid,
  extractOwnerUid,
  isCompletedTask,
  secondsForLogsInRange,
  formatHoursMinutes,
  formatSecondsToHoursMinutes,
} from './activityUtils';

export function useActivityLogData(props: ActivityLogViewProps) {
  const {
    activityLogs,
    elapsedTime,
    handleDeleteLog,
    tasks = [],
    users = [],
    teamSessions = [],
    currentTeamId,
    currentTeamName,
    currentTeamOwnerId,
    currentTeamLogoId,
    ownedTeams = [],
    myTeams: myTeamsFromApi = [],
    currentUserId,
    currentUserDisplayName,
    currentUserPhotoURL,
    currentUserEmail,
  } = props;

  const {
    myTeams: myTeamsFromHook,
    loading: teamsLoading,
    syncTeamsFromApi,
  } = useTeamPersistence(currentUserId);
  const normalizedCurrentUserId = useMemo(() => normalizeUid(currentUserId), [currentUserId]);

  useEffect(() => {
    if (!normalizedCurrentUserId) {
      return;
    }

    syncTeamsFromApi(
      [
        ...(Array.isArray(ownedTeams) ? ownedTeams : []),
        ...(Array.isArray(myTeamsFromApi) ? myTeamsFromApi : []),
      ],
      normalizedCurrentUserId
    );
  }, [syncTeamsFromApi, normalizedCurrentUserId, ownedTeams, myTeamsFromApi]);

  const mergedOwnedTeams = useMemo(() => {
    const map = new Map<string, any>();
    (Array.isArray(ownedTeams) ? ownedTeams : []).forEach((t: any) => {
      const id = t?.id || t?._id || t?.teamId;
      if (!id) {
        return;
      }
      const prev = map.get(id) || {};
      map.set(id, {
        ...prev,
        ...t,
        id,
        name: t?.name || prev?.name || 'Team',
      });
    });
    return Array.from(map.values());
  }, [ownedTeams]);

  const mergedMyTeams = useMemo(() => {
    const map = new Map<string, any>();
    [
      ...(Array.isArray(myTeamsFromApi) ? myTeamsFromApi : []),
      ...(Array.isArray(myTeamsFromHook) ? myTeamsFromHook : []),
    ].forEach((t: any) => {
      const id = t?.id || t?._id;
      if (!id) {
        return;
      }
      const prev = map.get(id) || {};
      map.set(id, { ...prev, ...t, id });
    });
    return Array.from(map.values());
  }, [myTeamsFromApi, myTeamsFromHook]);

  const allTeams = useMemo(() => {
    const map = new Map<string, any>();

    mergedOwnedTeams.forEach((t: any) => {
      const id = t?.id || t?._id;
      if (!id) {
        return;
      }
      const prev = map.get(id) || {};
      map.set(id, {
        ...prev,
        ...t,
        id,
        name: t?.name || prev?.name || 'Team',
        leaderId: extractOwnerUid(t) || prev?.leaderId || normalizedCurrentUserId,
        ownerId: extractOwnerUid(t) || prev?.ownerId,
        ownerUid: extractOwnerUid(t) || prev?.ownerUid,
      });
    });

    mergedMyTeams.forEach((t: any) => {
      const id = t?.id || t?._id;
      if (!id) {
        return;
      }
      const prev = map.get(id) || {};
      map.set(id, {
        ...prev,
        ...t,
        id,
        name: t?.name || prev?.name || 'Team',
        leaderId: extractOwnerUid(t) || prev?.leaderId,
        ownerId: extractOwnerUid(t) || prev?.ownerId,
        ownerUid: extractOwnerUid(t) || prev?.ownerUid,
      });
    });

    if (currentTeamId && !map.has(currentTeamId)) {
      map.set(currentTeamId, {
        id: currentTeamId,
        name: currentTeamName || 'My Team',
        ownerId: normalizeUid(currentTeamOwnerId),
        leaderId: normalizeUid(currentTeamOwnerId),
        logoId: currentTeamLogoId,
      });
    }

    return Array.from(map.values());
  }, [
    mergedOwnedTeams,
    mergedMyTeams,
    normalizedCurrentUserId,
    currentTeamId,
    currentTeamName,
    currentTeamOwnerId,
    currentTeamLogoId,
  ]);

  const ownedTeamIdSet = useMemo(
    () =>
      new Set(
        (Array.isArray(mergedOwnedTeams) ? mergedOwnedTeams : [])
          .map((t: any) => t?.id || t?._id)
          .filter(Boolean)
      ),
    [mergedOwnedTeams]
  );
  const leaderTeams = useMemo(
    () =>
      allTeams.filter((t: any) => {
        const id = t?.id || t?._id;
        if (id && ownedTeamIdSet.has(id)) {
          return true;
        }
        const owner = extractOwnerUid(t);
        return Boolean(normalizedCurrentUserId) && owner === normalizedCurrentUserId;
      }),
    [allTeams, normalizedCurrentUserId, ownedTeamIdSet]
  );
  const teamFilterOptions = useMemo(() => {
    const fromOwned = (Array.isArray(mergedOwnedTeams) ? mergedOwnedTeams : [])
      .map((t: any) => ({
        ...t,
        id: String(t?.id || t?._id || t?.teamId || ''),
        name: t?.name || 'My Team',
      }))
      .filter((t: any) => Boolean(t.id));
    const fromMineOwned = (Array.isArray(mergedMyTeams) ? mergedMyTeams : [])
      .map((t: any) => ({
        ...t,
        id: String(t?.id || t?._id || t?.teamId || ''),
        name: t?.name || 'My Team',
      }))
      .filter((t: any) => {
        if (!t.id || !normalizedCurrentUserId) {
          return false;
        }
        const owner = extractOwnerUid(t);
        return Boolean(owner) && owner === normalizedCurrentUserId;
      });

    if (leaderTeams.length > 0) {
      return leaderTeams;
    }
    if (fromOwned.length > 0) {
      return fromOwned;
    }
    if (fromMineOwned.length > 0) {
      return fromMineOwned;
    }
    const normalizedCurrentTeamOwner = normalizeUid(currentTeamOwnerId);
    if (
      currentTeamId &&
      normalizedCurrentTeamOwner &&
      normalizedCurrentTeamOwner === normalizedCurrentUserId
    ) {
      return [
        {
          id: String(currentTeamId),
          name: currentTeamName || 'My Team',
          ownerId: normalizedCurrentTeamOwner,
          leaderId: normalizedCurrentTeamOwner,
          logoId: currentTeamLogoId,
        },
      ];
    }
    return [];
  }, [
    leaderTeams,
    mergedOwnedTeams,
    mergedMyTeams,
    currentTeamId,
    currentTeamName,
    currentTeamOwnerId,
    currentTeamLogoId,
    normalizedCurrentUserId,
  ]);

  const normalizedTeamFilterOptions = useMemo(() => {
    const map = new Map<string, any>();
    teamFilterOptions.forEach((t: any) => {
      const id = String(t?.id || t?._id || t?.teamId || '');
      if (!id) {
        return;
      }
      map.set(id, {
        ...t,
        id,
        name: t?.name || 'My Team',
      });
    });
    return Array.from(map.values());
  }, [teamFilterOptions]);

  const canShowTeamFilter = normalizedTeamFilterOptions.length > 0;
  const isLeader = canShowTeamFilter;
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUserId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [taskAnalyticsThisMonth, setTaskAnalyticsThisMonth] = useState(false);

  useEffect(() => {
    setSelectedUserId(currentUserId || 'all');
  }, [currentUserId]);

  useEffect(() => {
    if (selectedTeamId === 'all' && selectedUserId === 'all' && currentUserId) {
      setSelectedUserId(currentUserId);
    }
  }, [selectedTeamId, selectedUserId, currentUserId]);

  useEffect(() => {
    if (selectedTeamId === 'all') {
      return;
    }

    if (normalizedTeamFilterOptions.length === 0) {
      return;
    }
    if (!normalizedTeamFilterOptions.some((t: any) => t.id === selectedTeamId)) {
      setSelectedTeamId('all');
      setSelectedUserId(currentUserId || 'all');
    }
  }, [selectedTeamId, normalizedTeamFilterOptions, currentUserId]);

  const { stats: persistedStats, saveStats } = useTaskPersistence(
    selectedUserId === 'all' ? undefined : selectedUserId
  );

  const activeUser = useMemo(() => {
    if (selectedUserId === 'all') {
      return null;
    }
    const found = users.find((u) => u.uid === selectedUserId);
    if (found) {
      if (selectedUserId === currentUserId) {
        return {
          ...found,
          displayName: found.displayName || currentUserDisplayName || 'You',
          email: found.email || currentUserEmail,
          photoURL: found.photoURL || currentUserPhotoURL || null,
        };
      }
      return found;
    }
    if (selectedUserId === currentUserId) {
      return {
        uid: currentUserId,
        displayName: currentUserDisplayName || currentUserEmail?.split('@')[0] || 'You',
        email: currentUserEmail,
        photoURL: currentUserPhotoURL || null,
      };
    }

    const selectedTeam = allTeams.find((t: any) => t.id === selectedTeamId);
    const rawMember = (selectedTeam?.members || []).find((m: any) => {
      if (!m) {
        return false;
      }
      if (typeof m === 'string') {
        return m === selectedUserId;
      }
      const candidateId = m.uid || m.userId || m.id || m._id;
      return candidateId === selectedUserId;
    });
    if (rawMember && typeof rawMember === 'object') {
      return {
        uid: rawMember.uid || rawMember.userId || rawMember.id || rawMember._id || selectedUserId,
        displayName:
          rawMember.displayName || rawMember.name || rawMember.email?.split('@')[0] || 'Member',
        email: rawMember.email,
        photoURL: rawMember.photoURL || rawMember.avatar || null,
      };
    }
    return null;
  }, [
    selectedUserId,
    users,
    currentUserId,
    currentUserDisplayName,
    currentUserEmail,
    currentUserPhotoURL,
    allTeams,
    selectedTeamId,
  ]);

  const selectedTeamMemberOptions = useMemo(() => {
    if (selectedTeamId === 'all') {
      return [];
    }
    const team = allTeams.find((t: any) => t.id === selectedTeamId);
    if (!team) {
      return [];
    }

    const teamUids = new Set<string>();
    (team.members || []).forEach((member: any) => {
      const uid =
        typeof member === 'string'
          ? member
          : member?.uid || member?.userId || member?.id || member?._id;
      if (uid) {
        teamUids.add(uid);
      }
    });
    [team.ownerId, team.ownerUid, team.leaderId].forEach((uid: string) => {
      if (uid) {
        teamUids.add(uid);
      }
    });

    const fromUsers = users
      .filter((u: any) => {
        const hasMembership =
          u.teamMemberships?.includes(selectedTeamId) || (u as any).teamId === selectedTeamId;
        return teamUids.has(u.uid) || hasMembership;
      })
      .map((u: any) => ({
        uid: u.uid,
        label: u.displayName || u.email?.split('@')[0] || u.uid,
        photoURL: u.photoURL || null,
      }));

    const map = new Map<string, { uid: string; label: string; photoURL?: string | null }>();
    fromUsers.forEach((u: { uid: string; label: string; photoURL?: string | null }) =>
      map.set(u.uid, u)
    );

    (team.members || []).forEach((member: any) => {
      if (!member || typeof member === 'string') {
        return;
      }
      const uid = member.uid || member.userId || member.id || member._id;
      if (!uid || map.has(uid)) {
        return;
      }
      map.set(uid, {
        uid,
        label: member.displayName || member.name || member.email?.split('@')[0] || uid,
        photoURL: member.photoURL || member.avatar || null,
      });
    });

    teamUids.forEach((uid) => {
      if (!map.has(uid)) {
        map.set(uid, { uid, label: uid === currentUserId ? 'You' : uid, photoURL: null });
      }
    });

    return Array.from(map.values());
  }, [selectedTeamId, allTeams, users, currentUserId]);

  const selectedTeamOption = useMemo(
    () => normalizedTeamFilterOptions.find((t: any) => t.id === selectedTeamId),
    [normalizedTeamFilterOptions, selectedTeamId]
  );

  const selectedMemberOption = useMemo(
    () => selectedTeamMemberOptions.find((u: any) => u.uid === selectedUserId),
    [selectedTeamMemberOptions, selectedUserId]
  );

  const taskList = useMemo(() => {
    const baseTasks = tasks ?? [];

    return baseTasks.filter((task: any) => {
      const hasRepoLink = Boolean(
        task?.githubRepoOwner ||
          task?.githubRepoName ||
          task?.githubRepo ||
          (Array.isArray(task?.repoIds) && task.repoIds.length > 0)
      );
      const hasCommitCode = Boolean(task?.commitCode);
      if (!hasRepoLink || !hasCommitCode) {
        return false;
      }

      if (selectedUserId !== 'all') {
        const assignedTo = task?.assignedTo;
        const assignedUserIds = Array.isArray(task?.assignedUserIds) ? task.assignedUserIds : [];
        return assignedTo === selectedUserId || assignedUserIds.includes(selectedUserId);
      }

      if (selectedTeamId !== 'all') {
        const isMemberOfSelectedTeam =
          users.find((u) => u.uid === selectedUserId)?.teamId === selectedTeamId;

        const assignedTo = task?.assignedTo;
        const assignedUserIds = Array.isArray(task?.assignedUserIds) ? task.assignedUserIds : [];

        const isUserInTeam = (uid: string) => {
          const u = users.find((usr) => usr.uid === uid);
          return u?.teamMemberships?.includes(selectedTeamId);
        };

        return isUserInTeam(assignedTo) || assignedUserIds.some(isUserInTeam);
      }

      if (!isLeader) {
        const assignedTo = task?.assignedTo;
        const assignedUserIds = Array.isArray(task?.assignedUserIds) ? task.assignedUserIds : [];
        return (
          currentUserId && (assignedTo === currentUserId || assignedUserIds.includes(currentUserId))
        );
      }

      return true;
    });
  }, [tasks, currentUserId, isLeader, selectedTeamId, selectedUserId, users]);

  const dailyStats = useMemo(() => {
    const subjectSessions =
      selectedUserId === 'all'
        ? selectedTeamId === 'all'
          ? teamSessions
          : teamSessions.filter((s) => {
              const u = users.find((user) => user.uid === s.userId);
              const t = allTeams.find((team) => team.id === selectedTeamId);
              return u?.teamMemberships?.includes(selectedTeamId) || t?.members?.includes(s.userId);
            })
        : teamSessions.filter((s) => s.userId === selectedUserId);

    const totalSecs = subjectSessions.reduce((acc, s) => acc + (s.activeDuration || 0), 0);
    const uniqueDays =
      new Set(subjectSessions.map((s) => new Date(s.startTime).toDateString())).size || 1;
    const avgSecsPerDay = totalSecs / uniqueDays;

    return {
      avgMins: Math.round(avgSecsPerDay / 60),
      totalDays: uniqueDays,
    };
  }, [selectedUserId, selectedTeamId, teamSessions, users, allTeams]);

  const taskStats = useMemo(() => {
    if (selectedUserId !== 'all' && selectedUserId !== currentUserId && persistedStats) {
      return persistedStats;
    }

    const total = taskList.length;
    const completedCount = taskList.filter(isCompletedTask).length;

    const hasAnyCommit = taskList.some((t) =>
      Boolean((t as any).commitUrl || (t as any).commitMessage || (t as any).commitInfo?.message)
    );
    const inProgress = hasAnyCommit ? 1 : 0;
    const efficiency = total ? Math.round((completedCount / total) * 100) : 0;

    return {
      total,
      inProgress,
      completed: completedCount,
      overdue: persistedStats?.overdue || 0,
      efficiency,
      dailyActiveAvg: dailyStats.avgMins,
    };
  }, [taskList, persistedStats, selectedUserId, currentUserId, dailyStats.avgMins]);

  const totalActiveSeconds = useMemo(() => {
    const list =
      selectedUserId === 'all'
        ? selectedTeamId === 'all'
          ? teamSessions
          : teamSessions.filter((s) => {
              const u = users.find((usr) => usr.uid === s.userId);
              const t = allTeams.find((team) => team.id === selectedTeamId);
              return u?.teamMemberships?.includes(selectedTeamId) || t?.members?.includes(s.userId);
            })
        : teamSessions.filter((s) => s.userId === selectedUserId);

    let total = list.reduce((acc, s) => acc + (s.activeDuration || 0), 0);

    const isSelfInSelection =
      selectedUserId === currentUserId ||
      (selectedUserId === 'all' &&
        (selectedTeamId === 'all' ||
          users.find((u) => u.uid === currentUserId)?.teamMemberships?.includes(selectedTeamId) ||
          allTeams.find((t) => t.id === selectedTeamId)?.members?.includes(currentUserId)));
    if (isSelfInSelection) {
      const [h, m] = elapsedTime.split(':').map((val) => parseInt(val) || 0);
      total += h * 3600 + m * 60;
    }
    return total;
  }, [selectedUserId, selectedTeamId, teamSessions, users, allTeams, currentUserId, elapsedTime]);

  useEffect(() => {
    if (selectedUserId !== 'all' && selectedUserId === currentUserId) {
      saveStats({
        total: taskStats.total,
        inProgress: taskStats.inProgress,
        completed: taskStats.completed,
        overdue: taskStats.overdue,
        efficiency: taskStats.efficiency,
        dailyActiveAvg: taskStats.dailyActiveAvg,
      });
    }
  }, [
    taskStats.total,
    taskStats.inProgress,
    taskStats.completed,
    taskStats.efficiency,
    taskStats.dailyActiveAvg,
    selectedUserId,
    currentUserId,
  ]);

  const totalTasksDelta = useMemo(() => {
    const w = 7 * 24 * 60 * 60 * 1000;
    const t = Date.now();
    let thisWeek = 0;
    let prevWeek = 0;
    taskList.forEach((task) => {
      const c = task?.createdAt ? new Date(task.createdAt).getTime() : 0;
      if (!c) {
        return;
      }
      if (c >= t - w) {
        thisWeek++;
      } else if (c >= t - 2 * w && c < t - w) {
        prevWeek++;
      }
    });
    return thisWeek - prevWeek;
  }, [taskList]);

  const myProgressSegments = useMemo(() => {
    const valuesRaw = [
      taskStats.total,
      taskStats.inProgress,
      taskStats.completed,
      taskStats.overdue,
    ];
    const hasData = valuesRaw.some((v) => v > 0);
    return {
      values: hasData ? valuesRaw : [1, 0, 0, 0],
      displayValues: valuesRaw,
      labels: ['Total Tasks', 'In Progress', 'Completed', 'Overdue'],
      centerValue: taskStats.total,
    };
  }, [taskStats]);

  const sixMonthBars = useMemo(() => {
    const end = new Date();
    const rows: { key: string; label: string; minutes: number; active: boolean }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(startOfMonth(end), i);
      const ms = startOfMonth(monthDate);
      const me = endOfMonth(monthDate);
      const secs = secondsForLogsInRange(activityLogs, ms, me);
      const active = format(ms, 'yyyy-MM') === format(end, 'yyyy-MM');
      rows.push({
        key: format(ms, 'yyyy-MM'),
        label: format(ms, 'MMM'),
        minutes: Math.round(secs / 60),
        active,
      });
    }
    return rows;
  }, [activityLogs]);

  const thisMonthBar = useMemo(() => {
    const ms = startOfMonth(new Date());
    const me = endOfMonth(new Date());
    const secs = secondsForLogsInRange(activityLogs, ms, me);
    return {
      label: format(ms, 'MMMM yyyy'),
      minutes: Math.round(secs / 60),
    };
  }, [activityLogs]);

  const feedItems: FeedItem[] = useMemo(() => {
    const out: FeedItem[] = [];

    activityLogs.forEach((log, logIndex) => {
      if (selectedUserId !== 'all' && log.userId !== selectedUserId) {
        return;
      }

      const start = new Date(log.startTime);
      const end = new Date(log.endTime);
      const dur = log.duration ?? Math.round((end.getTime() - start.getTime()) / 1000);

      if (log.eventType === 'task-assigned') {
        out.push({
          id: `task-assigned-${log._id ?? logIndex}`,
          sortTime: start.getTime(),
          actor: log.actorName || 'Workspace',
          entity: log.title || 'New task assigned',
          timeLabel: formatDistanceToNow(start, { addSuffix: true }),
          source: log.source || 'Tasks',
          tag: 'Invite',
          iconBg: 'hsl(var(--card) / 0.8)',
          onDelete: () => handleDeleteLog(log._id),
        });
        return;
      }

      if (log.eventType === 'task-progressed') {
        const trigger = String(log.metadata?.trigger || '').toLowerCase();
        if (trigger && trigger !== 'commit') {
          return;
        }

        const toStatus = normStatus(log.metadata?.toStatus);
        const isCompletedTransition = toStatus === 'done' || toStatus.includes('complete');

        out.push({
          id: `task-progressed-${log._id ?? logIndex}`,
          sortTime: start.getTime(),
          actor: log.actorName || 'Workspace',
          entity:
            log.title || (isCompletedTransition ? 'Task completed' : 'Task moved to In Progress'),
          timeLabel: formatDistanceToNow(start, { addSuffix: true }),
          source: log.source || 'Tasks',
          tag: isCompletedTransition ? 'Completed' : 'Comment',
          iconBg: 'hsl(var(--card) / 0.8)',
          onDelete: () => handleDeleteLog(log._id),
        });
        return;
      }

      out.push({
        id: `log-${log._id ?? logIndex}`,
        sortTime: start.getTime(),
        actor:
          log.actorName ||
          (log.userId === currentUserId
            ? 'You'
            : users.find((u) => u.uid === log.userId)?.displayName || 'Member'),
        entity: `Session · ${Math.max(1, Math.round(dur / 60))} min`,
        timeLabel: formatDistanceToNow(start, { addSuffix: true }),
        source: 'Activity',
        tag: 'Session',
        iconBg: 'hsl(var(--card) / 0.8)',
        onDelete: log.userId === currentUserId ? () => handleDeleteLog(log._id) : undefined,
      });
    });

    if (isLeader && Array.isArray(teamSessions)) {
      teamSessions.forEach((session, idx) => {
        if (selectedUserId !== 'all' && session.userId !== selectedUserId) {
          return;
        }

        if (
          activityLogs.some(
            (al) => al.startTime === session.startTime && al.userId === session.userId
          )
        ) {
          return;
        }

        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        const dur = session.activeDuration ?? Math.round((end.getTime() - start.getTime()) / 1000);
        const member = users.find((u) => u.uid === session.userId);

        const team = allTeams.find((t) => t.id === selectedTeamId);
        const logoId = team?.logoId || getDeterministicLogoId(selectedTeamId || 'default');

        out.push({
          id: `team-session-${session._id || idx}`,
          sortTime: start.getTime(),
          actor: member?.displayName || 'Member',
          entity: `Session · ${Math.max(1, Math.round(dur / 60))} min`,
          timeLabel: formatDistanceToNow(start, { addSuffix: true }),
          source: 'Team Activity',
          tag: 'Session',
          iconBg: 'hsl(var(--card) / 0.8)',
          logoId,
        });
      });
    }

    taskList.forEach((t) => {
      const ci = (t as any).commitInfo;
      if (ci?.message) {
        const ts = ci.timestamp ? new Date(ci.timestamp).getTime() : Date.now();
        out.push({
          id: `commit-${t._id || t.id}`,
          sortTime: ts,
          actor: ci.author || 'Git',
          entity: String(ci.message).slice(0, 80),
          timeLabel: formatDistanceToNow(ts, { addSuffix: true }),
          source: t.projectName || 'Project',
          tag: 'Commit',
          iconBg: 'hsl(var(--card) / 0.8)',
        });
      }
      if (isCompletedTask(t) && !ci?.message) {
        const ts = t.updatedAt
          ? new Date(t.updatedAt).getTime()
          : t.createdAt
            ? new Date(t.createdAt).getTime()
            : Date.now();
        out.push({
          id: `task-done-${t._id || t.id}`,
          sortTime: ts,
          actor: t.assignedToName || 'You',
          entity: `Completed "${t.title || 'Task'}"`,
          timeLabel: formatDistanceToNow(ts, { addSuffix: true }),
          source: t.projectName || 'Tasks',
          tag: 'Completed',
          iconBg: 'hsl(var(--card) / 0.8)',
        });
      }
      const due = (t as any).dueDate || (t as any).deadline;
      if (due && !isCompletedTask(t)) {
        const d = new Date(due);
        out.push({
          id: `due-${t._id || t.id}`,
          sortTime: d.getTime(),
          actor: 'Deadline',
          entity: t.title || 'Task',
          timeLabel: formatDistanceToNow(d, { addSuffix: true }),
          source: t.projectName || 'Tasks',
          tag: 'Deadline',
          iconBg: 'hsl(var(--card) / 0.8)',
        });
      }
    });

    out.sort((a, b) => b.sortTime - a.sortTime);
    return out;
  }, [activityLogs, teamSessions, taskList, selectedUserId, isLeader, users, handleDeleteLog]);

  const filteredFeed = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return feedItems;
    }
    return feedItems.filter(
      (f) =>
        f.entity.toLowerCase().includes(q) ||
        f.actor.toLowerCase().includes(q) ||
        f.source.toLowerCase().includes(q)
    );
  }, [feedItems, searchQuery]);

  const displayedFeed = showAllLogs ? filteredFeed : filteredFeed.slice(0, 8);

  const dateSubtitle = format(new Date(), 'EEEE, MMMM d, yyyy');

  const statCards = [
    {
      key: 'total',
      title: 'Total Tasks',
      value: taskStats.total,
      delta: totalTasksDelta,
      sub: 'From last week',
      icon: ListTodo,
    },
    {
      key: 'progress',
      title: 'In Progress',
      value: taskStats.inProgress,
      delta: null as number | null,
      sub: 'Active tasks',
      icon: PlayCircle,
    },
    {
      key: 'done',
      title: 'Completed',
      value: taskStats.completed,
      delta: null as number | null,
      sub: 'Finished',
      icon: CheckSquare,
    },
    {
      key: 'overdue',
      title: 'Overdue',
      value: taskStats.overdue,
      delta: null as number | null,
      sub: 'Needs attention',
      icon: Calendar,
    },
  ];

  return {
    selectedTeamId,
    setSelectedTeamId,
    selectedUserId,
    setSelectedUserId,
    searchQuery,
    setSearchQuery,
    showAllLogs,
    setShowAllLogs,
    taskAnalyticsThisMonth,
    setTaskAnalyticsThisMonth,
    isLeader,
    normalizedTeamFilterOptions,
    selectedTeamOption,
    selectedMemberOption,
    selectedTeamMemberOptions,
    activeUser,
    allTeams,
    taskStats,
    totalActiveSeconds,
    dailyStats,
    myProgressSegments,
    sixMonthBars,
    thisMonthBar,
    filteredFeed,
    displayedFeed,
    dateSubtitle,
    statCards,
    currentTeamId,
    currentUserId,
  };
}
