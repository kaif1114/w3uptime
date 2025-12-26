import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Deterministic heights for ResponseTimeChartsSkeleton (50 bars)
// Using fixed heights prevents hydration errors from Math.random()
const RESPONSE_TIME_SKELETON_HEIGHTS = [
  45, 52, 48, 55, 60, 58, 62, 68, 72, 70,
  65, 58, 54, 50, 48, 52, 58, 64, 70, 75,
  80, 85, 90, 88, 82, 75, 68, 62, 58, 55,
  52, 58, 65, 72, 78, 82, 85, 88, 92, 95,
  98, 95, 90, 85, 78, 70, 62, 55, 48, 42
] as const;

// Deterministic heights for BarChartSkeleton (30 bars)
// Using fixed heights prevents hydration errors from Math.random()
const BAR_CHART_SKELETON_HEIGHTS = [
  35, 42, 38, 45, 52, 58, 65, 70, 68, 62,
  55, 48, 42, 38, 45, 52, 60, 68, 75, 82,
  88, 85, 78, 70, 62, 55, 48, 42, 38, 35
] as const;


export const StatusOverviewSkeleton = () => {
  return (
    <div className="space-y-6 mb-4">
      
      <div className="text-sm">
        <Skeleton className="h-4 w-48" />
      </div>

      
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
                height: `${BAR_CHART_SKELETON_HEIGHTS[i]}px`
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


export const ResponseTimeChartsSkeleton = () => {
  return (
    <div className="space-y-6">
      <CardHeader>
        <Skeleton className="h-6 w-36" />
      </CardHeader>
      
      
      <div className="flex h-6 w-full rounded overflow-hidden mb-4">
        {Array.from({ length: 100 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-full mx-px" />
        ))}
      </div>
      

      <div className="h-64">
        <div className="w-full h-full flex items-end justify-between px-8 pb-8">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center space-y-2">
              <Skeleton
                className="w-1"
                style={{
                  height: `${RESPONSE_TIME_SKELETON_HEIGHTS[i]}px`
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


export const IncidentsListSkeleton = () => {
  return (
    <>
      
      <div className="flex items-center justify-center gap-4 mb-8">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="px-6 py-2 bg-muted rounded-lg">
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-10 rounded-md" />
      </div>

      
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

      
      <div className="mt-8 text-center">
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
    </>
  );
};