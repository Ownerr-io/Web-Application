import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Height of the step area below the marketing header (mobile / desktop). */
export const VALUATION_STAGE_MIN_H =
  'min-h-[calc(100dvh-3.25rem)] sm:min-h-[calc(100dvh-4rem)]';

/** Full content area below marketing header — edge to edge, no cards. */
export function ValuationFullViewport({
  children,
  className,
  center = true,
}: {
  children: ReactNode;
  className?: string;
  center?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative flex w-full flex-col',
        VALUATION_STAGE_MIN_H,
        center && 'items-center justify-center',
        className,
      )}
    >
      {children}
    </div>
  );
}
