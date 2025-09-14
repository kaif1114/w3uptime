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

          {/* True Horizontal Bar Chart */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Hourly Latency Distribution</h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Low</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>High</span>
                </div>
              </div>
            </div>
            
            {/* Horizontal Chart Container */}
            <div className="bg-muted/20 rounded-lg p-4 overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Chart Area */}
                <div className="relative" style={{ height: '320px', paddingBottom: '40px' }}>
                  {/* Background Grid Lines */}
                  <div className="absolute inset-0 flex flex-col">
                    {[0, 25, 50, 75, 100].map((percent) => (
                      <div key={percent} className="flex-1 border-b border-muted/30 last:border-b-0"></div>
                    ))}
                  </div>
                  
                  {/* Y-Axis Labels (Latency) */}
                  <div className="absolute left-0 top-0 h-full w-12 flex flex-col justify-between text-xs text-muted-foreground py-2">
                    {(() => {
                      const maxLatency = Math.max(...patterns.map(p => p.avg_latency));
                      const steps = [maxLatency, maxLatency * 0.75, maxLatency * 0.5, maxLatency * 0.25, 0];
                      return steps.map((value, index) => (
                        <div key={index} className="text-right pr-2">
                          {value.toFixed(0)}ms
                        </div>
                      ));
                    })()}
                  </div>
                  
                  {/* Bars */}
                  <div className="ml-12 relative" style={{ height: '280px' }}>
                    {/* Bars container */}
                    <div className="absolute bottom-0 left-0 right-0 flex items-end gap-1">
                      {sortedPatterns.map((pattern) => {
                        const maxLatency = Math.max(...patterns.map(p => p.avg_latency));
                        
                        // Enhanced height calculation with proper alignment
                        const normalizedHeight = maxLatency > 0 ? (pattern.avg_latency / maxLatency) : 0;
                        const minBarHeightPx = 8; // Minimum bar height in pixels
                        const maxBarHeightPx = 280; // Maximum bar height in pixels
                        const barHeightPx = Math.max(minBarHeightPx, normalizedHeight * maxBarHeightPx);
                        
                        const avgLatency = patterns.reduce((sum, p) => sum + p.avg_latency, 0) / patterns.length;
                        const isHighLatency = pattern.avg_latency > avgLatency;
                        const isPeakHour = pattern.hour_of_day === peakLatencyHour.hour_of_day;
                        const isBestHour = pattern.hour_of_day === bestLatencyHour.hour_of_day;
                        const barWidth = `calc((100% - ${sortedPatterns.length - 1} * 0.25rem) / ${sortedPatterns.length})`;
                        
                        return (
                          <div key={pattern.hour_of_day} className="relative group" style={{ width: barWidth }}>
                            {/* Bar */}
                            <div 
                              className={`w-full rounded-t-md transition-all duration-300 hover:opacity-80 cursor-pointer shadow-sm ${
                                isHighLatency ? 'bg-gradient-to-t from-red-600 to-red-400' : 'bg-gradient-to-t from-green-600 to-green-400'
                              } ${isPeakHour ? 'ring-2 ring-red-400 ring-offset-1' : ''} ${isBestHour ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}
                              style={{ height: `${barHeightPx}px` }}
                            >
                              {/* Value label on top of bar */}
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-foreground whitespace-nowrap">
                                {pattern.avg_latency.toFixed(0)}ms
                              </div>
                              
                              {/* Special Hour Badges */}
                              {isPeakHour && (
                                <Badge variant="destructive" className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-xs h-4 px-1 whitespace-nowrap">
                                  Peak
                                </Badge>
                              )}
                              {isBestHour && (
                                <Badge variant="default" className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-xs h-4 px-1 bg-green-600 whitespace-nowrap">
                                  Best
                                </Badge>
                              )}
                            </div>
                            
                            {/* Tooltip on Hover */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              <div className="bg-popover border rounded-lg shadow-lg p-3 text-xs min-w-32">
                                <div className="font-medium text-center mb-2">{formatHour(pattern.hour_of_day)}</div>
                                <div className="space-y-1">
                                  <div className={`font-medium ${isHighLatency ? 'text-red-600' : 'text-green-600'}`}>
                                    Latency: {pattern.avg_latency.toFixed(0)}ms
                                  </div>
                                  <div>Success: {pattern.success_rate.toFixed(1)}%</div>
                                  <div>Checks: {pattern.total_checks.toLocaleString()}</div>
                                  <div>Frequency: {pattern.check_frequency}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Hour Labels - positioned outside the bars container */}
                    <div className="absolute -bottom-8 left-0 right-0 flex gap-1">
                      {sortedPatterns.map((pattern) => {
                        const barWidth = `calc((100% - ${sortedPatterns.length - 1} * 0.25rem) / ${sortedPatterns.length})`;
                        return (
                          <div key={`label-${pattern.hour_of_day}`} className="text-xs font-mono text-center text-muted-foreground font-medium" style={{ width: barWidth }}>
                            {pattern.hour_of_day.toString().padStart(2, '0')}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                {/* X-axis label */}
                <div className="mt-4 text-xs text-muted-foreground text-center">
                  Hours (0-23)
                </div>
              </div>
            </div>
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