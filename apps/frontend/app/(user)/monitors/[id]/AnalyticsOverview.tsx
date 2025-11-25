'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useMonitorAnalytics } from "@/hooks/useMonitors";
import { AlertTriangle, CheckCircle, Clock, Activity, TrendingUp, MapPin } from "lucide-react";

interface AnalyticsOverviewProps {
  monitorId: string;
  period: string;
}

function formatDuration(intervalString: string): string {
  if (!intervalString) return 'N/A';
  
  
  const match = intervalString.match(/(?:(\d+) days?\s*)?(?:(\d+):(\d+):(\d+))?/);
  if (!match) return intervalString;

  const [, days, hours, minutes, seconds] = match;
  const parts = [];
  
  if (days && parseInt(days) > 0) {
    parts.push(`${days}d`);
  }
  if (hours && parseInt(hours) > 0) {
    parts.push(`${parseInt(hours)}h`);
  }
  if (minutes && parseInt(minutes) > 0) {
    parts.push(`${parseInt(minutes)}m`);
  }
  if (seconds && parseInt(seconds) > 0 && !days && !hours) {
    parts.push(`${parseInt(seconds)}s`);
  }
  
  return parts.length > 0 ? parts.join(' ') : '0s';
}

export function AnalyticsOverview({ monitorId, period }: AnalyticsOverviewProps) {
  const { data: analytics, isLoading, error } = useMonitorAnalytics(monitorId, period);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-2/3"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
          <p className="text-destructive">Failed to load analytics data</p>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  const { uptime, latency, bestRegion, worstRegion, regional } = analytics;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Uptime</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {uptime?.uptime_percentage ? Number(uptime.uptime_percentage).toFixed(2) : '0'}%
          </div>
          <div className="space-y-2 mt-4">
            <Progress 
              value={uptime?.uptime_percentage ? Number(uptime.uptime_percentage) : 0} 
              className="w-full" 
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{uptime?.successful_checks || 0} successful</span>
              <span>{uptime?.failed_checks || 0} failed</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Total checks: {uptime?.total_checks || 0}
          </p>
        </CardContent>
      </Card>

      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Latency</CardTitle>
          <Activity className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {latency?.avg_latency ? Number(latency.avg_latency).toFixed(0) : '0'}ms
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Min: {latency?.min_latency ? Number(latency.min_latency).toFixed(0) : '0'}ms</span>
            <span>Max: {latency?.max_latency ? Number(latency.max_latency).toFixed(0) : '0'}ms</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {latency?.sample_count || 0} samples
          </p>
        </CardContent>
      </Card>

      
      {worstRegion && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Worst Region</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {worstRegion.avg_latency ? Number(worstRegion.avg_latency).toFixed(0) : '0'}ms
            </div>
            <div className="mt-2">
              <Badge variant="destructive">
                {worstRegion.region_name}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {worstRegion.region_type} • {worstRegion.sample_count} samples
            </p>
          </CardContent>
        </Card>
      )}

      
      {bestRegion && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Region</CardTitle>
            <MapPin className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bestRegion.avg_latency ? Number(bestRegion.avg_latency).toFixed(0) : '0'}ms
            </div>
            <div className="mt-2">
              <Badge variant="secondary">
                {bestRegion.region_name}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {bestRegion.region_type} • {bestRegion.sample_count} samples
            </p>
          </CardContent>
        </Card>
      )}

      
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Performing Countries</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {regional.byCountry.slice(0, 5).map((country, index) => (
              <div key={country.country_code} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="w-8 justify-center">
                    {index + 1}
                  </Badge>
                  <span className="font-medium">{country.country_code}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {country.avg_latency ? Number(country.avg_latency).toFixed(0) : '0'}ms
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {country.sample_count || 0} checks
                  </div>
                </div>
              </div>
            ))}
            {regional.byCountry.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No regional data available
              </p>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}