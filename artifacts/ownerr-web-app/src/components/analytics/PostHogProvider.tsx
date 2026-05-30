import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { isPlatformAdminUser } from "@/lib/auth/platformAdmin";
import {
  identifyPostHogUser,
  initPostHog,
  resetPostHogUser,
} from "@/lib/analytics/posthog";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { authUser } = useAuth();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (authUser) {
      identifyPostHogUser(authUser.id, {
        email: authUser.email,
        is_platform_admin: isPlatformAdminUser(authUser),
      });
    } else {
      resetPostHogUser();
    }
  }, [authUser]);

  return children;
}
