'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMonitorAnalytics } from "@/hooks/useMonitors";
import { useAvailableCountries } from "@/hooks/useAnalytics";
import { AlertTriangle, CheckCircle, Activity, TrendingUp, MapPin, BarChart3 } from "lucide-react";
import { CountryRankingTable } from "@/components/analytics/CountryRankingTable";
import { EnhancedTimePeriod, CustomTimePeriod } from "@/types/analytics";
import { RegionalLatencyChart } from "@/components/analytics/RegionalLatencyChart";

interface AnalyticsOverviewProps {
  monitorId: string;
  period: EnhancedTimePeriod | string;
  customPeriod?: CustomTimePeriod;
}

export function AnalyticsOverview({ monitorId, period }: AnalyticsOverviewProps) {
  const { data: analytics, isLoading, error } = useMonitorAnalytics(monitorId, period);
  const { data: availableCountries } = useAvailableCountries(monitorId);
  
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-muted rounded animate-pulse" />
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

  const { uptime, bestRegion, worstRegion, regional } = analytics;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="rankings" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Rankings
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Uptime Overview */}
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

          {/* Worst Performing Region */}
          {worstRegion && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Worst Region</CardTitle>
                <MapPin className="h-4 w-4 text-red-500" />
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

          {/* Best Performing Region */}
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
        </div>

        {/* Regional Latency Chart */}
        <RegionalLatencyChart monitorId={monitorId} period={typeof period === 'string' ? period : 'day'} />

        {/* Regional Distribution */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performing Countries</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {regional.byCountry.slice(0, 8).map((country, index) => (
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
      </TabsContent>


      {/* Rankings Tab */}
      <TabsContent value="rankings" className="space-y-6">
        {availableCountries && availableCountries.countries.length > 0 && (
          <CountryRankingTable
            countries={availableCountries.countries}
            title="Global Country Performance Rankings"
          />
        )}
      </TabsContent>
    </Tabs>
  );
}