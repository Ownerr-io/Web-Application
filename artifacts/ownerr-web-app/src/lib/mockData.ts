/** Types and marketing-only content — startup catalog lives in Supabase (`marketplace/catalog`). */
export type {
  Category,
  Startup,
  StartupSeed,
  Founder,
  FeedEvent,
} from "@/lib/marketplace/types";
export type { SponsorCard, Visitor } from "@/lib/marketplace/marketingContent";

export {
  browseCategories,
  whatsHappeningPosts,
} from "@/lib/marketplace/marketingContent";
export type { WhatsHappeningPost } from "@/lib/marketplace/marketingContent";
export {
  PASTEL_COLORS,
  generateMonthlyRevenue,
  leaderboardMetricValue,
} from "@/lib/marketplace/utils";
export { buildFoundersFromStartups } from "@/lib/marketplace/founders";
