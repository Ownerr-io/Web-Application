import { type ReactNode } from 'react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

/**
 * Renders a link to a startup, or a span when the slug is empty or invalid.
 */
export function StartupLink({
  slug,
  className,
  children,
}: {
  slug: string | undefined | null;
  className?: string;
  children: ReactNode;
}) {
  if (!slug) return <span className={className}>{children}</span>;
  return (
    <Link
      href={`/startup/${encodeURIComponent(slug)}`}
      className={cn('text-inherit hover:underline', className)}
    >
      {children}
    </Link>
  );
}

/**
 * Renders a link to a founder profile by handle, or a span when the handle is empty.
 */
export function FounderLink({
  handle,
  className,
  children,
}: {
  handle: string | undefined | null;
  className?: string;
  children: ReactNode;
}) {
  if (!handle) return <span className={className}>{children}</span>;
  return (
    <Link
      href={`/founder/${encodeURIComponent(handle)}`}
      className={cn('text-inherit hover:underline', className)}
    >
      {children}
    </Link>
  );
}
