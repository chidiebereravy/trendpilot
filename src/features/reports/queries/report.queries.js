"use client";

import { useQuery } from "@tanstack/react-query";

import { getReport } from "@/features/reports/api/report.api";
import { reportKeys } from "@/features/reports/queries/report.keys";

export function useReport(filters = {}, options = {}) {
  return useQuery({
    queryKey: reportKeys.list(filters),
    queryFn: () => getReport(filters),
    enabled: options.enabled ?? true,
    staleTime: 30 * 1000,
    retry: false,
  });
}
