"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { usePublicMonitorStats } from "@/hooks/usePublicMonitorStats";
import { UptimeStatusBars } from "@/components/status/UptimeStatusBars";
import { PublicTimeSeriesChart } from "../PublicTimeSeriesChart";

interface MonitorStatsDisplayProps {
  monitorId: string;
  monitorName: string;
  monitorStatus: string;
  sectionType: "STATUS" | "HISTORY" | "BOTH";
  selectedPeriod: "24h" | "7d" | "30d";
  onPeriodChange?: (period: "24h" | "7d" | "30d") => void;
}

export function MonitorStatsDisplay({
  monitorId,
  monitorName,
  monitorStatus,
  sectionType,
  selectedPeriod,
  onPeriodChange,
}: MonitorStatsDisplayProps) {
  // Map UI period to API period
  const apiPeriod = selectedPeriod === "24h" ? "day" : selectedPeriod === "7d" ? "week" : "month";

  // Fetch real stats from API
  const { data: stats, isLoading } = usePublicMonitorStats({
    monitorId,
    period: apiPeriod,
  });

  // Determine status icon and color
  const isOperational = monitorStatus === "ACTIVE";
  const StatusIcon = isOperational ? CheckCircle : XCircle;
  const statusColor = isOperational ? "text-green-500" : "text-red-500";

  return (
    <div className="space-y-2">
      {/* Monitor name and current status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <StatusIcon className={`w-5 h-5 ${statusColor}`} />
          <span className="font-medium text-card-foreground">
            {monitorName}
          </span>
        </div>

        {/* Real uptime percentage */}
        {isLoading ? (
          <span className="text-sm text-muted-foreground">Loading...</span>
        ) : stats ? (
          <span className="text-green-600 font-medium">
            {stats.uptime.toFixed(3)}% uptime
          </span>
        ) : (
          <span className="text-muted-foreground">No data</span>
        )}
      </div>

      {/* Uptime bars - ONLY for HISTORY and BOTH types */}
      {(sectionType === "HISTORY" || sectionType === "BOTH") && (
        <div className="w-full">
          <UptimeStatusBars monitorId={monitorId} period="30d" />
        </div>
      )}

      {/* Chart - ONLY for BOTH type */}
      {sectionType === "BOTH" && onPeriodChange && (
        <div className="w-full mt-4">
          <PublicTimeSeriesChart
            monitorId={monitorId}
            period={apiPeriod}
            type="latency"
            selectedPeriod={selectedPeriod}
            onPeriodChange={onPeriodChange}
          />
        </div>
      )}
    </div>
  );
}
