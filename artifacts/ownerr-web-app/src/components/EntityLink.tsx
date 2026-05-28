import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { marketplaceFounderPath, marketplaceStartupPath } from "@/lib/appPaths";

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
  const [location] = useLocation();
  if (!slug) return <span className={className}>{children}</span>;
  return (
    <Link
      href={marketplaceStartupPath(slug, location)}
      className={cn("text-inherit hover:underline", className)}
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
  const [location] = useLocation();
  if (!handle) return <span className={className}>{children}</span>;
  return (
    <Link
      href={marketplaceFounderPath(handle, location)}
      className={cn("text-inherit hover:underline", className)}
    >
      {children}
    </Link>
  );
}
