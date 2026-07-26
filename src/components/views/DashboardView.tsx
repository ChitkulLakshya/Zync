/**
 * @fileoverview DashboardView.tsx
 * @module DashboardView
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
import { useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { API_BASE_URL } from '@/lib/utils';
import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
} from '@/components/kibo-ui/contribution-graph';
import { eachDayOfInterval, formatISO } from 'date-fns';
import { Users, GitFork, Star, GitCommit, GitPullRequest, Clock, ExternalLink, AlertCircle, ChevronDown, BookMarked, LogOut, Kanban, StickyNote, CalendarDays, MessageSquare, ArrowRight,  } from 'lucide-react';
import { Github } from '@/components/ui/GithubIcon';;

import { useGitHubStats, useGitHubEvents, useGitHubContributions } from '@/hooks/useGitHubData';
import { useProjects } from '@/hooks/useProjects';
import { useQueryClient } from '@tanstack/react-query';

interface DashboardViewProps {
  currentUser: any;
  isPreview?: boolean;
  mockGitHubData?: any;
  mockProjects?: any[];
}

const DashboardView = ({
  currentUser,
  isPreview,
  mockGitHubData,
  mockProjects,
}: DashboardViewProps) => {
  const queryClient = useQueryClient();
  const { data: realProjects = [] } = useProjects();
  const projects = isPreview && mockProjects ? mockProjects : realProjects;
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const {
    data: realStats,
    isLoading: statsLoading,
    error: statsError,
    isRefetching: statsRefetching,
  } = useGitHubStats(!!currentUser && !isPreview);

  const { data: realEvents = [], isLoading: eventsLoading } = useGitHubEvents(
    !!currentUser && !isPreview
  );

  const {
    data: realContributions = [],
    isLoading: contribLoading,
    isFetching: contribFetching,
  } = useGitHubContributions(selectedYear, !!currentUser && !isPreview);

  const stats = isPreview ? mockGitHubData?.stats : realStats;
  const events = isPreview ? mockGitHubData?.events : realEvents;
  const contributions = isPreview ? mockGitHubData?.contributions : realContributions;

  const loading = !isPreview && (statsLoading || eventsLoading || contribLoading);
  const isRefreshing = !isPreview && (statsRefetching || contribFetching);
  const error = isPreview
    ? null
    : statsError
      ? (statsError as Error).message
      : stats?.connected === false
        ? 'GitHub not connected. Sign in with GitHub to see your activity.'
        : null;

  const formatEventType = (type: string) => {
    const typeMap: Record<string, { label: string; icon: React.JSX.Element }> = {
      PushEvent: { label: 'Pushed to', icon: <GitCommit className="h-4 w-4" /> },
      PullRequestEvent: { label: 'Pull request', icon: <GitPullRequest className="h-4 w-4" /> },
      CreateEvent: { label: 'Created', icon: <Star className="h-4 w-4" /> },
      IssuesEvent: { label: 'Issue', icon: <AlertCircle className="h-4 w-4" /> },
      WatchEvent: { label: 'Starred', icon: <Star className="h-4 w-4" /> },
      ForkEvent: { label: 'Forked', icon: <GitFork className="h-4 w-4" /> },
    };
    return (
      typeMap[type] || { label: type.replace('Event', ''), icon: <Github className="h-4 w-4" /> }
    );
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    return `${diffDays}d ago`;
  };

  const getEventActor = (event: (typeof events)[number]) => {
    const actor = event.actor;
    return {
      name:
        actor?.login || stats?.name || stats?.login || currentUser?.displayName || 'GitHub user',
      avatarUrl: actor?.avatar_url || stats?.avatar_url || currentUser?.photoURL || '',
      profileUrl:
        actor?.html_url ||
        stats?.html_url ||
        `https://github.com/${stats?.login || actor?.login || ''}`,
    };
  };

  const handleUnlink = async () => {
    if (!confirm('Are you sure you want to unlink your GitHub account?')) {
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      await fetch(`${API_BASE_URL}/api/github/disconnect`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });


      queryClient.invalidateQueries({ queryKey: ['github'] });
    } catch (err) {
      console.error('Error unlinking:', err);
    }
  };

  const contributionMap = contributions.reduce(
    (acc: Record<string, number>, c: any) => {
      acc[c.date] = c.count;
      return acc;
    },
    {} as Record<string, number>
  );

  const maxCount = Math.max(...contributions.map((c: any) => c.count), 1);

  const yearStart = new Date(selectedYear, 0, 1);
  const yearEnd = new Date(selectedYear, 11, 31);

  const today = new Date();
  const isCurrentYear = selectedYear === today.getFullYear();
  const end = isCurrentYear ? today : yearEnd;

  const days = eachDayOfInterval({
    start: yearStart,
    end: yearEnd,
  });

  const graphData = days.map((date) => {
    const dateStr = formatISO(date, { representation: 'date' });
    const count = contributionMap[dateStr] || 0;
    const level = count === 0 ? 0 : Math.ceil((count / maxCount) * 4);
    return {
      date: dateStr,
      count,
      level: Math.min(level, 4),
    };
  });

  const activityStats = [
    {
      subject: 'Commits',
      A: events.filter((e: any) => e.type === 'PushEvent').length,
      fullMark: 100,
    },
    {
      subject: 'Pull Requests',
      A: events.filter((e: any) => e.type === 'PullRequestEvent').length,
      fullMark: 100,
    },
    {
      subject: 'Code Review',
      A: events.filter((e: any) => e.type === 'PullRequestReviewEvent').length,
      fullMark: 100,
    },
    {
      subject: 'Issues',
      A: events.filter((e: any) => e.type === 'IssuesEvent').length,
      fullMark: 100,
    },
  ];

  const repositories = Array.from(new Set(events.map((e: any) => e.repo))).slice(0, 5) as string[];

  const currentYear = new Date().getFullYear();
  const startYear = stats?.created_at ? new Date(stats.created_at).getFullYear() : currentYear;
  const availableYears = Array.from(
    { length: currentYear - startYear + 1 },
    (_, i) => currentYear - i
  );
  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground flex items-center justify-center h-full">
        Loading...
      </div>
    );
  }
  if (error && !stats) {
    const totalTasks = projects.reduce((sum: number, p: any) => {
      const steps = p.steps || [];
      return sum + steps.reduce((s: number, step: any) => s + (step.tasks?.length || 0), 0);
    }, 0);
    const completedTasks = projects.reduce((sum: number, p: any) => {
      const steps = p.steps || [];
      return (
        sum +
        steps.reduce(
          (s: number, step: any) =>
            s +
            (step.tasks?.filter((t: any) => t.status === 'Done')
              .length || 0),
          0
        )
      );
    }, 0);

    return (
      <div className="max-w-7xl mx-auto w-full p-6 md:p-8 space-y-8">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <Github className="h-10 w-10 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground mt-1">
                  Connect GitHub to unlock contribution graphs, commit tracking, and repo analytics.
                </p>
              </div>
              <Button size="lg" onClick={() => (window.location.href = '/login')}>
                <Github className="mr-2 h-5 w-5" />
                Connect GitHub
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <Kanban className="h-8 w-8 text-foreground mx-auto mb-2" />
              <p className="text-2xl font-bold">{projects.length}</p>
              <p className="text-sm text-muted-foreground">Projects</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <GitCommit className="h-8 w-8 text-foreground mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalTasks}</p>
              <p className="text-sm text-muted-foreground">Total Tasks</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <Star className="h-8 w-8 text-foreground mx-auto mb-2" />
              <p className="text-2xl font-bold">{completedTasks}</p>
              <p className="text-sm text-muted-foreground">Done</p>
            </CardContent>
          </Card>
        </div>

        {projects.length > 0 ? (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookMarked className="h-5 w-5" />
                Your Projects
              </CardTitle>
              <CardDescription>Quick overview of your active projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {projects.slice(0, 5).map((project: any) => {
                  const steps = project.steps || [];
                  const tasks = steps.flatMap((s: any) => s.tasks || []);
                  const done = tasks.filter(
                    (t: any) => t.status === 'Done'
                  ).length;
                  const total = tasks.length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <div
                      key={project.id || project._id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{total} tasks</p>
                      </div>
                      <div className="w-24">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-foreground rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-right mt-1">{pct}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card">
            <CardContent className="pt-6 text-center space-y-4">
              <Kanban className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="text-lg font-semibold">No projects yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first project to get started with task tracking.
                </p>
              </div>
              <Button onClick={() => (window.location.href = '/new-project')}>
                Create a Project
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: MessageSquare,
              title: 'Chat',
              desc: 'Message teammates in real-time',
              href: '/dashboard',
            },
            {
              icon: CalendarDays,
              title: 'Calendar',
              desc: 'Schedule meetings and track holidays',
              href: '/dashboard',
            },
            {
              icon: StickyNote,
              title: 'Notes',
              desc: 'Share project documentation',
              href: '/dashboard',
            },
          ].map((item) => (
            <Card
              key={item.title}
              className="glass-card hover:bg-surface-glass-thick transition-colors cursor-pointer"
            >
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full p-6 md:p-8 space-y-8">
      {}
      {stats && (
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 border-4 border-primary/20">
                <AvatarImage src={stats.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {stats.login?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{stats.name || stats.login}</h1>
                  <Badge variant="secondary" className="bg-muted text-foreground">
                    <Github className="h-3 w-3 mr-1" />@{stats.login}
                  </Badge>
                </div>
                {stats.bio && <p className="text-muted-foreground mt-1">{stats.bio}</p>}
                <div className="flex items-center gap-6 mt-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <strong>{stats.followers}</strong> followers
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <strong>{stats.following}</strong> following
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <GitFork className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <strong>{stats.public_repos}</strong> repos
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="outline" asChild className="bg-surface-glass-regular">
                <a href={stats.html_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Profile
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {}
      <div className="flex flex-col md:flex-row gap-6">
        <div
          className={`flex-1 glass-card p-4 transition-opacity duration-200 ${isRefreshing ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <ContributionGraph
            data={graphData}
            blockSize={12}
            blockMargin={3}
            blockRadius={2}
            className="w-full"
          >
            {}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ContributionGraphTotalCount className="text-lg font-semibold" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">
                    Contribution settings
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleUnlink}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Unlink GitHub
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {}
            <div className="overflow-x-auto">
              <ContributionGraphCalendar>
                {({ activity, dayIndex, weekIndex }) => (
                  <ContributionGraphBlock
                    key={`${weekIndex}-${dayIndex}`}
                    activity={activity}
                    dayIndex={dayIndex}
                    weekIndex={weekIndex}
                  />
                )}
              </ContributionGraphCalendar>
            </div>

            {}
            <div className="flex items-center justify-between mt-2 pt-2 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground hover:underline">
                Learn how we count contributions
              </a>
              <ContributionGraphLegend />
            </div>
          </ContributionGraph>
        </div>

        {}
        <div className="w-full md:w-32 flex flex-col gap-2">
          {availableYears.map((year) => (
            <Button
              key={year}
              type="button"
              variant={selectedYear === year ? 'default' : 'ghost'}
              className={`w-full justify-start ${selectedYear === year ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setSelectedYear(year)}
              disabled={isRefreshing}
            >
              {year}
            </Button>
          ))}
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookMarked className="h-5 w-5" />
            Activity overview
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <GitCommit className="h-4 w-4" />
                Contributed to
              </p>
              <div className="space-y-2">
                {repositories.map((repo, idx) => (
                  <a
                    key={idx}
                    href={`https://github.com/${repo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-foreground hover:underline text-sm font-medium pl-6"
                  >
                    {repo}
                  </a>
                ))}
                {repositories.length === 0 && (
                  <p className="text-sm text-muted-foreground pl-6">No recent repositories found</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-center min-h-[300px]">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={activityStats}>
              <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
              <Radar
                name="Activity"
                dataKey="A"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your latest GitHub events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent activity</p>
            ) : (
              events.slice(0, 10).map((event: any) => {
                const { label, icon } = formatEventType(event.type);
                const actor = getEventActor(event);
                const commitMessage = event.payload.commits?.[0]?.message || null;
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-1 p-2 rounded-full bg-muted">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 flex-wrap">
                        <Avatar className="h-9 w-9 border">
                          <AvatarImage src={actor.avatarUrl} alt={actor.name} />
                          <AvatarFallback>{actor.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{label}</span>
                            <a
                              href={`https://github.com/${event.repo}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-foreground hover:underline truncate"
                            >
                              {event.repo}
                            </a>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                            <a
                              href={actor.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:text-foreground hover:underline truncate"
                            >
                              {actor.name}
                            </a>
                            <span className="shrink-0">made this commit</span>
                          </div>
                        </div>
                      </div>
                      {commitMessage && (
                        <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Commit message
                          </p>
                          <p className="mt-1 text-sm text-foreground break-words">
                            {commitMessage}
                          </p>
                        </div>
                      )}
                      {event.payload.commits && event.payload.commits.length > 1 && (
                        <div className="mt-2 space-y-1">
                          {event.payload.commits.slice(1).map((commit: any, idx: number) => (
                            <div
                              key={idx}
                              className="text-sm text-muted-foreground flex items-center gap-2"
                            >
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {commit.sha}
                              </code>
                              <span className="truncate">{commit.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {event.payload.ref && (
                        <p className="text-sm text-muted-foreground">
                          Branch:{' '}
                          <code className="bg-muted px-1 py-0.5 rounded">
                            {event.payload.ref.replace('refs/heads/', '')}
                          </code>
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimeAgo(event.created_at)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardView;
