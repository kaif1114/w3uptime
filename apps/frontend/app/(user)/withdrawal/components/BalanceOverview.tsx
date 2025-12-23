"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { ValidatorBalance } from "@/types/validator";
import { Clock, TrendingUp, Wallet } from "lucide-react";

interface BalanceOverviewProps {
  balance: ValidatorBalance;
}

export default function BalanceOverview({ balance }: BalanceOverviewProps) {
  const formatAmount = (amount: number) => {
    return `${amount.toFixed(4)} ${balance.currency}`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatAmount(balance.totalEarnings)}
          </div>
          <p className="text-xs text-muted-foreground">
            Lifetime validator earnings
          </p>
        </CardContent>
      </Card>

      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Available Balance
          </CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatAmount(balance.availableBalance)}
          </div>
          <p className="text-xs text-muted-foreground">Ready for withdrawal</p>
        </CardContent>
      </Card>

      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Pending Withdrawals
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {formatAmount(balance.pendingWithdrawals)}
          </div>
          <p className="text-xs text-muted-foreground">Awaiting processing</p>
        </CardContent>
      </Card>
    </div>
  );
}
