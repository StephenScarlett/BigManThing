import { useEffect, useState } from "react";

const COLORS = [
  "#E10600",
  "#F59E0B",
  "#FACC15",
  "#22C55E",
  "#3B82F6",
  "#A855F7",
  "#EC4899",
  "#FFFFFF",
];
const PARTICLE_COUNT = 90;
const DURATION_MS = 4200;

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  color: string;
  size: number;
}

/**
 * One-shot confetti overlay; renders for ~4 seconds then unmounts itself.
 * Pointer-events disabled so it never blocks UI.
 */
export function Confetti({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<P[] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const w = window.innerWidth;
    const next: P[] = Array.from({ length: PARTICLE_COUNT }).map(() => ({
      x: Math.random() * w,
      y: -20 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 12,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      size: 6 + Math.random() * 8,
    }));
    setParticles(next);
    const start = performance.now();
    let raf = 0;
    const loop = () => {
      const elapsed = performance.now() - start;
      if (elapsed >= DURATION_MS) {
        setParticles(null);
        return;
      }
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!particles) return null;

  // Apply velocity over current tick
  const aged = particles.map((p) => ({
    ...p,
    x: p.x + p.vx * tick,
    y: p.y + p.vy * tick + 0.05 * tick * tick * 0.05,
    rot: p.rot + p.vr * tick,
  }));

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {aged.map((p, i) => (
        <span
          key={i}
          className="absolute block"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size * 0.4,
            background: p.color,
            transform: `rotate(${p.rot}deg)`,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
