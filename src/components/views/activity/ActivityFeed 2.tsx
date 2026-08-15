/** Recent Activity feed: searchable, paginated list of activity items. */

import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { T, FeedItem, tagStyles } from './activityTypes';
import { TeamLogoDisplay } from '@/components/ui/TeamLogoDisplay';

interface ActivityFeedProps {
  filteredFeed: FeedItem[];
  displayedFeed: FeedItem[];
  showAllLogs: boolean;
  setShowAllLogs: (v: boolean) => void;
  handleClearLogs: () => void;
  hasLogs: boolean;
  elapsedTime: string;
}

export function ActivityFeed({
  filteredFeed,
  displayedFeed,
  showAllLogs,
  setShowAllLogs,
  handleClearLogs,
  hasLogs,
  elapsedTime,
}: ActivityFeedProps) {
  return (
    <section
      className="al-fade-up rounded-2xl border border-border/10 bg-surface-glass-regular shadow-sm"
      style={{ animationDelay: '0.5s' }}
    >
      <div
        className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: T.border }}
      >
        <div>
          <h2 className="text-sm font-semibold" style={{ color: T.text1 }}>
            Recent Activity
          </h2>
          <p className="font-mono text-[11px]" style={{ color: T.text3 }}>
            Sessions, tasks, and updates · Current session {elapsedTime}
          </p>
        </div>
        {hasLogs && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-[8px] font-medium"
            style={{ borderColor: T.border, color: T.red, background: 'transparent' }}
            onClick={handleClearLogs}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear history
          </Button>
        )}
      </div>
      <div className="divide-y" style={{ borderColor: T.border }}>
        {displayedFeed.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm" style={{ color: T.text3 }}>
            No activity yet.
          </div>
        ) : (
          displayedFeed.map((item) => {
            const ts = tagStyles[item.tag];
            return (
              <div
                key={item.id}
                className="flex gap-3 px-5 py-4 transition-colors hover:bg-[rgba(16,27,46,0.5)]"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] text-sm font-medium border border-border"
                  style={{ background: item.iconBg, color: T.text2 }}
                >
                  {item.logoId ? (
                    <TeamLogoDisplay
                      logoId={item.logoId}
                      teamName={item.entity}
                      className="h-6 w-6"
                      iconClassName="h-3.5 w-3.5"
                    />
                  ) : item.tag === 'Session' ? (
                    '⏱'
                  ) : (
                    item.tag[0]
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm" style={{ color: T.text1 }}>
                    <span className="font-semibold">{item.actor}</span>{' '}
                    <span style={{ color: T.text2 }}>{item.entity}</span>
                  </p>
                  <p className="mt-1 font-mono text-[11px]" style={{ color: T.text3 }}>
                    {item.timeLabel} · {item.source}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase"
                    style={{ background: ts.bg, color: ts.text }}
                  >
                    {item.tag}
                  </span>
                  {item.onDelete && (
                    <button
                      type="button"
                      className="rounded-[8px] p-1.5 transition-colors hover:bg-red-500/10"
                      style={{ color: T.red }}
                      aria-label="Delete log"
                      onClick={item.onDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      {filteredFeed.length > 8 && (
        <div className="border-t px-3 py-2" style={{ borderColor: T.border }}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full rounded-[8px] font-mono text-[11px]"
            style={{ color: T.text2 }}
            onClick={() => setShowAllLogs(!showAllLogs)}
          >
            {showAllLogs ? (
              <>
                <ChevronUp className="mr-1 h-4 w-4" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-4 w-4" /> Show {filteredFeed.length - 8} more
              </>
            )}
          </Button>
        </div>
      )}
    </section>
  );
}
