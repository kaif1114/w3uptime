"use client";
import { CheckCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";

import { usePublicStatusPageData } from "@/hooks/usePublicStatusPage";
import { PublicTimeSeriesChart } from "./PublicTimeSeriesChart";
import { UptimeStatusBars } from "@/components/status/UptimeStatusBars";
import {
  StatusOverviewSkeleton,
  ResponseTimeChartsSkeleton,
} from "@/components/skeletons/StatusPageSkeletons";


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
  type: "STATUS" | "HISTORY" | "BOTH";
  monitors: Monitor[];
}

const PublicPage = ({ id }: { id: string }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<"24h" | "7d" | "30d">(
    "24h"
  );

  
  const {
    data: statusPageData,
    isLoading: isStatusPageLoading,
    error: statusPageError,
  } = usePublicStatusPageData(id);


  if (isStatusPageLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <StatusOverviewSkeleton />
          <ResponseTimeChartsSkeleton />
        </div>
      </div>
    );
  }

  
  if (statusPageError || !statusPageData) {
    notFound();
  }

  
  const transformedSections: Section[] = statusPageData.sections.map(
    (section) => ({
      id: section.id,
      name: section.name,
      type: section.type,
      monitors: [
        {
          id: section.monitor.id,
          name: section.monitor.name,
          url: section.monitor.url,
          status:
            section.monitor.status === "ACTIVE"
              ? "up"
              : ("down" as "up" | "down" | "maintenance"),
          uptime: 99.9,
          responseTime: 150,
          lastChecked: new Date().toISOString(),
        },
      ],
    })
  );


  
  const allOperational = transformedSections.every((section) =>
    section.monitors.every((monitor) => monitor.status === "up")
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-4xl font-semibold text-foreground">
            {allOperational
              ? "All services are online"
              : "Some services are down"}
          </h1>
          <p className="text-muted-foreground">
            Last updated on {format(new Date(), "MMM dd 'at' hh:mmaaa")} HDT
          </p>
        </div>

        
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          
          {transformedSections.map((section) => (
            <div key={section.id}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-card-foreground">
                  {section.name}
                </h2>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-card-foreground">
                    Operational
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>


              {section.monitors.map((monitor) => (
                <div key={monitor.id} className="space-y-2">

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-medium text-card-foreground">
                        {monitor.name}
                      </span>
                    </div>
                    <span className="text-green-600 font-medium">
                      {monitor.uptime.toFixed(3)}% uptime
                    </span>
                  </div>

                  {/* Uptime bars - ONLY for HISTORY and BOTH types */}
                  {(section.type === "HISTORY" || section.type === "BOTH") && (
                    <div className="w-full">
                      <UptimeStatusBars monitorId={monitor.id} period="30d" />
                    </div>
                  )}

                  {/* Chart - ONLY for BOTH type */}
                  {section.type === "BOTH" && (
                    <div className="w-full mt-4">
                      <PublicTimeSeriesChart
                        monitorId={monitor.id}
                        period={
                          selectedPeriod === "24h"
                            ? "day"
                            : selectedPeriod === "7d"
                              ? "week"
                              : "month"
                        }
                        type="latency"
                        selectedPeriod={selectedPeriod}
                        onPeriodChange={setSelectedPeriod}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PublicPage;
