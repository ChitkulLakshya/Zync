/** Activity Summary hero card: team/member filters, identity header,
 *  total time worked, and the task progress bar. */

import { PlayCircle, Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { T } from './activityTypes';
import { formatHoursMinutes, formatSecondsToHoursMinutes } from './activityUtils';
import { getLogoById, getDeterministicLogoId } from '@/lib/team-logos';
import { getFullUrl } from '@/lib/utils';

interface ActivitySummaryCardProps {
  selectedTeamId: string;
  setSelectedTeamId: (v: string) => void;
  selectedUserId: string;
  setSelectedUserId: (v: string) => void;
  currentUserId?: string;
  currentTeamId?: string;
  selectedTeamOption: any;
  normalizedTeamFilterOptions: any[];
  selectedMemberOption: any;
  selectedTeamMemberOptions: any[];
  activeUser: any;
  allTeams: any[];
  taskStats: {
    total: number;
    inProgress: number;
    completed: number;
    overdue: number;
    efficiency: number;
    dailyActiveAvg: number;
  };
  totalActiveSeconds: number;
  dailyStats: { avgMins: number; totalDays: number };
}

export function ActivitySummaryCard({
  selectedTeamId,
  setSelectedTeamId,
  selectedUserId,
  setSelectedUserId,
  currentUserId,
  currentTeamId,
  selectedTeamOption,
  normalizedTeamFilterOptions,
  selectedMemberOption,
  selectedTeamMemberOptions,
  activeUser,
  allTeams,
  taskStats,
  totalActiveSeconds,
  dailyStats,
}: ActivitySummaryCardProps) {
  return (
    <div
      className="al-fade-up rounded-[2rem] border border-border/10 p-8 space-y-8 shadow-sm relative overflow-hidden bg-surface-glass-regular"
      style={{ animationDelay: '0.1s' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground opacity-80 uppercase tracking-[0.2em] text-[10px] font-bold">
          <PlayCircle className="h-4 w-4 text-blue" />
          Activity Summary
        </div>
        <div className="flex items-center gap-4">
          {normalizedTeamFilterOptions.length > 0 && (
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
                <SelectTrigger className="w-[170px] h-9 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[11px] text-muted-foreground backdrop-blur-md hover:bg-black/10 dark:hover:bg-white/10">
                  {selectedTeamId !== 'all' && selectedTeamOption ? (
                    (() => {
                      const logoId =
                        selectedTeamOption.logoId ||
                        getDeterministicLogoId(selectedTeamOption.id);
                      const {
                        icon: LogoIcon,
                        fgColor,
                        bgColor,
                        borderColor,
                      } = getLogoById(logoId);
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
                <SelectContent className="bg-background/80 backdrop-blur-xl border-border text-foreground">
                  {normalizedTeamFilterOptions.length === 0 ? (
                    <SelectItem
                      value="__no_team_available"
                      disabled
                      className="text-muted-foreground focus:bg-accent"
                    >
                      No teams available
                    </SelectItem>
                  ) : (
                    normalizedTeamFilterOptions.map((t: any) => {
                      const logoId = t.logoId || getDeterministicLogoId(t.id);
                      const {
                        icon: LogoIcon,
                        fgColor,
                        bgColor,
                        borderColor,
                      } = getLogoById(logoId);
                      return (
                        <SelectItem
                          key={t.id}
                          value={t.id}
                          className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                        >
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
                  <SelectTrigger className="w-[170px] h-9 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[11px] text-muted-foreground backdrop-blur-md hover:bg-black/10 dark:hover:bg-white/10">
                    {selectedUserId !== 'all' && selectedMemberOption ? (
                      <div className="flex items-center gap-2 truncate">
                        {selectedMemberOption.photoURL ? (
                          <img
                            src={getFullUrl(selectedMemberOption.photoURL)}
                            referrerPolicy="no-referrer"
                            alt={selectedMemberOption.label}
                            className="h-5 w-5 rounded-full object-cover border border-border shrink-0"
                          />
                        ) : (
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/20 bg-accent text-[10px] font-semibold text-foreground">
                            {(selectedMemberOption.label || 'M').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="truncate">{selectedMemberOption.label}</span>
                      </div>
                    ) : (
                      <SelectValue placeholder="Select Member" />
                    )}
                  </SelectTrigger>
                  <SelectContent className="bg-background/80 backdrop-blur-xl border-border text-foreground">
                    {selectedTeamMemberOptions.length === 0 ? (
                      <SelectItem
                        value="__no_member_available"
                        disabled
                        className="text-muted-foreground focus:bg-accent"
                      >
                        No members found
                      </SelectItem>
                    ) : (
                      selectedTeamMemberOptions.map((u) => (
                        <SelectItem
                          key={u.uid}
                          value={u.uid}
                          className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="flex items-center gap-2">
                            {u.photoURL ? (
                              <img
                                src={getFullUrl(u.photoURL)}
                                referrerPolicy="no-referrer"
                                alt={u.label}
                                className="h-5 w-5 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/20 bg-accent text-[10px] font-semibold text-foreground">
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
          )}
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{new Date().getFullYear()}</span>
            <ChevronDown className="h-3 w-3 ml-1" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full border border-border text-muted-foreground"
          >
            <span className="text-xl leading-none">···</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-[20px] overflow-hidden border-2 border-blue/30 shadow-[0_0_20px_rgba(59,130,246,0.15)] bg-muted flex items-center justify-center p-0">
            {selectedUserId !== 'all' ? (
              activeUser?.photoURL ? (
                <img
                  src={getFullUrl(activeUser.photoURL)}
                  referrerPolicy="no-referrer"
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-2xl font-bold bg-gradient-to-br from-blue to-purple text-primary-foreground">
                  {(activeUser?.displayName || 'Z').charAt(0)}
                </div>
              )
            ) : (
              (() => {
                const team = allTeams.find((t) => t.id === selectedTeamId);
                const logoId =
                  team?.logoId || getDeterministicLogoId(selectedTeamId || 'default');
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
            <h2 className="text-xl font-bold text-foreground">
              {selectedUserId === 'all'
                ? selectedTeamId === 'all'
                  ? 'Organization Overview'
                  : `${allTeams.find((t) => t.id === selectedTeamId)?.name || 'Team'} Overview`
                : activeUser?.displayName || 'Member Profile'}
            </h2>
            {selectedUserId !== 'all' && activeUser?.email && (
              <p className="text-xs text-muted-foreground/90">{activeUser.email}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {taskStats.completed} Tasks completed
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.15em] font-bold mb-1">
            Total time worked
          </p>
          <h3 className="text-4xl font-bold tracking-tight text-foreground">
            {formatSecondsToHoursMinutes(totalActiveSeconds)}
          </h3>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Completed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              In Progress
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-orange" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Overdue
            </span>
          </div>
        </div>

        <div className="h-3 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-green transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            style={{
              width: `${taskStats.total ? (taskStats.completed / taskStats.total) * 100 : 0}%`,
            }}
          />
          <div
            className="h-full bg-blue transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            style={{
              width: `${taskStats.total ? (taskStats.inProgress / taskStats.total) * 100 : 0}%`,
            }}
          />
          <div
            className="h-full bg-orange transition-all duration-1000 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            style={{
              width: `${taskStats.total ? (taskStats.overdue / taskStats.total) * 100 : 0}%`,
            }}
          />
        </div>

        <div className="flex justify-between items-center text-[11px] text-muted-foreground/60 font-mono">
          <div className="flex gap-12">
            <div>
              <p className="text-foreground font-bold">{taskStats.efficiency}%</p>
              <p>Efficiency</p>
            </div>
            <div>
              <p className="text-foreground font-bold">
                {formatHoursMinutes(taskStats.dailyActiveAvg)}
              </p>
              <p>Daily Active (Avg)</p>
            </div>
            <div>
              <p className="text-foreground font-bold">{dailyStats.totalDays}</p>
              <p>Days Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
