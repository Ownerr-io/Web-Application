export type WhatsHappeningPost = {
  id: string;
  founderHandle: string;
  startupName: string;
  startupSlug: string;
  timestamp: string;
  text: string;
  action?: 'added' | 'on';
  hasImage?: boolean;
  imageGradient?: string;
  imageCaption?: string;
  likes: number;
  comments: number;
};

export const whatsHappeningPosts: WhatsHappeningPost[] = [
  {
    id: 'p12',
    founderHandle: 'alicew',
    startupName: 'Sorio AI',
    startupSlug: 'sorio-ai',
    timestamp: '7h',
    text: 'Hit $12.5k MRR this month. Slow but steady. Going to focus on B2B SEO next.',
    likes: 8,
    comments: 2,
  },
];

export interface SponsorCard {
  name: string;
  desc: string;
  bg: string;
  fg: string;
  letter?: string;
}

export interface Visitor {
  id: string;
  name: string;
  avatarSeed: string;
  countryFlag: string;
  countryName: string;
  city: string;
  os: 'Mac OS' | 'Windows' | 'Linux' | 'iOS' | 'Android';
  device: 'Desktop' | 'Mobile';
  browser: 'Chrome' | 'Safari' | 'Firefox' | 'Edge';
  referrer: 'Google' | 'Direct' | 'Twitter' | 'android.gms';
  currentUrl: string;
  sessionTime: string;
  totalVisits: number;
  conversionLikelihood: number;
  estimatedValue: number;
  top: number;
  left: number;
  dotColor: string;
}

export const browseCategories = [
  { label: 'Artificial Intelligence', icon: 'Brain' },
  { label: 'SaaS', icon: 'Package' },
  { label: 'Developer Tools', icon: 'Terminal' },
  { label: 'Marketing', icon: 'Megaphone' },
  { label: 'Content Creation', icon: 'PenLine' },
] as const;
