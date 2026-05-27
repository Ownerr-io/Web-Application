import { motion, useReducedMotion } from "framer-motion";
import type { FounderFormDraft } from "./founderOsQuestions";

type Props = {
  draft: FounderFormDraft;
};

export function FounderCaptureSummary({ draft }: Props) {
  const reduce = useReducedMotion();
  const rows: { label: string; value: string }[] = [
    { label: "Founder", value: draft.founderName.trim() || "—" },
    { label: "Startup", value: draft.startupName.trim() || "—" },
    { label: "Tagline", value: draft.tagline.trim() || "—" },
    { label: "Building", value: draft.description.trim() || "—" },
    { label: "Website", value: (draft.website ?? "").trim() || "—" },
    { label: "Category", value: draft.category?.trim() || "—" },
    { label: "Location", value: (draft.location ?? "").trim() || "—" },
    { label: "LinkedIn", value: draft.linkedin.trim() || "—" },
    { label: "X / Twitter", value: draft.twitter.trim() || "—" },
    { label: "Instagram", value: draft.instagram.trim() || "—" },
    { label: "WhatsApp", value: draft.whatsapp.trim() || "—" },
    { label: "Photo", value: draft.founderPhoto ? "Added" : "—" },
  ];

  return (
    <motion.section
      className="space-y-6 border-0 bg-transparent p-0 shadow-none"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="border-b border-white/10 pb-4">
        <h3 className="text-xs font-black uppercase tracking-[0.25em] text-[#EBFBBC]">
          What you listed
        </h3>
        <p className="mt-1.5 text-sm font-medium text-[color:var(--terminal-muted)]">
          Everything you shared — this is what the world sees on OWNERR OS.
        </p>
      </div>
      <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col justify-between border-b border-white/[0.04] pb-4">
            <dt className="text-[10px] font-black uppercase tracking-widest text-[color:var(--terminal-muted)]">
              {row.label}
            </dt>
            <dd className="mt-2 line-clamp-3 font-mono text-base font-bold leading-snug text-white">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </motion.section>
  );
}
