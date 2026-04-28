import { ACQUIRE_GRID_ROWS } from '@/lib/acquireMarketplaceData';
import { computeStartupScores } from '@/lib/startupScores';

export type Category =
  | 'Content Creation'
  | 'Mobile Apps'
  | 'SaaS'
  | 'Education'
  | 'Crypto & Web3'
  | 'Developer Tools'
  | 'Artificial Intelligence'
  | 'Health'
  | 'Marketing'
  | 'Customer Support'
  | 'Social Media';

export interface Startup {
  slug: string;
  name: string;
  category: Category;
  revenue: number;
  /** All-time high MRR (for leaderboard “All time” view). Defaults to `revenue` if omitted. */
  peakMrr?: number;
  price?: number;
  multiple?: number;
  forSale: boolean;
  founderHandle: string;
  /** Shown in leaderboard when the founder is not in `mockFounders` (e.g. user-added). */
  founderDisplayName?: string;
  /** Profile / Stripe Connect style username for listings. */
  listingUsername?: string;
  description: string;
  monthlyRevenueSeries: { month: string; value: number }[];
  logoColor: string;
  foundedYear: number;
  ttmProfit?: number;
  customers: number;
  momGrowth: number;
  /** Marketplace grid (acquire page). */
  listingViews?: number;
  listingFavorites?: number;
  revenueGrowth30dPct?: number | null;
  /** Prior / crossed-out asking price when shown on listing card. */
  askingPriceStrike?: number;
  /** 0–100 — revenue quality & momentum (ownerr). */
  businessScore: number;
  /** 0–100 — lending / credit proxy (ownerr). */
  lendScore: number;
  /** 0–100 — M&A / buyer attractiveness (ownerr). */
  acquisitionPower: number;
  /** Revenue verified via payment provider (demo/mock). */
  revenueVerified: boolean;
  /** Which provider verified the revenue. */
  revenueProvider: 'Stripe' | 'RevenueCat' | null;
  /** Domain ownership verified (demo/mock). */
  domainVerified: boolean;
  /** Traffic verified via Google Analytics (demo/mock). */
  trafficVerified: boolean;
  /** Monthly visitors (demo/mock). */
  trafficMonthlyVisitors: number | null;
  /** Traffic trend direction (demo/mock). */
  trafficTrend: 'up' | 'down' | 'flat' | null;
}

/** Seed rows before scores are merged (see `mockStartupsFromSeed`). */
export type StartupSeed = Omit<Startup, 'businessScore' | 'lendScore' | 'acquisitionPower' | 'revenueVerified' | 'revenueProvider' | 'domainVerified' | 'trafficVerified' | 'trafficMonthlyVisitors' | 'trafficTrend'> & Partial<Pick<Startup, 'revenueVerified' | 'revenueProvider' | 'domainVerified' | 'trafficVerified' | 'trafficMonthlyVisitors' | 'trafficTrend'>>;

export interface Founder {
  handle: string;
  name: string;
  twitter: string;
  avatarSeed: string;
  bio: string;
  startupSlugs: string[];
  skills: string[];
  lookingForCofounder: boolean;
}

export interface FeedEvent {
  id: string;
  timestamp: string;
  content: string;
}

export const PASTEL_COLORS = ['#FFE6F1','#E6EAFF','#E6FFE8','#E6F5FF','#FFF8E6','#F0E6FF','#FFEEE6'];

function getRandomPastel() { return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)]; }

export function generateMonthlyRevenue(currentMrr: number) {
  const series: { month: string; value: number }[] = [];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let val = currentMrr * 0.3;
  for (let i = 0; i < 12; i++) {
    const variance = (Math.random() - 0.2) * 0.25;
    val = val * (1 + variance);
    if (i === 11) val = currentMrr;
    series.push({ month: months[i], value: Math.round(val) });
  }
  return series;
}

function slugPeakMultiplier(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i) * (i + 3)) % 251;
  return 1.04 + (h % 28) / 100;
}

export function leaderboardMetricValue(
  s: Startup,
  metric: 'mrr' | 'arr',
  period: 'all_time' | 'current',
): number {
  const mrr = period === 'all_time' ? (s.peakMrr ?? s.revenue) : s.revenue;
  return metric === 'arr' ? mrr * 12 : mrr;
}

const mockStartupsSeed: StartupSeed[] = [
  { slug: 'stan', name: 'Stan', category: 'Content Creation', revenue: 3569654, forSale: false, founderHandle: 'vitddnv', description: 'Stan enables people to make a living and work for themselves.', monthlyRevenueSeries: generateMonthlyRevenue(3569654), logoColor: '#E6EAFF', foundedYear: 2020, customers: 45000, momGrowth: 12.5 },
  { slug: 'sorio-ai', name: 'Sorio AI', category: 'Artificial Intelligence', revenue: 12500, price: 250000, multiple: 1.6, forSale: true, founderHandle: 'alicew', description: 'AI-powered writing assistant for B2B marketers.', monthlyRevenueSeries: generateMonthlyRevenue(12500), logoColor: '#E6FFE8', foundedYear: 2023, ttmProfit: 95000, customers: 340, momGrowth: 8.2 },
  { slug: 'cursorclip', name: 'CursorClip', category: 'Content Creation', revenue: 1300, price: 29000, multiple: 1.8, forSale: true, founderHandle: 'robbyf', description: 'Capture cursor recordings beautifully.', monthlyRevenueSeries: generateMonthlyRevenue(1300), logoColor: '#FFE6F1', foundedYear: 2024, ttmProfit: 9000, customers: 120, momGrowth: 5.1 },
  { slug: 'iqmax', name: 'IQMax', category: 'Education', revenue: 620, price: 4000, multiple: 0.5, forSale: true, founderHandle: 'marcdev', description: 'Daily IQ workout app.', monthlyRevenueSeries: generateMonthlyRevenue(620), logoColor: '#E6F5FF', foundedYear: 2024, ttmProfit: 2500, customers: 80, momGrowth: -3.2 },
  { slug: 'holypoly', name: 'Holypoly', category: 'Crypto & Web3', revenue: 11000, price: 80000, multiple: 0.6, forSale: true, founderHandle: 'cryptodan', description: 'Liquid staking on every chain.', monthlyRevenueSeries: generateMonthlyRevenue(11000), logoColor: '#F0E6FF', foundedYear: 2022, ttmProfit: 60000, customers: 800, momGrowth: 1.4 },
  { slug: 'polysight-app', name: 'polysight.app', category: 'SaaS', revenue: 16000, price: 1000000, multiple: 5.1, forSale: true, founderHandle: 'yoava', description: 'Your all in one tool for making money online.', monthlyRevenueSeries: generateMonthlyRevenue(16000), logoColor: '#E6EAFF', foundedYear: 2021, ttmProfit: 110000, customers: 540, momGrowth: 6.0 },
  { slug: 'sacred-bible', name: 'Sacred: Bible & Daily Devotion', category: 'Mobile Apps', revenue: 993, price: 11000, multiple: 0.9, forSale: true, founderHandle: 'ianmarco', description: 'Daily devotionals and Bible reading.', monthlyRevenueSeries: generateMonthlyRevenue(993), logoColor: '#FFEEE6', foundedYear: 2024, ttmProfit: 4000, customers: 220, momGrowth: 9.2 },
  { slug: 'dunkmax', name: 'DunkMax', category: 'Mobile Apps', revenue: 7000, price: 155000, multiple: 1.8, forSale: true, founderHandle: 'janed', description: 'Vertical jump training program app.', monthlyRevenueSeries: generateMonthlyRevenue(7000), logoColor: '#FFF8E6', foundedYear: 2023, ttmProfit: 32000, customers: 410, momGrowth: 4.0 },
  { slug: 'oli-ai', name: 'Oli Ai', category: 'Artificial Intelligence', revenue: 1100, price: 50000, multiple: 3.6, forSale: true, founderHandle: 'alicew', description: 'AI olive oil sommelier.', monthlyRevenueSeries: generateMonthlyRevenue(1100), logoColor: '#E6FFE8', foundedYear: 2024, ttmProfit: 4500, customers: 60, momGrowth: 14.0 },
  { slug: 'b2c-b2b-proxy', name: 'B2C & B2B Proxy Company', category: 'Developer Tools', revenue: 17000, price: 249000, multiple: 1.2, forSale: true, founderHandle: 'sowak', description: 'Residential proxy network.', monthlyRevenueSeries: generateMonthlyRevenue(17000), logoColor: '#FFE6F1', foundedYear: 2021, ttmProfit: 130000, customers: 380, momGrowth: 2.4 },
  { slug: 'conduzy', name: 'Conduzy', category: 'Mobile Apps', revenue: 14000, price: 250000, multiple: 1.4, forSale: true, founderHandle: 'janed', description: 'Drivers ed app for new drivers.', monthlyRevenueSeries: generateMonthlyRevenue(14000), logoColor: '#E6EAFF', foundedYear: 2022, ttmProfit: 90000, customers: 1100, momGrowth: 7.2 },
  { slug: 'trimrx', name: 'TrimRx', category: 'Health', revenue: 310527, forSale: false, founderHandle: 'heygrant', description: 'Online telehealth GLP-1 weight loss programs.', monthlyRevenueSeries: generateMonthlyRevenue(310527), logoColor: '#E6FFE8', foundedYear: 2023, customers: 12000, momGrowth: 13.0 },
  { slug: 'rezi', name: 'Rezi', category: 'SaaS', revenue: 285341, price: 4500000, multiple: 1.3, forSale: true, founderHandle: 'jacobj', description: 'AI resume builder used by 1M+ users yearly.', monthlyRevenueSeries: generateMonthlyRevenue(285341), logoColor: '#FFE6F1', foundedYear: 2019, ttmProfit: 1800000, customers: 1000000, momGrowth: 2.0 },
  { slug: 'kibu', name: 'Kibu', category: 'SaaS', revenue: 234319, forSale: false, founderHandle: 'danielc', description: 'EHR for I/DD provider organizations.', monthlyRevenueSeries: generateMonthlyRevenue(234319), logoColor: '#E6F5FF', foundedYear: 2018, customers: 320, momGrowth: 0 },
  { slug: '1capture', name: '1Capture', category: 'Marketing', revenue: 216246, price: 2400000, multiple: 0.9, forSale: true, founderHandle: 'robbyf', description: 'Double your trial-to-paid conversion.', monthlyRevenueSeries: generateMonthlyRevenue(216246), logoColor: '#FFEEE6', foundedYear: 2020, ttmProfit: 1200000, customers: 740, momGrowth: 0 },
  { slug: 'cometly', name: 'Cometly', category: 'Marketing', revenue: 212162, forSale: false, founderHandle: 'heygrant', description: 'Marketing attribution & analytics for SaaS.', monthlyRevenueSeries: generateMonthlyRevenue(212162), logoColor: '#F0E6FF', foundedYear: 2021, customers: 900, momGrowth: 4.0 },
  { slug: 'supliful', name: 'Brand On Demand, Inc.', category: 'SaaS', revenue: 198400, forSale: false, founderHandle: 'sarahj', description: 'CPG brand launch platform for creators.', monthlyRevenueSeries: generateMonthlyRevenue(198400), logoColor: '#E6FFE8', foundedYear: 2020, customers: 5400, momGrowth: 8.5 },
  { slug: 'dm-champ', name: 'DM Champ', category: 'Artificial Intelligence', revenue: 192155, forSale: false, founderHandle: 'sowak', description: 'AI sales agent that closes 24/7.', monthlyRevenueSeries: generateMonthlyRevenue(192155), logoColor: '#FFF8E6', foundedYear: 2023, customers: 410, momGrowth: 22.0 },
  { slug: 'stealth-venture', name: 'Stealth Venture', category: 'SaaS', revenue: 183683, forSale: false, founderHandle: 'nomistair', description: 'Currently unannounced.', monthlyRevenueSeries: generateMonthlyRevenue(183683), logoColor: '#E6EAFF', foundedYear: 2022, customers: 420, momGrowth: 4.0 },
  { slug: 'hidden-business', name: 'Hidden Business', category: 'SaaS', revenue: 157013, forSale: false, founderHandle: 'sowak', description: 'Stealth project.', monthlyRevenueSeries: generateMonthlyRevenue(157013), logoColor: '#FFE6F1', foundedYear: 2022, customers: 280, momGrowth: 0 },
  { slug: 'dealsourcr', name: 'Dealsourcr Ltd', category: 'SaaS', revenue: 152308, forSale: false, founderHandle: 'ashleyr', description: 'Software for deal sourcing teams.', monthlyRevenueSeries: generateMonthlyRevenue(152308), logoColor: '#E6F5FF', foundedYear: 2021, customers: 340, momGrowth: 25.0 },
  { slug: 'dataexpert', name: 'DataExpert / TechCreator', category: 'Education', revenue: 62790, forSale: false, founderHandle: 'zachw', description: 'DataExpert.io is a data engineering education platform.', monthlyRevenueSeries: generateMonthlyRevenue(62790), logoColor: '#FFEEE6', foundedYear: 2022, customers: 1800, momGrowth: 3.0 },
  { slug: 'besbet', name: 'besbet', category: 'SaaS', revenue: 53028, forSale: false, founderHandle: 'kevinyu', description: 'Sportsbook analytics platform.', monthlyRevenueSeries: generateMonthlyRevenue(53028), logoColor: '#E6EAFF', foundedYear: 2023, customers: 740, momGrowth: 44.0 },
];

// add a few more random fillers
  for (let i = 0; i < 10; i++) {
  const mrr = Math.floor(Math.random() * 80000) + 5000;
  const isForSale = Math.random() > 0.5;
  const price = isForSale ? Math.round(mrr * 12 * (1 + Math.random() * 2)) : undefined;
  const slug = `mock-${i}`;
  mockStartupsSeed.push({
    slug,
    name: ['Lumen', 'Pixly', 'BrewMate', 'Notewise', 'Forge', 'Pulsar', 'Nimbus', 'Chime', 'Echo', 'Atlas'][i],
    category: (['SaaS','Mobile Apps','Developer Tools','Marketing','Artificial Intelligence'] as Category[])[i % 5],
    revenue: mrr,
    price,
    multiple: price ? Math.round((price / (mrr * 12)) * 10) / 10 : undefined,
    forSale: isForSale,
    founderHandle: ['vitddnv','alicew','robbyf','sarahj','marcdev','janed','cryptodan'][i % 7],
    description: 'A small profitable indie product.',
    monthlyRevenueSeries: generateMonthlyRevenue(mrr),
    logoColor: getRandomPastel(),
    foundedYear: 2020 + (i % 4),
    ttmProfit: isForSale ? mrr * 8 : undefined,
    customers: Math.floor(Math.random() * 5000) + 50,
    momGrowth: Math.round((Math.random() - 0.3) * 200) / 10,
    revenueVerified: true,
    revenueProvider: i % 2 === 0 ? 'Stripe' : 'RevenueCat',
    domainVerified: true,
    trafficVerified: i % 3 !== 0,
    trafficMonthlyVisitors: Math.floor(Math.random() * 20000) + 500,
    trafficTrend: Math.random() > 0.4 ? 'up' : 'flat',
  });
}

function acquireRowToStartup(r: (typeof ACQUIRE_GRID_ROWS)[number]): Startup {
  const base: Startup = {
    slug: r.slug,
    name: r.name,
    category: r.category as Category,
    revenue: r.revenue30d,
    price: r.askingPrice,
    multiple: r.multiple,
    forSale: true,
    founderHandle: r.founderHandle ?? 'mrtars',
    description: r.description,
    monthlyRevenueSeries: generateMonthlyRevenue(r.revenue30d),
    logoColor: r.logoColor,
    foundedYear: 2022,
    customers: Math.max(20, Math.round(r.views / 25)),
    momGrowth: r.revenueGrowthPct ?? 0,
    peakMrr: Math.round(r.revenue30d * (1.05 + (r.slug.length % 10) / 100)),
    listingViews: r.views,
    listingFavorites: r.favorites,
    revenueGrowth30dPct: r.revenueGrowthPct,
    askingPriceStrike: r.askingStrike,
    businessScore: 0,
    lendScore: 0,
    acquisitionPower: 0,
    revenueVerified: true,
    revenueProvider: 'Stripe',
    domainVerified: true,
    trafficVerified: true,
    trafficMonthlyVisitors: Math.max(500, Math.round(r.views * 3)),
    trafficTrend: 'up',
  };
  return { ...base, ...computeStartupScores(base) };
}

const mockStartupsFromSeed: Startup[] = mockStartupsSeed.map((s) => {
  const base: Startup = {
    ...s,
    peakMrr: s.peakMrr ?? Math.round(s.revenue * slugPeakMultiplier(s.slug)),
    businessScore: 0,
    lendScore: 0,
    acquisitionPower: 0,
    revenueVerified: s.revenueVerified ?? true,
    revenueProvider: s.revenueProvider ?? (s.slug.length % 2 === 0 ? 'Stripe' : 'RevenueCat'),
    domainVerified: s.domainVerified ?? true,
    trafficVerified: s.trafficVerified ?? (s.slug.length % 3 !== 0),
    trafficMonthlyVisitors: s.trafficMonthlyVisitors ?? Math.max(200, Math.round(s.customers * 2.5)),
    trafficTrend: s.trafficTrend ?? (s.momGrowth >= 0 ? 'up' : 'flat'),
  };
  return { ...base, ...computeStartupScores(base) };
});

export const mockStartups: Startup[] = [
  ...mockStartupsFromSeed,
  ...ACQUIRE_GRID_ROWS.map(acquireRowToStartup),
];

export const leaderboardStartups = [...mockStartups].sort((a, b) => b.revenue - a.revenue);

export const mockFounders: Founder[] = [
  { handle: 'vitddnv', name: 'Vitalii Dodonov', twitter: '@vitddnv', avatarSeed: 'vitddnv', bio: 'Building Stan. Helping creators make a living.', startupSlugs: ['stan'], skills: ['Engineering','Product'], lookingForCofounder: false },
  { handle: 'alicew', name: 'Alice Wang', twitter: '@alicewang_dev', avatarSeed: 'alicew', bio: 'Marketing engineer. Sold 2 micro-SaaS.', startupSlugs: ['sorio-ai','oli-ai'], skills: ['Marketing','Sales','Engineering'], lookingForCofounder: true },
  { handle: 'robbyf', name: 'Robby Frank', twitter: '@robbyfrank', avatarSeed: 'robbyf', bio: 'Shipping fast. Next.js & Tailwind.', startupSlugs: ['cursorclip','1capture'], skills: ['Engineering','Design'], lookingForCofounder: true },
  { handle: 'sarahj', name: 'Sarah Jenkins', twitter: '@sarahj_growth', avatarSeed: 'sarahj', bio: 'Growth hacker turned founder.', startupSlugs: ['supliful'], skills: ['Marketing','Growth'], lookingForCofounder: false },
  { handle: 'marcdev', name: 'Marc Dev', twitter: '@marc_dev', avatarSeed: 'marcdev', bio: 'Design engineer sharing knowledge.', startupSlugs: ['iqmax'], skills: ['Design','Engineering','Education'], lookingForCofounder: true },
  { handle: 'janed', name: 'Jane Doe', twitter: '@janed_apps', avatarSeed: 'janed', bio: 'Indie iOS developer.', startupSlugs: ['dunkmax','conduzy'], skills: ['Engineering','Mobile','Design'], lookingForCofounder: true },
  { handle: 'cryptodan', name: 'Crypto Dan', twitter: '@cryptodan_xyz', avatarSeed: 'cryptodan', bio: 'Web3 builder.', startupSlugs: ['holypoly'], skills: ['Engineering','Web3'], lookingForCofounder: false },
  { handle: 'yoava', name: 'YOAV AYALON', twitter: '@yoava', avatarSeed: 'yoava', bio: 'Founder polysight.app.', startupSlugs: ['polysight-app'], skills: ['Engineering','Product'], lookingForCofounder: false },
  { handle: 'ianmarco', name: 'Ian Marco', twitter: '@ianmarco__', avatarSeed: 'ianmarco', bio: 'Building Sacred Bible app.', startupSlugs: ['sacred-bible'], skills: ['Mobile','Marketing'], lookingForCofounder: false },
  { handle: 'sowak', name: 'Sowa Killian', twitter: '@sowakillian', avatarSeed: 'sowak', bio: 'Agency + SaaS.', startupSlugs: ['b2c-b2b-proxy','dm-champ','hidden-business'], skills: ['Sales','AI'], lookingForCofounder: false },
  { handle: 'heygrant', name: 'Grant Cooper', twitter: '@heygrantcooper', avatarSeed: 'heygrant', bio: 'Marketing analytics.', startupSlugs: ['cometly','trimrx'], skills: ['Marketing','Analytics'], lookingForCofounder: false },
  { handle: 'jacobj', name: 'Jacob Jacquet', twitter: '@jacobjacquet', avatarSeed: 'jacobj', bio: 'Founder of Rezi.', startupSlugs: ['rezi'], skills: ['Product','AI'], lookingForCofounder: false },
  { handle: 'danielc', name: 'Daniel Caridi', twitter: '@danielcaridi', avatarSeed: 'danielc', bio: 'Building Kibu.', startupSlugs: ['kibu'], skills: ['Engineering','Healthcare'], lookingForCofounder: false },
  { handle: 'nomistair', name: 'Simon', twitter: '@nomistair', avatarSeed: 'nomistair', bio: 'Stealth.', startupSlugs: ['stealth-venture'], skills: ['Engineering'], lookingForCofounder: false },
  { handle: 'ashleyr', name: 'Ashley Rudland', twitter: '@ashleyrudland', avatarSeed: 'ashleyr', bio: 'Shipping deal sourcing software.', startupSlugs: ['dealsourcr'], skills: ['Engineering','Sales'], lookingForCofounder: false },
  { handle: 'zachw', name: 'Zach Wilson', twitter: '@zachwilsonsfo', avatarSeed: 'zachw', bio: 'Data engineering educator.', startupSlugs: ['dataexpert'], skills: ['Engineering','Education'], lookingForCofounder: false },
  { handle: 'kevinyu', name: 'Kevin Yubin', twitter: '@kevinyubin', avatarSeed: 'kevinyu', bio: 'Sportsbook analytics.', startupSlugs: ['besbet'], skills: ['Engineering','Analytics'], lookingForCofounder: false },
  { handle: 'mrtars', name: 'Mr Tars', twitter: '@mrtars', avatarSeed: 'mrtars', bio: 'Building Shortgram.', startupSlugs: [], skills: ['AI','Content'], lookingForCofounder: true },
  { handle: 'rafal', name: 'Rafal', twitter: '@rafal', avatarSeed: 'rafal', bio: 'Founder of Chatwith.', startupSlugs: ['chatwith'], skills: ['AI','Product'], lookingForCofounder: false },
  { handle: 'yujiueki', name: 'Yuji Ueki', twitter: '@yujiueki', avatarSeed: 'yujiueki', bio: 'Building Deariary.', startupSlugs: [], skills: ['Mobile','Design'], lookingForCofounder: false },
  { handle: 'caitlin', name: 'Caitlin', twitter: '@caitlinpicx', avatarSeed: 'caitlin', bio: 'Founder PicX Studio.', startupSlugs: [], skills: ['Design','AI'], lookingForCofounder: true },
  { handle: 'gopal', name: 'Gopal Das', twitter: '@gopaldas', avatarSeed: 'gopal', bio: 'QuickClip founder.', startupSlugs: [], skills: ['Mobile','Productivity'], lookingForCofounder: false },
  { handle: 'julien', name: 'Julien', twitter: '@julien', avatarSeed: 'julien', bio: 'Shipmail founder.', startupSlugs: [], skills: ['Engineering','Product'], lookingForCofounder: false },
  { handle: 'ugo', name: 'Ugo', twitter: '@ugo', avatarSeed: 'ugo', bio: 'Adventory monetization platform.', startupSlugs: [], skills: ['Sales','Marketing'], lookingForCofounder: false },
  { handle: 'kered', name: 'Kered Kurten', twitter: '@kered', avatarSeed: 'kered', bio: 'ClearFeedback founder.', startupSlugs: [], skills: ['Product','Engineering'], lookingForCofounder: false },
];

export const mockFeedEvents: FeedEvent[] = [
  { id: '1', timestamp: '2 hours ago', content: 'Sorio AI listed for $250k' },
  { id: '2', timestamp: '5 hours ago', content: 'Stan crossed $3.5M MRR' },
  { id: '3', timestamp: '1 day ago', content: 'New verified founder: Robby Frank' },
  { id: '4', timestamp: '1 day ago', content: 'CursorClip MRR verified at $1.3k' },
  { id: '5', timestamp: '2 days ago', content: 'TrimRx verified at $310,527 MRR' },
  { id: '6', timestamp: '3 days ago', content: 'New verified founder: Alice Wang' },
];

// Sponsor cards — mix of dark and colored backgrounds (matches reference image 1)
export interface SponsorCard {
  name: string;
  desc: string;
  bg: string;        // background color
  fg: string;        // foreground/text color
  letter?: string;   // monogram override
}

export const sponsorCardsLeft: SponsorCard[] = [
  { name: 'CodeFast',  desc: 'Learn to code in days, not years', bg: '#1f1f22', fg: '#fafafa' },
  { name: 'Handoff',   desc: 'Acquire with confidence. Hand off assets. Operate tomorrow.', bg: '#1f1f22', fg: '#fafafa' },
  { name: 'xCloud',    desc: 'The #1 cloud hosting from OpenClaw to Lovable.', bg: '#1d2a44', fg: '#cfe0ff' },
  { name: 'Inboxapp',  desc: 'Find & auto DM your next customers on X', bg: '#0e2238', fg: '#cfe0ff' },
  { name: 'Postopus',  desc: 'Post everywhere, all at once. Become a Founding Tentacle.', bg: '#3a1d3f', fg: '#f5d6ff' },
  { name: 'Virlo',     desc: 'AI video generation', bg: '#fde6f1', fg: '#3a0f29' },
];

export const sponsorCardsRight: SponsorCard[] = [
  { name: 'Master Claude Code', desc: 'Ship faster. Earn more. Master Claude Code.', bg: '#19402b', fg: '#d6ffe1' },
  { name: 'GojiberryAI',        desc: 'Find warm leads and book sales calls automatically', bg: '#5a1b1b', fg: '#ffd6d6' },
  { name: 'MakeUGC',            desc: 'Create viral AI ads', bg: '#1f1f22', fg: '#fafafa' },
  { name: 'ProvenTools',        desc: '99,000+ validated SaaS and tool ideas to build', bg: '#1f1f22', fg: '#fafafa' },
  { name: 'Replymer',           desc: 'Human replies that sell your product', bg: '#fde6f1', fg: '#3a0f29' },
  { name: 'Chargeback.io',      desc: 'Prevent chargebacks on autopilot', bg: '#cfe0ff', fg: '#0a1a3a' },
];

// Live visitor mock data
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
  conversionLikelihood: number; // 0-100
  estimatedValue: number;       // dollars
  // visual position on the globe (percent)
  top: number;
  left: number;
  dotColor: string;
}

const flag = (n: string) => ({
  us: '🇺🇸', in: '🇮🇳', vn: '🇻🇳', ca: '🇨🇦', tr: '🇹🇷', se: '🇸🇪', jp: '🇯🇵',
  br: '🇧🇷', de: '🇩🇪', fr: '🇫🇷', uk: '🇬🇧', ng: '🇳🇬', mx: '🇲🇽', ph: '🇵🇭',
  id: '🇮🇩', au: '🇦🇺',
}[n] || '🌐');

export const mockVisitors: Visitor[] = [
  { id: 'v1', name: 'amber gayal',    avatarSeed: 'amber',   countryFlag: flag('ca'), countryName: 'Canada', city: 'Chilliwack, CA', os: 'Mac OS', device: 'Desktop', browser: 'Chrome', referrer: 'Google',  currentUrl: '/',                 sessionTime: '2 min 8 sec', totalVisits: 1, conversionLikelihood: 78, estimatedValue: 0.09, top: 28, left: 18, dotColor: '#ef4444' },
  { id: 'v2', name: 'chocolate gorilla', avatarSeed: 'gorilla', countryFlag: flag('us'), countryName: 'United States', city: 'Austin, US', os: 'Windows', device: 'Desktop', browser: 'Chrome', referrer: 'Direct', currentUrl: '/startup/postpeer', sessionTime: '4 min 12 sec', totalVisits: 3, conversionLikelihood: 62, estimatedValue: 0.18, top: 38, left: 24, dotColor: '#3b82f6' },
  { id: 'v3', name: 'sapphire fowl',   avatarSeed: 'sapphire', countryFlag: flag('us'), countryName: 'United States', city: 'New York, US', os: 'Mac OS', device: 'Desktop', browser: 'Safari', referrer: 'Twitter', currentUrl: '/startup/vidai-llc', sessionTime: '8 min 03 sec', totalVisits: 5, conversionLikelihood: 88, estimatedValue: 0.42, top: 33, left: 28, dotColor: '#22c55e' },
  { id: 'v4', name: 'white urial',     avatarSeed: 'whiteurial', countryFlag: flag('tr'), countryName: 'Turkey', city: 'Istanbul, TR', os: 'Windows', device: 'Desktop', browser: 'Chrome', referrer: 'Google', currentUrl: '/startup/ploxto', sessionTime: '1 min 22 sec', totalVisits: 1, conversionLikelihood: 35, estimatedValue: 0.04, top: 40, left: 55, dotColor: '#f59e0b' },
  { id: 'v5', name: 'aida dunder',     avatarSeed: 'aida',     countryFlag: flag('se'), countryName: 'Sweden', city: 'Stockholm, SE', os: 'Mac OS', device: 'Desktop', browser: 'Firefox', referrer: 'Direct', currentUrl: '/', sessionTime: '6 min 41 sec', totalVisits: 2, conversionLikelihood: 71, estimatedValue: 0.21, top: 22, left: 51, dotColor: '#a855f7' },
  { id: 'v6', name: 'dan tokyo',       avatarSeed: 'dantokyo', countryFlag: flag('jp'), countryName: 'Japan', city: 'Tokyo, JP', os: 'iOS', device: 'Mobile', browser: 'Safari', referrer: 'Direct', currentUrl: '/feed', sessionTime: '3 min 05 sec', totalVisits: 1, conversionLikelihood: 44, estimatedValue: 0.06, top: 36, left: 78, dotColor: '#06b6d4' },
  { id: 'v7', name: 'priya kumar',     avatarSeed: 'priya',    countryFlag: flag('in'), countryName: 'India', city: 'Bangalore, IN', os: 'Android', device: 'Mobile', browser: 'Chrome', referrer: 'Google', currentUrl: '/acquire', sessionTime: '12 min 30 sec', totalVisits: 4, conversionLikelihood: 59, estimatedValue: 0.15, top: 50, left: 65, dotColor: '#ef4444' },
  { id: 'v8', name: 'leo silva',       avatarSeed: 'leo',      countryFlag: flag('br'), countryName: 'Brazil', city: 'São Paulo, BR', os: 'Windows', device: 'Desktop', browser: 'Edge', referrer: 'Twitter', currentUrl: '/stats', sessionTime: '5 min 45 sec', totalVisits: 2, conversionLikelihood: 50, estimatedValue: 0.10, top: 65, left: 30, dotColor: '#22c55e' },
  { id: 'v9', name: 'maya yusuf',      avatarSeed: 'maya',     countryFlag: flag('id'), countryName: 'Indonesia', city: 'Jakarta, ID', os: 'Android', device: 'Mobile', browser: 'Chrome', referrer: 'Direct', currentUrl: '/cofounders', sessionTime: '2 min 11 sec', totalVisits: 1, conversionLikelihood: 38, estimatedValue: 0.05, top: 60, left: 75, dotColor: '#f59e0b' },
  { id: 'v10', name: 'henry park',     avatarSeed: 'henry',    countryFlag: flag('au'), countryName: 'Australia', city: 'Sydney, AU', os: 'Mac OS', device: 'Desktop', browser: 'Chrome', referrer: 'Direct', currentUrl: '/', sessionTime: '7 min 02 sec', totalVisits: 2, conversionLikelihood: 66, estimatedValue: 0.19, top: 72, left: 82, dotColor: '#a855f7' },
  { id: 'v11', name: 'lucas miller',   avatarSeed: 'lucas',    countryFlag: flag('us'), countryName: 'United States', city: 'San Francisco, US', os: 'Mac OS', device: 'Desktop', browser: 'Chrome', referrer: 'Google', currentUrl: '/stats', sessionTime: '9 min 14 sec', totalVisits: 3, conversionLikelihood: 81, estimatedValue: 0.32, top: 30, left: 14, dotColor: '#3b82f6' },
  { id: 'v12', name: 'noor hassan',    avatarSeed: 'noor',     countryFlag: flag('ng'), countryName: 'Nigeria', city: 'Lagos, NG', os: 'Android', device: 'Mobile', browser: 'Chrome', referrer: 'Direct', currentUrl: '/', sessionTime: '1 min 50 sec', totalVisits: 1, conversionLikelihood: 28, estimatedValue: 0.03, top: 53, left: 46, dotColor: '#ef4444' },
  { id: 'v13', name: 'eva schmidt',    avatarSeed: 'eva',      countryFlag: flag('de'), countryName: 'Germany', city: 'Berlin, DE', os: 'Linux', device: 'Desktop', browser: 'Firefox', referrer: 'Direct', currentUrl: '/feed', sessionTime: '4 min 19 sec', totalVisits: 2, conversionLikelihood: 55, estimatedValue: 0.12, top: 25, left: 49, dotColor: '#22c55e' },
  { id: 'v14', name: 'rafael ortiz',   avatarSeed: 'rafael',   countryFlag: flag('mx'), countryName: 'Mexico', city: 'Mexico City, MX', os: 'Mac OS', device: 'Desktop', browser: 'Safari', referrer: 'Twitter', currentUrl: '/', sessionTime: '3 min 33 sec', totalVisits: 1, conversionLikelihood: 49, estimatedValue: 0.08, top: 50, left: 18, dotColor: '#f59e0b' },
  { id: 'v15', name: 'sofia r',        avatarSeed: 'sofia',    countryFlag: flag('ph'), countryName: 'Philippines', city: 'Manila, PH', os: 'iOS', device: 'Mobile', browser: 'Safari', referrer: 'Google', currentUrl: '/startup/sorio-ai', sessionTime: '6 min 12 sec', totalVisits: 2, conversionLikelihood: 67, estimatedValue: 0.20, top: 55, left: 80, dotColor: '#a855f7' },
];

// "What's happening?" feed
export interface WhatsHappeningPost {
  id: string;
  founderHandle: string;
  startupName: string;
  startupSlug: string;
  timestamp: string;
  text: string;
  /** Feed phrasing: "X added …" vs "X on …" */
  action?: 'added' | 'on';
  hasImage?: boolean;
  imageGradient?: string;
  imageCaption?: string;
  likes: number;
  comments: number;
}

export const whatsHappeningPosts: WhatsHappeningPost[] = [
  { id: 'p1',  founderHandle: 'ianmarco', startupName: 'Sacred: Bible',  startupSlug: 'sacred-bible',  timestamp: '3h',  text: "Forgot to mention, the app is also live on Android (not marketed yet, so there's room to turn that on). We also have a blog with 800+ posts across English, Spanish and Portuguese, built for SEO and GEO. Already starting to pick up traction. thesacredapp.com/blog",  likes: 0, comments: 0 },
  { id: 'p2',  founderHandle: 'ianmarco', startupName: 'Sacred: Bible',  startupSlug: 'sacred-bible',  timestamp: '3h',  text: 'Hey everyone — Had some great conversations with a few of you over the weekend, appreciate the interest and the thoughtful questions. Show more', likes: 0, comments: 0 },
  { id: 'p3',  founderHandle: 'yujiueki', startupName: 'Deariary',       startupSlug: 'mock-0',        timestamp: '11h', text: "New Article! blog.deariary.com/posts/2026-04-21-what-... — What did I do today? Let your apps answer.", hasImage: true, imageGradient: 'linear-gradient(135deg,#f5f1e8,#e8e2d4)', imageCaption: 'What did I do today?', likes: 1, comments: 0 },
  { id: 'p4',  founderHandle: 'mrtars',   startupName: 'Shortgram',      startupSlug: 'mock-1',        timestamp: '13h', text: "Hey! I'm transforming Shortgram to a fully-autonomous faceless channel generator. From 0 to monetization! and... and with mcp for OpenClaw or Claude Code. Wooooooohooooo", likes: 0, comments: 0 },
  { id: 'p5',  founderHandle: 'gopal',    startupName: 'QuickClip',      startupSlug: 'mock-2',        timestamp: '13h', text: "You copy stuff all day, make it easier. QuickClip keeps it synced everywhere. Simple win.", likes: 1, comments: 0 },
  { id: 'p6',  founderHandle: 'gopal',    startupName: 'QuickClip',      startupSlug: 'mock-2',        timestamp: '9h',  text: "No more sending yourself messages. QuickClip replaces all that. Try it once.", likes: 1, comments: 0 },
  { id: 'p7',  founderHandle: 'caitlin',  startupName: 'PicX Studio (FOR SALE)', startupSlug: 'mock-3', timestamp: '8h',  action: 'on', text: "I'm running three agents in parallel, shipping new features very fast.", hasImage: true, imageGradient: 'linear-gradient(135deg,#0a0a0a,#1a1a1a)', imageCaption: 'terminal output', likes: 1, comments: 0 },
  { id: 'p8',  founderHandle: 'julien',   startupName: 'Shipmail',       startupSlug: 'mock-4',        timestamp: '16h', text: "Some users on Shipmail were recording their screen and didn't want to show their main email\n\nSo I just added a feature to hide it whenever you want :)", hasImage: true, imageGradient: 'linear-gradient(135deg,#1a1a1d,#2a2a2d)', imageCaption: 'Demo User', likes: 2, comments: 0 },
  { id: 'p9',  founderHandle: 'ugo',      startupName: 'Adventory',      startupSlug: 'mock-5',        timestamp: '19h', text: "We're actively looking for publishers with NA and EU audiences to monetize their apps! If you have a free app or open source project you'd like to monetize, check Adventory out, and get paid monthly. We currently offer 100% fill rate.", likes: 0, comments: 0 },
  { id: 'p10', founderHandle: 'kered',    startupName: 'ClearFeedback',  startupSlug: 'mock-6',        timestamp: '21h', text: "Collect feedback directly on your site with clearfeedback.io", hasImage: true, imageGradient: 'linear-gradient(135deg,#fef3c7,#fde68a)', imageCaption: 'Collect feedback directly on your site', likes: 0, comments: 0 },
  { id: 'p11', founderHandle: 'robbyf',   startupName: 'CursorClip',     startupSlug: 'cursorclip',    timestamp: '5h',  text: "Just shipped a new export option — 4K clean cursor recordings in under a minute. Check it out 👀", likes: 4, comments: 1 },
  { id: 'p12', founderHandle: 'alicew',   startupName: 'Sorio AI',       startupSlug: 'sorio-ai',      timestamp: '7h',  text: "Hit $12.5k MRR this month. Slow but steady. Going to focus on B2B SEO next.", likes: 8, comments: 2 },
];

// Categories for the bottom section
export const browseCategories = [
  { label: 'Artificial Intelligence', icon: 'Brain' },
  { label: 'SaaS', icon: 'Package' },
  { label: 'Developer Tools', icon: 'Terminal' },
  { label: 'Fintech', icon: 'Banknote' },
  { label: 'Productivity', icon: 'CheckSquare' },
  { label: 'Marketing', icon: 'Megaphone' },
  { label: 'E-commerce', icon: 'ShoppingBag' },
  { label: 'Design Tools', icon: 'Palette' },
  { label: 'No-Code', icon: 'Layers' },
  { label: 'Analytics', icon: 'BarChart3' },
  { label: 'Education', icon: 'GraduationCap' },
  { label: 'Health & Fitness', icon: 'HeartPulse' },
  { label: 'Social Media', icon: 'Share2' },
  { label: 'Content Creation', icon: 'PenLine' },
  { label: 'Sales', icon: 'TrendingUp' },
  { label: 'Customer Support', icon: 'Headphones' },
  { label: 'Recruiting & HR', icon: 'Users' },
  { label: 'Real Estate', icon: 'Home' },
  { label: 'Travel', icon: 'Plane' },
  { label: 'Security', icon: 'Shield' },
];
