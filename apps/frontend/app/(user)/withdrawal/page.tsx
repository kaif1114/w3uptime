import { getSessionOnServer } from "@/lib/GetSessionOnServer";
import { redirect } from "next/navigation";
import ValidatorDashboardClient from "./components/ValidatorDashboardClient";

export default async function ValidatorDashboardPage() {
  const session = await getSessionOnServer();
  if (!session?.authenticated) {
    redirect("/");
  }

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Earnings & Withdrawals
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor your earnings and manage withdrawals
        </p>
      </div>

      <ValidatorDashboardClient />
    </div>
  );
}
