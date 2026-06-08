export const marketplaceKeys = {
  all: ["marketplace"] as const,
  listings: () => [...marketplaceKeys.all, "listings"] as const,
  listing: (slug: string) => [...marketplaceKeys.all, "listing", slug] as const,
  bids: {
    mine: (userId: string) =>
      [...marketplaceKeys.all, "bids", "mine", userId] as const,
    startup: (slug: string) =>
      [...marketplaceKeys.all, "bids", "startup", slug] as const,
  },
  offers: {
    buyer: (userId: string) =>
      [...marketplaceKeys.all, "offers", "buyer", userId] as const,
    seller: (userId: string) =>
      [...marketplaceKeys.all, "offers", "seller", userId] as const,
    startup: (slug: string) =>
      [...marketplaceKeys.all, "offers", "startup", slug] as const,
    detail: (bidId: string) =>
      [...marketplaceKeys.all, "offers", "detail", bidId] as const,
  },
  interests: {
    mine: (userId: string) =>
      [...marketplaceKeys.all, "interests", "mine", userId] as const,
    startup: (slug: string) =>
      [...marketplaceKeys.all, "interests", "startup", slug] as const,
    seller: (userId: string) =>
      [...marketplaceKeys.all, "interests", "seller", userId] as const,
  },
  inbox: (userId: string) => [...marketplaceKeys.all, "inbox", userId] as const,
  messages: (conversationId: string) =>
    [...marketplaceKeys.all, "messages", conversationId] as const,
  claims: () => [...marketplaceKeys.all, "claims"] as const,
  claimStats: () => [...marketplaceKeys.all, "claim-stats"] as const,
};
