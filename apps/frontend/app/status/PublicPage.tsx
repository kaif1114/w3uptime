"use client";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { notFound } from "next/navigation";
import { useState } from "react";

import { useDailyStatus } from "@/hooks/useDailyStatus";
import { usePublicStatusPageData } from "@/hooks/usePublicStatusPage";
import DailyStatusBarChart from "./Barchart";
import { StatusOverview } from "./StatusOverview";
import { PublicTimeSeriesChart } from "./PublicTimeSeriesChart";
import { UptimeStatusBars } from "@/components/status/UptimeStatusBars";
import {
  StatusOverviewSkeleton,
  PerformanceMetricsSkeleton,
  BarChartSkeleton,
  ResponseTimeChartsSkeleton,
} from "@/components/skeletons/StatusPageSkeletons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
      <div className="container mx-auto px-4 py-8">
        <StatusOverviewSkeleton />

        <div>
          <PerformanceMetricsSkeleton />
        </div>
        <div>
          <BarChartSkeleton />
        </div>
        <div>
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

  return (
    <Card>
      <CardHeader>
     
        {/* Status Overview Component */}
        <StatusOverview 
          sections={transformedSections}
          renderStatusBars={(monitorId) => (
            <UptimeStatusBars 
              monitorId={monitorId} 
              period={selectedPeriod}
            />
          )}
        />

        {/* Charts Section */}
        {(shouldShowHistory || shouldShowStatus) && (
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Performance Metrics</span>
              </div>
              {shouldShowHistory && (
                <div className="flex space-x-2">
                  {["24h", "7d", "30d"].map((period) => (
                    <Button
                      key={period}
                      variant={selectedPeriod === period ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setSelectedPeriod(period as "24h" | "7d" | "30d")
                      }
                    >
                      {period}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        </CardHeader>
        <CardContent>
        {/* Status Chart - Show for STATUS and BOTH types */}
        {shouldShowStatus && (
          <div>
            {isDailyStatusLoading ? (
              <BarChartSkeleton />
            ) : (
              <DailyStatusBarChart
                data={dailyStatusData?.data || []}
                period={30}
                title="30-Day Status History"
                showLegend={true}
              />
            )}
          </div>
        )}
        
        {/* History Chart - Show for HISTORY and BOTH types */}
        {shouldShowHistory && monitorId && (
          <div className="mt-6">
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

        {/* Services Section Component */}
      </CardContent>
    </Card>
  );
};

export default PublicPage;
