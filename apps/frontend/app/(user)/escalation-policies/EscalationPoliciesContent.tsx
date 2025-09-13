"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEscalationPolicies } from "@/hooks/useEscalationPolicies";
import {
  AlertTriangle,
  Clock,
  Mail,
  MessageSquare,
  Plus,
  Users,
  Webhook,
} from "lucide-react";
import Link from "next/link";

const methodIcons = {
  email: Mail,
  slack: MessageSquare,
  webhook: Webhook,
};

export function EscalationPoliciesContent() {
  const { data, isLoading, error } = useEscalationPolicies();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Escalation Policies</h1>
            <p className="text-muted-foreground">
              Manage how incidents are escalated when not acknowledged
            </p>
          </div>
          <div className="h-9 w-32 bg-muted animate-pulse rounded-md" />
        </div>

        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 w-48 bg-muted animate-pulse rounded" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Escalation Policies</h1>
            <p className="text-muted-foreground">
              Manage how incidents are escalated when not acknowledged
            </p>
          </div>
          <Button asChild>
            <Link href="/escalation-policies/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Policy
            </Link>
          </Button>
        </div>

        <Card className="border-destructive">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-destructive mb-2">
                Failed to load escalation policies
              </p>
              <p className="text-sm text-muted-foreground">
                Please try refreshing the page or check your connection
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Escalation Policies</h1>
          <p className="text-muted-foreground">
            Manage how incidents are escalated when not acknowledged
          </p>
        </div>
        <Button asChild>
          <Link href="/escalation-policies/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Policy
          </Link>
        </Button>
      </div>

      {!data || data.escalationPolicies.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No escalation policies yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first escalation policy to define how incidents
                should be handled when they are not acknowledged in time.
              </p>
              <Button asChild>
                <Link href="/escalation-policies/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Policy
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data.escalationPolicies.map((policy) => {
            const Icon =
              methodIcons[policy.levels[0]?.method as keyof typeof methodIcons] ||
              AlertTriangle;

            return (
              <Card
                key={policy.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{policy.name}</CardTitle>
                        <CardDescription>
                          {policy.levels.length} escalation level
                          {policy.levels.length !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        ⋮
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Created {new Date(policy.createdAt).toLocaleDateString()}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Escalation Flow:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {policy.levels.map((level, index) => {
                          const LevelIcon =
                            methodIcons[level.method as keyof typeof methodIcons] ||
                            AlertTriangle;
                          return (
                            <div
                              key={level.id}
                              className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs"
                            >
                              <span className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                {index + 1}
                              </span>
                              <LevelIcon className="h-3 w-3" />
                              <span className="capitalize">{level.method}</span>
                              {index < policy.levels.length - 1 && (
                                <>
                                  <span className="text-muted-foreground">
                                    →
                                  </span>
                                  <span className="text-muted-foreground">
                                    {level.waitTimeMinutes}m
                                  </span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
