import { PASSWORD_RULES } from "@/lib/auth/validation";
import { cn } from "@/lib/utils";

export function PasswordRulesHint({
  password,
  className,
}: {
  password: string;
  className?: string;
}) {
  return (
    <ul
      className={cn("space-y-1 text-xs text-muted-foreground", className)}
      aria-label="Password requirements"
    >
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.id}
            className={cn("flex items-center gap-2", met && "text-brand-lime")}
          >
            <span aria-hidden>{met ? "✓" : "○"}</span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
