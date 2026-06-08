import React, { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Calendar,
    CheckSquare,
    ChevronDown,
    ChevronUp,
    ListTodo,
    PlayCircle,
    Search,
    Trash2,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import {
    format,
    formatDistanceToNow,
    startOfMonth,
    endOfMonth,
    subMonths,
} from 'date-fns';
import { useTaskPersistence } from '@/hooks/useTaskPersistence';
import { useTeamPersistence } from '@/hooks/useTeamPersistence';
import { getLogoById, getDeterministicLogoId } from '@/lib/team-logos';

/** Design tokens — Activity Log page only */
const T = {
    bgBase: '#020617', // Deep slate/black
    bgCard: 'rgba(255, 255, 255, 0.04)',
    bgSurface: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(255, 255, 255, 0.12)',
    blue: '#3b82f6',
    green: '#10b981',
    orange: '#f59e0b',
    red: '#ef4444',
    text1: '#f8fafc',
    text2: '#94a3b8',
    text3: '#475569',
    purple: '#8b5cf6',
    pink: '#ec4899',
} as const;

const FONT_LINK_ID = 'activity-log-dm-fonts';

interface ActivityLog {
    _id: string;
    userId: string;
    startTime: string;
    endTime: string;
    duration?: number;
    date: string;
    eventType?: string;
    title?: string | null;
    source?: string | null;
    actorName?: string | null;
    metadata?: {
        toStatus?: string | null;
        trigger?: string | null;
        [key: string]: unknown;
    } | null;
}

interface ActivityLogViewProps {
    activityLogs: ActivityLog[];
    elapsedTime: string;
    handleClearLogs: () => void;
    handleDeleteLog: (id: string) => void;
    tasks?: any[];
    users?: any[];
    teamSessions?: any[];
    currentTeamId?: string;
    currentTeamName?: string;
    currentTeamOwnerId?: string;
    currentTeamLogoId?: string;
    ownedTeams?: any[];
    myTeams?: any[];
    currentUserId?: string;
    currentUserDisplayName?: string;
    currentUserPhotoURL?: string | null;
    currentUserEmail?: string;
}

function normStatus(s: unknown): string {
    return String(s ?? '')
        .trim()
        .toLowerCase();
}

function normalizeUid(value: any): string {
    if (!value) {return '';}
    if (typeof value === 'string') {return value;}
    if (typeof value === 'object') {
        return String(value.uid || value.id || value._id || '');
    }
    return String(value);
}

function extractOwnerUid(team: any): string {
    return normalizeUid(
        team?.ownerId ||
        team?.ownerUid ||
        team?.leaderId ||
        team?.createdBy ||
        team?.createdByUid ||
        team?.owner?.uid ||
        team?.owner?.id ||
        team?.owner?._id
    );
}

function isCompletedTask(t: any): boolean {
    const s = normStatus(t?.status);
    // Auto-ticked implies status is 'done' or 'complete'
    return s.includes('complete') || s === 'done';
}

function isInProgressTask(t: any): boolean {
    if (isCompletedTask(t)) {return false;}
    const s = normStatus(t?.status);
    const hasCommitEvidence = Boolean(
        t?.commitUrl ||
        t?.commitMessage ||
        t?.commitTimestamp ||
        t?.commitInfo?.message
    );

    // Only count tasks that have a real commit attached.
    if (!hasCommitEvidence) {return false;}

    return s.includes('progress') || s === 'active' || s === 'in review';
}

function isOverdueTask(t: any): boolean {
    if (isCompletedTask(t)) {
        return false;
    }
    const d = t?.dueDate || t?.deadline;
    const hasCommits = !!(t?.commitUrl || t?.commitMessage);
    
    // Task opened and made some commits but wasn't completed via Zync's last commit logic
    if (hasCommits && (!d || new Date(d).getTime() < Date.now())) {
        return true;
    }
    
    if (!d) {
        return false;
    }
    return new Date(d).getTime() < Date.now();
}

function secondsForLogsInRange(logs: ActivityLog[], rangeStart: Date, rangeEnd: Date): number {
    let total = 0;
    logs.forEach((log) => {
        const st = new Date(log.startTime).getTime();
        if (st >= rangeStart.getTime() && st <= rangeEnd.getTime()) {
            const end = new Date(log.endTime);
            const start = new Date(log.startTime);
            total += log.duration ?? Math.round((end.getTime() - start.getTime()) / 1000);
        }
    });
    return total;
}

function formatHoursMinutes(totalMinutes: number): string {
    const safeMinutes = Math.max(0, Math.floor(totalMinutes));
    const hours = Math.floor(safeMinutes / 60);
    const minutes = safeMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatSecondsToHoursMinutes(totalSeconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

type FeedTag = 'Commit' | 'Completed' | 'Invite' | 'Deadline' | 'Comment' | 'Session';

interface FeedItem {
    id: string;
    sortTime: number;
    actor: string;
    entity: string;
    timeLabel: string;
    source: string;
    tag: FeedTag;
    iconBg: string;
    onDelete?: () => void;
    logoId?: string;
}

const tagStyles: Record<FeedTag, { bg: string; text: string }> = {
    Commit: { bg: 'rgba(26,143,209,0.2)', text: T.blue },
    Completed: { bg: 'rgba(34,197,94,0.2)', text: T.green },
    Invite: { bg: 'rgba(168,85,247,0.2)', text: T.purple },
    Deadline: { bg: 'rgba(251,146,60,0.2)', text: T.orange },
    Comment: { bg: 'rgba(236,72,153,0.2)', text: T.pink },
    Session: { bg: 'rgba(26,143,209,0.15)', text: T.blue },
};

export default function ActivityLogView({
    activityLogs,
    elapsedTime,
    handleClearLogs,
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
}: ActivityLogViewProps) {
    const { myTeams: myTeamsFromHook, loading: teamsLoading, syncTeamsFromApi } = useTeamPersistence(currentUserId);
    const normalizedCurrentUserId = useMemo(() => normalizeUid(currentUserId), [currentUserId]);

    useEffect(() => {
        if (!normalizedCurrentUserId) {return;}
        // Keep Firestore teams aligned with backend source of truth to avoid owner/member mismatch.
        syncTeamsFromApi([...(Array.isArray(ownedTeams) ? ownedTeams : []), ...(Array.isArray(myTeamsFromApi) ? myTeamsFromApi : [])], normalizedCurrentUserId);
    }, [syncTeamsFromApi, normalizedCurrentUserId, ownedTeams, myTeamsFromApi]);

    const mergedOwnedTeams = useMemo(() => {
        const map = new Map<string, any>();
        (Array.isArray(ownedTeams) ? ownedTeams : []).forEach((t: any) => {
            const id = t?.id || t?._id || t?.teamId;
            if (!id) {return;}
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
        [...(Array.isArray(myTeamsFromApi) ? myTeamsFromApi : []), ...(Array.isArray(myTeamsFromHook) ? myTeamsFromHook : [])].forEach((t: any) => {
            const id = t?.id || t?._id;
            if (!id) {return;}
            const prev = map.get(id) || {};
            map.set(id, { ...prev, ...t, id });
        });
        return Array.from(map.values());
    }, [myTeamsFromApi, myTeamsFromHook]);

    // Merge API teams and Firestore teams
    const allTeams = useMemo(() => {
        const map = new Map<string, any>();

        mergedOwnedTeams.forEach((t: any) => {
            const id = t?.id || t?._id;
            if (!id) {return;}
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
            if (!id) {return;}
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

        // Fallback: inject currently selected team from /users/me payload when team APIs fail.
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
    }, [mergedOwnedTeams, mergedMyTeams, normalizedCurrentUserId, currentTeamId, currentTeamName, currentTeamOwnerId, currentTeamLogoId]);

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
                if (id && ownedTeamIdSet.has(id)) {return true;}
                const owner = extractOwnerUid(t);
                return Boolean(normalizedCurrentUserId) && owner === normalizedCurrentUserId;
            }),
        [allTeams, normalizedCurrentUserId, ownedTeamIdSet]
    );
    const teamFilterOptions = useMemo(
        () => {
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
                    if (!t.id || !normalizedCurrentUserId) {return false;}
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
            if (currentTeamId && normalizedCurrentTeamOwner && normalizedCurrentTeamOwner === normalizedCurrentUserId) {
                return [{
                    id: String(currentTeamId),
                    name: currentTeamName || 'My Team',
                    ownerId: normalizedCurrentTeamOwner,
                    leaderId: normalizedCurrentTeamOwner,
                    logoId: currentTeamLogoId,
                }];
            }
            return [];
        },
        [leaderTeams, mergedOwnedTeams, mergedMyTeams, currentTeamId, currentTeamName, currentTeamOwnerId, currentTeamLogoId, normalizedCurrentUserId]
    );

    const normalizedTeamFilterOptions = useMemo(() => {
        const map = new Map<string, any>();
        teamFilterOptions.forEach((t: any) => {
            const id = String(t?.id || t?._id || t?.teamId || '');
            if (!id) {return;}
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
        if (selectedTeamId === 'all') {return;}
        // Keep current selection during transient reload/rate-limit gaps.
        if (normalizedTeamFilterOptions.length === 0) {return;}
        if (!normalizedTeamFilterOptions.some((t: any) => t.id === selectedTeamId)) {
            setSelectedTeamId('all');
            setSelectedUserId(currentUserId || 'all');
        }
    }, [selectedTeamId, normalizedTeamFilterOptions, currentUserId]);

    // Persistence for task progress
    const { stats: persistedStats, saveStats } = useTaskPersistence(selectedUserId === 'all' ? undefined : selectedUserId);

    const activeUser = useMemo(() => {
        if (selectedUserId === 'all') {return null;}
        const found = users.find(u => u.uid === selectedUserId);
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
            // Fallback to current authenticated user info if not in users list
            return {
                uid: currentUserId,
                displayName: currentUserDisplayName || currentUserEmail?.split('@')[0] || 'You',
                email: currentUserEmail,
                photoURL: currentUserPhotoURL || null
            };
        }
        // Secondary fallback: resolve from selected team's embedded member objects.
        const selectedTeam = allTeams.find((t: any) => t.id === selectedTeamId);
        const rawMember = (selectedTeam?.members || []).find((m: any) => {
            if (!m) {return false;}
            if (typeof m === 'string') {return m === selectedUserId;}
            const candidateId = m.uid || m.userId || m.id || m._id;
            return candidateId === selectedUserId;
        });
        if (rawMember && typeof rawMember === 'object') {
            return {
                uid: rawMember.uid || rawMember.userId || rawMember.id || rawMember._id || selectedUserId,
                displayName: rawMember.displayName || rawMember.name || rawMember.email?.split('@')[0] || 'Member',
                email: rawMember.email,
                photoURL: rawMember.photoURL || rawMember.avatar || null,
            };
        }
        return null;
    }, [selectedUserId, users, currentUserId, currentUserDisplayName, currentUserEmail, currentUserPhotoURL, allTeams, selectedTeamId]);

    const selectedTeamMemberOptions = useMemo(() => {
        if (selectedTeamId === 'all') {return [];}
        const team = allTeams.find((t: any) => t.id === selectedTeamId);
        if (!team) {return [];}

        const teamUids = new Set<string>();
        (team.members || []).forEach((member: any) => {
            const uid = typeof member === 'string' ? member : member?.uid || member?.userId || member?.id || member?._id;
            if (uid) {teamUids.add(uid);}
        });
        [team.ownerId, team.ownerUid, team.leaderId].forEach((uid: string) => {
            if (uid) {teamUids.add(uid);}
        });

        // Prefer enriched user profiles when available.
        const fromUsers = users
            .filter((u: any) => {
                const hasMembership = u.teamMemberships?.includes(selectedTeamId) || (u as any).teamId === selectedTeamId;
                return teamUids.has(u.uid) || hasMembership;
            })
            .map((u: any) => ({
                uid: u.uid,
                label: u.displayName || u.email?.split('@')[0] || u.uid,
                photoURL: u.photoURL || null,
            }));

        const map = new Map<string, { uid: string; label: string; photoURL?: string | null }>();
        fromUsers.forEach((u: { uid: string; label: string; photoURL?: string | null }) => map.set(u.uid, u));

        // Include embedded member objects (when API sends rich member entries on team payload).
        (team.members || []).forEach((member: any) => {
            if (!member || typeof member === 'string') {return;}
            const uid = member.uid || member.userId || member.id || member._id;
            if (!uid || map.has(uid)) {return;}
            map.set(uid, {
                uid,
                label: member.displayName || member.name || member.email?.split('@')[0] || uid,
                photoURL: member.photoURL || member.avatar || null,
            });
        });

        // Fallback when /api/users is rate-limited: show UID-based options so filtering still works.
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

    const doughnutCanvasRef = useRef<HTMLCanvasElement>(null);
    const barCanvasRef = useRef<HTMLCanvasElement>(null);
    const doughnutChartRef = useRef<Chart | null>(null);
    const barChartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (document.getElementById(FONT_LINK_ID)) {
            return;
        }
        const link = document.createElement('link');
        link.id = FONT_LINK_ID;
        link.rel = 'stylesheet';
        link.href =
            'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=DM+Mono:wght@400;500;600&display=swap';
        document.head.appendChild(link);
    }, []);

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
            if (!hasRepoLink || !hasCommitCode) {return false;}

            // Always honor explicit user selection first (including default self view)
            if (selectedUserId !== 'all') {
                const assignedTo = task?.assignedTo;
                const assignedUserIds = Array.isArray(task?.assignedUserIds) ? task.assignedUserIds : [];
                return assignedTo === selectedUserId || assignedUserIds.includes(selectedUserId);
            }

            if (selectedTeamId !== 'all') {
                // Check if the user is a member of the selected team
                const isMemberOfSelectedTeam = users.find(u => u.uid === selectedUserId)?.teamId === selectedTeamId; // Fallback
                
                const assignedTo = task?.assignedTo;
                const assignedUserIds = Array.isArray(task?.assignedUserIds) ? task.assignedUserIds : [];

                // If filtering by specific team, check if assigned users are in that team
                const isUserInTeam = (uid: string) => {
                    const u = users.find(usr => usr.uid === uid);
                    return u?.teamMemberships?.includes(selectedTeamId);
                };

                return isUserInTeam(assignedTo) || assignedUserIds.some(isUserInTeam);
            }

            // Default (no filter or current user only if not leader)
            if (!isLeader) {
                const assignedTo = task?.assignedTo;
                const assignedUserIds = Array.isArray(task?.assignedUserIds) ? task.assignedUserIds : [];
                return currentUserId && (assignedTo === currentUserId || assignedUserIds.includes(currentUserId));
            }

            return true;
        });
    }, [tasks, currentUserId, isLeader, selectedTeamId, selectedUserId, users]);

    const dailyStats = useMemo(() => {
        const subjectSessions = (selectedUserId === 'all' 
            ? (selectedTeamId === 'all' 
                ? teamSessions 
                : teamSessions.filter(s => {
                    const u = users.find(user => user.uid === s.userId);
                    const t = allTeams.find(team => team.id === selectedTeamId);
                    return u?.teamMemberships?.includes(selectedTeamId) || t?.members?.includes(s.userId);
                })
              )
            : teamSessions.filter(s => s.userId === selectedUserId)
        );

        const totalSecs = subjectSessions.reduce((acc, s) => acc + (s.activeDuration || 0), 0);
        const uniqueDays = new Set(subjectSessions.map(s => new Date(s.startTime).toDateString())).size || 1;
        const avgSecsPerDay = totalSecs / uniqueDays;
        
        return {
            avgMins: Math.round(avgSecsPerDay / 60),
            totalDays: uniqueDays
        };
    }, [selectedUserId, selectedTeamId, teamSessions, users, allTeams]);

    const taskStats = useMemo(() => {
        // If we have persisted stats for a selected member, use those (since we might not have their full task list)
        if (selectedUserId !== 'all' && selectedUserId !== currentUserId && persistedStats) {
            return persistedStats;
        }

        const total = taskList.length;
        const completedCount = taskList.filter(isCompletedTask).length;
        
        const hasAnyCommit = taskList.some(t => Boolean(
            (t as any).commitUrl || 
            (t as any).commitMessage || 
            (t as any).commitInfo?.message
        ));
        const inProgress = hasAnyCommit ? 1 : 0;
        const efficiency = total ? Math.round((completedCount / total) * 100) : 0;

        return { 
            total, 
            inProgress, 
            completed: completedCount, 
            overdue: persistedStats?.overdue || 0,
            efficiency,
            dailyActiveAvg: dailyStats.avgMins
        };
    }, [taskList, persistedStats, selectedUserId, currentUserId, dailyStats.avgMins]);

    const totalActiveSeconds = useMemo(() => {
        const list = selectedUserId === 'all' 
            ? (selectedTeamId === 'all' ? teamSessions : teamSessions.filter(s => {
                const u = users.find(usr => usr.uid === s.userId);
                const t = allTeams.find(team => team.id === selectedTeamId);
                return u?.teamMemberships?.includes(selectedTeamId) || t?.members?.includes(s.userId);
              }))
            : teamSessions.filter(s => s.userId === selectedUserId);
        
        let total = list.reduce((acc, s) => acc + (s.activeDuration || 0), 0);
        
        // Add current elapsed time if viewing self or a team which self is a member of
        const isSelfInSelection = selectedUserId === currentUserId || (selectedUserId === 'all' && (selectedTeamId === 'all' || users.find(u => u.uid === currentUserId)?.teamMemberships?.includes(selectedTeamId) || allTeams.find(t => t.id === selectedTeamId)?.members?.includes(currentUserId)));
        if (isSelfInSelection) {
            const [h, m] = elapsedTime.split(':').map(val => parseInt(val) || 0);
            total += (h * 3600 + m * 60);
        }
        return total;
    }, [selectedUserId, selectedTeamId, teamSessions, users, allTeams, currentUserId, elapsedTime]);

    // Sync stats to Firestore for current user
    useEffect(() => {
        if (selectedUserId !== 'all' && selectedUserId === currentUserId) {
            saveStats({
                total: taskStats.total,
                inProgress: taskStats.inProgress,
                completed: taskStats.completed,
                overdue: taskStats.overdue,
                efficiency: taskStats.efficiency,
                dailyActiveAvg: taskStats.dailyActiveAvg
            });
        }
    }, [taskStats.total, taskStats.inProgress, taskStats.completed, taskStats.efficiency, taskStats.dailyActiveAvg, selectedUserId, currentUserId]);


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
            if (selectedUserId !== 'all' && log.userId !== selectedUserId) {return;}
            
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
                    iconBg: T.bgSurface,
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
                    entity: log.title || (isCompletedTransition ? 'Task completed' : 'Task moved to In Progress'),
                    timeLabel: formatDistanceToNow(start, { addSuffix: true }),
                    source: log.source || 'Tasks',
                    tag: isCompletedTransition ? 'Completed' : 'Comment',
                    iconBg: T.bgSurface,
                    onDelete: () => handleDeleteLog(log._id),
                });
                return;
            }

            out.push({
                id: `log-${log._id ?? logIndex}`,
                sortTime: start.getTime(),
                actor: log.actorName || (log.userId === currentUserId ? 'You' : users.find(u => u.uid === log.userId)?.displayName || 'Member'),
                entity: `Session · ${Math.max(1, Math.round(dur / 60))} min`,
                timeLabel: formatDistanceToNow(start, { addSuffix: true }),
                source: 'Activity',
                tag: 'Session',
                iconBg: T.bgSurface,
                onDelete: log.userId === currentUserId ? () => handleDeleteLog(log._id) : undefined,
            });
        });

        // If leader, add team sessions to the feed
        if (isLeader && Array.isArray(teamSessions)) {
            teamSessions.forEach((session, idx) => {
                if (selectedUserId !== 'all' && session.userId !== selectedUserId) {return;}
                
                // Skip if session is already in activityLogs (though unlikely to overlap perfectly)
                if (activityLogs.some(al => al.startTime === session.startTime && al.userId === session.userId)) {return;}
                
                const start = new Date(session.startTime);
                const end = new Date(session.endTime);
                const dur = session.activeDuration ?? Math.round((end.getTime() - start.getTime()) / 1000);
                const member = users.find(u => u.uid === session.userId);
                
                // Get logo from team
                const team = allTeams.find(t => t.id === selectedTeamId);
                const logoId = team?.logoId || getDeterministicLogoId(selectedTeamId || 'default');

                out.push({
                    id: `team-session-${session._id || idx}`,
                    sortTime: start.getTime(),
                    actor: member?.displayName || 'Member',
                    entity: `Session · ${Math.max(1, Math.round(dur / 60))} min`,
                    timeLabel: formatDistanceToNow(start, { addSuffix: true }),
                    source: 'Team Activity',
                    tag: 'Session',
                    iconBg: T.bgSurface,
                    logoId: logoId
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
                    iconBg: T.bgSurface,
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
                    entity: `Completed “${t.title || 'Task'}”`,
                    timeLabel: formatDistanceToNow(ts, { addSuffix: true }),
                    source: t.projectName || 'Tasks',
                    tag: 'Completed',
                    iconBg: T.bgSurface,
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
                    iconBg: T.bgSurface,
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

    useEffect(() => {
        if (!doughnutCanvasRef.current) {
            return;
        }
        doughnutChartRef.current?.destroy();
        doughnutChartRef.current = new Chart(doughnutCanvasRef.current, {
            type: 'doughnut',
            data: {
                labels: myProgressSegments.labels,
                datasets: [
                    {
                        data: myProgressSegments.values,
                        backgroundColor: [T.blue, T.orange, T.bgSurface],
                        borderWidth: 0,
                        hoverOffset: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx: any) => {
                                const v = Number(ctx.raw) || 0;
                                return `${ctx.label}: ${v}`;
                            },
                        },
                    },
                },
                animation: {
                    easing: 'easeInOutQuart' as const,
                },
            },
        });
        return () => {
            doughnutChartRef.current?.destroy();
            doughnutChartRef.current = null;
        };
    }, [myProgressSegments]);

    useEffect(() => {
        if (!barCanvasRef.current) {
            return;
        }
        barChartRef.current?.destroy();

        const labels = taskAnalyticsThisMonth
            ? [thisMonthBar.label]
            : sixMonthBars.map((b) => b.label);
        const data = taskAnalyticsThisMonth ? [thisMonthBar.minutes] : sixMonthBars.map((b) => b.minutes);
        const colors = taskAnalyticsThisMonth
            ? [T.blue]
            : sixMonthBars.map((b) => (b.active ? T.blue : 'rgba(148, 163, 184, 0.1)'));

        barChartRef.current = new Chart(barCanvasRef.current, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        data,
                        backgroundColor: colors,
                        borderRadius: 6,
                        borderSkipped: false,
                        barThickness: 32,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: T.text2, font: { family: 'DM Sans', size: 10 } },
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.03)' },
                        ticks: {
                            color: T.text3,
                            font: { family: 'DM Mono', size: 9 },
                            callback: (v: any) => `${v}m`,
                        },
                    },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleFont: { family: 'DM Sans' },
                        bodyFont: { family: 'DM Mono' },
                        padding: 10,
                        cornerRadius: 8,
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart' as const,
                },
            },
        });
        return () => {
            barChartRef.current?.destroy();
            barChartRef.current = null;
        };
    }, [taskAnalyticsThisMonth, sixMonthBars, thisMonthBar]);

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

    return (
        <div
            className="h-full w-full overflow-y-auto overflow-x-hidden transparent relative"
            style={{
                fontFamily: '"DM Sans", system-ui, sans-serif',
                color: T.text1,
            }}
        >
            <style>{`
        @keyframes al-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .al-fade-up { animation: al-fade-up 0.5s ease forwards; opacity: 0; }
      `}</style>

            <div className="mx-auto max-w-[1400px] px-5 py-6 space-y-6">
                {/* Activity Summary Premium Card */}
                <div 
                    className="al-fade-up rounded-[24px] border p-8 space-y-8 shadow-2xl relative overflow-hidden"
                    style={{ 
                        animationDelay: '0.1s', 
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderColor: 'rgba(255,255,255,0.12)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: 'none'
                    }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-text1 opacity-80 uppercase tracking-[0.2em] text-[10px] font-bold">
                            <PlayCircle className="h-4 w-4 text-blue" />
                            Activity Summary
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex gap-2">
                                <Select
                                    value={selectedTeamId === 'all' ? undefined : selectedTeamId}
                                    onValueChange={(v) => {
                                        setSelectedTeamId(v);
                                        if (v === 'all') {
                                            setSelectedUserId(currentUserId || 'all');
                                        } else {
                                            setSelectedUserId('all');
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-[170px] h-9 bg-white/[0.04] border-white/20 text-[11px] text-text2 backdrop-blur-md hover:bg-white/[0.08]">
                                        {selectedTeamId !== 'all' && selectedTeamOption ? (
                                            (() => {
                                                const logoId = selectedTeamOption.logoId || getDeterministicLogoId(selectedTeamOption.id);
                                                const { icon: LogoIcon, fgColor, bgColor, borderColor } = getLogoById(logoId);
                                                return (
                                                    <div className="flex items-center gap-2 truncate">
                                                        <span
                                                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                                                            style={{ color: fgColor, backgroundColor: bgColor, borderColor }}
                                                        >
                                                            <LogoIcon className="h-3 w-3" />
                                                        </span>
                                                        <span className="truncate">{selectedTeamOption.name}</span>
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            <SelectValue placeholder="Select Team" />
                                        )}
                                    </SelectTrigger>
                                    <SelectContent className="bg-white/[0.05] backdrop-blur-xl border-white/20 text-text2">
                                        {normalizedTeamFilterOptions.length === 0 ? (
                                            <SelectItem value="__no_team_available" disabled className="text-text2/70 focus:bg-white/10">
                                                No teams available
                                            </SelectItem>
                                        ) : (
                                            normalizedTeamFilterOptions.map((t: any) => {
                                                const logoId = t.logoId || getDeterministicLogoId(t.id);
                                                const { icon: LogoIcon, fgColor, bgColor, borderColor } = getLogoById(logoId);
                                                return (
                                                    <SelectItem key={t.id} value={t.id} className="cursor-pointer focus:bg-white/10 focus:text-white">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="inline-flex h-5 w-5 items-center justify-center rounded-full border"
                                                                style={{ color: fgColor, backgroundColor: bgColor, borderColor }}
                                                            >
                                                                <LogoIcon className="h-3 w-3" />
                                                            </span>
                                                            <span>{t.name}</span>
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })
                                        )}
                                    </SelectContent>
                                </Select>
                                
                                {selectedTeamId !== 'all' && (
                                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                        <SelectTrigger className="w-[170px] h-9 bg-white/[0.04] border-white/20 text-[11px] text-text2 backdrop-blur-md hover:bg-white/[0.08]">
                                            {selectedUserId !== 'all' && selectedMemberOption ? (
                                                <div className="flex items-center gap-2 truncate">
                                                    {selectedMemberOption.photoURL ? (
                                                        <img
                                                            src={selectedMemberOption.photoURL}
                                                            alt={selectedMemberOption.label}
                                                            className="h-5 w-5 rounded-full object-cover border border-white/20 shrink-0"
                                                        />
                                                    ) : (
                                                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[10px] font-semibold text-white">
                                                            {(selectedMemberOption.label || 'M').charAt(0).toUpperCase()}
                                                        </span>
                                                    )}
                                                    <span className="truncate">{selectedMemberOption.label}</span>
                                                </div>
                                            ) : (
                                                <SelectValue placeholder="Select Member" />
                                            )}
                                        </SelectTrigger>
                                        <SelectContent className="bg-white/[0.05] backdrop-blur-xl border-white/20 text-text2">
                                            {selectedTeamMemberOptions.length === 0 ? (
                                                <SelectItem value="__no_member_available" disabled className="text-text2/70 focus:bg-white/10">
                                                    No members found
                                                </SelectItem>
                                            ) : (
                                                selectedTeamMemberOptions.map((u) => (
                                                    <SelectItem key={u.uid} value={u.uid} className="cursor-pointer focus:bg-white/10 focus:text-white">
                                                        <div className="flex items-center gap-2">
                                                            {u.photoURL ? (
                                                                <img
                                                                    src={u.photoURL}
                                                                    alt={u.label}
                                                                    className="h-5 w-5 rounded-full object-cover border border-white/20"
                                                                />
                                                            ) : (
                                                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[10px] font-semibold text-white">
                                                                    {(u.label || 'M').charAt(0).toUpperCase()}
                                                                </span>
                                                            )}
                                                            <span>{u.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-text2">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{new Date().getFullYear()}</span>
                                <ChevronDown className="h-3 w-3 ml-1" />
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-white/10 text-text2">
                                <span className="text-xl leading-none">···</span>
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-4">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-[20px] overflow-hidden border-2 border-blue/30 shadow-[0_0_20px_rgba(59,130,246,0.15)] bg-slate-900 flex items-center justify-center p-0">
                                {selectedUserId !== 'all' ? (
                                    activeUser?.photoURL ? (
                                        <img 
                                            src={activeUser.photoURL} 
                                            alt="Profile" 
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-2xl font-bold bg-gradient-to-br from-blue to-purple text-white">
                                            {(activeUser?.displayName || 'Z').charAt(0)}
                                        </div>
                                    )
                                ) : (
                                    (() => {
                                        const team = allTeams.find(t => t.id === selectedTeamId);
                                        const logoId = team?.logoId || getDeterministicLogoId(selectedTeamId || 'default');
                                        const { icon: LogoIcon, fgColor, bgColor, borderColor } = getLogoById(logoId);
                                        return (
                                            <span
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border"
                                                style={{ color: fgColor, backgroundColor: bgColor, borderColor }}
                                            >
                                                <LogoIcon className="h-6 w-6" />
                                            </span>
                                        );
                                    })()
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-text1">
                                    {selectedUserId === 'all' 
                                        ? (selectedTeamId === 'all' ? 'Organization Overview' : `${allTeams.find(t => t.id === selectedTeamId)?.name || 'Team'} Overview`)
                                        : (activeUser?.displayName || 'Member Profile')}
                                </h2>
                                {selectedUserId !== 'all' && activeUser?.email && (
                                    <p className="text-xs text-text2/90">{activeUser.email}</p>
                                )}
                                <p className="text-sm text-text2">{taskStats.completed} Tasks completed</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-[10px] text-text3 uppercase tracking-[0.15em] font-bold mb-1">Total time worked</p>
                            <h3 className="text-4xl font-bold tracking-tight text-text1">
                                {formatSecondsToHoursMinutes(totalActiveSeconds)}
                            </h3>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-green" />
                                <span className="text-[11px] font-bold text-text2 uppercase tracking-wider">Completed</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-blue" />
                                <span className="text-[11px] font-bold text-text2 uppercase tracking-wider">In Progress</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-orange" />
                                <span className="text-[11px] font-bold text-text2 uppercase tracking-wider">Overdue</span>
                            </div>
                        </div>

                        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex">
                            <div 
                                className="h-full bg-green transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                                style={{ width: `${taskStats.total ? (taskStats.completed / taskStats.total) * 100 : 0}%` }}
                            />
                            <div 
                                className="h-full bg-blue transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                                style={{ width: `${taskStats.total ? (taskStats.inProgress / taskStats.total) * 100 : 0}%` }}
                            />
                            <div 
                                className="h-full bg-orange transition-all duration-1000 shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
                                style={{ width: `${taskStats.total ? (taskStats.overdue / taskStats.total) * 100 : 0}%` }}
                            />
                        </div>
                        
                        <div className="flex justify-between items-center text-[11px] text-text3 font-mono">
                           <div className="flex gap-12">
                                <div>
                                    <p className="text-text1 font-bold">{taskStats.efficiency}%</p>
                                    <p>Efficiency</p>
                                </div>
                                <div>
                                    <p className="text-text1 font-bold">{formatHoursMinutes(taskStats.dailyActiveAvg)}</p>
                                    <p>Daily Active (Avg)</p>
                                </div>
                                <div>
                                    <p className="text-text1 font-bold">{dailyStats.totalDays}</p>
                                    <p>Days Active</p>
                                </div>
                           </div>
                        </div>
                    </div>
                </div>

                {/* Topbar */}
                <header
                    className="al-fade-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                    style={{ animationDelay: '0s' }}
                >
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: T.text1 }}>
                            Activity Log
                        </h1>
                        <p className="mt-1 font-mono text-xs" style={{ color: T.text3 }}>
                            {dateSubtitle}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                            <Search
                                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                                style={{ color: T.text3 }}
                            />
                            <Input
                                placeholder="Search activity…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 rounded-[8px] pl-9 font-sans"
                                style={{
                                    background: T.bgSurface,
                                    borderColor: T.border,
                                    color: T.text1,
                                }}
                            />
                        </div>
                    </div>
                </header>

                {/* Stat cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {statCards.map((c, i) => (
                        <div
                            key={c.key}
                            className="al-fade-up rounded-[12px] border p-5 transition-colors"
                            style={{
                                animationDelay: `${0.05 + i * 0.05}s`,
                                background: T.bgCard,
                                borderColor: T.border,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(26,143,209,0.35)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = T.border;
                            }}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div
                                    className="flex h-10 w-10 items-center justify-center rounded-[8px]"
                                    style={{ background: T.bgSurface }}
                                >
                                    <c.icon className="h-5 w-5" style={{ color: T.blue }} />
                                </div>
                                {c.delta !== null && c.delta !== undefined && (
                                    <span
                                        className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium"
                                        style={{
                                            background:
                                                c.delta > 0
                                                    ? 'rgba(34,197,94,0.15)'
                                                    : c.delta < 0
                                                      ? 'rgba(239,68,68,0.15)'
                                                      : 'rgba(58,90,120,0.2)',
                                            color:
                                                c.delta > 0 ? T.green : c.delta < 0 ? T.red : T.text3,
                                        }}
                                    >
                                        {c.delta > 0 ? (
                                            <TrendingUp className="h-3 w-3" />
                                        ) : c.delta < 0 ? (
                                            <TrendingDown className="h-3 w-3" />
                                        ) : null}
                                        {c.delta === 0 ? '—' : `${c.delta > 0 ? '+' : ''}${c.delta}`}
                                    </span>
                                )}
                            </div>
                            <p className="mt-4 font-mono text-[11px] uppercase tracking-wider" style={{ color: T.text3 }}>
                                {c.title}
                            </p>
                            <p className="mt-1 text-3xl font-semibold tabular-nums" style={{ color: T.text1 }}>
                                {c.value}
                            </p>
                            <p className="mt-1 text-xs" style={{ color: T.text2 }}>
                                {c.sub}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Charts row */}
                <div
                    className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]"
                    style={{ alignItems: 'stretch' }}
                >
                    <div
                        className="al-fade-up rounded-[12px] border p-5"
                        style={{ animationDelay: '0.4s', background: T.bgCard, borderColor: T.border }}
                    >
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold" style={{ color: T.text1 }}>
                                Task Analytics
                            </h2>
                        </div>
                        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                            <div className="relative mx-auto h-[200px] w-[200px] shrink-0">
                                <canvas ref={doughnutCanvasRef} className="max-h-full max-w-full" />
                                <div
                                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                                    style={{ marginTop: -4 }}
                                >
                                    <span className="text-3xl font-semibold tabular-nums" style={{ color: T.text1 }}>
                                        {myProgressSegments.centerValue}
                                    </span>
                                    <span className="font-mono text-[10px]" style={{ color: T.text3 }}>
                                        tasks
                                    </span>
                                </div>
                            </div>
                            <ul className="flex flex-1 flex-col gap-2 font-mono text-[11px]" style={{ color: T.text2 }}>
                                {myProgressSegments.labels.map((lab, idx) => (
                                    <li key={lab} className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{
                                                background: [T.blue, '#f59e0b', T.green, T.red][idx],
                                            }}
                                        />
                                        <span className="flex-1">{lab}</span>
                                        <span style={{ color: T.text3 }}>
                                            {myProgressSegments.displayValues[idx] || 0}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div
                        className="al-fade-up rounded-[12px] border p-5"
                        style={{ animationDelay: '0.45s', background: T.bgCard, borderColor: T.border }}
                    >
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold" style={{ color: T.text1 }}>
                                Work Summary
                            </h2>
                            <div
                                className="flex rounded-[8px] border p-0.5 font-mono text-[11px]"
                                style={{ borderColor: T.border, background: T.bgSurface }}
                            >
                                    <button
                                        type="button"
                                        className="rounded-[6px] px-2 py-1 transition-colors"
                                        style={{
                                            background: !taskAnalyticsThisMonth ? T.blue : 'transparent',
                                            color: !taskAnalyticsThisMonth ? '#fff' : T.text2,
                                        }}
                                        onClick={() => setTaskAnalyticsThisMonth(false)}
                                    >
                                        6 months
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-[6px] px-2 py-1 transition-colors"
                                        style={{
                                            background: taskAnalyticsThisMonth ? T.blue : 'transparent',
                                            color: taskAnalyticsThisMonth ? '#fff' : T.text2,
                                        }}
                                        onClick={() => setTaskAnalyticsThisMonth(true)}
                                    >
                                        This Month
                                    </button>
                            </div>
                        </div>
                        <div className="h-[220px] w-full">
                            <canvas ref={barCanvasRef} className="h-full w-full" />
                        </div>
                    </div>
                </div>

                {/* Recent activity */}
                <section
                    className="al-fade-up rounded-[12px] border"
                    style={{ animationDelay: '0.5s', background: T.bgCard, borderColor: T.border }}
                >
                    <div
                        className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                        style={{ borderColor: T.border }}
                    >
                        <div>
                            <h2 className="text-sm font-semibold" style={{ color: T.text1 }}>
                                Recent Activity
                            </h2>
                            <p className="font-mono text-[11px]" style={{ color: T.text3 }}>
                                Sessions, tasks, and updates · Current session {elapsedTime}
                            </p>
                        </div>
                        {activityLogs.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-[8px] font-medium"
                                style={{ borderColor: T.border, color: T.red, background: 'transparent' }}
                                onClick={handleClearLogs}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Clear history
                            </Button>
                        )}
                    </div>
                    <div className="divide-y" style={{ borderColor: T.border }}>
                        {displayedFeed.length === 0 ? (
                            <div className="px-5 py-12 text-center text-sm" style={{ color: T.text3 }}>
                                No activity yet.
                            </div>
                        ) : (
                            displayedFeed.map((item) => {
                                const ts = tagStyles[item.tag];
                                return (
                                    <div
                                        key={item.id}
                                        className="flex gap-3 px-5 py-4 transition-colors hover:bg-[rgba(16,27,46,0.5)]"
                                    >
                                        <div
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] text-sm font-medium border border-white/5"
                                            style={{ background: item.iconBg, color: T.text2 }}
                                        >
                                            {item.logoId ? (
                                                (() => {
                                                    const { icon: CustomIcon, fgColor, bgColor, borderColor } = getLogoById(item.logoId);
                                                    return (
                                                        <span
                                                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border"
                                                            style={{ color: fgColor, backgroundColor: bgColor, borderColor }}
                                                        >
                                                            <CustomIcon className="h-3.5 w-3.5" />
                                                        </span>
                                                    );
                                                })()
                                            ) : (
                                                item.tag === 'Session' ? '⏱' : item.tag[0]
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm" style={{ color: T.text1 }}>
                                                <span className="font-semibold">{item.actor}</span>{' '}
                                                <span style={{ color: T.text2 }}>{item.entity}</span>
                                            </p>
                                            <p className="mt-1 font-mono text-[11px]" style={{ color: T.text3 }}>
                                                {item.timeLabel} · {item.source}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-2">
                                            <span
                                                className="rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase"
                                                style={{ background: ts.bg, color: ts.text }}
                                            >
                                                {item.tag}
                                            </span>
                                            {item.onDelete && (
                                                <button
                                                    type="button"
                                                    className="rounded-[8px] p-1.5 transition-colors hover:bg-red-500/10"
                                                    style={{ color: T.red }}
                                                    aria-label="Delete log"
                                                    onClick={item.onDelete}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {filteredFeed.length > 8 && (
                        <div className="border-t px-3 py-2" style={{ borderColor: T.border }}>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full rounded-[8px] font-mono text-[11px]"
                                style={{ color: T.text2 }}
                                onClick={() => setShowAllLogs(!showAllLogs)}
                            >
                                {showAllLogs ? (
                                    <>
                                        <ChevronUp className="mr-1 h-4 w-4" /> Show less
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="mr-1 h-4 w-4" /> Show{' '}
                                        {filteredFeed.length - 8} more
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
