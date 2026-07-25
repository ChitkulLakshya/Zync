import React from 'react';
import { cn } from '@/lib/utils';

interface TeamLogoDisplayProps {
  /** The logoId from the team object — either a full URL or null */
  logoId: string | null | undefined;
  /** The name of the team, used for the image alt tag and initials fallback */
  teamName: string;
  /** Custom classes applied to the outer wrapper div */
  className?: string;
  /** Optional inline style override for the wrapper */
  style?: React.CSSProperties;
  /** Custom classes applied to the SVG icon (unused now, kept for API compat) */
  iconClassName?: string;
}

/**
 * Renders a team's logo. If the team has a custom uploaded photo (URL),
 * it shows the image. Otherwise, it shows the team's initials.
 */
export function TeamLogoDisplay({
  logoId,
  teamName,
  className,
  style,
}: TeamLogoDisplayProps) {
  const isUrl = logoId?.startsWith('http');

  // Generate initials from the team name (first 2 characters, uppercase)
  const initials = (teamName || 'T')
    .split(/\s+/)
    .map(w => w.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full overflow-hidden shrink-0",
        isUrl
          ? ""
          : "bg-muted border border-border text-muted-foreground font-semibold text-xs",
        className
      )}
      style={style}
    >
      {isUrl ? (
        <img src={logoId!} alt={teamName} className="h-full w-full object-cover" />
      ) : (
        <span className="select-none">{initials}</span>
      )}
    </div>
  );
}
