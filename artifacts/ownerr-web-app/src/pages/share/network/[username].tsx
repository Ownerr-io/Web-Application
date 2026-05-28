import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { MarketingLayout } from "@/components/MarketingLayout";
import { Button } from "@/components/ui/button";
import { MARKETING_SHELL_CLASS } from "@/lib/marketingShell";
import { fetchPublicProfileByUsername } from "@/lib/ownerr-network/api";
import type { LeaderboardEntry } from "@/lib/ownerr-network/types";
import {
  OWNERR_OS_SHARE_CARD_PATH,
  getPublicSiteOrigin,
} from "@/lib/ownerrOsShareAssets";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";

export default function OwnerrNetworkSharePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    if (!username) return;
    void fetchPublicProfileByUsername(username).then(setProfile);
  }, [username]);

  useEffect(() => {
    if (!profile) return;
    const title = `${profile.name} on Ownerr Network`;
    const desc = `Reputation ${profile.network_score ?? profile.points} · ${profile.total_referrals} referrals`;
    document.title = title;
    const origin = getPublicSiteOrigin() || window.location.origin;
    const image = `${origin}${OWNERR_OS_SHARE_CARD_PATH}`;
    const url = `${origin}${PRODUCT_ROUTES.ownerrNetworkShare(profile.username)}`;
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:image", image);
    setMeta("property", "og:url", url);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", image);
  }, [profile]);

  return (
    <MarketingLayout>
      <div className={MARKETING_SHELL_CLASS + " mx-auto max-w-lg py-16"}>
        {profile ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--terminal-muted)]">
              Ownerr Network
            </p>
            <h1 className="mt-2 text-3xl font-bold">@{profile.username}</h1>
            <p className="text-lg text-[color:var(--terminal-muted)]">
              {profile.name}
            </p>
            <p className="mt-4 text-sm">
              <span className="font-bold text-[color:var(--terminal-lime)]">
                {profile.network_score ?? profile.points}
              </span>{" "}
              reputation · {profile.total_referrals} referrals ·{" "}
              {profile.points} credits
            </p>
            <img
              src={OWNERR_OS_SHARE_CARD_PATH}
              alt="Ownerr Network share card"
              className="mt-8 w-full rounded-lg border border-[color:var(--terminal-border)]"
            />
            <Button asChild className="mt-8 w-full">
              <Link href={PRODUCT_ROUTES.ownerrNetworkLanding}>
                Join Ownerr Network
              </Link>
            </Button>
          </motion.div>
        ) : (
          <p className="text-sm text-[color:var(--terminal-muted)]">
            Profile not found.
          </p>
        )}
      </div>
    </MarketingLayout>
  );
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
