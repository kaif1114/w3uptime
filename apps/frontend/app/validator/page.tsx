import { getSessionOnServer } from "@/lib/get-session-on-server";
import { redirect } from "next/navigation";
import ValidatorDashboardClient from "./components/ValidatorDashboardClient";

export default async function ValidatorDashboardPage() {
  const session = await getSessionOnServer();
  if (!session?.authenticated) {
    redirect("/login");
  }

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

      <ValidatorDashboardClient />
    </div>
  );
}
