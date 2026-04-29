export interface AcquireGridRow {
  slug: string;
  views: number;
  favorites: number;
  name: string;
  category: string;
  description: string;
  revenue30d: number;
  revenueGrowthPct: number | null;
  askingPrice: number;
  askingStrike?: number;
  multiple: number;
  logoColor: string;
  /** Optional founder handle (matches `mockFounders`); defaults to placeholder in mockData. */
  founderHandle?: string;
}

/** Curated marketplace rows — mirrored to Startup records in mockData. */
export const ACQUIRE_GRID_ROWS: AcquireGridRow[] = [
  {
    slug: 'chatwith',
    views: 3751,
    favorites: 10,
    name: 'Chatwith',
    category: 'Customer Support',
    description:
      'AI chatbots for agencies. Trained on website & files, fully white labeled, and with AI tool use.',
    revenue30d: 4800,
    revenueGrowthPct: 6,
    askingPrice: 147000,
    multiple: 2.5,
    logoColor: '#1e3a5f',
    founderHandle: 'rafal',
  },
  {
    slug: 'sceneroll',
    views: 3900,
    favorites: 7,
    name: 'SceneRoll',
    category: 'Content Creation',
    description:
      'A better way to edit short-form faceless video. No editor timeline, no audio scrubber. Just upload audio, add your B-roll, and our app does the rest!',
    revenue30d: 4300,
    revenueGrowthPct: null,
    askingStrike: 45000,
    askingPrice: 40000,
    multiple: 0.8,
    logoColor: '#5c4033',
  },
  {
    slug: 'post-bridge',
    views: 22000,
    favorites: 28,
    name: 'POST BRIDGE',
    category: 'Social Media',
    description:
      'Post your content to multiple social media platforms at the same time, all-in one place.',
    revenue30d: 37000,
    revenueGrowthPct: 17,
    askingStrike: 5700000,
    askingPrice: 2500000,
    multiple: 5.7,
    logoColor: '#14532d',
  },
  {
    slug: 'ai-text-humanizer',
    views: 1900,
    favorites: 7,
    name: 'AI Text Humanizer',
    category: 'Artificial Intelligence',
    description:
      'Transforms AI-generated content into writing that genuinely feels human. Not by swapping words around like every other tool, but through a Human-AI Synergy Engine that actually understands your conten',
    revenue30d: 772,
    revenueGrowthPct: 16,
    askingPrice: 9000,
    multiple: 1.0,
    logoColor: '#27272a',
  },
  {
    slug: 'confidential-startup',
    views: 2100,
    favorites: 4,
    name: 'Confidential Startup',
    category: 'Artificial Intelligence',
    description:
      'SaaS platform that lets users deploy their own AI assistant (powered by OpenClaw) in under 60 seconds. No coding, no server management — users pick a model, connect a messaging app, and they\'re live.',
    revenue30d: 1000,
    revenueGrowthPct: 23,
    askingPrice: 45000,
    multiple: 3.7,
    logoColor: '#4c1d95',
  },
  {
    slug: 'setter-ai-llc',
    views: 6500,
    favorites: 14,
    name: 'Setter AI LLC',
    category: 'Artificial Intelligence',
    description:
      'Setter AI (via TrySetter) is an AI-driven lead engagement and appointment-booking assistant designed to help businesses capture more sales opportunities. It instantly follows up with new leads (in ~10',
    revenue30d: 6900,
    revenueGrowthPct: 21,
    askingStrike: 230000,
    askingPrice: 195000,
    multiple: 2.3,
    logoColor: '#0f172a',
  },
  {
    slug: 'aiseoscan',
    views: 1500,
    favorites: 6,
    name: 'AISEOScan',
    category: 'Marketing',
    description:
      'AI Search Optimization Scanner Scanner built specifically for AI search optimization audit.The platform analyzes websites and generates detailed reports with actionable implementation code for every',
    revenue30d: 177,
    revenueGrowthPct: 8750,
    askingStrike: 3200,
    askingPrice: 2800,
    multiple: 1.3,
    logoColor: '#134e4a',
  },
  {
    slug: 'angular-material-blocks',
    views: 608,
    favorites: 0,
    name: 'Angular Material Blocks',
    category: 'Developer Tools',
    description:
      'Rapid Angular UI Development. With Pre-built Blocks, Beautiful Templates & Powerful CLI. Also includes revenues from angular-ui.com (25%), angular-material.dev (14%), themes.angular-material.dev (5%)',
    revenue30d: 1700,
    revenueGrowthPct: 1735,
    askingStrike: 15000,
    askingPrice: 12000,
    multiple: 0.6,
    logoColor: '#7f1d1d',
  },
  {
    slug: 'sorio-ai-market',
    views: 376,
    favorites: 3,
    name: 'Sorio AI',
    category: 'Content Creation',
    description:
      'Sorio AI is a platform for creating AI-generated content and viral faceless videos. It lets users create content with different AI models like Veo 3.1, Sora 2, Wan 2.2, and Kling 1.6, while also makin',
    revenue30d: 1500,
    revenueGrowthPct: null,
    askingPrice: 25000,
    multiple: 1.4,
    logoColor: '#831843',
  },
  {
    slug: 'prompt-sloth',
    views: 2100,
    favorites: 2,
    name: 'Prompt Sloth',
    category: 'Artificial Intelligence',
    description:
      'Your Prompting sucks, we fix it! Turn rough ideas into expert prompts for better AI results. Works across ChatGPT, Claude, and every tool you use.',
    revenue30d: 1300,
    revenueGrowthPct: 505,
    askingStrike: 28000,
    askingPrice: 25000,
    multiple: 1.5,
    logoColor: '#365314',
  },
  {
    slug: 'studyai-fr',
    views: 1,
    favorites: 0,
    name: 'studyai.fr',
    category: 'SaaS',
    description:
      'Logiciel saas qui génère des fiches de révision, des quiz et des flashcards par ia pour les étudiants.',
    revenue30d: 446,
    revenueGrowthPct: 73,
    askingPrice: 15000,
    multiple: 2.8,
    logoColor: '#1e3a8a',
  },
  {
    slug: 'job-bridge',
    views: 1500,
    favorites: 1,
    name: 'Job Bridge',
    category: 'Artificial Intelligence',
    description:
      'JobBridge.io is a real-time AI interview assistant (interview copilot) that gives you instant, contextual answers and suggestions during live job interviews to help you respond confidently and land yo',
    revenue30d: 3000,
    revenueGrowthPct: 26,
    askingPrice: 75000,
    multiple: 2.1,
    logoColor: '#0c4a6e',
  },
];

export interface FounderSoldPost {
  id: string;
  displayName: string;
  handle: string;
  avatarSeed: string;
  verified?: boolean;
  headline?: string;
  body: string;
  imageSrc?: string;
  timeLabel: string;
  likes: number;
}

export const FOUNDER_SOLD_POSTS: FounderSoldPost[] = [
  {
    id: 'marc-63k',
    displayName: 'Marc Lou',
    handle: 'marclou',
    avatarSeed: 'marclou',
    verified: true,
    headline: '✅ ACQUIRED FOR $63,000',
    body: `The maker @AyalonYoav23747 spent 2 years doing organic dropshipping. He noticed everything was manual, so he built a tool to automate it.

MVP in 2 weeks.
First user in 3 days.
100% organic traction.

The buyer @alexbirle has 10+ years XP in e-commerce.`,
    imageSrc: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    timeLabel: '8:48 PM · Feb 4, 2026',
    likes: 306,
  },
  {
    id: 'victor-proofwall',
    displayName: 'Victor 🧢',
    handle: 'victor_bigfield',
    avatarSeed: 'victorbf',
    body: `I built ProofWall
I sold ProofWall
It wasn't a six-figure sale
But it's my first exit

And I sold it thanks to Ownerr of @marclou in just a few days.
Even though it had been on other platforms for a month

I'm preparing a thread that will explain why it works better on ownerr`,
    imageSrc: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    timeLabel: '5:41 PM · Dec 8, 2025',
    likes: 166,
  },
  {
    id: 'aleks-1',
    displayName: 'Aleksandar Jovanovic',
    handle: 'AleksDoesCode',
    avatarSeed: 'aleksj',
    body: 'I sold my Startup via Ownerr thanks to @marclou.\n\nJust received the signed contract.\n\nFull breakdown and more infos coming soon!',
    timeLabel: '2:41 PM · Dec 9, 2025',
    likes: 4,
  },
  {
    id: 'aleks-2',
    displayName: 'Aleksandar Jovanovic',
    handle: 'AleksDoesCode',
    avatarSeed: 'aleksj',
    body: "How am I supposed to sleep when people keep sending me EXIT-offers? 👀👀\n\nSeems like my site is in high demand. Just adjusted the asking price accordingly to the feedback I received 🤑😇",
    timeLabel: '2:41 PM · Dec 9, 2025',
    likes: 4,
  },
  {
    id: 'mohamed',
    displayName: 'mohamedmesk',
    handle: 'kilozua5kdm',
    avatarSeed: 'mohamedm',
    body: 'Huge thanks to\n@marclou\n! Thanks to Ownerr, I just made my first SaaS sale directly through WhatsApp and paypal with Ownerr. It’s amazing what a little help can do… and this is just the beginning! #SaaS #Entrepreneur  Next SaaS is coming… $1 MILLION estimated resale value !',
    timeLabel: '12:04 AM · Jan 2, 2026',
    likes: 29,
  },
  {
    id: 'kyzo',
    displayName: 'kyzo',
    handle: 'ky__zo',
    avatarSeed: 'kyzo',
    body: "wow i listed my startup in @marclou 's Ownerr and got first acquisition offer in 15 minutes.\n\nsick",
    timeLabel: '3:29 AM · Dec 11, 2025',
    likes: 86,
  },
  {
    id: 'effie-1',
    displayName: 'Effie',
    handle: 'MuhammadAnas707',
    avatarSeed: 'effie',
    body: "Just sold my first ever startup on Ownerr!\n\nNever thought this was possible, always wanted a platform where you could directly just get buyers for projects even with low revenue. Ownerr was the thing I was looking for, and it turned out to be super useful.\n\nThanks @marclou",
    timeLabel: '11:49 AM · Dec 31, 2025',
    likes: 2,
  },
  {
    id: 'mehroz',
    displayName: 'Mehroz Sheikh',
    handle: 'Mehroz__sheikh',
    avatarSeed: 'mehroz',
    body: 'Wow, I just received three offers in a single day! @ownerr_io is really good, and the offers also appear legit. I hope I can close a deal with one of them.',
    timeLabel: '11:12 AM · Jan 10, 2026',
    likes: 10,
  },
  {
    id: 'velombe',
    displayName: 'Velombe',
    handle: 'JeanChrinot',
    avatarSeed: 'velombe',
    body: `Ovennia.com was acquired yesterday! 🎉

What this means for me:

- A perfect way to finish 2025
- Extra money to start 2026 with full energy
- Now I can focus fully on my other SaaS project

My goals for 2026:

- Reach $3000 MRR from SaaS
- Grow to 10K followers here`,
    timeLabel: '2:39 AM · Jan 2, 2026',
    likes: 60,
  },
  {
    id: 'yogesh',
    displayName: 'Yogesh',
    handle: 'yogesharc',
    avatarSeed: 'yogesh',
    body: 'Promptmonitor has been acquired ♥️',
    timeLabel: '8:54 PM · Jan 29, 2026',
    likes: 69,
  },
  {
    id: 'marc-85k',
    displayName: 'Marc Lou',
    handle: 'marclou',
    avatarSeed: 'marclou',
    verified: true,
    headline: '✅ SOLD FOR $85,000',
    body: "It's the biggest acquisition on Ownerr so far (the marketplace is 45 days old). Here's the story.\n\n@yogesharc noticed something odd in May 2025:\n\nHis own job board was getting traffic from ChatGPT. So he built a small tool to see when AI tools mention his",
    imageSrc: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80',
    timeLabel: '8:54 PM · Jan 29, 2026',
    likes: 69,
  },
  {
    id: 'effie-2',
    displayName: 'Effie',
    handle: 'MuhammadAnas707',
    avatarSeed: 'effie',
    body: "got acquired yet again. At the start of this year, got acquired for $250. This time it's $1,767.\n\nhappy to annouce payping.space has been acquired via @ownerr_io by @marclou \n\nnever thought this was possible!\n\nPS. if you haven't tried payping.space yet, go",
    timeLabel: '12:24 PM · Feb 27, 2026',
    likes: 21,
  },
  {
    id: 'ramesh',
    displayName: 'Ramesh',
    handle: 'ram_kem',
    avatarSeed: 'ramesh',
    body: 'My startup Startup Directory was acquired on @ownerr_io 🎉 \n\nThis is my very first exit and everything was so smooth. Thanks to @marclou for having such a great a platform.',
    timeLabel: '2:21 AM · Apr 22, 2026',
    likes: 12,
  },
];

export const ACQUIRE_MARKETPLACE_TOTAL = 1600;
