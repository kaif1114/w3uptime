import { useState, useEffect } from 'react';
import { DailyStatusHistoryResponse } from '@/types/monitor';

interface UseDailyStatusProps {
  monitorId: string;
  period?: '7d' | '30d' | '90d';
  isPublic?: boolean;
  enabled?: boolean;
}

interface UseDailyStatusReturn {
  data: DailyStatusHistoryResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useDailyStatus = ({
  monitorId,
  period = '30d',
  isPublic = false,
  enabled = true
}: UseDailyStatusProps): UseDailyStatusReturn => {
  const [data, setData] = useState<DailyStatusHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!enabled || !monitorId) return;

    setIsLoading(true);
    setError(null);

    try {
      const baseUrl = isPublic 
        ? `/api/public/monitors/${monitorId}/daily-status`
        : `/api/monitors/${monitorId}/daily-status`;
      
      const url = new URL(baseUrl, window.location.origin);
      url.searchParams.set('period', period);
      
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Failed to fetch daily status: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching daily status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [monitorId, period, isPublic, enabled]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  };
};
