import { getSessionOnServer } from "@/lib/GetSessionOnServer";
import { redirect } from "next/navigation";
import WithdrawalsSection from "../components/WithdrawalsSection";

export default async function WithdrawalPage() {
  const session = await getSessionOnServer();
  if (!session?.authenticated) {
    redirect("/");
  }

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

      <WithdrawalsSection />
    </div>
  );
}
