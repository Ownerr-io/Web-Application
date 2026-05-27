import type { FounderFormDraft } from "./founderOsQuestions";

/** Ownerr OS listing used as editable defaults so founders see the expected format. */
export const OWNERR_OS_REFERENCE_DRAFT: Omit<
  FounderFormDraft,
  "founderName" | "founderPhoto" | "socialLinks"
> = {
  startupName: "Ownerr OS",
  tagline: "The infrastructure for startup ownership.",
  description:
    "Ownerr.live helps founders exit at fair valuations and gives buyers verified acquisition opportunities—business scoring, revenue and traffic verification, legal documentation, and secure deal management.",
  website: "https://ownerr.live",
  linkedin: "https://www.linkedin.com/company/ownerr/",
  twitter: "https://x.com/OwnerrOS",
  instagram: "https://www.instagram.com/ownerr_os/",
  whatsapp: "",
  category: "SaaS",
  location: "",
};

export const OWNERR_OS_FORM_PREFILL_NOTE =
  "We pre-filled the form with Ownerr OS as an example. Replace any field with your details.";
