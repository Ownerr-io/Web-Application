import type { Founder, Startup } from '@/lib/mockData';

export interface StartupDetailDailyPoint {
  label: string;
  prevLabel: string;
  current: number;
  prev: number;
  charges: number;
}

export interface StartupDetailRich {
  foundedLabel: string;
  allTimeRevenue: number;
  leaderboardRank: number;
  mrrDisplay: number;
  activeSubscriptions: number;
  buyersViewed: number;
  offersReceived: number;
  chartPeriodTotal: number;
  chartVsPrevPct: number;
  chartMetricLabel: string;
  verifiedProvider: 'paddle' | 'stripe';
  lastUpdated: string;
  visitUrl: string;
  dailyChart: StartupDetailDailyPoint[];
  insights: {
    valueProposition: string;
    problemSolved: string;
    pricing: string;
    targetAudience: string;
    businessPills: string[];
    userCountLabel: string;
    additionalInfo: string;
    tags: string[];
  };
  techStack: {
    frontend: string[];
    backend: string[];
  };
  founderQuote: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function slugHash(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
}

function formatChartDay(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** ~28 daily points scaled to `targetSum`, deterministic per slug. */
export function buildSyntheticDailyChart(slug: string, targetSum: number): StartupDetailDailyPoint[] {
  const n = 28;
  let h = slugHash(slug) || 1;
  const next = (): number => {
    h = (h * 1103515245 + 12345) >>> 0;
    return h / 4294967296;
  };
  const raw: number[] = [];
  for (let i = 0; i < n; i++) {
    const base = 70 + Math.sin(i / 3.5) * 45 + next() * 95;
    raw.push(Math.max(35, Math.round(base)));
  }
  const sum = raw.reduce((a, b) => a + b, 0);
  const scaled = raw.map((v) => Math.round((v / sum) * Math.max(1, targetSum)));
  const drift = Math.max(1, targetSum) - scaled.reduce((a, b) => a + b, 0);
  scaled[n - 1] = Math.max(0, scaled[n - 1] + drift);

  const end = new Date();
  const out: StartupDetailDailyPoint[] = [];
  for (let i = 0; i < n; i++) {
    const day = new Date(end);
    day.setDate(end.getDate() - (n - 1 - i));
    const prevDay = new Date(day);
    prevDay.setMonth(day.getMonth() - 1);
    const charges = 1 + Math.floor(next() * 4);
    const cur = scaled[i];
    const prev = Math.max(15, Math.round(cur * (0.36 + next() * 0.26)));
    out.push({
      label: formatChartDay(day),
      prevLabel: formatChartDay(prevDay),
      current: cur,
      prev,
      charges,
    });
  }
  return out;
}

function formatCompactUsers(n: number): string {
  if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)}M users`;
  if (n >= 10_000) return `~${Math.round(n / 1000)}k users`;
  if (n >= 1000) return `~${(n / 1000).toFixed(1)}k users`;
  return `~${n} users`;
}

function defaultTechForCategory(category: string): { frontend: string[]; backend: string[] } {
  const c = category.toLowerCase();
  const fe = ['React', 'TypeScript', 'Tailwind CSS'];
  if (c.includes('mobile')) {
    return {
      frontend: ['React Native', 'TypeScript'],
      backend: ['Node.js', 'PostgreSQL', 'AWS', 'Redis', 'Stripe'],
    };
  }
  if (c.includes('artificial') || c.includes('ai')) {
    return {
      frontend: [...fe],
      backend: ['OpenAI', 'Node.js', 'PostgreSQL', 'Redis', 'Vercel', 'Stripe'],
    };
  }
  if (c.includes('crypto') || c.includes('web3')) {
    return {
      frontend: [...fe],
      backend: ['Node.js', 'PostgreSQL', 'Redis', 'Alchemy', 'Solidity tooling'],
    };
  }
  return {
    frontend: [...fe],
    backend: ['Node.js', 'PostgreSQL', 'Redis', 'AWS', 'Stripe', 'Docker'],
  };
}

function deepMergeDetail(base: StartupDetailRich, patch: Partial<StartupDetailRich>): StartupDetailRich {
  const insights = patch.insights ? { ...base.insights, ...patch.insights } : base.insights;
  const techStack = patch.techStack ? { ...base.techStack, ...patch.techStack } : base.techStack;
  return {
    ...base,
    ...patch,
    insights,
    techStack,
  };
}

function buildDefaultDetail(startup: Startup, founder: Founder | undefined, leaderboardRank: number): StartupDetailRich {
  const h = slugHash(startup.slug);
  const peak = startup.peakMrr ?? startup.revenue;
  const allTimeRevenue = Math.max(
    Math.round(peak * 12 * (1.15 + (h % 20) / 100)),
    Math.round(startup.revenue * 18),
  );
  const mrrDisplay = startup.revenue;
  const activeSubscriptions = Math.max(8, Math.round(startup.customers * (0.06 + (h % 8) / 200)));
  const buyersViewed =
    startup.listingViews ?? Math.max(100, Math.round(startup.customers * (6 + (h % 5)) + (h % 400)));
  const offersReceived = startup.listingFavorites ?? Math.max(1, (h % 9) + 2);

  const foundedMonth = MONTHS[h % 12];
  const foundedLabel = `${foundedMonth} ${startup.foundedYear}`;

  const chartTarget = Math.max(
    1,
    Math.round(startup.revenue * (0.55 + ((h >> 3) % 15) / 100)),
  );
  const dailyChart = buildSyntheticDailyChart(startup.slug, chartTarget);
  const chartPeriodTotal = dailyChart.reduce((s, d) => s + d.current, 0);

  let chartVsPrevPct = startup.revenueGrowth30dPct ?? null;
  if (chartVsPrevPct == null) {
    chartVsPrevPct = Math.round(startup.momGrowth * 0.85 + ((h % 11) - 5));
    chartVsPrevPct = Math.max(-18, Math.min(28, chartVsPrevPct));
  }

  const visitUrl = `https://${startup.slug.replace(/[^a-z0-9-]/gi, '')}.example`;

  const c = startup.category.toLowerCase();
  const categoryTag = startup.category;
  const tags = Array.from(
    new Set([
      categoryTag,
      'SaaS',
      c.includes('mobile') ? 'Mobile' : 'Product',
      startup.slug.length > 3 ? startup.slug.slice(0, 1).toUpperCase() + startup.slug.slice(1, 8) : 'Startup',
    ]),
  ).filter(Boolean);
  const b2b = !c.includes('consumer') && !c.includes('b2c');
  const businessPills = b2b ? ['B2B', 'SaaS'] : ['B2C', 'Product'];

  const techStack = defaultTechForCategory(startup.category);

  const lastUpdated = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const verifiedProvider: 'paddle' | 'stripe' = h % 2 === 0 ? 'stripe' : 'paddle';

  return {
    foundedLabel,
    allTimeRevenue,
    leaderboardRank,
    mrrDisplay,
    activeSubscriptions,
    buyersViewed,
    offersReceived,
    chartPeriodTotal,
    chartVsPrevPct,
    chartMetricLabel: 'Revenue',
    verifiedProvider,
    lastUpdated,
    visitUrl,
    dailyChart,
    insights: {
      valueProposition: startup.description,
      problemSolved: `${startup.name} addresses operational gaps for teams in ${startup.category.toLowerCase()}: faster workflows, clearer metrics, and less manual overhead.`,
      pricing:
        'Pricing is shared with serious buyers after introduction. Many listings use tiered plans from starter to scale—ask the seller for the latest structure.',
      targetAudience: `Operators and teams buying in ${startup.category.toLowerCase()}.`,
      businessPills,
      userCountLabel: formatCompactUsers(startup.customers),
      additionalInfo: founder
        ? `Verified founder listing on TrustMRR. ${founder.lookingForCofounder ? 'Open to strategic partners.' : ''}`
        : 'Community-verified metrics on TrustMRR.',
      tags,
    },
    techStack,
    founderQuote:
      founder?.bio ??
      `Looking for the right buyer to take ${startup.name} further—the product is solid; it needs focused distribution and sales.`,
  };
}

/** Optional per-slug overrides merged on top of generated defaults (e.g. curated Chatwith copy). */
const STARTUP_DETAIL_OVERRIDES: Partial<Record<string, Partial<StartupDetailRich>>> = {
  chatwith: {
    foundedLabel: 'September 2023',
    allTimeRevenue: 110_967,
    leaderboardRank: 314,
    mrrDisplay: 5984,
    activeSubscriptions: 65,
    buyersViewed: 3751,
    offersReceived: 10,
    chartPeriodTotal: 4807,
    chartVsPrevPct: -5,
    verifiedProvider: 'paddle',
    lastUpdated: 'Apr 22, 2026, 12:36 PM',
    visitUrl: 'https://chatwith.example',
    dailyChart: (() => {
      const target = 4807;
      const n = 28;
      let h = 42;
      const next = (): number => {
        h = (h * 1103515245 + 12345) >>> 0;
        return h / 4294967296;
      };
      const raw: number[] = [];
      for (let i = 0; i < n; i++) {
        const base = 85 + Math.sin(i / 4) * 55 + next() * 100;
        raw.push(Math.max(45, Math.round(base)));
      }
      const sum = raw.reduce((a, b) => a + b, 0);
      const scaled = raw.map((v) => Math.round((v / sum) * target));
      scaled[n - 1] += target - scaled.reduce((a, b) => a + b, 0);
      const start = new Date(2026, 2, 26);
      const out: StartupDetailDailyPoint[] = [];
      for (let i = 0; i < n; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        const prevDay = new Date(day);
        prevDay.setMonth(day.getMonth() - 1);
        const charges = 1 + Math.floor(next() * 4);
        const cur = scaled[i];
        const prev = Math.max(20, Math.round(cur * (0.38 + next() * 0.22)));
        out.push({
          label: formatChartDay(day),
          prevLabel: formatChartDay(prevDay),
          current: cur,
          prev,
          charges,
        });
      }
      return out;
    })(),
    insights: {
      valueProposition:
        'White-label AI chatbots your clients will love. Build, brand, and resell—no code required.',
      problemSolved:
        'Solve the problem of not being able to provide 24/7 customer assistance and multilingual support, as well as the need for easy integration and customization of AI chatbots.',
      pricing: 'Hobby: $19/month, Standard: $99/month, Business: $399/month',
      targetAudience: 'AI agencies',
      businessPills: ['B2B'],
      userCountLabel: '~9,107 users',
      additionalInfo: 'Made in the EU',
      tags: ['Customer Support', 'AI', 'Saas', 'No Code', 'Ecommerce'],
    },
    techStack: {
      frontend: ['Next.js', 'Tailwind CSS', 'TypeScript'],
      backend: [
        'Anthropic',
        'Cloudflare',
        'Node.js',
        'OpenAI',
        'Pinecone',
        'Prisma',
        'PostgreSQL',
        'Supabase',
        'Vercel',
        'Redis',
      ],
    },
    founderQuote:
      'No time to grow it. It receives inbound B2B leads but I have no capacity to handle the sales process.',
  },
};

export function getStartupDetailModel(
  startup: Startup,
  founder: Founder | undefined,
  leaderboardRank: number,
): StartupDetailRich {
  const base = buildDefaultDetail(startup, founder, leaderboardRank);
  const patch = STARTUP_DETAIL_OVERRIDES[startup.slug];
  return patch ? deepMergeDetail(base, patch) : base;
}
