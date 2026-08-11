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
 * @license AGPL-3.0-only
 * ============================================================================
 */
import { eachDayOfInterval, formatISO } from "date-fns";
import { Users, GitFork } from 'lucide-react';
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
import { useGitHubStats, useGitHubContributions } from "@/hooks/useGitHubData";
import { useProjects } from "@/hooks/useProjects";

const MobileDashboardView = ({ currentUser }: { currentUser: any }) => {
  const { data: stats } = useGitHubStats(!!currentUser);
  const { data: projects = [] } = useProjects();
  const currentYear = new Date().getFullYear();
  const { data: contributions = [] } = useGitHubContributions(currentYear, !!currentUser);

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
    <div className="p-4 pr-14 space-y-4 overflow-x-hidden">
      <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-sm">
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

      <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Github className="h-4 w-4 text-foreground" />
            Contributions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <ContributionGraph data={graphData} blockSize={9} blockMargin={2} blockRadius={2} className="min-w-[300px]">
            <ContributionGraphTotalCount className="text-sm font-semibold mb-2" />
            <ContributionGraphCalendar>
              {({ activity, dayIndex, weekIndex }) => (
                <ContributionGraphBlock key={`${weekIndex}-${dayIndex}`} activity={activity} dayIndex={dayIndex} weekIndex={weekIndex} />
              )}
            </ContributionGraphCalendar>
            <div className="mt-2 flex justify-end">
              <ContributionGraphLegend />
            </div>
          </ContributionGraph>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-sm">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-base font-semibold">{projects.length}</p>
            <p className="text-[11px] text-muted-foreground">Projects</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-sm">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-base font-semibold">{totalTasks}</p>
            <p className="text-[11px] text-muted-foreground">Tasks</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/10 shadow-sm">
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
