"use client";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { notFound } from "next/navigation";
import { useState } from "react";
import Navbar from "./Navbar";

import { useDailyStatus } from "@/hooks/useDailyStatus";
import { usePublicStatusPageData } from "@/hooks/usePublicStatusPage";
import { MaintenanceItem, UpdateItem } from "@/types/generic";
import DailyStatusBarChart from "./Barchart";
import ResponseTimeCharts from "./Chart";
import { ServicesSection } from "./ServicesSection";
import { StatusOverview } from "./StatusOverview";



// Types for components (matching the expected interfaces)
interface Monitor {
  id: string;
  name: string;
  url: string;
  status: 'up' | 'down' | 'maintenance';
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Handle error state
  if (statusPageError || !statusPageData) {
    notFound();
  }

  // Transform API data to match component interfaces
  const transformedSections: Section[] = statusPageData.sections.map(section => ({
    id: section.id,
    name: section.name,
    monitors: [{
      id: section.monitor.id,
      name: section.monitor.name,
      url: section.monitor.url,
      status: section.monitor.status === 'ACTIVE' ? 'up' : 'down' as 'up' | 'down' | 'maintenance',
      uptime: 99.9, // Default uptime - would need to calculate from actual data
      responseTime: 150, // Default response time - would need actual data
      lastChecked: new Date().toISOString(),
    }]
  }));

  const transformedMaintenances: MaintenanceItem[] = statusPageData.maintenances.map(maintenance => ({
    id: maintenance.id,
    title: maintenance.title,
    description: maintenance.description,
    startDate: new Date(maintenance.from),
    endDate: new Date(maintenance.to),
    status: maintenance.status as 'scheduled' | 'in_progress' | 'completed',
    affectedServices: [], // Would need to map from actual affected sections
  }));

  const transformedUpdates: UpdateItem[] = statusPageData.updates.map(update => ({
    id: update.id,
    title: update.title,
    description: update.description,
    publishedAt: new Date(update.publishedAt),
    type: 'improvement' as const, // Default type
    changes: [], // Would need to extract from description or separate field
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        logoUrl={statusPageData.logoUrl || undefined}
        companyName={statusPageData.name}
        logoLinkUrl={statusPageData.logoLinkUrl || undefined}
        currentPage="status"
        serviceId={undefined}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Status Overview Component */}
        <StatusOverview sections={transformedSections} />

        {/* Charts Section */}

        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Performance Metrics</span>
            </div>
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
          </div>
        </div>
        <div>
          {isDailyStatusLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 "></div>
            </div>
          ) : (
            <DailyStatusBarChart
              data={dailyStatusData?.data || []}
              period={30}
              title="30-Day Status History"
              showLegend={true}
            />
          )}
        </div>
        <div>
          <ResponseTimeCharts />
        </div>

        {/* Services Section Component */}
        <ServicesSection
          sections={transformedSections}
          maintenances={transformedMaintenances}
          updates={transformedUpdates}
        />
      </div>
    </div>
  );
};

export default PublicPage;
