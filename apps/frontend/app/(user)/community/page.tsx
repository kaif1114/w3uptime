import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { CommunityGovernanceClient } from "./CommunityGovernanceClient";
import { ProposalsResponse } from "@/types/proposal";

async function fetchProposals(): Promise<ProposalsResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8000";

  try {
    const response = await fetch(
      `${baseUrl}/api/proposals?page=1&pageSize=10`,
      {
        cache: "no-store", // Ensure fresh data for governance
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch proposals");
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching proposals:", error);
    // Return empty data structure on error
    return {
      data: [],
      page: 1,
      pageSize: 10,
      total: 0,
    };
  }
}

export default async function CommunityGovernancePage() {
  const initialData = await fetchProposals();

  const header = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Community Governance
          </h1>
          <p className="text-muted-foreground">
            Shape the future of W3Uptime through community proposals and
            feedback.
          </p>
        </div>
        <Link href="/community/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Submit Proposal
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {header}
      <CommunityGovernanceClient initialData={initialData} />
    </div>
  );
}
