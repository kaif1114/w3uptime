"use client";

import { useState } from "react";
import { ValidatorDashboardData, WithdrawalRequest } from "@/types/validator";
import { useWithdrawalRequest } from "@/hooks/useValidatorDashboard";
import BalanceOverview from "./BalanceOverview";
import ValidationsSummary from "./ValidationsSummary";
import WithdrawalsSection from "./WithdrawalsSection";
import TransactionsList from "./TransactionsList";

interface ValidatorDashboardClientProps {
  initialData: ValidatorDashboardData;
}

export default function ValidatorDashboardClient({
  initialData,
}: ValidatorDashboardClientProps) {
  const [dashboardData, setDashboardData] =
    useState<ValidatorDashboardData>(initialData);
  const withdrawalRequestMutation = useWithdrawalRequest();

  const handleWithdrawalRequest = async (amount: number) => {
    try {
      const newWithdrawal = await withdrawalRequestMutation.mutateAsync(amount);

      // Update local state with new withdrawal
      setDashboardData((prev) => ({
        ...prev,
        recentWithdrawals: [newWithdrawal, ...prev.recentWithdrawals],
        balance: {
          ...prev.balance,
          availableBalance: prev.balance.availableBalance - amount,
          pendingWithdrawals: prev.balance.pendingWithdrawals + amount,
        },
      }));
    } catch (error) {
      console.error("Withdrawal request failed:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <BalanceOverview balance={dashboardData.balance} />

      {/* Validations Summary */}
      <ValidationsSummary validationSummary={dashboardData.validationSummary} />

      {/* Withdrawals & Payments Section */}
      <WithdrawalsSection
        withdrawals={dashboardData.recentWithdrawals}
        onWithdrawalRequest={handleWithdrawalRequest}
        isLoading={withdrawalRequestMutation.isPending}
      />

      {/* Transaction History Section */}
      <TransactionsList transactions={dashboardData.recentTransactions} />
    </div>
  );
}
