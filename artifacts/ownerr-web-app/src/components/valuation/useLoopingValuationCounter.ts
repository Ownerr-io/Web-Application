import { useEffect, useMemo, useState } from 'react';
import { normalizeEnterpriseDollars } from '@/lib/utils';

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Triangle wave 0 → 1 → 0 over one period. */
function trianglePhase(linear: number): number {
  const t = linear % 1;
  return t < 0.5 ? t * 2 : (1 - t) * 2;
}

type Range = { floor: number; ceiling: number };

function resolveRange(target: number): Range {
  const dollars = normalizeEnterpriseDollars(target);
  if (dollars > 0) {
    const spread = Math.max(dollars * 0.22, 25_000);
    return {
      floor: Math.max(10_000, Math.round(dollars - spread)),
      ceiling: dollars,
    };
  }
  return { floor: 180_000, ceiling: 2_400_000 };
}

/**
 * Counts dollars up and down in a loop (for analysis hero).
 */
export function useLoopingValuationCounter(
  target: number,
  cycleMs = 2200,
  enabled = true,
): number {
  const range = useMemo(() => resolveRange(target), [target]);
  const [value, setValue] = useState(range.floor);

  useEffect(() => {
    if (!enabled) {
      setValue(target > 0 ? target : range.ceiling);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const linear = ((now - start) % cycleMs) / cycleMs;
      const phase = easeOutCubic(trianglePhase(linear));
      setValue(Math.round(range.floor + (range.ceiling - range.floor) * phase));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled, target, cycleMs, range.floor, range.ceiling]);

  return value;
}
