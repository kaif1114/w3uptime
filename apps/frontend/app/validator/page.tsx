import { ValidatorDashboardData } from "@/types/validator";
import ValidatorDashboardClient from "./components/ValidatorDashboardClient";

// Mock data for development - replace with actual API calls
async function getValidatorDashboardData(): Promise<ValidatorDashboardData> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  return {
    balance: {
      totalEarnings: 1250.75,
      availableBalance: 850.25,
      pendingWithdrawals: 150.5,
      currency: "ETH",
    },
    validationSummary: {
      totalValidations: 1247,
      successfulValidations: 1198,
      failedValidations: 49,
      successRate: 96.1,
      lastValidationDate: "2024-01-15T10:30:00Z",
    },
    recentWithdrawals: [
      {
        id: "wd_001",
        amount: 200.0,
        status: "completed",
        requestedAt: "2024-01-10T14:20:00Z",
        processedAt: "2024-01-11T09:15:00Z",
        transactionHash: "0x1234567890abcdef...",
      },
      {
        id: "wd_002",
        amount: 150.5,
        status: "pending",
        requestedAt: "2024-01-14T16:45:00Z",
      },
    ],
    recentTransactions: [
      {
        id: "tx_001",
        type: "earnings",
        amount: 25.75,
        status: "completed",
        date: "2024-01-15T10:30:00Z",
        description: "Validation reward for block #1234567",
        transactionHash: "0xabcdef1234567890...",
      },
      {
        id: "tx_002",
        type: "earnings",
        amount: 18.5,
        status: "completed",
        date: "2024-01-15T08:15:00Z",
        description: "Validation reward for block #1234566",
        transactionHash: "0x9876543210fedcba...",
      },
      {
        id: "tx_003",
        type: "withdrawal",
        amount: -200.0,
        status: "completed",
        date: "2024-01-11T09:15:00Z",
        description: "Withdrawal to wallet",
        transactionHash: "0x1234567890abcdef...",
      },
      {
        id: "tx_004",
        type: "earnings",
        amount: 22.25,
        status: "completed",
        date: "2024-01-14T22:45:00Z",
        description: "Validation reward for block #1234565",
        transactionHash: "0xfedcba0987654321...",
      },
      {
        id: "tx_005",
        type: "earnings",
        amount: 19.8,
        status: "pending",
        date: "2024-01-15T12:00:00Z",
        description: "Validation reward for block #1234568",
      },
    ],
  };
}

export default async function ValidatorDashboardPage() {
  const dashboardData = await getValidatorDashboardData();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Validator Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor your validator performance, earnings, and manage withdrawals
        </p>
      </div>

      <ValidatorDashboardClient initialData={dashboardData} />
    </div>
  );
}
