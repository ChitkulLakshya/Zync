/** Shared types and design tokens for the Activity Log page. */

export const T = {
  bgBase: 'hsl(var(--background))',
  bgCard: 'hsl(var(--card) / 0.5)',
  bgSurface: 'hsl(var(--card) / 0.8)',
  border: 'hsl(var(--border) / 0.5)',
  blue: '#3b82f6',
  green: '#10b981',
  orange: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  text1: 'hsl(var(--foreground))',
  text2: 'hsl(var(--muted-foreground))',
  text3: 'hsl(var(--muted-foreground) / 0.6)',
} as const;

export interface ActivityLog {
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

export interface ActivityLogViewProps {
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

export type FeedTag = 'Commit' | 'Completed' | 'Invite' | 'Deadline' | 'Comment' | 'Session';

export interface FeedItem {
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

export const tagStyles: Record<FeedTag, { bg: string; text: string }> = {
  Commit: { bg: 'rgba(26,143,209,0.2)', text: T.blue },
  Completed: { bg: 'rgba(34,197,94,0.2)', text: T.green },
  Invite: { bg: 'rgba(168,85,247,0.2)', text: T.purple },
  Deadline: { bg: 'rgba(251,146,60,0.2)', text: T.orange },
  Comment: { bg: 'rgba(236,72,153,0.2)', text: T.pink },
  Session: { bg: 'rgba(26,143,209,0.15)', text: T.blue },
};
