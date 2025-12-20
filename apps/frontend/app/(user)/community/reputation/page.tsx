import { Metadata } from "next";
import { ReputationPageClient } from "./ReputationPageClient";

export const metadata: Metadata = {
  title: "Reputation System | W3Uptime",
  description:
    "Track your earned reputation and claim it on-chain for governance participation",
};

export default function ReputationPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Reputation System</h1>
        <p className="text-muted-foreground">
          Track your earned reputation and claim it on-chain for governance
          participation
        </p>
      </div>
      <ReputationPageClient />
    </div>
  );
}
