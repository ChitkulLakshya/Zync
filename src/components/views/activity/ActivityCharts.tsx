/** Charts row: Task Analytics doughnut + Work Summary bar (6-month / this-month). */

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { T } from './activityTypes';
import { useTheme } from 'next-themes';

interface ActivityChartsProps {
  myProgressSegments: {
    values: number[];
    displayValues: number[];
    labels: string[];
    centerValue: number;
  };
  sixMonthBars: { key: string; label: string; minutes: number; active: boolean }[];
  thisMonthBar: { label: string; minutes: number };
  taskAnalyticsThisMonth: boolean;
  setTaskAnalyticsThisMonth: (v: boolean) => void;
}

export function ActivityCharts({
  myProgressSegments,
  sixMonthBars,
  thisMonthBar,
  taskAnalyticsThisMonth,
  setTaskAnalyticsThisMonth,
}: ActivityChartsProps) {
  const doughnutCanvasRef = useRef<HTMLCanvasElement>(null);
  const barCanvasRef = useRef<HTMLCanvasElement>(null);
  const doughnutChartRef = useRef<Chart | null>(null);
  const barChartRef = useRef<Chart | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!doughnutCanvasRef.current) {
      return;
    }
    doughnutChartRef.current?.destroy();
    doughnutChartRef.current = new Chart(doughnutCanvasRef.current, {
      type: 'doughnut',
      data: {
        labels: myProgressSegments.labels,
        datasets: [
          {
            data: myProgressSegments.values,
            backgroundColor: [T.blue, T.orange, T.green, T.red],
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const v = Number(ctx.raw) || 0;
                return `${ctx.label}: ${v}`;
              },
            },
          },
        },
        animation: {
          easing: 'easeInOutQuart' as const,
        },
      },
    });
    return () => {
      doughnutChartRef.current?.destroy();
      doughnutChartRef.current = null;
    };
  }, [myProgressSegments]);

  useEffect(() => {
    if (!barCanvasRef.current) {
      return;
    }
    barChartRef.current?.destroy();

    const isDark = resolvedTheme === 'dark';
    const xTickColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)';
    const yTickColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';
    const yGridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    const labels = taskAnalyticsThisMonth ? [thisMonthBar.label] : sixMonthBars.map((b) => b.label);
    const data = taskAnalyticsThisMonth
      ? [thisMonthBar.minutes]
      : sixMonthBars.map((b) => b.minutes);
    const colors = taskAnalyticsThisMonth
      ? [T.blue]
      : sixMonthBars.map((b) => (b.active ? T.blue : 'rgba(148, 163, 184, 0.1)'));

    barChartRef.current = new Chart(barCanvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 32,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: xTickColor, font: { family: 'DM Sans', size: 10 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: yGridColor },
            ticks: {
              color: yTickColor,
              font: { family: 'DM Mono', size: 9 },
              callback: (v: any) => `${v}m`,
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { family: 'DM Sans' },
            bodyFont: { family: 'DM Mono' },
            padding: 10,
            cornerRadius: 8,
          },
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart' as const,
        },
      },
    });
    return () => {
      barChartRef.current?.destroy();
      barChartRef.current = null;
    };
  }, [taskAnalyticsThisMonth, sixMonthBars, thisMonthBar, resolvedTheme]);

  return (
    <div
      className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]"
      style={{ alignItems: 'stretch' }}
    >
      <div
        className="al-fade-up rounded-2xl border border-border/10 bg-surface-glass-regular p-5 shadow-sm"
        style={{ animationDelay: '0.4s' }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold" style={{ color: T.text1 }}>
            Task Analytics
          </h2>
        </div>
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          <div className="relative mx-auto h-[200px] w-[200px] shrink-0">
            <canvas ref={doughnutCanvasRef} className="max-h-full max-w-full" />
            <div
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
              style={{ marginTop: -4 }}
            >
              <span className="text-3xl font-semibold tabular-nums" style={{ color: T.text1 }}>
                {myProgressSegments.centerValue}
              </span>
              <span className="font-mono text-[10px]" style={{ color: T.text3 }}>
                tasks
              </span>
            </div>
          </div>
          <ul className="flex flex-1 flex-col gap-2 font-mono text-[11px]" style={{ color: T.text2 }}>
            {myProgressSegments.labels.map((lab, idx) => (
              <li key={lab} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: [T.blue, T.orange, T.green, T.red][idx] }}
                />
                <span className="flex-1">{lab}</span>
                <span style={{ color: T.text3 }}>{myProgressSegments.displayValues[idx] || 0}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className="al-fade-up rounded-2xl border border-border/10 bg-surface-glass-regular p-5 shadow-sm"
        style={{ animationDelay: '0.45s' }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold" style={{ color: T.text1 }}>
            Work Summary
          </h2>
          <div
            className="flex rounded-[8px] border p-0.5 font-mono text-[11px]"
            style={{ borderColor: T.border, background: T.bgSurface }}
          >
            <button
              type="button"
              className="rounded-[6px] px-2 py-1 transition-colors"
              style={{
                background: !taskAnalyticsThisMonth ? T.blue : 'transparent',
                color: !taskAnalyticsThisMonth ? '#fff' : T.text2,
              }}
              onClick={() => setTaskAnalyticsThisMonth(false)}
            >
              6 months
            </button>
            <button
              type="button"
              className="rounded-[6px] px-2 py-1 transition-colors"
              style={{
                background: taskAnalyticsThisMonth ? T.blue : 'transparent',
                color: taskAnalyticsThisMonth ? '#fff' : T.text2,
              }}
              onClick={() => setTaskAnalyticsThisMonth(true)}
            >
              This Month
            </button>
          </div>
        </div>
        <div className="h-[220px] w-full">
          <canvas ref={barCanvasRef} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
