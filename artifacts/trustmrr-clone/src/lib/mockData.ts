export type Category = 'Content Creation' | 'Mobile Apps' | 'SaaS' | 'Education' | 'Crypto & Web3' | 'Developer Tools' | 'Artificial Intelligence' | 'Health' | 'Marketing';

export interface Startup {
  slug: string;
  name: string;
  category: Category;
  revenue: number;
  price?: number;
  multiple?: number;
  forSale: boolean;
  founderHandle: string;
  description: string;
  monthlyRevenueSeries: { month: string; value: number }[];
  logoColor: string;
  foundedYear: number;
  ttmProfit?: number;
  customers: number;
  momGrowth: number;
}

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

export const PASTEL_COLORS = [
  '#FFE6F1', // pink
  '#E6EAFF', // lavender
  '#E6FFE8', // mint
  '#E6F5FF', // sky
  '#FFF8E6', // soft yellow
  '#F0E6FF', // lilac
  '#FFEEE6', // peach
];

function getRandomPastel() {
  return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
}

function generateMonthlyRevenue(currentMrr: number): { month: string; value: number }[] {
  const series = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let val = currentMrr * 0.3; // Start lower
  for (let i = 0; i < 12; i++) {
    // Add some jaggedness
    const variance = (Math.random() - 0.2) * 0.2; // -5% to +15%
    val = val * (1 + variance);
    if (i === 11) val = currentMrr; // Ensure last month is exact MRR
    series.push({ month: months[i], value: Math.round(val) });
  }
  return series;
}

export const mockStartups: Startup[] = [
  {
    slug: 'stan',
    name: 'Stan',
    category: 'Content Creation',
    revenue: 3569654,
    forSale: false,
    founderHandle: 'johndoe',
    description: 'The easiest way to make money as a creator. Stan is your all-in-one store.',
    monthlyRevenueSeries: generateMonthlyRevenue(3569654),
    logoColor: '#E6EAFF',
    foundedYear: 2020,
    customers: 45000,
    momGrowth: 12.5,
  },
  {
    slug: 'sorio-ai',
    name: 'Sorio AI',
    category: 'Artificial Intelligence',
    revenue: 12500,
    price: 250000,
    multiple: 1.6,
    forSale: true,
    founderHandle: 'alicew',
    description: 'AI-powered writing assistant for B2B marketers.',
    monthlyRevenueSeries: generateMonthlyRevenue(12500),
    logoColor: '#E6FFE8',
    foundedYear: 2023,
    ttmProfit: 95000,
    customers: 340,
    momGrowth: 8.2,
  },
  {
    slug: 'typefast',
    name: 'TypeFast',
    category: 'Developer Tools',
    revenue: 4500,
    price: 85000,
    multiple: 1.5,
    forSale: true,
    founderHandle: 'robbyf',
    description: 'Keyboard-first productivity tool for developers.',
    monthlyRevenueSeries: generateMonthlyRevenue(4500),
    logoColor: '#FFE6F1',
    foundedYear: 2022,
    ttmProfit: 35000,
    customers: 850,
    momGrowth: -2.1,
  },
  {
    slug: 'growthy',
    name: 'Growthy',
    category: 'Marketing',
    revenue: 85000,
    forSale: false,
    founderHandle: 'sarahj',
    description: 'Twitter growth automation platform.',
    monthlyRevenueSeries: generateMonthlyRevenue(85000),
    logoColor: '#E6F5FF',
    foundedYear: 2021,
    customers: 2100,
    momGrowth: 5.4,
  },
  {
    slug: 'learn-ui',
    name: 'LearnUI',
    category: 'Education',
    revenue: 32000,
    price: 550000,
    multiple: 1.4,
    forSale: true,
    founderHandle: 'marcdev',
    description: 'Video courses for developers learning UI design.',
    monthlyRevenueSeries: generateMonthlyRevenue(32000),
    logoColor: '#FFF8E6',
    foundedYear: 2019,
    ttmProfit: 210000,
    customers: 5600,
    momGrowth: 1.2,
  },
  {
    slug: 'fit-track',
    name: 'FitTrack',
    category: 'Health',
    revenue: 18500,
    forSale: false,
    founderHandle: 'janed',
    description: 'Minimalist habit and fitness tracker for iOS.',
    monthlyRevenueSeries: generateMonthlyRevenue(18500),
    logoColor: '#F0E6FF',
    foundedYear: 2022,
    customers: 12000,
    momGrowth: 18.5,
  },
  {
    slug: 'block-tax',
    name: 'BlockTax',
    category: 'Crypto & Web3',
    revenue: 145000,
    forSale: false,
    founderHandle: 'cryptodan',
    description: 'Automated crypto tax reporting for retail investors.',
    monthlyRevenueSeries: generateMonthlyRevenue(145000),
    logoColor: '#FFEEE6',
    foundedYear: 2021,
    customers: 18500,
    momGrowth: 0,
  },
  {
    slug: 'saas-boiler',
    name: 'SaaSBoiler',
    category: 'Developer Tools',
    revenue: 8900,
    price: 120000,
    multiple: 1.1,
    forSale: true,
    founderHandle: 'robbyf',
    description: 'Next.js boilerplate for fast shipping.',
    monthlyRevenueSeries: generateMonthlyRevenue(8900),
    logoColor: '#E6EAFF',
    foundedYear: 2023,
    ttmProfit: 85000,
    customers: 450,
    momGrowth: 22.1,
  },
  {
    slug: 'mail-genius',
    name: 'MailGenius',
    category: 'Marketing',
    revenue: 24000,
    price: 450000,
    multiple: 1.5,
    forSale: true,
    founderHandle: 'alicew',
    description: 'Cold email deliverability monitoring.',
    monthlyRevenueSeries: generateMonthlyRevenue(24000),
    logoColor: '#E6FFE8',
    foundedYear: 2020,
    ttmProfit: 180000,
    customers: 920,
    momGrowth: 4.5,
  },
  {
    slug: 'zen-journal',
    name: 'ZenJournal',
    category: 'Mobile Apps',
    revenue: 5200,
    forSale: false,
    founderHandle: 'janed',
    description: 'Private, encrypted daily journaling app.',
    monthlyRevenueSeries: generateMonthlyRevenue(5200),
    logoColor: '#FFE6F1',
    foundedYear: 2023,
    customers: 3400,
    momGrowth: 35.0,
  }
];

// Generate 20 more random startups
for (let i = 0; i < 20; i++) {
  const mrr = Math.floor(Math.random() * 50000) + 1000;
  const isForSale = Math.random() > 0.5;
  const price = isForSale ? mrr * 12 * (1 + Math.random() * 2) : undefined;
  
  mockStartups.push({
    slug: `startup-${i}`,
    name: `Startup ${i}`,
    category: ['SaaS', 'Mobile Apps', 'Developer Tools', 'Marketing'][Math.floor(Math.random() * 4)] as Category,
    revenue: mrr,
    price: price,
    multiple: price ? price / (mrr * 12) : undefined,
    forSale: isForSale,
    founderHandle: 'johndoe',
    description: 'A randomly generated startup for the mock database.',
    monthlyRevenueSeries: generateMonthlyRevenue(mrr),
    logoColor: getRandomPastel(),
    foundedYear: 2020 + Math.floor(Math.random() * 4),
    ttmProfit: isForSale ? mrr * 8 : undefined,
    customers: Math.floor(Math.random() * 5000) + 50,
    momGrowth: (Math.random() - 0.3) * 20, // -6% to +14%
  });
}

// Sort leaderboard by MRR descending
export const leaderboardStartups = [...mockStartups].sort((a, b) => b.revenue - a.revenue);

export const mockFounders: Founder[] = [
  {
    handle: 'johndoe',
    name: 'John Doe',
    twitter: '@johndoe',
    avatarSeed: 'johndoe',
    bio: 'Building things on the internet. Creator of Stan.',
    startupSlugs: ['stan', 'startup-0', 'startup-1'],
    skills: ['Engineering', 'Product'],
    lookingForCofounder: false,
  },
  {
    handle: 'alicew',
    name: 'Alice Wang',
    twitter: '@alicewang_dev',
    avatarSeed: 'alicew',
    bio: 'Marketing engineer. Sold 2 micro-SaaS.',
    startupSlugs: ['sorio-ai', 'mail-genius'],
    skills: ['Marketing', 'Sales', 'Engineering'],
    lookingForCofounder: true,
  },
  {
    handle: 'robbyf',
    name: 'Robby Frank',
    twitter: '@robbyfrank',
    avatarSeed: 'robbyf',
    bio: 'Shipping fast. I love Next.js and Tailwind.',
    startupSlugs: ['typefast', 'saas-boiler'],
    skills: ['Engineering', 'Design'],
    lookingForCofounder: true,
  },
  {
    handle: 'sarahj',
    name: 'Sarah Jenkins',
    twitter: '@sarahj_growth',
    avatarSeed: 'sarahj',
    bio: 'Growth hacker turned founder.',
    startupSlugs: ['growthy'],
    skills: ['Marketing', 'Growth'],
    lookingForCofounder: false,
  },
  {
    handle: 'marcdev',
    name: 'Marc Developer',
    twitter: '@marc_dev',
    avatarSeed: 'marcdev',
    bio: 'Design engineer sharing knowledge.',
    startupSlugs: ['learn-ui'],
    skills: ['Design', 'Engineering', 'Education'],
    lookingForCofounder: true,
  },
  {
    handle: 'janed',
    name: 'Jane Doe',
    twitter: '@janed_apps',
    avatarSeed: 'janed',
    bio: 'Indie iOS developer. Building calm apps.',
    startupSlugs: ['fit-track', 'zen-journal'],
    skills: ['Engineering', 'Mobile', 'Design'],
    lookingForCofounder: true,
  },
  {
    handle: 'cryptodan',
    name: 'Crypto Dan',
    twitter: '@cryptodan_xyz',
    avatarSeed: 'cryptodan',
    bio: 'Web3 builder.',
    startupSlugs: ['block-tax'],
    skills: ['Engineering', 'Web3', 'Finance'],
    lookingForCofounder: false,
  }
];

export const mockFeedEvents: FeedEvent[] = [
  { id: '1', timestamp: '2 hours ago', content: 'Sorio AI listed for $25k' },
  { id: '2', timestamp: '5 hours ago', content: 'Stan crossed $3.5M MRR' },
  { id: '3', timestamp: '1 day ago', content: 'New verified founder: Robby Frank' },
  { id: '4', timestamp: '1 day ago', content: 'TypeFast MRR verified at $4.5k' },
  { id: '5', timestamp: '2 days ago', content: 'Growthy listed for sale' },
  { id: '6', timestamp: '3 days ago', content: 'New verified founder: Alice Wang' },
];

export const sponsorCards = [
  { name: 'Virlo', desc: 'AI video generation', color: '#FFE6F1' },
  { name: 'Context.dev', desc: 'Search for your codebase', color: '#E6EAFF' },
  { name: 'xCloud', desc: 'Managed cloud hosting', color: '#E6FFE8' },
  { name: 'ProvenTools', desc: 'Curated developer tools', color: '#E6F5FF' },
  { name: 'Handoff', desc: 'Design to code made easy', color: '#FFF8E6' },
  { name: 'AdKit', desc: 'Sponsorship management', color: '#F0E6FF' },
  { name: 'Replymer', desc: 'Automated email replies', color: '#FFEEE6' },
  { name: 'Master Claude', desc: 'Learn prompt engineering', color: '#FFE6F1' },
  { name: 'Chargeback.io', desc: 'Prevent Stripe disputes', color: '#E6EAFF' },
];