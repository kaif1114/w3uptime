"use client";

import { Card, CardContent } from '@/components/ui/card'
import React from 'react'
import { useMaintenances } from '@/hooks/useMaintenances'
import type { Maintenance as MaintenanceType } from "@/hooks/useMaintenances";

interface MaintenanceListProps {
  statusPageId: string;
}

const MaintenanceList = ({ statusPageId }: MaintenanceListProps) => {
  const { data: maintenancesData, isLoading, error } = useMaintenances(statusPageId);
  const maintenances = maintenancesData?.maintenances || [];

  if (isLoading) {
    return (
      <div className="w-2/3">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-border/50 bg-card shadow-sm">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-2/3">
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-600">Failed to load maintenance schedules</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (maintenances.length === 0) {
    return (
      <div className="w-2/3">
        <Card className="border border-border/50 bg-card shadow-sm">
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">No maintenance schedules found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-2/3">
      <div className="space-y-4">
        {maintenances.map((maintenance: MaintenanceType) => (
          <Card key={maintenance.id} className="border border-border/50 bg-card shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">
                  {maintenance.title}
                </h4>
                {maintenance.description && (
                  <p className="text-sm text-muted-foreground">
                    {maintenance.description}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  {new Date(maintenance.start).toLocaleString()} -{" "}
                  {new Date(maintenance.end).toLocaleString()}
                </div>
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {maintenance.status}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MaintenanceList;

