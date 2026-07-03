import { useMemo, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';

interface HoveredTile {
  id: string;
  u: number;
  v: number;
  points: string;
}

export const IsometricMatrix = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Track the trail of hovered square tiles forming under cursor
  const [hoverTrail, setHoverTrail] = useState<HoveredTile[]>([]);
  const lastTileRef = useRef<{ u: number; v: number } | null>(null);

  // Motion values for subtle parallax reactivity
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 150 };
  const parallaxX = useSpring(mouseX, springConfig);
  const parallaxY = useSpring(mouseY, springConfig);

  const tileW = 40; // half width along X
  const tileH = 23.094; // half height along Y (40 * tan(30deg))
  const centerX = 600;
  const centerY = 400;

  const getCoord = (u: number, v: number) => ({
    x: centerX + (u - v) * tileW,
    y: centerY + (u + v) * tileH,
  });

  const getTilePoints = (u: number, v: number) => {
    const p0 = getCoord(u, v);
    const p1 = getCoord(u + 1, v);
    const p2 = getCoord(u + 1, v + 1);
    const p3 = getCoord(u, v + 1);
    return `${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculate mouse coordinates relative to SVG viewBox (1200x800)
      const scaleX = 1200 / rect.width;
      const scaleY = 800 / rect.height;
      const svgX = (e.clientX - rect.left) * scaleX;
      const svgY = (e.clientY - rect.top) * scaleY;

      // Update CSS variables for GPU-accelerated radial mask reveal
      containerRef.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      containerRef.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);

      // Inverse isometric transformation to find exact hovered grid square (u, v)
      const dx = svgX - centerX;
      const dy = svgY - centerY;
      const u = Math.floor(0.5 * (dx / tileW + dy / tileH));
      const v = Math.floor(0.5 * (dy / tileH - dx / tileW));

      // If pointer entered a new grid square tile, form it and add to trail
      if (!lastTileRef.current || lastTileRef.current.u !== u || lastTileRef.current.v !== v) {
        lastTileRef.current = { u, v };
        const newTile: HoveredTile = {
          id: `${u}-${v}-${Date.now()}`,
          u,
          v,
          points: getTilePoints(u, v),
        };

        setHoverTrail((prev) => [newTile, ...prev.slice(0, 14)]); // Keep last 15 tiles for smooth fading trail
      }

      // Calculate normalized offset (-1 to 1) for parallax shift
      const normX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const normY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      mouseX.set(normX * -12);
      mouseY.set(normY * -12);
    };

    const handlePointerLeave = () => {
      lastTileRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [mouseX, mouseY]);

  // Generate background static isometric grid lines and prisms
  const { gridLines, activeTiles, isometricCubes } = useMemo(() => {
    const lines: Array<{ id: string; x1: number; y1: number; x2: number; y2: number; isMajor: boolean }> = [];
    const tiles: Array<{ id: string; points: string; delay: number; duration: number }> = [];
    const cubes: Array<{ id: string; top: string; left: string; right: string; delay: number; duration: number }> = [];

    const range = 16;

    for (let i = -range; i <= range; i++) {
      const isMajor = Math.abs(i) % 4 === 0;
      lines.push({
        id: `line-u-${i}`,
        x1: centerX + (i - (-range)) * tileW,
        y1: centerY + (i + (-range)) * tileH,
        x2: centerX + (i - range) * tileW,
        y2: centerY + (i + range) * tileH,
        isMajor,
      });
      lines.push({
        id: `line-v-${i}`,
        x1: centerX + ((-range) - i) * tileW,
        y1: centerY + ((-range) + i) * tileH,
        x2: centerX + (range - i) * tileW,
        y2: centerY + (range + i) * tileH,
        isMajor,
      });
    }

    const tileCoords = [
      { u: -4, v: -2, delay: 0, duration: 6 },
      { u: -3, v: -2, delay: 1.2, duration: 7 },
      { u: -4, v: -1, delay: 2.4, duration: 8 },
      { u: 5, v: -3, delay: 0.8, duration: 6.5 },
      { u: 6, v: -3, delay: 2.0, duration: 7.5 },
      { u: -5, v: 4, delay: 1.5, duration: 9 },
      { u: -4, v: 4, delay: 2.8, duration: 8.5 },
      { u: 3, v: 3, delay: 0.4, duration: 7 },
      { u: 4, v: 3, delay: 1.8, duration: 6 },
      { u: 3, v: 4, delay: 3.2, duration: 8 },
    ];

    tileCoords.forEach((t, idx) => {
      tiles.push({
        id: `tile-${idx}`,
        points: getTilePoints(t.u, t.v),
        delay: t.delay,
        duration: t.duration,
      });
    });

    const cubeCoords = [
      { u: -6, v: -4, h: tileH * 2, delay: 0.5, duration: 10 },
      { u: 6, v: -5, h: tileH * 2, delay: 2.0, duration: 11 },
      { u: -7, v: 5, h: tileH * 2, delay: 1.0, duration: 9 },
      { u: 5, v: 5, h: tileH * 2, delay: 3.0, duration: 12 },
    ];

    cubeCoords.forEach((c, idx) => {
      const center = getCoord(c.u, c.v);
      const h = c.h;

      const topN = { x: center.x, y: center.y - tileH * 2 };
      const topR = { x: center.x + tileW, y: center.y - tileH };
      const topC = { x: center.x, y: center.y };
      const topL = { x: center.x - tileW, y: center.y - tileH };

      const botL = { x: topL.x, y: topL.y + h };
      const botC = { x: topC.x, y: topC.y + h };
      const botR = { x: topR.x, y: topR.y + h };

      cubes.push({
        id: `cube-${idx}`,
        top: `${topN.x},${topN.y} ${topR.x},${topR.y} ${topC.x},${topC.y} ${topL.x},${topL.y}`,
        left: `${topC.x},${topC.y} ${topL.x},${topL.y} ${botL.x},${botL.y} ${botC.x},${botC.y}`,
        right: `${topC.x},${topC.y} ${topR.x},${topR.y} ${botR.x},${botR.y} ${botC.x},${botC.y}`,
        delay: c.delay,
        duration: c.duration,
      });
    });

    return { gridLines: lines, activeTiles: tiles, isometricCubes: cubes };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ '--mouse-x': '-1000px', '--mouse-y': '-1000px' } as React.CSSProperties}
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none"
    >
      {/* Edge vignette */}
      <div className="absolute inset-0 bg-radial-vignette opacity-90 z-20 pointer-events-none" />

      {/* Base Layer: Subdued Ambient Isometric Matrix */}
      <motion.div style={{ x: parallaxX, y: parallaxY }} className="absolute inset-0 w-full h-full">
        <svg
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full text-foreground/80"
        >
          {/* Grid lines */}
          <g className="grid-lines">
            {gridLines.map((l) => (
              <line
                key={l.id}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="currentColor"
                strokeWidth="0.5"
                style={{ opacity: l.isMajor ? 0.1 : 0.03 }}
              />
            ))}
          </g>

          {/* Ambient floor tiles */}
          <g className="illuminated-tiles">
            {activeTiles.map((t) => (
              <motion.polygon
                key={t.id}
                points={t.points}
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="0.5"
                initial={{ fillOpacity: 0.01 }}
                animate={{
                  fillOpacity: [0.01, 0.08, 0.01],
                  strokeOpacity: [0.08, 0.3, 0.08],
                }}
                transition={{
                  duration: t.duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: t.delay,
                }}
              />
            ))}
          </g>

          {/* Isometric Prisms */}
          {isometricCubes.map((c) => (
            <motion.g
              key={c.id}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{
                duration: c.duration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: c.delay,
              }}
            >
              <polygon points={c.top} fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.3" />
              <polygon points={c.left} fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.25" />
              <polygon points={c.right} fill="currentColor" fillOpacity="0.015" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.18" />
            </motion.g>
          ))}

          {/* Interactive Hovered Square Formation Layer */}
          <g className="hover-trail">
            <AnimatePresence>
              {hoverTrail.map((tile, idx) => (
                <motion.polygon
                  key={tile.id}
                  points={tile.points}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: idx === 0 ? 0.8 : Math.max(0, 0.5 - idx * 0.04), scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  fill="hsl(var(--primary))"
                  fillOpacity={idx === 0 ? 0.25 : 0.08}
                  stroke="hsl(var(--primary))"
                  strokeWidth={idx === 0 ? 1.5 : 0.75}
                />
              ))}
            </AnimatePresence>
          </g>
        </svg>
      </motion.div>
    </div>
  );
};
