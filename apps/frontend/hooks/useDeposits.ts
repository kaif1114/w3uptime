"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DepositHistoryResponse, DepositEvent } from 'common/types';

interface DepositHistoryParams {
  page?: number;
  limit?: number;
}

interface UseDepositHistoryOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useDepositHistory(
  params: DepositHistoryParams = {},
  options: UseDepositHistoryOptions = {}
) {
  const { page = 1, limit = 10 } = params;
  const { enabled = true, refetchInterval } = options;

  return useQuery({
    queryKey: ['deposits', 'history', page, limit],
    queryFn: async (): Promise<DepositHistoryResponse> => {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`/api/deposits?${searchParams}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch deposit history');
      }

      return response.json();
    },
    enabled,
    refetchInterval,
    staleTime: 1000 * 60 * 5, 
    gcTime: 1000 * 60 * 10 
  });
}

export function useProcessDepositEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: DepositEvent) => {
      const response = await fetch('/api/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WEBHOOK_SECRET || ''}`
        },
        body: JSON.stringify(eventData),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to process deposit event');
      }

      return response.json();
    },
    onSuccess: () => {
      
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      
      queryClient.invalidateQueries({ queryKey: ['session'] });
    }
  });
}

export function useRefreshDeposits() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['deposits'] });
    queryClient.invalidateQueries({ queryKey: ['user', 'balance'] });
    queryClient.invalidateQueries({ queryKey: ['session'] });
  };
}