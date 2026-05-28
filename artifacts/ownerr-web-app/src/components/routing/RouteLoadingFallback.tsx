import { Spinner } from "@/components/ui/spinner";

export function RouteLoadingFallback({
  label = "Loading…",
}: {
  label?: string;
}) {
  return (
    <div
      className="flex min-h-[min(60vh,480px)] w-full flex-col items-center justify-center gap-3 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Spinner className="size-8" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
