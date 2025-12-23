"use client";

import { useValidatorDashboard } from "@/hooks/useValidatorDashboard";
import BalanceOverview from "./BalanceOverview";
import ValidationsSummary from "./ValidationsSummary";
import WithdrawalsSection from "./WithdrawalsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function ValidatorDashboardClient() {
  const { data: dashboardData, isLoading, error } = useValidatorDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            Loading dashboard data...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Failed to load dashboard data. Please try refreshing the page.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <div className="space-y-6">
      <BalanceOverview balance={dashboardData.balance} />
      {dashboardData.validationSummary.totalValidations > 0 && (
        <ValidationsSummary validationSummary={dashboardData.validationSummary} />
      )}
      <WithdrawalsSection />
    </div>
  );
}
