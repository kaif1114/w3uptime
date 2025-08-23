"use client";

import { Button } from "@/components/ui/button";
import { useMonitorDetails, usePauseMonitor } from "@/hooks/useMonitors";
import { MonitorStatus } from "@/types/monitor";
import {
  AlertTriangle,
  Calendar,
  Edit3,
  Pause,
  Play,
  Send
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TimePeriod } from "./MonitoringControls";
import { TimeSeriesChart } from "./TimeSeriesChart";
interface MonitorDetailsProps {
  monitorId: string;
}

function getStatusColor(status: MonitorStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-500";
    case "PAUSED":
      return "bg-yellow-500";
    case "DISABLED":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
}

function getStatusText(status: MonitorStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Up";
    case "PAUSED":
      return "Paused";
    case "DISABLED":
      return "Down";
    default:
      return "Unknown";
  }
}

export function MonitorDetails({ monitorId }: MonitorDetailsProps) {
  const { data: monitor, isLoading, error } = useMonitorDetails(monitorId);
  const pauseMonitor = usePauseMonitor();

  const [timePeriod, setTimePeriod] = useState<TimePeriod>("day");

  const handlePauseToggle = () => {
    if (monitor && monitor?.status) {
      const newStatus = monitor?.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      pauseMonitor.mutate({ id: monitorId, status: newStatus });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          Failed to load monitor details
        </h3>
        <p className="text-muted-foreground">Please try refreshing the page.</p>
      </div>
    );
  }

  if (!monitor) return null;

  return (
    <div className="space-y-6">
      {/* Monitor Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${getStatusColor(monitor?.status)}`}
          />
          <div>
            <h1 className="text-2xl font-bold">
              {monitor?.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="text-lg font-medium">
                {getStatusText(monitor?.status)}
              </span>
              <span>•</span>
              <span>Checked every {monitor?.checkInterval / 60} minutes</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm">
            <Send className="mr-2 h-4 w-4" />
            Send test alert
          </Button>
          <Link href={`/incidents?monitor=${monitorId}`}>
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Incidents
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePauseToggle}
            disabled={pauseMonitor.isPending}
          >
            {monitor.status === "ACTIVE" ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Resume
              </>
            )}
          </Button>
          <Link href={`/monitors/${monitorId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div>
        <div className="p-0">
          <div className="p-6">
            {/* Performance Content */}
            <div className="space-y-6">
              {/* Performance Tab Time Period Buttons */}
              <div className="flex flex-wrap gap-2">
                {(["hour", "day", "week", "month"] as const).map((period) => (
                  <Button
                    key={period}
                    variant={timePeriod === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimePeriod(period)}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Button>
                ))}
              </div>

              <TimeSeriesChart
                monitorId={monitorId}
                period={timePeriod}
                type="latency"
              />
              <TimeSeriesChart
                monitorId={monitorId}
                period={timePeriod}
                type="uptime"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
