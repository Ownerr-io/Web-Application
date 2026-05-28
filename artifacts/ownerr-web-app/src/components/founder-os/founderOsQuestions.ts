import type {
  CreateFounderInput,
  FounderSubmissionRecord,
} from "@/lib/founderTypes";
import { OWNERR_OS_REFERENCE_DRAFT } from "./ownerrOsFormDefaults";

export type FounderFormDraft = CreateFounderInput & {
  linkedin: string;
  twitter: string;
  instagram: string;
  whatsapp: string;
};

export type FounderQuestionKind =
  | "text"
  | "textarea"
  | "url"
  | "select"
  | "photo";

export type FounderQuestion = {
  id: keyof FounderFormDraft | "photo";
  prompt: string;
  hint?: string;
  placeholder?: string;
  kind: FounderQuestionKind;
  optional?: boolean;
  selectOptions?: string[];
};

export const FOUNDER_CATEGORIES = [
  "SaaS",
  "AI",
  "Fintech",
  "Health",
  "Consumer",
  "Developer Tools",
  "Climate",
  "Education",
  "Other",
] as const;

export const FOUNDER_QUESTIONS: FounderQuestion[] = [
  {
    id: "founderName",
    prompt: "What should we call you on OWNERR OS?",
    hint: "Your name — other steps start with Ownerr OS as an example you can swap for your startup.",
    placeholder: "Alex Chen",
    kind: "text",
  },
  {
    id: "startupName",
    prompt: "What's your startup called? Let's put it on the map!",
    placeholder: "Acme Labs",
    kind: "text",
  },
  {
    id: "tagline",
    prompt: "Drop your one-line pitch — make it punchy!",
    hint: "Sharp, memorable, under 280 characters. This is what hooks reach.",
    placeholder: "AI copilot for acquisition desks",
    kind: "text",
  },
  {
    id: "description",
    prompt: "What are you building? We're excited to hear it.",
    hint: "A few sentences — enough that people feel the energy and hit your link.",
    placeholder: "We help founders…",
    kind: "textarea",
  },
  {
    id: "website",
    prompt: "Startup website",
    hint: "Optional — skip if you are pre-launch.",
    placeholder: "https://",
    kind: "url",
    optional: true,
  },
  {
    id: "linkedin",
    prompt: "LinkedIn profile URL",
    kind: "url",
    optional: true,
  },
  {
    id: "twitter",
    prompt: "Twitter / X handle or URL",
    placeholder: "@founder or https://x.com/…",
    kind: "text",
    optional: true,
  },
  {
    id: "instagram",
    prompt: "Instagram",
    kind: "text",
    optional: true,
  },
  {
    id: "whatsapp",
    prompt: "WhatsApp",
    kind: "text",
    optional: true,
  },
  {
    id: "category",
    prompt: "Startup category",
    kind: "select",
    selectOptions: [...FOUNDER_CATEGORIES],
    optional: true,
  },
  {
    id: "location",
    prompt: "City / country",
    placeholder: "San Francisco, US",
    kind: "text",
    optional: true,
  },
  {
    id: "photo",
    prompt: "Founder photo or logo",
    hint: "Optional — helps people recognize you when you share.",
    kind: "photo",
    optional: true,
  },
];

export function defaultFounderDraft(): FounderFormDraft {
  return {
    founderName: "",
    ...OWNERR_OS_REFERENCE_DRAFT,
    founderPhoto: undefined,
    socialLinks: {},
  };
}

export function recordToFounderDraft(
  record: FounderSubmissionRecord,
): FounderFormDraft {
  const social = record.socialLinks ?? {};
  return {
    founderName: record.founderName,
    startupName: record.startupName,
    tagline: record.tagline,
    description: record.description,
    website: record.website ?? "",
    linkedin: social.linkedin ?? "",
    twitter: social.twitter ?? "",
    instagram: social.instagram ?? "",
    whatsapp: social.whatsapp ?? "",
    category: record.category ?? "",
    location: record.location ?? "",
    founderPhoto: record.founderPhoto ?? undefined,
    socialLinks: social,
  };
}

export function questionProgress(index: number): number {
  if (FOUNDER_QUESTIONS.length <= 1) return 100;
  return Math.round(((index + 1) / FOUNDER_QUESTIONS.length) * 100);
}

export function getQuestionValue(
  q: FounderQuestion,
  draft: FounderFormDraft,
): string {
  if (q.id === "photo") return draft.founderPhoto ? "uploaded" : "";
  const v = draft[q.id as keyof FounderFormDraft];
  return typeof v === "string" ? v : "";
}

export function validateQuestion(
  q: FounderQuestion,
  draft: FounderFormDraft,
): string | undefined {
  if (q.id === "photo") return undefined;
  const raw = getQuestionValue(q, draft).trim();
  if (!raw && !q.optional) return "This field is required.";
  if (q.kind === "url" && raw) {
    try {
      const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      if (!u.hostname) return "Enter a valid URL.";
    } catch {
      return "Enter a valid URL.";
    }
  }
  if (q.id === "description" && !q.optional && raw.length < 12) {
    return "Add a bit more detail (at least 12 characters).";
  }
  return undefined;
}

export function draftToSubmitInput(
  draft: FounderFormDraft,
): CreateFounderInput {
  return {
    founderName: draft.founderName.trim(),
    startupName: draft.startupName.trim(),
    tagline: draft.tagline.trim(),
    description: draft.description.trim(),
    website: (draft.website ?? "").trim() || undefined,
    socialLinks: {
      linkedin: draft.linkedin.trim() || undefined,
      twitter: draft.twitter.trim() || undefined,
      instagram: draft.instagram.trim() || undefined,
      whatsapp: draft.whatsapp.trim() || undefined,
    },
    founderPhoto: draft.founderPhoto,
    category: draft.category?.trim() || undefined,
    location: (draft.location ?? "").trim() || undefined,
  };
}
