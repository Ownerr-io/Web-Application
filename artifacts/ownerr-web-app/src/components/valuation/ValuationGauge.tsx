import { useEffect, useState, useId } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Props = {
  value: number; // 0 to 100
  label: string;
  subtitle?: string;
  size?: number;
  className?: string;
};

export function ValuationGauge({ value, label, subtitle, size = 180, className }: Props) {
  const reduce = useReducedMotion();
  const gradId = useId().replace(/:/g, '');
  const [animatedValue, setAnimatedValue] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setAnimatedValue(value);
      return;
    }
    const start = performance.now();
    const dur = 1200;
    let frame = 0;
    
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3); // Cubic ease out
      setAnimatedValue(eased * value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);

  // SVG dimensions
  const r = 72;
  const cx = 100;
  const cy = 100;
  
  // Circumference of a half circle is PI * r
  const halfCircumference = Math.PI * r; // ~226.2
  const strokeDashoffset = halfCircumference - (animatedValue / 100) * halfCircumference;

  // The angle for the needle: sweeps through top-half clockwise from 180deg (left) to 360deg (right)
  const needleRotation = 180 + (animatedValue / 100) * 180;

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center text-center bg-transparent border-0 p-0 shadow-none',
        className
      )}
      style={{ width: size }}
    >
      <div className="relative w-full overflow-hidden" style={{ height: size * 0.62 }}>
        {/* Glow behind the gauge */}
        <div 
          className="absolute left-1/2 bottom-2 -translate-x-1/2 w-[80%] h-[50%] rounded-full opacity-20 blur-xl pointer-events-none transition-all duration-500"
          style={{
            background: 'radial-gradient(circle, var(--terminal-glow), transparent 75%)'
          }}
        />

        <svg
          viewBox="0 0 200 120"
          width="100%"
          height="100%"
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--terminal-ochre)" />
              <stop offset="60%" stopColor="var(--terminal-lime)" />
              <stop offset="100%" stopColor="var(--terminal-lime)" />
            </linearGradient>
            
            <filter id={`glow-${gradId}`}>
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background Track Arc */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="color-mix(in srgb, var(--terminal-border) 20%, transparent)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Active Gradient Arc - Sweeps instantly in sync with frame-by-frame animatedValue */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={halfCircumference}
            strokeDashoffset={strokeDashoffset}
            filter={`url(#glow-${gradId})`}
          />

          {/* Center Hub */}
          <circle cx={cx} cy={cy} r="7" fill="var(--terminal-bg)" stroke="color-mix(in srgb, var(--terminal-border) 45%, transparent)" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r="3" fill="var(--terminal-lime)" />

          {/* Animated Needle - Rotates natively in perfect sync with the active color path */}
          <g transform={`translate(${cx}, ${cy}) rotate(${needleRotation})`}>
            {/* Pointer line */}
            <line
              x1="8"
              y1="0"
              x2={r - 5}
              y2="0"
              stroke="var(--terminal-fg)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Luxury needle arrow accent */}
            <polygon
              points={`10,0 6,-1.5 ${r - 10},0 6,1.5`}
              fill="var(--terminal-lime)"
              opacity="0.9"
            />
          </g>
        </svg>
      </div>

      {/* Numerical percentage indicator placed cleanly below the tracker */}
      <div className="mt-3.5 flex flex-col items-center">
        <span className="font-mono text-2xl font-black text-[#EBFBBC] tracking-tight leading-none mb-1.5 tabular-nums">
          {Math.round(animatedValue)}%
        </span>
        <span className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--terminal-muted)] leading-none">
          {label}
        </span>
        {subtitle && (
          <span className="text-xs font-bold mt-1 text-white/50 leading-none">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
