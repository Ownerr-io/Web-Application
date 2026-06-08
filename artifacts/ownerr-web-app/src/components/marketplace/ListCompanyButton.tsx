import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAddStartup } from "@/context/AddStartupContext";
import { useAuth } from "@/context/AuthContext";
import { useRequireAuth } from "@/lib/platform/requireAuth";
import { useToast } from "@/hooks/use-toast";

type Props = {
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
  label?: string;
};

export function ListCompanyButton({
  variant = "default",
  size = "default",
  className,
  label = "Add startup",
}: Props) {
  const { openAddStartup } = useAddStartup();
  const { isAuthenticated, isFounder } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { toast } = useToast();

  function onClick() {
    if (!isAuthenticated) {
      requireAuth({ action: "create_listing", onAllowed: openAddStartup });
      return;
    }
    if (!isFounder) {
      toast({
        title: "Founder desk required",
        description: "Switch to a founder/seller account to list a company.",
        variant: "destructive",
      });
      return;
    }
    openAddStartup();
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={onClick}
    >
      <Rocket className="mr-2 h-4 w-4" aria-hidden />
      {label}
    </Button>
  );
}
