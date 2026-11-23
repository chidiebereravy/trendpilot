import { useQuery } from "@tanstack/react-query";

import { getDashboardAnalytics } from "@/features/analytics/api/analytics.api";
import { analyticsKeys } from "@/features/analytics/queries/analytics.keys";

export function useDashboardAnalytics(range = "30d") {
  return useQuery({
    queryKey: analyticsKeys.detail(range),
    queryFn: () => getDashboardAnalytics(range),
    staleTime: 30 * 1000,
    retry: false,
  });
}
