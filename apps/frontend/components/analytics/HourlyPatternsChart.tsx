'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { HourlyPattern } from "@/types/analytics";
import { Clock, Activity, TrendingUp } from "lucide-react";

interface HourlyPatternsChartProps {
  patterns: HourlyPattern[];
  period: string;
}

const formatHour = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;
};

export function HourlyPatternsChart({ patterns, period }: HourlyPatternsChartProps) {
  // Sort patterns by hour to ensure correct order
  const sortedPatterns = [...patterns].sort((a, b) => a.hour_of_day - b.hour_of_day);
  
  // Find peak hours (highest and lowest latency)
  const peakLatencyHour = patterns.reduce((max, current) => 
    current.avg_latency > max.avg_latency ? current : max, patterns[0] || { hour_of_day: 0, avg_latency: 0 }
  );
  
  const bestLatencyHour = patterns.reduce((min, current) => 
    current.avg_latency < min.avg_latency ? current : min, patterns[0] || { hour_of_day: 0, avg_latency: 999999 }
  );

  const totalChecks = patterns.reduce((sum, pattern) => sum + pattern.total_checks, 0);
  const avgSuccessRate = patterns.length > 0 
    ? patterns.reduce((sum, pattern) => sum + pattern.success_rate, 0) / patterns.length 
    : 0;

  if (patterns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Hourly Traffic Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No hourly pattern data available</p>
            <p className="text-xs mt-1">Data will appear as monitoring continues</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          Hourly Traffic Patterns
          <span className="text-sm font-normal text-muted-foreground">({period})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">Peak Hour</span>
              </div>
              <div className="text-lg font-bold text-blue-900">
                {formatHour(peakLatencyHour.hour_of_day)}
              </div>
              <div className="text-xs text-blue-600">
                {peakLatencyHour.avg_latency.toFixed(0)}ms avg latency
              </div>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-700">Best Hour</span>
              </div>
              <div className="text-lg font-bold text-green-900">
                {formatHour(bestLatencyHour.hour_of_day)}
              </div>
              <div className="text-xs text-green-600">
                {bestLatencyHour.avg_latency.toFixed(0)}ms avg latency
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Overall</span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {avgSuccessRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">
                {totalChecks.toLocaleString()} total checks
              </div>
            </div>
          </div>

          {/* Horizontal Bar Chart using Shadcn Components */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground mb-4">Hourly Latency Distribution</div>
            {sortedPatterns.map((pattern) => {
              const maxLatency = Math.max(...patterns.map(p => p.avg_latency));
              const relativeHeight = maxLatency > 0 ? (pattern.avg_latency / maxLatency) * 100 : 0;
              const isHighLatency = pattern.avg_latency > (patterns.reduce((sum, p) => sum + p.avg_latency, 0) / patterns.length);
              
              return (
                <div key={pattern.hour_of_day} className="flex items-center gap-4">
                  <div className="w-12 text-xs font-medium text-muted-foreground">
                    {formatHour(pattern.hour_of_day)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={relativeHeight} 
                        className="h-6 flex-1" 
                      />
                      <div className="w-16 text-xs text-right">
                        <span className={`font-medium ${isHighLatency ? 'text-red-600' : 'text-green-600'}`}>
                          {pattern.avg_latency.toFixed(0)}ms
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{pattern.success_rate.toFixed(1)}% success</span>
                      <span>{pattern.total_checks.toLocaleString()} checks</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Insights */}
          <div className="bg-muted/30 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Quick Insights:</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                • Peak latency occurs at <strong>{formatHour(peakLatencyHour.hour_of_day)}</strong> 
                with {peakLatencyHour.avg_latency.toFixed(0)}ms average response time
              </p>
              <p>
                • Best performance at <strong>{formatHour(bestLatencyHour.hour_of_day)}</strong> 
                with {bestLatencyHour.avg_latency.toFixed(0)}ms average response time
              </p>
              <p>
                • Consider scaling resources during peak hours or investigate performance bottlenecks
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}