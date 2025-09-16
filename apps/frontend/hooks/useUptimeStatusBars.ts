import { useQuery } from '@tanstack/react-query';

interface StatusBar {
  id: string;
  timestamp: string;
  status: 'up' | 'down' | 'no-data';
  uptime_percentage: number;
}

interface TimeSeriesPoint {
  time_bucket: string;
  avg_latency: number;
  uptime_percentage: number;
  total_checks: number;
}

interface TimeSeriesResponse {
  monitorId: string;
  period: string;
  data: TimeSeriesPoint[];
  generatedAt: string;
}

const mapPeriodToTimescaleDB = (period: "24h" | "7d" | "30d"): string => {
  switch (period) {
    case "24h":
      return "day";
    case "7d":
      return "week";
    case "30d":
      return "month";
    default:
      return "day";
  }
};

const transformTimeSeriesToStatusBars = (
  data: TimeSeriesPoint[], 
  period: "24h" | "7d" | "30d"
): StatusBar[] => {
  if (!data || data.length === 0) {
    // Return empty bars for the expected count
    const emptyCount = period === "24h" ? 24 : period === "7d" ? 7 : 30;
    return Array.from({ length: emptyCount }, (_, i) => ({
      id: `empty-${i}`,
      timestamp: new Date().toISOString(),
      status: 'no-data' as const,
      uptime_percentage: 0,
    }));
  }

  return data.map((point, index) => ({
    id: `${point.time_bucket}-${index}`,
    timestamp: point.time_bucket,
    status: point.total_checks === 0 
      ? 'no-data' as const
      : point.uptime_percentage >= 95 
        ? 'up' as const 
        : 'down' as const,
    uptime_percentage: point.uptime_percentage || 0,
  }));
};

export const useUptimeStatusBars = (
  monitorId: string, 
  period: "24h" | "7d" | "30d"
) => {
  return useQuery<StatusBar[], Error>({
    queryKey: ['uptime-status-bars', monitorId, period],
    queryFn: async (): Promise<StatusBar[]> => {
      if (!monitorId) {
        throw new Error('Monitor ID is required');
      }

      const timescaleDbPeriod = mapPeriodToTimescaleDB(period);
      const response = await fetch(
        `/api/public/monitors/${monitorId}/timeseries?period=${timescaleDbPeriod}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch status bars data: ${response.statusText}`);
      }

      const result: TimeSeriesResponse = await response.json();
      return transformTimeSeriesToStatusBars(result.data, period);
    },
    enabled: !!monitorId,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Data is fresh for 30 seconds
  });
};