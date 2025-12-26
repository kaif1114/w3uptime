"use client";
import { CheckCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";

import { usePublicStatusPageData } from "@/hooks/usePublicStatusPage";
import { MonitorStatsDisplay } from "./components/MonitorStatsDisplay";
import {
  StatusOverviewSkeleton,
  ResponseTimeChartsSkeleton,
} from "@/components/skeletons/StatusPageSkeletons";
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


  const allOperational = statusPageData.sections.every(
    (section) => section.monitor.status === "ACTIVE"
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

          {statusPageData.sections.map((section) => (
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

              <MonitorStatsDisplay
                monitorId={section.monitor.id}
                monitorName={section.monitor.name}
                monitorStatus={section.monitor.status}
                sectionType={section.type}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PublicPage;
