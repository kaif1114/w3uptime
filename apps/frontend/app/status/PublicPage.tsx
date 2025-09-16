"use client";
import { CheckCircle, ChevronDown } from "lucide-react";
import { notFound } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";

import { useDailyStatus } from "@/hooks/useDailyStatus";
import { usePublicStatusPageData } from "@/hooks/usePublicStatusPage";
import { PublicTimeSeriesChart } from "./PublicTimeSeriesChart";
import { UptimeStatusBars } from "@/components/status/UptimeStatusBars";
import {
  StatusOverviewSkeleton,
  ResponseTimeChartsSkeleton,
} from "@/components/skeletons/StatusPageSkeletons";

// Types for components (matching the expected interfaces)
interface Monitor {
  id: string;
  name: string;
  url: string;
  status: "up" | "down" | "maintenance";
  uptime: number;
  responseTime: number;
  lastChecked: string;
}

interface Section {
  id: string;
  name: string;
  monitors: Monitor[];
}

const PublicPage = ({ id }: { id: string }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<"24h" | "7d" | "30d">(
    "24h"
  );

  // Fetch public status page data (includes sections, maintenances, updates)
  const {
    data: statusPageData,
    isLoading: isStatusPageLoading,
    error: statusPageError,
  } = usePublicStatusPageData(id);

  // Fetch daily status data for the chart
  const { data: dailyStatusData, isLoading: isDailyStatusLoading } =
    useDailyStatus({
      monitorId: id,
      period: "30d",
      isPublic: true,
      enabled: !!id,
    });

  // Handle loading state
  if (isStatusPageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <StatusOverviewSkeleton />
          <ResponseTimeChartsSkeleton />
        </div>
      </div>
    );
  }

  // Handle error state
  if (statusPageError || !statusPageData) {
    notFound();
  }

  // Transform API data to match component interfaces
  const transformedSections: Section[] = statusPageData.sections.map(
    (section) => ({
      id: section.id,
      name: section.name,
      monitors: [
        {
          id: section.monitor.id,
          name: section.monitor.name,
          url: section.monitor.url,
          status:
            section.monitor.status === "ACTIVE"
              ? "up"
              : ("down" as "up" | "down" | "maintenance"),
          uptime: 99.9, // Default uptime - would need to calculate from actual data
          responseTime: 150, // Default response time - would need actual data
          lastChecked: new Date().toISOString(),
        },
      ],
    })
  );

  // Determine which charts to show based on section types
  const shouldShowHistory = statusPageData.sections.some(section => 
    section.type === "HISTORY" || section.type === "BOTH"
  );
  const shouldShowStatus = statusPageData.sections.some(section => 
    section.type === "STATUS" || section.type === "BOTH"
  );

  // Get monitor ID for history chart (use first monitor)
  const monitorId = statusPageData.sections[0]?.monitor.id;

  // Check overall status
  const allOperational = transformedSections.every(section => 
    section.monitors.every(monitor => monitor.status === 'up')
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-4xl font-semibold text-gray-900">
            {allOperational ? "All services are online" : "Some services are down"}
          </h1>
          <p className="text-gray-500">
            Last updated on {format(new Date(), "MMM dd 'at' hh:mmaaa")} HDT
          </p>
        </div>

        {/* Services Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {transformedSections.map((section) => (
            <div key={section.id}>
              {/* Section Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">{section.name}</h2>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-900">Operational</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Monitor Row */}
              {section.monitors.map((monitor) => (
                <div key={monitor.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-gray-900">{monitor.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    {/* Status Bars */}
                    <UptimeStatusBars 
                      monitorId={monitor.id} 
                      period={selectedPeriod}
                    />
                    <span className="text-green-600 font-medium">{monitor.uptime.toFixed(3)}% uptime</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Response Times Chart */}
        {shouldShowHistory && monitorId && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Response times</h3>
            <PublicTimeSeriesChart
              monitorId={monitorId}
              period={
                selectedPeriod === "24h" ? "day" : 
                selectedPeriod === "7d" ? "week" : "month"
              }
              type="latency"
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default PublicPage;
