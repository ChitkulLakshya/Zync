/**
 * @fileoverview ActivityLogView.tsx
 * @module ActivityLogView
 *
 * Container for the Activity Log page. It composes the modular sub-components
 * (summary, stat cards, charts, feed) and owns the page-level chrome + the
 * DM Sans font injection. All derived state and side effects live in
 * `useActivityLogData`.
 */

import { useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ActivityLogViewProps } from './activity/activityTypes';
import { useActivityLogData } from './activity/useActivityLogData';
import { ActivitySummaryCard } from './activity/ActivitySummaryCard';
import { ActivityStatCards } from './activity/ActivityStatCards';
import { ActivityCharts } from './activity/ActivityCharts';
import { ActivityFeed } from './activity/ActivityFeed';

const FONT_LINK_ID = 'activity-log-dm-fonts';

export default function ActivityLogView(props: ActivityLogViewProps) {
  const data = useActivityLogData(props);

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

  return (
    <div
      className="min-h-screen font-sans bg-background text-foreground"
      style={{
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`
        @keyframes al-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .al-fade-up { animation: al-fade-up 0.5s ease forwards; opacity: 0; }
      `}</style>

      <div className="max-w-7xl mx-auto w-full p-6 md:p-8 space-y-8">
        <ActivitySummaryCard
          selectedTeamId={data.selectedTeamId}
          setSelectedTeamId={data.setSelectedTeamId}
          selectedUserId={data.selectedUserId}
          setSelectedUserId={data.setSelectedUserId}
          currentUserId={data.currentUserId}
          currentTeamId={data.currentTeamId}
          selectedTeamOption={data.selectedTeamOption}
          normalizedTeamFilterOptions={data.normalizedTeamFilterOptions}
          selectedMemberOption={data.selectedMemberOption}
          selectedTeamMemberOptions={data.selectedTeamMemberOptions}
          activeUser={data.activeUser}
          allTeams={data.allTeams}
          taskStats={data.taskStats}
          totalActiveSeconds={data.totalActiveSeconds}
          dailyStats={data.dailyStats}
        />

        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            placeholder="Search activities by user, message, or project..."
            value={data.searchQuery}
            onChange={(e) => data.setSearchQuery(e.target.value)}
            className="pl-11 h-12 rounded-[14px] text-sm border-border bg-card text-foreground"
          />
        </div>

        <ActivityStatCards statCards={data.statCards} />

        <ActivityCharts
          myProgressSegments={data.myProgressSegments}
          sixMonthBars={data.sixMonthBars}
          thisMonthBar={data.thisMonthBar}
          taskAnalyticsThisMonth={data.taskAnalyticsThisMonth}
          setTaskAnalyticsThisMonth={data.setTaskAnalyticsThisMonth}
        />

        <ActivityFeed
          filteredFeed={data.filteredFeed}
          displayedFeed={data.displayedFeed}
          showAllLogs={data.showAllLogs}
          setShowAllLogs={data.setShowAllLogs}
          handleClearLogs={props.handleClearLogs}
          hasLogs={props.activityLogs.length > 0}
          elapsedTime={props.elapsedTime}
        />
      </div>
    </div>
  );
}
