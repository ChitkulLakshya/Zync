import React from 'react';
import { cn } from '@/lib/utils';

interface LineProps {
  className?: string;
  height?: string;
}

/**
 * A centered, razor-thin vertical line that fades out using a gradient.
 * Perfect for connecting vertical sections or leading the eye downward.
 */
export const VerticalConnectingLine = ({ className, height = "h-32" }: LineProps) => {
  return (
    <div className={cn("flex justify-center w-full relative z-0", className)} aria-hidden="true">
      <div 
        className={cn(
          "w-[1px] bg-gradient-to-b from-transparent via-slate-200 to-transparent dark:via-white/10",
          height
        )} 
      />
    </div>
  );
};

/**
 * A centered vertical line that starts solid and fades to transparent at the bottom.
 * Useful for hanging off the bottom of a section block.
 */
export const VerticalFadeOutLine = ({ className, height = "h-32" }: LineProps) => {
  return (
    <div className={cn("flex justify-center w-full relative z-0", className)} aria-hidden="true">
      <div 
        className={cn(
          "w-[1px] bg-gradient-to-b from-slate-200 to-transparent dark:from-white/10",
          height
        )} 
      />
    </div>
  );
};

/**
 * A subtle horizontal section divider that fades to transparent on the edges.
 */
export const HorizontalDivider = ({ className }: { className?: string }) => {
  return (
    <div className={cn("w-full flex justify-center py-8 relative z-0", className)} aria-hidden="true">
      <div className="w-full max-w-5xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10" />
    </div>
  );
};
