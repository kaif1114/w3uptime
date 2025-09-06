"use client";

import { useState } from "react";
import { ValidatorDashboardData, WithdrawalRequest } from "@/types/validator";
import { useWithdrawalRequest } from "@/hooks/useValidatorDashboard";
import BalanceOverview from "./BalanceOverview";
import ValidationsSummary from "./ValidationsSummary";
import WithdrawalsSection from "./WithdrawalsSection";
import TransactionsList from "./TransactionsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

      {/* Main Content Tabs */}
      <Tabs defaultValue="withdrawals" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="withdrawals">Withdrawals & Payments</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawals" className="space-y-4">
          <WithdrawalsSection
            withdrawals={dashboardData.recentWithdrawals}
            onWithdrawalRequest={handleWithdrawalRequest}
            isLoading={withdrawalRequestMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <TransactionsList transactions={dashboardData.recentTransactions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
