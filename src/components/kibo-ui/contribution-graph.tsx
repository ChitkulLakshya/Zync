/**
 * @fileoverview contribution-graph.tsx
 * @module contribution-graph
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
'use client';

import { cn } from '@/lib/utils';
import { createContext, useContext, type ComponentProps, type ReactNode } from 'react';

interface Activity {
  date: string;
  count: number;
  level: number;
}

/** Parse YYYY-MM-DD as a local calendar date (avoids UTC shift from `new Date(iso)`). */
function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format a local calendar date as YYYY-MM-DD (avoids UTC shift from `toISOString()`). */
function formatLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface ContributionGraphContextValue {
  data: Activity[];
  blockSize: number;
  blockMargin: number;
  blockRadius: number;
}

const ContributionGraphContext = createContext<ContributionGraphContextValue | null>(null);

const useContributionGraph = () => {
  const context = useContext(ContributionGraphContext);
  if (!context) {
    throw new Error('useContributionGraph must be used within a ContributionGraphProvider');
  }
  return context;
};

interface ContributionGraphProps extends ComponentProps<'div'> {
  data: Activity[];
  blockSize?: number;
  blockMargin?: number;
  blockRadius?: number;
  children: ReactNode;
}

const ContributionGraph = ({
  data,
  blockSize = 10,
  blockMargin = 2,
  blockRadius = 2,
  children,
  className,
  ...props
}: ContributionGraphProps) => {
  return (
    <ContributionGraphContext.Provider value={{ data, blockSize, blockMargin, blockRadius }}>
      <div className={cn('flex flex-col gap-2', className)} {...props}>
        {children}
      </div>
    </ContributionGraphContext.Provider>
  );
};

interface ContributionGraphCalendarProps {
  children: (props: { activity: Activity; dayIndex: number; weekIndex: number }) => ReactNode;
  maxWeeks?: number;
}

const ContributionGraphCalendar = ({ children, maxWeeks }: ContributionGraphCalendarProps) => {
  const { data, blockSize, blockMargin } = useContributionGraph();

  if (data.length === 0) {
    return null;
  }

  const dataMap = new Map(data.map((d) => [d.date, d]));

  const sortedData = [...data].sort(
    (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
  );

  const startDate = parseLocalDate(sortedData[0].date);
  const endDate = parseLocalDate(sortedData[sortedData.length - 1].date);

  const adjustedStart = new Date(startDate);
  adjustedStart.setDate(adjustedStart.getDate() - adjustedStart.getDay());

  const weeks: Activity[][] = [];
  const currentDate = new Date(adjustedStart);

  while (currentDate <= endDate) {
    const week: Activity[] = [];

    for (let day = 0; day < 7; day++) {
      const dateStr = formatLocalDateKey(currentDate);
      const activity = dataMap.get(dateStr) || {
        date: dateStr,
        count: 0,
        level: 0,
      };
      week.push(activity);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    weeks.push(week);
  }

  // 150 days is ~21 weeks. Default mobile view to 21 weeks if maxWeeks is unspecified.
  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
  const effectiveMaxWeeks = maxWeeks ?? (isMobileViewport ? 21 : undefined);

  const displayWeeks =
    effectiveMaxWeeks && weeks.length > effectiveMaxWeeks
      ? weeks.slice(-effectiveMaxWeeks)
      : weeks;

  const height = 7 * (blockSize + blockMargin);
  const width = displayWeeks.length * (blockSize + blockMargin);
  const marginLeft = 26;

  const months: { name: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  displayWeeks.forEach((week, weekIndex) => {
    const firstDayOfWeek = parseLocalDate(week[0].date);
    const month = firstDayOfWeek.getMonth();
    if (month !== lastMonth) {
      if (months.length > 0) {
        const lastAdded = months[months.length - 1];
        if (weekIndex - lastAdded.weekIndex < 3) {
          months.pop();
        }
      }
      months.push({
        name: firstDayOfWeek.toLocaleString('en-US', { month: 'short' }),
        weekIndex,
      });
      lastMonth = month;
    }
  });

  return (
    <div className="w-full flex flex-col items-center justify-center overflow-hidden py-1">
      <div className="flex flex-col items-center max-w-full">
        {/* Month Labels */}
        <div
          className="flex text-xs text-muted-foreground mb-2 relative"
          style={{ marginLeft: marginLeft, height: '1.2em', width: width }}
        >
          {months.map((month, idx) => (
            <span
              key={idx}
              className="absolute whitespace-nowrap text-[10px] sm:text-xs"
              style={{
                left: month.weekIndex * (blockSize + blockMargin),
              }}
            >
              {month.name}
            </span>
          ))}
        </div>

        <div className="flex items-center">
          {/* Day Labels */}
          <div
            className="flex flex-col justify-between text-xs text-muted-foreground mr-1.5 h-full py-[1px]"
            style={{ height: height }}
          >
            <span className="opacity-0 text-[10px]">Sum</span>
            <span className="text-[10px]">Mon</span>
            <span className="opacity-0 text-[10px]">Tue</span>
            <span className="text-[10px]">Wed</span>
            <span className="opacity-0 text-[10px]">Thu</span>
            <span className="text-[10px]">Fri</span>
            <span className="opacity-0 text-[10px]">Sat</span>
          </div>

          <svg width={width} height={height} className="block">
            {displayWeeks.map((week, weekIndex) =>
              week.map((activity, dayIndex) => children({ activity, dayIndex, weekIndex }))
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};

interface ContributionGraphBlockProps {
  activity: Activity;
  dayIndex: number;
  weekIndex: number;
  className?: string;
}

const ContributionGraphBlock = ({
  activity,
  dayIndex,
  weekIndex,
  className,
}: ContributionGraphBlockProps) => {
  const { blockSize, blockMargin, blockRadius } = useContributionGraph();

  const x = weekIndex * (blockSize + blockMargin);
  const y = dayIndex * (blockSize + blockMargin);

  const levelColors = [
    'var(--level-0)',
    'var(--level-1)',
    'var(--level-2)',
    'var(--level-3)',
    'var(--level-4)',
  ];

  return (
    <rect
      x={x}
      y={y}
      width={blockSize}
      height={blockSize}
      rx={blockRadius}
      ry={blockRadius}
      fill={levelColors[activity.level] || levelColors[0]}
      className={cn('transition-all hover:stroke-foreground hover:stroke-1', className)}
      data-date={activity.date}
      data-count={activity.count}
      data-level={activity.level}
    >
      <title>{`${activity.date}: ${activity.count} contributions`}</title>
    </rect>
  );
};

interface ContributionGraphFooterProps extends ComponentProps<'div'> {
  children: ReactNode;
}

const ContributionGraphFooter = ({
  children,
  className,
  ...props
}: ContributionGraphFooterProps) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between text-xs text-muted-foreground mt-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const ContributionGraphTotalCount = ({ className, ...props }: ComponentProps<'span'>) => {
  const { data } = useContributionGraph();
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const year = new Date().getFullYear();

  return (
    <span className={cn('font-medium', className)} {...props}>
      {total.toLocaleString()} contributions in {year}
    </span>
  );
};

const ContributionGraphLegend = ({ className, ...props }: ComponentProps<'div'>) => {
  return (
    <div className={cn('flex items-center justify-center gap-1.5 text-xs text-muted-foreground mx-auto text-center w-full', className)} {...props}>
      <span>Less</span>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--level-0)' }} />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--level-1)' }} />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--level-2)' }} />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--level-3)' }} />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--level-4)' }} />
      </div>
      <span>More</span>
    </div>
  );
};

export {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphFooter,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
};
