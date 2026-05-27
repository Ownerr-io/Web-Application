import type { ReactNode } from 'react';
import { OWNERR_OS_APP_CONTENT_CLASS } from '@/lib/ownerrOsAppLayout';
import { cn } from '@/lib/utils';

type Props = {
  kicker?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

/** Shared in-app page chrome (aligned with marketplace desk pages). */
export function OwnerrOsAppPageShell({
  kicker = 'OWNERR OS',
  title,
  description,
  children,
}: Props) {
  return (
    <div className={cn(OWNERR_OS_APP_CONTENT_CLASS, 'ownerr-os-app-page w-full')}>
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{kicker}</p>
        <h1 className="ownerr-os-app-page-title text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </div>
  );
}
