import { useState, useCallback } from "react";
import { ValidatorDashboardData, WithdrawalRequest } from "@/types/validator";

// Mock withdrawal request function
export function useWithdrawalRequest() {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async (amount: number) => {
    setIsPending(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock successful response
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
