import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props =
  | { mode: "loading"; productLabel: string }
  | {
      mode: "error";
      productLabel: string;
      message: string;
      onRetry?: () => void;
    };

export function ProductShellFallback(props: Props) {
  if (props.mode === "loading") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4">
        <Loader2
          className="h-8 w-8 animate-spin text-muted-foreground"
          aria-hidden
        />
        <p className="text-sm font-medium text-muted-foreground">
          Loading {props.productLabel}…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-bold text-foreground">{props.productLabel}</p>
      <p className="text-sm text-destructive">{props.message}</p>
      {props.onRetry ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={props.onRetry}
        >
          Try again
        </Button>
      ) : null}
    </div>
  );
}
