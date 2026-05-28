import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0" +
    " hover-elevate",
  {
    variants: {
      variant: {
        default:
          // @replit: add primary border; hover-elevate uses inset shadow (keeps text contrast)
          "bg-primary text-primary-foreground border border-primary-border",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm border-destructive-border",
        outline:
          // @replit: inherits text; light hover via inset on top of transparent bg
          " border [border-color:var(--button-outline)] shadow-xs active:shadow-none hover:text-foreground",
        secondary:
          "border bg-secondary text-secondary-foreground border border-secondary-border",
        ghost: "border border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
        /** Matches marketing `btn-platform-gradient` (also applied in `.desk-app-shell` for default). */
        platform:
          "btn-platform-gradient min-h-10 rounded-[10px] px-4 text-sm font-bold shadow-none hover-elevate",
        platformOutline:
          "min-h-10 rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface-2)] px-4 text-sm font-bold text-[color:var(--terminal-fg)] shadow-xs hover:border-[color:var(--terminal-ochre)]/45 hover:bg-[color:var(--terminal-bg)]",
      },
      size: {
        // @replit changed sizes
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const resolvedVariant = variant ?? "default";
    const resolvedSize = size ?? "default";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        data-button-variant={resolvedVariant}
        data-button-size={resolvedSize}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
