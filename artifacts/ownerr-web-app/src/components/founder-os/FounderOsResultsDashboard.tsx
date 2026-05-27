import { Rocket } from "lucide-react";
import { MARKETING_SHELL_CLASS } from "@/lib/marketingShell";
import type { FounderSubmissionRecord } from "@/lib/founderTypes";
import type { FounderFormDraft } from "./founderOsQuestions";
import { FounderCaptureSummary } from "./FounderCaptureSummary";
import { FounderSharePanel } from "./FounderSharePanel";

type Props = {
  record: FounderSubmissionRecord;
  draft: FounderFormDraft;
};

export function FounderOsResultsDashboard({ record, draft }: Props) {
  return (
    <div className={MARKETING_SHELL_CLASS}>
      <div className="space-y-4 py-10 sm:py-14">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[color:var(--terminal-lime)]">
          OWNERR OS · You&apos;re listed!
        </p>
        <h1 className="flex flex-wrap items-center gap-2 text-balance text-3xl font-bold text-[#EBFBBC] sm:text-4xl">
          More reach starts now
          <Rocket className="h-8 w-8 shrink-0 text-[color:var(--terminal-lime)]" aria-hidden />
        </h1>
        <p className="max-w-2xl text-sm font-medium text-[color:var(--terminal-fg)] sm:text-base">
          Your idea is on OWNERR OS. Spread it on LinkedIn, X, WhatsApp, Instagram — and send your referral link
          so more founders join the loop (and you stack more visibility).
        </p>
        <p className="text-xs font-semibold text-[color:var(--terminal-ochre)]">
          Chance to Win $250k · Top 100 get $2,500 each in Founders Capital
        </p>
      </div>

      <FounderSharePanel record={record} prominent />

      <div className="mt-14 border-t border-white/10 pt-12">
        <FounderCaptureSummary draft={draft} />
      </div>
    </div>
  );
}
