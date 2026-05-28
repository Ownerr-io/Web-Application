import { useEffect, useState } from "react";

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export function useAnimatedNumber(
  target: number,
  durationMs = 900,
  enabled = true,
): number {
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const from = value;
    const delta = target - from;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(from + delta * easeOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate from latest displayed value
  }, [target, durationMs, enabled]);

  return Math.round(value);
}
