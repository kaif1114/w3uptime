import { Button } from "@/components/ui/button";
import { Plus, Users, Lightbulb, Settings } from "lucide-react";
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center space-x-3 p-4 rounded-lg border bg-card">
          <Lightbulb className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-sm font-medium">Feature Requests</p>
            <p className="text-xs text-muted-foreground">
              New functionality ideas
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 p-4 rounded-lg border bg-card">
          <Settings className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-sm font-medium">Change Requests</p>
            <p className="text-xs text-muted-foreground">
              Improvements to existing features
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 p-4 rounded-lg border bg-card">
          <Users className="h-5 w-5 text-purple-500" />
          <div>
            <p className="text-sm font-medium">Community Driven</p>
            <p className="text-xs text-muted-foreground">
              Vote and discuss proposals
            </p>
          </div>
        </div>
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
