import { useRpc } from "@getpaseo/plugin/client";
import { useQuery } from "@tanstack/react-query";
import { reviewsRpc } from "../shared/reviews";

export const REVIEWS_QUERY_KEY = ["review-queue"];
// Every refetch is one GitHub GraphQL call; the sidebar count and the screen share this one query.
const REFRESH_MS = 2 * 60 * 1000;

export function useReviews() {
  const list = useRpc(reviewsRpc);
  return useQuery({
    queryKey: REVIEWS_QUERY_KEY,
    queryFn: () => list({}),
    refetchInterval: REFRESH_MS,
    staleTime: 30 * 1000,
  });
}
