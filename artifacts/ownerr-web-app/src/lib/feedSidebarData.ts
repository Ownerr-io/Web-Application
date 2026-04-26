/** Static sidebar lists for the /feed page (top movers & posting streaks). */
export const FEED_TOP_STARTUPS: {
  name: string;
  mrr: string;
  growthPct: number;
  slug: string;
  letter?: string;
}[] = [
  { name: 'HanziStroke Pro — Lifetime Access', mrr: '$335/mo', growthPct: 6609, slug: 'mock-0' },
  { name: 'Ad Library Accelerator - Chrome Plugin for Facebook Ad Library / Meta / Instagram in Europe', mrr: '$3.6k/mo', growthPct: 5823, slug: 'b2c-b2b-proxy', letter: 'A' },
  { name: 'Private Venture', mrr: '$719/mo', growthPct: 2378, slug: 'stealth-venture', letter: 'P' },
  { name: 'VoiceCheap', mrr: '$19k/mo', growthPct: 1905, slug: 'dm-champ' },
  { name: 'Angular Material Blocks', mrr: '$1.7k/mo', growthPct: 1735, slug: 'cometly' },
  { name: 'Betta holdings', mrr: '$867/mo', growthPct: 1662, slug: 'holypoly', letter: 'B' },
  { name: 'Alphalog', mrr: '$442/mo', growthPct: 1601, slug: 'rezi' },
  { name: 'SETUPCLAW', mrr: '$2.5k/mo', growthPct: 1567, slug: 'sorio-ai' },
  { name: 'HSKLord', mrr: '$346/mo', growthPct: 1530, slug: 'iqmax' },
  { name: 'JC Holdings', mrr: '$5.3k/mo', growthPct: 1309, slug: 'rezi', letter: 'J' },
  { name: 'Minform', mrr: '$324/mo', growthPct: 1250, slug: 'besbet' },
  { name: 'AI Designer', mrr: '$13k/mo', growthPct: 1106, slug: '1capture' },
  { name: 'AuraClaw', mrr: '$5.4k/mo', growthPct: 980, slug: 'oli-ai' },
];

export const FEED_POSTING_STREAKS: { name: string; streak: number; seed: string; founderHandle?: string }[] = [
  { name: 'Caitlin Walt', streak: 39, seed: 'caitlin', founderHandle: 'caitlin' },
  { name: 'Julien', streak: 38, seed: 'julien', founderHandle: 'julien' },
  { name: 'Gopal Das', streak: 7, seed: 'gopal', founderHandle: 'gopal' },
  { name: 'AiZolo', streak: 4, seed: 'aizolo' },
  { name: 'Yuji Ueki', streak: 3, seed: 'yuji', founderHandle: 'yujiueki' },
  { name: 'AYESHA', streak: 2, seed: 'ayesha' },
  { name: 'marco', streak: 2, seed: 'marco' },
  { name: 'Sam T', streak: 1, seed: 'sam' },
  { name: 'Amit Kushwaha', streak: 1, seed: 'amit' },
  { name: 'Tobby', streak: 1, seed: 'tobby' },
  { name: 'Gungor Yildiz', streak: 1, seed: 'gungor' },
  { name: 'ian marco', streak: 1, seed: 'ianmarco', founderHandle: 'ianmarco' },
  { name: 'xy Z', streak: 1, seed: 'xyz' },
  { name: 'Mr Tars', streak: 1, seed: 'mrtars', founderHandle: 'mrtars' },
  { name: 'Ugo', streak: 1, seed: 'ugo', founderHandle: 'ugo' },
  { name: 'Kered', streak: 1, seed: 'kered', founderHandle: 'kered' },
  { name: 'Gabriel Costa', streak: 1, seed: 'gabriel' },
];

/** Extra “deal of the week” card when not enough for-sale in mocks. */
export const FEED_BONUS_DEAL = {
  slug: 'studyai-fr',
  name: 'studyai.fr',
  description:
    "Logiciel saas qui génère des fiches de révision, des quiz et des flashcards par ia pour les étudiants.",
  price: 15_000,
  mrr: 399,
  multiple: 2.8,
  logoColor: '#1e3a5f',
} as const;
