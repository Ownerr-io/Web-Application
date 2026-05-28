import { useQuery } from "@tanstack/react-query";
import { fetchPublicStartups } from "@/lib/marketplace/catalog";

export function publicStartupsQueryKey() {
  return ["marketplace", "startups", "public"] as const;
}

export function usePublicStartups() {
  return useQuery({
    queryKey: publicStartupsQueryKey(),
    queryFn: fetchPublicStartups,
    staleTime: 60_000,
  });
}
