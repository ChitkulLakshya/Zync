import { motion } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';

interface SimulatedCursorProps {
  x: number | string;
  y: number | string;
  isClicking?: boolean;
  name?: string;
  color?: string;
}

export const SimulatedCursor = ({
  x,
  y,
  isClicking = false,
  name,
  color,
}: SimulatedCursorProps) => {
  return (
    <motion.div
      className="absolute z-50 pointer-events-none flex flex-col"
      initial={{ left: '50%', top: '50%', opacity: 0 }}
      animate={{ left: x, top: y, opacity: 1, scale: isClicking ? 0.9 : 1 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 28,
        mass: 0.5,
      }}
    >
      <div className="relative flex items-start">
        {/* Pointer Arrow */}
        <MousePointer2
          className="w-7 h-7 -rotate-12 absolute -left-2 -top-2 drop-shadow-lg z-10"
          style={{
            color: color || 'hsl(var(--foreground))',
            fill: color || 'hsl(var(--foreground))',
          }}
        />

        {/* Feature Tag (Liquid Glass) */}
        {name && (
          <motion.div
            className="ml-6 mt-4 px-5 py-2 rounded-full bg-surface-glass-regular backdrop-blur-thick border border-black/10 dark:border-white/10 shadow-lg flex items-center gap-2.5"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Tiny Accent Dot */}
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: color || 'hsl(var(--primary))',
                boxShadow: `0 0 8px ${color}80`,
              }}
            />
            {/* Text */}
            <span className="font-mono text-xs uppercase font-bold tracking-widest text-foreground whitespace-nowrap opacity-90">
              {name}
            </span>
          </motion.div>
        )}
      </div>
      {/* Click ripple effect */}
      {isClicking && (
        <motion.div
          className="absolute top-1 left-1 w-5 h-5 rounded-full -z-10 blur-[1px]"
          style={{ backgroundColor: color || 'hsl(var(--primary))' }}
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      )}
    </motion.div>
  );
};
