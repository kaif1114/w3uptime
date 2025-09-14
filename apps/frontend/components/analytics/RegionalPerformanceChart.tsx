'use client';

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, MapPin, Clock, CheckCircle } from "lucide-react";
import { EnhancedTimeSeriesPoint } from "@/types/analytics";

interface RegionalData {
  region: string;
  regionType: 'continent' | 'country' | 'city';
  data: EnhancedTimeSeriesPoint[];
  label?: string;
}

interface RegionalPerformanceChartProps {
  regions: RegionalData[];
  title?: string;
  showLatency?: boolean;
  showUptime?: boolean;
  showComparison?: boolean;
  className?: string;
}

export function RegionalPerformanceChart({
  regions,
  title = "Regional Performance Comparison",
  showLatency = true,
  showUptime = true,
  showComparison = true,
  className = "",
}: RegionalPerformanceChartProps) {
  // Calculate aggregated metrics for each region
  const regionMetrics = useMemo(() => {
    return regions.map(region => {
      if (!region.data || region.data.length === 0) {
        return {
          ...region,
          avgLatency: 0,
          avgUptime: 0,
          totalChecks: 0,
          performanceScore: 0,
          trend: 'stable' as const,
        };
      }

      // Calculate averages
      const avgLatency = region.data.reduce((sum, point) => sum + point.avg_latency, 0) / region.data.length;
      const avgUptime = region.data.reduce((sum, point) => sum + point.uptime_percentage, 0) / region.data.length;
      const totalChecks = region.data.reduce((sum, point) => sum + point.total_checks, 0);
      
      // Calculate performance score (combination of latency and uptime)
      const latencyScore = Math.max(0, 100 - (avgLatency / 10)); // Lower latency = higher score
      const performanceScore = (avgUptime * 0.6) + (latencyScore * 0.4);

      // Calculate trend (comparing first half vs second half)
      const midPoint = Math.floor(region.data.length / 2);
      const firstHalf = region.data.slice(0, midPoint);
      const secondHalf = region.data.slice(midPoint);
      
      const firstHalfAvg = firstHalf.reduce((sum, p) => sum + p.avg_latency, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, p) => sum + p.avg_latency, 0) / secondHalf.length;
      
      const trend = secondHalfAvg < firstHalfAvg ? 'improving' : 
                   secondHalfAvg > firstHalfAvg ? 'degrading' : 'stable';

      return {
        ...region,
        avgLatency: Number(avgLatency.toFixed(2)),
        avgUptime: Number(avgUptime.toFixed(2)),
        totalChecks,
        performanceScore: Number(performanceScore.toFixed(1)),
        trend,
      };
    }).sort((a, b) => b.performanceScore - a.performanceScore); // Sort by performance score
  }, [regions]);

  const getRegionIcon = (regionType: string) => {
    switch (regionType) {
      case 'continent': return '🌍';
      case 'country': return '🏳️';
      case 'city': return '🏙️';
      default: return '📍';
    }
  };

  const getTrendIcon = (trend: string, score: number) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'degrading') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <MapPin className="h-4 w-4 text-muted-foreground" />;
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 75) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  if (regionMetrics.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2" />
          <p>No regional data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {title}
          <Badge variant="outline">{regionMetrics.length} region{regionMetrics.length !== 1 ? 's' : ''}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {regionMetrics.map((region, index) => (
          <div
            key={region.region}
            className={`p-4 rounded-lg border ${getPerformanceColor(region.performanceScore)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getRegionIcon(region.regionType)}</span>
                <div>
                  <h4 className="font-semibold">
                    {region.label || region.region}
                    {showComparison && index === 0 && (
                      <Badge className="ml-2 bg-green-500">Best</Badge>
                    )}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="capitalize">{region.regionType}</span>
                    <span>•</span>
                    <span>{region.totalChecks.toLocaleString()} checks</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {getTrendIcon(region.trend, region.performanceScore)}
                <Badge variant="outline" className="font-mono">
                  {region.performanceScore}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showLatency && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Avg Latency</span>
                    </div>
                    <span className="font-mono font-medium">
                      {region.avgLatency}ms
                    </span>
                  </div>
                  <Progress
                    value={Math.max(0, 100 - (region.avgLatency / 10))} // Convert latency to progress (lower = better)
                    className="h-2"
                  />
                </div>
              )}

              {showUptime && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>Uptime</span>
                    </div>
                    <span className="font-mono font-medium">
                      {region.avgUptime}%
                    </span>
                  </div>
                  <Progress
                    value={region.avgUptime}
                    className="h-2"
                  />
                </div>
              )}
            </div>

            {/* Mini timeline preview */}
            <div className="mt-3 pt-3 border-t border-current/20">
              <div className="flex items-center gap-1 h-6">
                {region.data.slice(-20).map((point, i) => (
                  <div
                    key={i}
                    className="flex-1 h-full rounded-sm"
                    style={{
                      backgroundColor: point.uptime_percentage > 95 
                        ? 'currentColor' 
                        : point.uptime_percentage > 80 
                          ? 'rgba(250, 204, 21, 0.8)' 
                          : 'rgba(239, 68, 68, 0.8)',
                      opacity: 0.6,
                    }}
                    title={`${new Date(point.time_bucket).toLocaleString()}: ${point.uptime_percentage.toFixed(1)}% uptime, ${point.avg_latency.toFixed(0)}ms latency`}
                  />
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Last {Math.min(20, region.data.length)} data points
              </div>
            </div>
          </div>
        ))}
        
        {showComparison && regionMetrics.length > 1 && (
          <div className="pt-4 border-t text-center">
            <div className="text-sm text-muted-foreground">
              Best performing: <strong>{regionMetrics[0].label || regionMetrics[0].region}</strong> 
              ({regionMetrics[0].performanceScore} score)
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}