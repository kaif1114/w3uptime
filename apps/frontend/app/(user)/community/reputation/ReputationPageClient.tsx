"use client";

import { ReputationDisplay } from "@/components/governance/ReputationDisplay";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, Shield, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

export function ReputationPageClient() {
  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Reputation is earned through validator activities and platform usage.
          Claim it on-chain to participate in governance (voting requires 50
          REP, proposals require 500 REP).
        </AlertDescription>
      </Alert>

      {/* Main Reputation Display */}
      <ReputationDisplay />

      {/* How to Earn Reputation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            How to Earn Reputation
          </CardTitle>
          <CardDescription>
            Build your reputation through active participation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Validator Activities</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Successful signature validations: +1 point each</li>
              <li>• Successful uptime checks: +1 point each</li>
              <li>• Failed validations: -2 points penalty</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Platform Usage</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Active monitors: +20 points per monitor</li>
              <li>• Platform deposits: Up to +3 points based on amount</li>
              <li>• Account age: +5 points per day</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Governance Thresholds Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Governance Requirements
          </CardTitle>
          <CardDescription>
            Minimum reputation needed for governance actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm">Vote on Proposals</span>
              <span className="font-medium">50 REP</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm">Comment on Proposals</span>
              <span className="font-medium">100 REP</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Create Proposals</span>
              <span className="font-medium">500 REP</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back to Community Link */}
      <div className="flex justify-center pt-4">
        <Link
          href="/community"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <Users className="h-4 w-4" />
          Back to Community
        </Link>
      </div>
    </div>
  );
}
