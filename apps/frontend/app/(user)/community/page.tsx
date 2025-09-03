import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { CommunityGovernanceClient } from "./CommunityGovernanceClient";

export default function CommunityGovernancePage() {
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
      <CommunityGovernanceClient />
    </div>
  );
}
