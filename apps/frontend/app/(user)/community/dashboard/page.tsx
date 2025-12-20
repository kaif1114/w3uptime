import { Metadata } from "next";
import { TransparencyDashboard } from "./TransparencyDashboard";

export const metadata: Metadata = {
  title: "Governance Transparency Dashboard | W3Uptime",
  description:
    "View all on-chain governance proposals with blockchain verification and real-time voting data",
  openGraph: {
    title: "Governance Transparency Dashboard",
    description: "Transparent, blockchain-verified governance for W3Uptime",
  },
};

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <TransparencyDashboard />
    </div>
  );
}
