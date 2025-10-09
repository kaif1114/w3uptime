"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEscalationPolicy } from "@/hooks/useEscalationPolicies";
import { AlertTriangle, ArrowLeft, Edit, Mail, MessageSquare, Webhook } from "lucide-react";
import Link from "next/link";

interface EscalationPolicyPageProps {
  policyId: string;
}

const methodIcons = {
  EMAIL: Mail,
  SLACK: MessageSquare,
  WEBHOOK: Webhook,
  email: Mail,
  slack: MessageSquare,
  webhook: Webhook,
};

const methodColors = {
  EMAIL: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  SLACK: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
  WEBHOOK: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  email: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  slack: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
  webhook: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
};

export function EscalationPolicyPage({ policyId }: EscalationPolicyPageProps) {
  const { data: policy, isLoading, error } = useEscalationPolicy(policyId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-muted animate-pulse rounded" />
          <div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/escalation-policies">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Escalation Policy</h1>
            <p className="text-muted-foreground">View escalation policy details</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Error Loading Policy</h3>
              <p className="text-muted-foreground mb-4">
                {error.status === 404
                  ? "Escalation policy not found"
                  : "Failed to load escalation policy"}
              </p>
              <Button asChild>
                <Link href="/escalation-policies">Back to Policies</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/escalation-policies">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Escalation Policy</h1>
            <p className="text-muted-foreground">View escalation policy details</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Policy Not Found</h3>
              <p className="text-muted-foreground mb-4">
                The escalation policy you&apos;re looking for doesn&apos;t exist.
              </p>
              <Button asChild>
                <Link href="/escalation-policies">Back to Policies</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/escalation-policies">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{policy.name}</h1>
            <p className="text-muted-foreground">
              Escalation policy with {policy.levels.length} level{policy.levels.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/escalation-policies/${policy.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Policy
          </Link>
        </Button>
      </div>

      <div className="grid gap-6">
        
        <Card>
          <CardHeader>
            <CardTitle>Policy Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-sm">{policy.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-sm">{new Date(policy.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-sm">{new Date(policy.updatedAt).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Levels</label>
                <p className="text-sm">{policy.levels.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        
        <Card>
          <CardHeader>
            <CardTitle>Escalation Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {policy.levels.map((level) => {
                const Icon = methodIcons[level.method as keyof typeof methodIcons];
                return (
                  <div
                    key={level.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full">
                        <span className="text-sm font-medium">{level.order}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="secondary"
                            className={methodColors[level.method as keyof typeof methodColors]}
                          >
                            {Icon && <Icon className="h-3 w-3 mr-1" />}
                            {level.method}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Wait {level.waitTimeMinutes} minutes
                          </span>
                        </div>
                        <p className="text-sm font-medium">{level.target}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


