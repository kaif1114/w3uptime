import { getSessionOnServer } from "@/lib/get-session-on-server";
import { redirect } from "next/navigation";
import WithdrawalsSection from "../components/WithdrawalsSection";

export default async function WithdrawalPage() {
  const session = await getSessionOnServer();
  if (!session?.authenticated) {
    redirect("/login");
  }

  // Mock data for withdrawal page - in a real app, this would come from your API
  const mockWithdrawals = [
    {
      id: "1",
      amount: 50.0,
      status: "pending" as const,
      requestedAt: "2024-01-15T10:30:00Z",
      processedAt: undefined,
    },
    {
      id: "2",
      amount: 25.5,
      status: "completed" as const,
      requestedAt: "2024-01-10T14:20:00Z",
      processedAt: "2024-01-11T09:15:00Z",
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Withdrawal Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Request withdrawals from your validator earnings and track withdrawal
          history
        </p>
      </div>

      <WithdrawalsSection
        withdrawals={mockWithdrawals}
        isLoading={false}
      />
    </div>
  );
}
