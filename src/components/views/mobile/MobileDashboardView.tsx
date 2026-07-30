/**
 * @fileoverview MobileDashboardView.tsx
 * @module MobileDashboardView
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
 * @license Proprietary and Confidential
 * ============================================================================
 */
import { eachDayOfInterval, formatISO } from "date-fns";
import { Users, GitFork, Clock, GitCommit, GitPullRequest, Star, AlertCircle } from 'lucide-react';
import { Github } from '@/components/ui/GithubIcon';;
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
} from "@/components/kibo-ui/contribution-graph";
import { useGitHubStats, useGitHubContributions, useGitHubEvents } from "@/hooks/useGitHubData";
import { useProjects } from "@/hooks/useProjects";

const formatEventType = (type: string) => {
  const typeMap: Record<string, { label: string; icon: React.JSX.Element }> = {
    PushEvent: { label: 'Pushed to', icon: <GitCommit className="h-3.5 w-3.5" /> },
    PullRequestEvent: { label: 'Pull request', icon: <GitPullRequest className="h-3.5 w-3.5" /> },
    CreateEvent: { label: 'Created', icon: <Star className="h-3.5 w-3.5" /> },
    IssuesEvent: { label: 'Issue', icon: <AlertCircle className="h-3.5 w-3.5" /> },
    WatchEvent: { label: 'Starred', icon: <Star className="h-3.5 w-3.5" /> },
    ForkEvent: { label: 'Forked', icon: <GitFork className="h-3.5 w-3.5" /> },
  };
  return typeMap[type] || { label: type.replace('Event', ''), icon: <Github className="h-3.5 w-3.5" /> };
};

const formatTimeAgo = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const MobileDashboardView = ({ currentUser }: { currentUser: any }) => {
  const { data: stats } = useGitHubStats(!!currentUser);
  const { data: projects = [] } = useProjects();
  const currentYear = new Date().getFullYear();
  const { data: contributions = [] } = useGitHubContributions(currentYear, !!currentUser);
  const { data: events = [] } = useGitHubEvents(!!currentUser);

  const contributionMap = contributions.reduce((acc, c) => {
    acc[c.date] = c.count;
    return acc;
  }, {} as Record<string, number>);

  const maxCount = Math.max(...contributions.map((c) => c.count), 1);
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31);
  const days = eachDayOfInterval({ start: yearStart, end: yearEnd });
  const graphData = days.map((date) => {
    const dateStr = formatISO(date, { representation: "date" });
    const count = contributionMap[dateStr] || 0;
    const level = count === 0 ? 0 : Math.ceil((count / maxCount) * 4);
    return { date: dateStr, count, level: Math.min(level, 4) };
  });

  const totalTasks = projects.reduce((sum, project: any) => {
    const steps = project.steps || [];
    return sum + steps.reduce((stepSum: number, step: any) => stepSum + (step.tasks?.length || 0), 0);
  }, 0);

  const completedTasks = projects.reduce((sum, project: any) => {
    const steps = project.steps || [];
    return (
      sum +
      steps.reduce(
        (stepSum: number, step: any) =>
          stepSum + (step.tasks?.filter((task: any) => task.status === "Completed" || task.status === "Done").length || 0),
        0
      )
    );
  }, 0);

  return (
    <div className="w-full flex flex-col box-border px-4 py-4 space-y-5 pb-28 min-h-fit overflow-y-auto overscroll-contain touch-pan-y">
      <Card className="w-full h-auto min-h-fit box-border bg-card/60 dark:bg-card/40 backdrop-blur-2xl backdrop-saturate-180 border border-white/10 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border border-border/20 shadow-sm">
              <AvatarImage src={stats?.avatar_url || currentUser?.photoURL || undefined} />
              <AvatarFallback>
                {(stats?.login || currentUser?.displayName || "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold truncate">{stats?.name || currentUser?.displayName || "Dashboard"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {stats?.bio || currentUser?.email || "Welcome to your mobile dashboard"}
              </p>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {stats?.followers ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {stats?.following ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="h-3 w-3" />
                  {stats?.public_repos ?? projects.length}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contributions 150-Day Graph Card (Centered) */}
      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-2xl backdrop-saturate-180 border border-white/10 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] overflow-hidden">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-sm flex items-center justify-center gap-2">
            <Github className="h-4 w-4 text-foreground" />
            Contributions (150 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col items-center justify-center px-2">
          <ContributionGraph data={graphData} blockSize={8.5} blockMargin={2} blockRadius={1.5} className="w-full flex flex-col items-center justify-center text-center mx-auto">
            <ContributionGraphTotalCount className="text-sm font-semibold mb-3 text-center block w-full mx-auto" />
            <div className="w-full flex items-center justify-center overflow-hidden mx-auto">
              <ContributionGraphCalendar maxWeeks={21}>
                {({ activity, dayIndex, weekIndex }) => (
                  <ContributionGraphBlock key={`${weekIndex}-${dayIndex}`} activity={activity} dayIndex={dayIndex} weekIndex={weekIndex} />
                )}
              </ContributionGraphCalendar>
            </div>
            <div className="mt-3 flex items-center justify-center w-full mx-auto text-center">
              <ContributionGraphLegend />
            </div>
          </ContributionGraph>
        </CardContent>
      </Card>

      {/* Recent Activities Card (Smooth Touch-Scrollable) */}
      <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-2xl backdrop-saturate-180 border border-white/10 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-sm flex items-center justify-center gap-2">
            <Clock className="h-4 w-4 text-foreground" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-1 px-3 pb-3 flex flex-col items-center">
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
          ) : (
            <div
              className="w-full max-h-[300px] overflow-y-auto overscroll-contain touch-pan-y space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {events.slice(0, 10).map((event: any) => {
                const { label, icon } = formatEventType(event.type);
                const repoName = typeof event.repo === 'string' ? event.repo : event.repo?.name || 'repository';
                const timeAgo = formatTimeAgo(event.created_at);
                const commitMsg = event.payload?.commits?.[0]?.message;

                return (
                  <div
                    key={event.id || Math.random()}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-card/40 dark:bg-white/5 border border-white/10 text-center gap-2"
                  >
                    <div className="p-1.5 rounded-full bg-foreground/5 text-foreground shrink-0 flex items-center justify-center">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs truncate">
                        <span className="font-semibold text-foreground">{label}</span>
                        <span className="text-primary truncate max-w-[140px]">{repoName}</span>
                      </div>
                      {commitMsg && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5 max-w-[200px] mx-auto">
                          {commitMsg}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {timeAgo}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-2xl backdrop-saturate-180 border border-white/10 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-base font-semibold">{projects.length}</p>
            <p className="text-[11px] text-muted-foreground">Projects</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-2xl backdrop-saturate-180 border border-white/10 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-base font-semibold">{totalTasks}</p>
            <p className="text-[11px] text-muted-foreground">Tasks</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-2xl backdrop-saturate-180 border border-white/10 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-base font-semibold">{completedTasks}</p>
            <p className="text-[11px] text-muted-foreground">Done</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MobileDashboardView;
