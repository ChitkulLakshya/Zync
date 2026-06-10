import { motion } from "framer-motion";
import { MousePointer2 } from "lucide-react";

interface SimulatedCursorProps {
  x: number | string;
  y: number | string;
  isClicking?: boolean;
  name?: string;
  color?: string; // Tailwind color class or hex, fallback to foreground
}

export const SimulatedCursor = ({ x, y, isClicking = false, name, color }: SimulatedCursorProps) => {
  return (
    <motion.div
      className="absolute z-50 pointer-events-none flex flex-col"
      initial={{ x: 0, y: 0, opacity: 0 }}
      animate={{ x, y, opacity: 1, scale: isClicking ? 0.9 : 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 28, // Using motion.spring.smooth
        mass: 0.5,
      }}
    >
      {/* Soft shadow for depth, translucent fill */}
      <MousePointer2 
        className="w-5 h-5 -rotate-12 drop-shadow-md" 
        style={{ 
          color: color || "hsl(var(--foreground))", 
          fill: color ? `${color}40` : "hsl(var(--foreground)/0.2)" 
        }} 
      />
      {/* Name Tag */}
      {name && (
        <motion.div 
          className="ml-4 mt-1 px-1.5 py-0.5 rounded shadow-sm text-[8px] font-medium text-white whitespace-nowrap overflow-hidden"
          style={{ backgroundColor: color || "hsl(var(--primary))" }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {name}
        </motion.div>
      )}
      {/* Click ripple effect */}
      {isClicking && (
        <motion.div
          className="absolute top-1 left-1 w-5 h-5 rounded-full -z-10 blur-[1px]"
          style={{ backgroundColor: color || "hsl(var(--primary))" }}
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      )}
    </motion.div>
  );
};
