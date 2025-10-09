'use client';

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnalyticsOverview } from "./AnalyticsOverview";
import { CustomPeriodSelector } from "@/components/analytics/CustomPeriodSelector";
import { useMonitors } from "@/hooks/useMonitors";
import { AlertTriangle } from "lucide-react";
import { EnhancedTimePeriod, CustomTimePeriod } from "@/types/analytics";

export default function AnalyticsPage() {
  const [selectedMonitorId, setSelectedMonitorId] = useState<string>("");
  const [timePeriod, setTimePeriod] = useState<EnhancedTimePeriod | CustomTimePeriod>('day');
  
  const { data: monitors, isLoading: monitorsLoading, error: monitorsError } = useMonitors();

  if (monitorsLoading) {
    return (
      <div className=" px-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Analytics Overview</h1>
          <p className="text-muted-foreground">Loading monitors...</p>
        </div>
      </div>
    );
  }

  if (monitorsError) {
    return (
      <div className=" space-y-6">
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
      <div className=" space-y-6">
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

  
  const currentMonitorId = selectedMonitorId || monitors.monitors[0]?.id;

  return (
    <div className=" space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Analytics Overview</h1>
        <p className="text-muted-foreground">
          View detailed performance analytics and insights for your monitors.
        </p>
      </div>

      
      <div className="flex justify-between gap-4 items-center">
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

        <CustomPeriodSelector
          value={timePeriod}
          onChange={setTimePeriod}
        />
      </div>

      
      {currentMonitorId && (
        <AnalyticsOverview 
          monitorId={currentMonitorId} 
          period={typeof timePeriod === 'string' ? timePeriod : 'day'}
          customPeriod={typeof timePeriod === 'object' ? timePeriod : undefined}
        />
      )}
    </div>
  );
}