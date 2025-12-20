import { useState, useCallback } from "react";
import { useQuery } from '@tanstack/react-query';
import { ValidatorDashboardData, WithdrawalRequest } from "@/types/validator";

export interface ValidatorDashboardResponse {
  balance: {
    totalEarnings: number;
    availableBalance: number;
    pendingWithdrawals: number;
    currency: string;
  };
  validationSummary: {
    totalValidations: number;
    successfulValidations: number;
    failedValidations: number;
    successRate: number;
    lastValidationDate: string;
  };
  recentTransactions: Array<{
    id: string;
    type: 'earnings' | 'withdrawal';
    amount: number;
    status: 'completed' | 'pending' | 'failed';
    date: string;
    description: string;
    transactionHash?: string;
  }>;
}

export function useValidatorDashboard() {
  return useQuery({
    queryKey: ['validator-dashboard'],
    queryFn: async (): Promise<ValidatorDashboardResponse> => {
      const response = await fetch('/api/validator/dashboard', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch validator dashboard data');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch validator dashboard data');
      }

      return result.data;
    },
    staleTime: 30000, 
    refetchInterval: 60000, 
  });
}


export function useWithdrawalRequest() {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async (amount: number) => {
    setIsPending(true);

    
    await new Promise((resolve) => setTimeout(resolve, 1000));

    
    const withdrawalRequest: WithdrawalRequest = {
      id: `wd_${Date.now()}`,
      amount,
      status: "pending",
      requestedAt: new Date().toISOString(),
    };

    setIsPending(false);
    return withdrawalRequest;
  }, []);

  return {
    mutateAsync,
    isPending,
  };
}
