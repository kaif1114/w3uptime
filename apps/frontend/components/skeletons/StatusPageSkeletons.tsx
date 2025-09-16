import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Skeleton for StatusOverview component
export const StatusOverviewSkeleton = () => {
  return (
    <div className="space-y-6 mb-4">
      {/* Last Updated */}
      <div className="text-sm">
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Main Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-5 w-5" />
                  <div>
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-5 w-24" />
                  <div className="flex items-center space-x-1">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Skeleton for Performance Metrics section
export const PerformanceMetricsSkeleton = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex space-x-2">
          {["24h", "7d", "30d"].map((period) => (
            <Skeleton key={period} className="h-8 w-12" />
          ))}
        </div>
      </div>
    </div>
  );
};

// Skeleton for Bar Chart
export const BarChartSkeleton = () => {
  return (
    <div className="h-64 flex items-center justify-center">
      <div className="w-full space-y-4">
        <div className="flex items-end justify-between h-40 px-4">
          {Array.from({ length: 30 }).map((_, i) => (
            <Skeleton
              key={i}
              className="w-2"
              style={{
                height: `${Math.random() * 120 + 20}px`
              }}
            />
          ))}
        </div>
        <div className="flex justify-between px-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
};

// Skeleton for Response Time Charts
export const ResponseTimeChartsSkeleton = () => {
  return (
    <div className="space-y-6">
      <CardHeader>
        <Skeleton className="h-6 w-36" />
      </CardHeader>
      
      {/* Status Bar Skeleton */}
      <div className="flex h-6 w-full rounded overflow-hidden mb-4">
        {Array.from({ length: 100 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-full mx-px" />
        ))}
      </div>
      
      {/* Chart Skeleton */}
      <div className="h-64">
        <div className="w-full h-full flex items-end justify-between px-8 pb-8">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center space-y-2">
              <Skeleton
                className="w-1"
                style={{
                  height: `${Math.random() * 150 + 20}px`
                }}
              />
              {i % 10 === 0 && <Skeleton className="h-2 w-8" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Skeleton for MaintenanceList (improved version)
export const MaintenanceListSkeleton = () => {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border border-border/50 bg-card shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Skeleton for IncidentsList navigation and month cards
export const IncidentsListSkeleton = () => {
  return (
    <>
      {/* Range Navigation Skeleton */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="px-6 py-2 bg-muted rounded-lg">
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-10 rounded-md" />
      </div>

      {/* Month Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Skeleton */}
      <div className="mt-8 text-center">
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
    </>
  );
};