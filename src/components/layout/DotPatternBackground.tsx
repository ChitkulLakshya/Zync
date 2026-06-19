import React from 'react';
import { cn } from '@/lib/utils';

export const DotPatternBackground = ({ 
  children, 
  className,
  containerClassName
}: { 
  children: React.ReactNode; 
  className?: string;
  containerClassName?: string;
}) => {
  return (
    <div className={cn("relative w-full h-full bg-white dark:bg-transparent", containerClassName)}>
      <div className={cn(
        "absolute inset-0 z-0 pointer-events-none",
        "opacity-[0.15] bg-[radial-gradient(circle_at_center,#94a3b8_1px,transparent_1px)] bg-[length:24px_24px]",
        "dark:opacity-[0.03] dark:bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)]",
        className
      )} />
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
