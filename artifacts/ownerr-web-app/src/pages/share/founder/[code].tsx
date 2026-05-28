import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { MarketingLayout } from "@/components/MarketingLayout";
import { Button } from "@/components/ui/button";
import { MARKETING_SHELL_CLASS } from "@/lib/marketingShell";
import {
  fetchFounderByReferralCodePublic,
  trackReferral,
} from "@/lib/founderService";
import type { FounderSubmissionRecord } from "@/lib/founderTypes";
import {
  getFounderCardImageUrl,
  getFounderSharePageUrl,
} from "@/lib/founderShareUrls";
import { buildReferralLink } from "@/lib/founderReferral";
import { getPublicShareOrigin } from "@/lib/founderShareUrls";

export default function FounderSharePage() {
  const { code } = useParams<{ code: string }>();
  const [record, setRecord] = useState<FounderSubmissionRecord | null>(null);

  useEffect(() => {
    if (!code) return;
    void fetchFounderByReferralCodePublic(code).then(setRecord);
    void trackReferral(code, "visit");
  }, [code]);

  useEffect(() => {
    if (!record) return;
    const title = `${record.startupName} on OWNERR OS | Ownerr`;
    const description = `Chance to Win $250k — ${record.founderName} listed ${record.startupName}. ${record.tagline}`;
    const imageUrl = getFounderCardImageUrl(record);
    const sharePageUrl = getFounderSharePageUrl(record);
    document.title = title;
    setMeta("property", "og:type", "website");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:image", imageUrl);
    setMeta("property", "og:url", sharePageUrl);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", imageUrl);
  }, [record]);

  const joinHref = record
    ? buildReferralLink(getPublicShareOrigin(), record.referralCode)
    : `${getPublicShareOrigin()}/ownerr-os/join`;

  return (
    <MarketingLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={
          MARKETING_SHELL_CLASS + " mx-auto max-w-lg space-y-6 px-4 py-12"
        }
      >
        <motion.div className="space-y-6 rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]">
            OWNERR OS
          </p>
          {record ? (
            <>
              <h1 className="text-2xl font-bold text-[color:var(--terminal-display)]">
                Chance to win up to $250k
              </h1>
              <p className="text-sm text-[color:var(--terminal-muted)]">
                {record.tagline}
              </p>
              <p className="text-xs text-[color:var(--terminal-muted)]">
                {record.founderName} · {record.startupName}
              </p>
            </>
          ) : (
            <p className="text-sm text-[color:var(--terminal-muted)]">
              Founder listing not found.
            </p>
          )}
          <img
            src={getFounderCardImageUrl(record ?? undefined)}
            alt="OWNERR OS share card"
            className="w-full rounded-[10px] border border-[color:var(--terminal-border)]"
          />
          <Button
            asChild
            className="w-full bg-[color:var(--terminal-ochre)] font-bold text-[color:var(--brand-accent-ink)]"
          >
            <Link href={joinHref}>List your startup on OWNERR OS</Link>
          </Button>
        </motion.div>
      </motion.div>
    </MarketingLayout>
  );
}

function setMeta(attr: "property" | "name", key: string, content: string) {
  const selector =
    attr === "property" ? `meta[property="${key}"]` : `meta[name="${key}"]`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
