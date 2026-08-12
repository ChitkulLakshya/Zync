/**
 * @fileoverview ActivityLogView.tsx
 * @module ActivityLogView
 *
 * Container for the Activity Log page. It composes the modular sub-components
 * (summary, stat cards, charts, feed) and owns the page-level chrome + the
 * DM Sans font injection. All derived state and side effects live in
 * `useActivityLogData`.
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Client-Side Presentation & Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license AGPL-3.0-only
 * ============================================================================
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
