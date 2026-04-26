import { mockFounders, type Startup } from "@/lib/mockData";
import type { MockBidderOption } from "@/lib/mockBiddingTypes";

export function getMockBidders(): MockBidderOption[] {
  return mockFounders.map((f) => ({ userId: f.handle, name: f.name }));
}

export function bidderDisplayName(userId: string): string {
  const f = mockFounders.find((x) => x.handle === userId);
  return f?.name ?? userId;
}

export function listingBasePrice(startup: Startup): number {
  if (startup.price != null && startup.price > 0) return startup.price;
  return Math.max(500, Math.round(startup.revenue * 0.25));
}
