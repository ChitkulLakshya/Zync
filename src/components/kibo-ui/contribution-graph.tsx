"use client";

import { cn } from "@/lib/utils";
import {
    createContext,
    useContext,
    type ComponentProps,
    type ReactNode,
} from "react";

// Types
interface Activity {
    date: string;
    count: number;
    level: number;
}

interface ContributionGraphContextValue {
    data: Activity[];
    blockSize: number;
    blockMargin: number;
    blockRadius: number;
}

// Context
const ContributionGraphContext = createContext<ContributionGraphContextValue | null>(null);

const useContributionGraph = () => {
    const context = useContext(ContributionGraphContext);
    if (!context) {
        throw new Error("useContributionGraph must be used within a ContributionGraphProvider");
    }
    return context;
};

// Main Component
interface ContributionGraphProps extends ComponentProps<"div"> {
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
        <ContributionGraphContext.Provider
            value={{ data, blockSize, blockMargin, blockRadius }}
        >
            <div className={cn("flex flex-col gap-2", className)} {...props}>
                {children}
            </div>
        </ContributionGraphContext.Provider>
    );
};

// Calendar Component - properly groups into weeks
interface ContributionGraphCalendarProps {
    children: (props: {
        activity: Activity;
        dayIndex: number;
        weekIndex: number;
    }) => ReactNode;
}

const ContributionGraphCalendar = ({
    children,
}: ContributionGraphCalendarProps) => {
    const { data, blockSize, blockMargin } = useContributionGraph();

    if (data.length === 0) return null;

    // Create a map for quick lookup
    const dataMap = new Map(data.map((d) => [d.date, d]));

    // Get the date range
    const sortedData = [...data].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const startDate = new Date(sortedData[0].date);
    const endDate = new Date(sortedData[sortedData.length - 1].date);

    // Adjust start to beginning of week (Sunday)
    const adjustedStart = new Date(startDate);
    adjustedStart.setDate(adjustedStart.getDate() - adjustedStart.getDay());

    // Build weeks array
    const weeks: Activity[][] = [];
    let currentDate = new Date(adjustedStart);

    while (currentDate <= endDate) {
        const week: Activity[] = [];

        for (let day = 0; day < 7; day++) {
            const dateStr = currentDate.toISOString().split("T")[0];
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
    const marginLeft = 30; // Space for day labels

    // Month labels
    const months: { name: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, weekIndex) => {
        const firstDayOfWeek = new Date(week[0].date);
        const month = firstDayOfWeek.getMonth();
        if (month !== lastMonth) {
            months.push({
                name: firstDayOfWeek.toLocaleString('default', { month: 'short' }),
                weekIndex,
            });
            lastMonth = month;
        }
    });

    return (
        <div className="flex flex-col">
            {/* Month labels */}
            <div
                className="flex text-xs text-muted-foreground mb-2 relative"
                style={{ marginLeft: marginLeft, height: '1.2em' }}
            >
                {months.map((month, idx) => (
                    <span
                        key={idx}
                        className="absolute"
                        style={{
                            left: month.weekIndex * (blockSize + blockMargin),
                        }}
                    >
                        {month.name}
                    </span>
                ))}
            </div>

            <div className="flex">
                {/* Day labels */}
                <div className="flex flex-col justify-between text-xs text-muted-foreground mr-2 h-full py-[1px]" style={{ height: height }}>
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
                        week.map((activity, dayIndex) =>
                            children({ activity, dayIndex, weekIndex })
                        )
                    )}
                </svg>
            </div>
        </div>
    );
};

// Block Component
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
        "var(--level-0, #161b22)",
        "var(--level-1, #0e4429)",
        "var(--level-2, #006d32)",
        "var(--level-3, #26a641)",
        "var(--level-4, #39d353)",
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
            className={cn("transition-all hover:stroke-foreground hover:stroke-1", className)}
            data-date={activity.date}
            data-count={activity.count}
            data-level={activity.level}
        >
            <title>{`${activity.date}: ${activity.count} contributions`}</title>
        </rect>
    );
};

// Footer Component
interface ContributionGraphFooterProps extends ComponentProps<"div"> {
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
                "flex items-center justify-between text-xs text-muted-foreground mt-2",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

// Total Count Component
const ContributionGraphTotalCount = ({
    className,
    ...props
}: ComponentProps<"span">) => {
    const { data } = useContributionGraph();
    const total = data.reduce((sum, d) => sum + d.count, 0);
    const year = new Date().getFullYear();

    return (
        <span className={cn("font-medium", className)} {...props}>
            {total.toLocaleString()} contributions in {year}
        </span>
    );
};

// Legend Component
const ContributionGraphLegend = ({
    className,
    ...props
}: ComponentProps<"div">) => {
    return (
        <div className={cn("flex items-center gap-1", className)} {...props}>
            <span>Less</span>
            <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: "var(--level-0, #161b22)" }}
            />
            <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: "var(--level-1, #0e4429)" }}
            />
            <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: "var(--level-2, #006d32)" }}
            />
            <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: "var(--level-3, #26a641)" }}
            />
            <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: "var(--level-4, #39d353)" }}
            />
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
