import { useCallback, useEffect, useRef } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/** Minimal player surface for the `complete` event. */
type DotLottiePlayer = {
  addEventListener: (event: 'complete', handler: () => void) => void;
  removeEventListener: (event: 'complete', handler: () => void) => void;
};

type Props = {
  src: string;
  /** When false, the animation plays through once (default). */
  loop?: boolean;
  className?: string;
  /** Decorative motion only — no visible caption from assistive labels. */
  decorative?: boolean;
  'aria-label'?: string;
  onComplete?: () => void;
};

export function ValuationLottieAnimation({
  src,
  loop = false,
  className,
  decorative = false,
  'aria-label': ariaLabel,
  onComplete,
}: Props) {
  const reduce = useReducedMotion();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const listenerRef = useRef<{ player: DotLottiePlayer; handler: () => void } | null>(null);

  useEffect(() => {
    if (!reduce || !onComplete) return;
    const t = window.setTimeout(() => onCompleteRef.current?.(), 600);
    return () => clearTimeout(t);
  }, [reduce, onComplete, src]);

  const dotLottieRefCallback = useCallback(
    (player: DotLottiePlayer | null) => {
      if (listenerRef.current) {
        listenerRef.current.player.removeEventListener('complete', listenerRef.current.handler);
        listenerRef.current = null;
      }
      if (!player || reduce) return;
      const handler = () => onCompleteRef.current?.();
      player.addEventListener('complete', handler);
      listenerRef.current = { player, handler };
    },
    [reduce],
  );

  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        listenerRef.current.player.removeEventListener('complete', listenerRef.current.handler);
        listenerRef.current = null;
      }
    };
  }, []);

  const a11yLabel = decorative ? undefined : ariaLabel ?? 'Loading animation';

  return (
    <DotLottieReact
      src={src}
      loop={loop}
      autoplay={!reduce}
      dotLottieRefCallback={dotLottieRefCallback}
      aria-hidden={decorative ? true : undefined}
      aria-label={a11yLabel}
      role={decorative ? 'presentation' : undefined}
      className={cn('mx-auto max-w-full', className)}
    />
  );
}
