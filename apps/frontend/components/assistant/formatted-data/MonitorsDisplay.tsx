"use client";

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, PauseCircle, XCircle } from "lucide-react";
import { formatDateSmart } from "@/lib/utils/date-formatter";
import { cn } from "@/lib/utils";

type Monitor = {
  id: string;
  name: string;
  url: string;
  status: string;
  lastCheckedAt: string | null;
  hasOngoingIncident?: boolean;
  recentIncidents?: Array<{
    id: string;
    status: string;
    createdAt: string;
    resolvedAt: string | null;
  }>;
};

type MonitorsDisplayProps = {
  data: Monitor[] | { monitors?: Monitor[] };
};

function getStatusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    case "PAUSED":
      return (
        <Badge variant="secondary">
          <PauseCircle className="h-3 w-3 mr-1" />
          Paused
        </Badge>
      );
    case "DOWN":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Down
        </Badge>
      );
    case "RECOVERING":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-500">
          Recovering
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      );
  }
}

export function MonitorsDisplay({ data }: MonitorsDisplayProps) {
  // Handle different data structures
  const monitors = Array.isArray(data) ? data : data.monitors || [];

  if (!monitors || monitors.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        No monitors found.
      </div>
    );
  }

  return (
    <div className="space-y-2 py-1">
      <div className="text-xs font-semibold text-muted-foreground mb-2">
        {monitors.length} Monitor{monitors.length !== 1 ? "s" : ""}
      </div>
      {monitors.map((monitor) => (
        <div
          key={monitor.id}
          className="border border-muted rounded-md p-2 space-y-1.5 bg-muted/30"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{monitor.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {monitor.url}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {getStatusBadge(monitor.status)}
              {monitor.hasOngoingIncident && (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {monitor.lastCheckedAt && (
              <span>Last checked: {formatDateSmart(monitor.lastCheckedAt)}</span>
            )}
            {monitor.recentIncidents && monitor.recentIncidents.length > 0 && (
              <span>
                {monitor.recentIncidents.length} recent incident
                {monitor.recentIncidents.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
