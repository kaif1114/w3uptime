'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnalyticsOverview } from "./AnalyticsOverview";
import { useMonitors } from "@/hooks/useMonitors";
import { AlertTriangle } from "lucide-react";

export type TimePeriod = 'hour' | 'day' | 'week' | 'month';

export default function AnalyticsPage() {
  const [selectedMonitorId, setSelectedMonitorId] = useState<string>("");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('day');
  
  const { data: monitors, isLoading: monitorsLoading, error: monitorsError } = useMonitors();

  if (monitorsLoading) {
    return (
      <div className="container mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Analytics Overview</h1>
          <p className="text-muted-foreground">Loading monitors...</p>
        </div>
      </div>
    );
  }

  if (monitorsError) {
    return (
      <div className="container mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Analytics Overview</h1>
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load monitors</h3>
            <p className="text-muted-foreground">Please try refreshing the page.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!monitors || monitors.monitors.length === 0) {
    return (
      <div className="container mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Analytics Overview</h1>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No Monitors Available</h3>
            <p className="text-muted-foreground">Create a monitor to view analytics data.</p>
          </div>
        </div>
      </div>
    );
  }

  // Auto-select first monitor if none selected
  const currentMonitorId = selectedMonitorId || monitors.monitors[0]?.id;

  return (
    <div className="container mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Analytics Overview</h1>
        <p className="text-muted-foreground">
          View detailed performance analytics and insights for your monitors.
        </p>
      </div>

      {/* Monitor and Time Period Selection */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Monitor:</span>
          <Select value={currentMonitorId} onValueChange={setSelectedMonitorId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a monitor" />
            </SelectTrigger>
            <SelectContent>
              {monitors.monitors.map((monitor) => (
                <SelectItem key={monitor.id} value={monitor.id}>
                  {monitor.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Period:</span>
          <div className="flex gap-2">
            {(['hour', 'day', 'week', 'month'] as const).map((period) => (
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
        </div>
      </div>

      {/* Analytics Content */}
      {currentMonitorId && (
        <AnalyticsOverview 
          monitorId={currentMonitorId} 
          period={timePeriod} 
        />
      )}
    </div>
  );
}