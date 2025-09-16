"use client";

import { Card, CardContent } from '@/components/ui/card'
import React from 'react'
import { useMaintenanceData, type PublicMaintenanceData } from '@/hooks/usePublicMaintenances'
import { MaintenanceListSkeleton } from '@/components/skeletons/StatusPageSkeletons'

interface MaintenanceListProps {
  statusPageId: string;
  isPublic?: boolean;
}

const MaintenanceList = ({ statusPageId, isPublic = true }: MaintenanceListProps) => {
  const { data: maintenancesData, isLoading, error } = useMaintenanceData(statusPageId, isPublic);
  const maintenances = maintenancesData?.maintenances || [];

  if (isLoading) {
    return <MaintenanceListSkeleton />;
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto">
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
      <div className="w-full max-w-2xl mx-auto">
        <Card className="border border-border/50 bg-card shadow-sm">
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">No maintenance schedules found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="space-y-4">
        {maintenances.map((maintenance: PublicMaintenanceData) => (
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
                  {new Date(maintenance.from).toLocaleString()} -{" "}
                  {new Date(maintenance.to).toLocaleString()}
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

