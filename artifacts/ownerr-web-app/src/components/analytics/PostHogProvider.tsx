import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  identifyPostHogUser,
  initPostHog,
  resetPostHogUser,
} from "@/lib/analytics/posthog";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { authUser, isPlatformAdmin } = useAuth();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (authUser) {
      identifyPostHogUser(authUser.id, {
        is_platform_admin: isPlatformAdmin,
      });
    } else {
      resetPostHogUser();
    }
  }, [authUser, isPlatformAdmin]);

  return children;
}
