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
}

const ContributionGraphCalendar = ({ children }: ContributionGraphCalendarProps) => {
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

  const height = 7 * (blockSize + blockMargin);
  const width = weeks.length * (blockSize + blockMargin);
  const marginLeft = 30;

  const months: { name: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, weekIndex) => {
    const firstDayOfWeek = parseLocalDate(week[0].date);
    const month = firstDayOfWeek.getMonth();
    if (month !== lastMonth) {
      // Skip labels for week columns that only exist for Sunday alignment before the
      // dataset starts (e.g. late Dec). Otherwise "Dec" sits on top of "Jan" (~15px apart)
      // and reads as a merged "Dedan".
      if (firstDayOfWeek < startDate) {
        lastMonth = month;
        return;
      }
      months.push({
        name: firstDayOfWeek.toLocaleString('en-US', { month: 'short' }),
        weekIndex,
      });
      lastMonth = month;
    }
  });

  return (
    <div className="flex flex-col">
      {}
      <div
        className="flex text-xs text-muted-foreground mb-2 relative"
        style={{ marginLeft: marginLeft, height: '1.2em' }}
      >
        {months.map((month, idx) => (
          <span
            key={idx}
            className="absolute whitespace-nowrap"
            style={{
              left: month.weekIndex * (blockSize + blockMargin),
            }}
          >
            {month.name}
          </span>
        ))}
      </div>

      <div className="flex">
        {}
        <div
          className="flex flex-col justify-between text-xs text-muted-foreground mr-2 h-full py-[1px]"
          style={{ height: height }}
        >
          <span className="opacity-0">Sum</span>
          <span>Mon</span>
          <span className="opacity-0">Tue</span>
          <span>Wed</span>
          <span className="opacity-0">Thu</span>
          <span>Fri</span>
          <span className="opacity-0">Sat</span>
        </div>

        <svg width={width} height={height} className="block">
          {weeks.map((week, weekIndex) =>
            week.map((activity, dayIndex) => children({ activity, dayIndex, weekIndex }))
          )}
        </svg>
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
    <div className={cn('flex items-center gap-1', className)} {...props}>
      <span>Less</span>
      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--level-0)' }} />
      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--level-1)' }} />
      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--level-2)' }} />
      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--level-3)' }} />
      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--level-4)' }} />
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
