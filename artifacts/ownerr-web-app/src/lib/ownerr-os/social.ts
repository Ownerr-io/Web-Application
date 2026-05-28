/** Official OWNERR OS social profiles ([Ownerr OS on LinkedIn](https://www.linkedin.com/company/ownerr/)). */
export const OWNERR_OS_SOCIAL = {
  linkedin: "https://www.linkedin.com/company/ownerr/",
  instagram: "https://www.instagram.com/ownerr_os",
  x: "https://x.com/OwnerrOS",
} as const;

export const OWNERR_OS_SOCIAL_LINKS = [
  { id: "linkedin", label: "LinkedIn", href: OWNERR_OS_SOCIAL.linkedin },
  { id: "instagram", label: "Instagram", href: OWNERR_OS_SOCIAL.instagram },
  { id: "x", label: "X", href: OWNERR_OS_SOCIAL.x },
] as const;
