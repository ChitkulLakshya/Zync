/** Pure helper utilities for the Activity Log page. */

import { ActivityLog } from './activityTypes';

export function normStatus(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase();
}

export function normalizeUid(value: any): string {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    return String(value.uid || value.id || value._id || '');
  }
  return String(value);
}

export function extractOwnerUid(team: any): string {
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

export function isCompletedTask(t: any): boolean {
  const s = normStatus(t?.status);
  return s.includes('complete') || s === 'done';
}

export function isInProgressTask(t: any): boolean {
  if (isCompletedTask(t)) {
    return false;
  }
  const s = normStatus(t?.status);
  const hasCommitEvidence = Boolean(
    t?.commitUrl || t?.commitMessage || t?.commitTimestamp || t?.commitInfo?.message
  );

  if (!hasCommitEvidence) {
    return false;
  }

  return s.includes('progress') || s === 'active' || s === 'in review';
}

export function isOverdueTask(t: any): boolean {
  if (isCompletedTask(t)) {
    return false;
  }
  const d = t?.dueDate || t?.deadline;
  const hasCommits = !!(t?.commitUrl || t?.commitMessage);

  if (hasCommits && (!d || new Date(d).getTime() < Date.now())) {
    return true;
  }

  if (!d) {
    return false;
  }
  return new Date(d).getTime() < Date.now();
}

export function secondsForLogsInRange(
  logs: ActivityLog[],
  rangeStart: Date,
  rangeEnd: Date
): number {
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

export function formatHoursMinutes(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function formatSecondsToHoursMinutes(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
