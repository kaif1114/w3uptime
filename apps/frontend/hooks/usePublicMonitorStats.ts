import { useQuery } from "@tanstack/react-query";

export interface PublicMonitorStats {
  monitorId: string;
  period: string;
  uptime: number;
  responseTime: number | null;
  lastChecked: string | null;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
}

export interface UsePublicMonitorStatsParams {
  monitorId: string;
  period?: 'day' | 'week' | 'month';
  enabled?: boolean;
}

export function usePublicMonitorStats({
  monitorId,
  period = 'day',
  enabled = true,
}: UsePublicMonitorStatsParams) {
  return useQuery<PublicMonitorStats>({
    queryKey: ['public-monitor-stats', monitorId, period],
    queryFn: async () => {
      const response = await fetch(
        `/api/public/monitors/${monitorId}/stats?period=${period}`
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to fetch monitor stats');
      }

      return response.json();
    },
    enabled: enabled && !!monitorId,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60, // Refetch every 1 minute
  });
}
