"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface EditEscalationPolicyPageProps {
  policyId: string;
}

export function EditEscalationPolicyPage({ policyId }: EditEscalationPolicyPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/escalation-policies">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Escalation Policy</h1>
          <p className="text-muted-foreground">
            Modify the escalation policy settings and levels
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Policy: {policyId}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              The edit functionality is coming soon! For now, you can delete and recreate the policy.
            </p>
            <Button asChild>
              <Link href="/escalation-policies">
                Back to Policies
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
