import React from 'react';

export const GitBranchBackground = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex justify-center items-center opacity-60 dark:opacity-100">
      <svg
        className="w-full h-full min-w-[1200px]"
        viewBox="0 0 1200 800"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main Trunk (Subtle, runs straight down the middle) */}
        <path
          d="M 600 800 L 600 0"
          className="stroke-zinc-200/50 dark:stroke-white/[0.04]"
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />

        {/* Left Branch */}
        <path
          d="M 600 700 C 400 700, 200 600, 200 400 C 200 200, 400 150, 600 100"
          className="stroke-zinc-300/80 dark:stroke-white/[0.08]"
          strokeWidth="1.5"
        />
        {/* Left Branch Nodes */}
        <circle cx="330" cy="625" r="4.5" className="fill-white dark:fill-[#0a0a0a] stroke-zinc-400 dark:stroke-white/30" strokeWidth="1.5" />
        <circle cx="200" cy="400" r="5" className="fill-white dark:fill-[#0a0a0a] stroke-zinc-400 dark:stroke-white/30" strokeWidth="2" />
        <circle cx="280" cy="225" r="4.5" className="fill-white dark:fill-[#0a0a0a] stroke-zinc-400 dark:stroke-white/30" strokeWidth="1.5" />

        {/* Right Branch */}
        <path
          d="M 600 750 C 850 750, 1050 600, 1050 350 C 1050 100, 850 50, 600 0"
          className="stroke-zinc-300/80 dark:stroke-white/[0.08]"
          strokeWidth="1.5"
        />
        {/* Right Branch Nodes */}
        <circle cx="900" cy="665" r="4.5" className="fill-white dark:fill-[#0a0a0a] stroke-zinc-400 dark:stroke-white/30" strokeWidth="1.5" />
        <circle cx="1050" cy="350" r="5" className="fill-white dark:fill-[#0a0a0a] stroke-zinc-400 dark:stroke-white/30" strokeWidth="2" />
        <circle cx="950" cy="140" r="4.5" className="fill-white dark:fill-[#0a0a0a] stroke-zinc-400 dark:stroke-white/30" strokeWidth="1.5" />
        
      </svg>
    </div>
  );
};
