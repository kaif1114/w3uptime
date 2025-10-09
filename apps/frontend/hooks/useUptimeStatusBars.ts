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
  const expectedCount = period === "24h" ? 24 : period === "7d" ? 7 : 30;
  const timeUnit = period === "24h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000; 
  
  
  const dataMap = new Map<string, TimeSeriesPoint>();
  if (data && data.length > 0) {
    data.forEach(point => {
      const date = new Date(point.time_bucket);
      const dateKey = date.toISOString().split('T')[0]; 
      dataMap.set(dateKey, point);
    });
  }

  
  const bars: StatusBar[] = [];
  const now = new Date();
  
  for (let i = expectedCount - 1; i >= 0; i--) {
    
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - i);
    const dateKey = targetDate.toISOString().split('T')[0];
    
    const existingData = dataMap.get(dateKey);
    
    if (existingData) {
      
      bars.push({
        id: `data-${dateKey}`,
        timestamp: existingData.time_bucket,
        status: existingData.total_checks === 0 
          ? 'no-data' as const
          : existingData.uptime_percentage >= 95 
            ? 'up' as const 
            : 'down' as const,
        uptime_percentage: existingData.uptime_percentage || 0,
      });
    } else {
      
      bars.push({
        id: `no-data-${dateKey}`,
        timestamp: targetDate.toISOString(),
        status: 'no-data' as const,
        uptime_percentage: 0,
      });
    }
  }

  return bars;
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
    refetchInterval: 60000, 
    staleTime: 30000, 
  });
};