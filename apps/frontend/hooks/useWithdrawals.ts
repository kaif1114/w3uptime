import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface WithdrawalRequest {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  requestedAt: string;
  processedAt?: string;
  transactionHash?: string;
}

export interface WithdrawalsResponse {
  withdrawals: WithdrawalRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  userBalance: number;
}

export interface WithdrawalSignature {
  signature: string;
  nonce: string;
  expiry: string;
  amount: string;
  userAddress: string;
}

export function useWithdrawals(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: ['withdrawals', page, limit],
    queryFn: async (): Promise<WithdrawalsResponse> => {
      const response = await fetch(`/api/withdrawals?page=${page}&limit=${limit}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch withdrawals');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch withdrawals');
      }

      return result.data;
    },
  });
}

export function useWithdrawalDetails(withdrawalId: string) {
  return useQuery({
    queryKey: ['withdrawal', withdrawalId],
    queryFn: async (): Promise<WithdrawalRequest> => {
      const response = await fetch(`/api/withdrawals/${withdrawalId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch withdrawal details');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch withdrawal details');
      }

      return result.data;
    },
    enabled: !!withdrawalId,
  });
}

export function useCreateWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number): Promise<{ withdrawalId: string; amount: number; status: string }> => {
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: amount.toString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create withdrawal request');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create withdrawal request');
      }

      return result.data;
    },
    onSuccess: () => {
      
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
    },
  });
}

export function useGetWithdrawalSignature() {
  return useMutation({
    mutationFn: async (withdrawalId: string): Promise<WithdrawalSignature> => {
      const response = await fetch(`/api/withdrawals/${withdrawalId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get withdrawal signature');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get withdrawal signature');
      }

      return result.data;
    },
  });
}