/** Official Ownerr Network social profiles. */
export const OWNERR_NETWORK_SOCIAL = {
  linkedin: "https://www.linkedin.com/showcase/ownerr-unemployed/",
  instagram:
    "https://www.instagram.com/ownerr_unemployed?igsh=eXRmdmRxZ2FyYmZm",
  x: "https://x.com/Ownerrun?s=20",
} as const;

export const OWNERR_NETWORK_SOCIAL_LINKS = [
  { id: "linkedin", label: "LinkedIn", href: OWNERR_NETWORK_SOCIAL.linkedin },
  {
    id: "instagram",
    label: "Instagram",
    href: OWNERR_NETWORK_SOCIAL.instagram,
  },
  { id: "x", label: "X", href: OWNERR_NETWORK_SOCIAL.x },
] as const;
