/** Stat cards row: Total Tasks / In Progress / Completed / Overdue. */

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { T } from './activityTypes';

interface StatCard {
  key: string;
  title: string;
  value: number;
  delta: number | null;
  sub: string;
  icon: LucideIcon;
}

export function ActivityStatCards({ statCards }: { statCards: StatCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statCards.map((c, i) => (
        <div
          key={c.key}
          className="al-fade-up rounded-2xl border border-border/10 bg-surface-glass-regular p-5 transition-colors shadow-sm"
          style={{ animationDelay: `${0.05 + i * 0.05}s` }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(26,143,209,0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = T.border;
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-[8px]"
              style={{ background: T.bgSurface }}
            >
              <c.icon className="h-5 w-5" style={{ color: T.blue }} />
            </div>
            {c.delta !== null && c.delta !== undefined && (
              <span
                className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium"
                style={{
                  background:
                    c.delta > 0
                      ? 'rgba(34,197,94,0.15)'
                      : c.delta < 0
                        ? 'rgba(239,68,68,0.15)'
                        : 'rgba(58,90,120,0.2)',
                  color: c.delta > 0 ? T.green : c.delta < 0 ? T.red : T.text3,
                }}
              >
                {c.delta > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : c.delta < 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
                {c.delta === 0 ? '—' : `${c.delta > 0 ? '+' : ''}${c.delta}`}
              </span>
            )}
          </div>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider" style={{ color: T.text3 }}>
            {c.title}
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums" style={{ color: T.text1 }}>
            {c.value}
          </p>
          <p className="mt-1 text-xs" style={{ color: T.text2 }}>
            {c.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
