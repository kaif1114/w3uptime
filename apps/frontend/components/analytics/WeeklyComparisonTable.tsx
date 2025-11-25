'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WeeklyComparison } from "@/types/analytics";
import { TrendingUp, TrendingDown, Minus, CalendarDays } from "lucide-react";

interface WeeklyComparisonTableProps {
  comparisons: WeeklyComparison[];
}

const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
  switch (direction) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-gray-400" />;
  }
};

const getTrendColor = (direction: 'up' | 'down' | 'stable', metricName: string) => {
  
  
  const isLatency = metricName.toLowerCase().includes('latency');
  
  if (direction === 'stable') return 'text-gray-600';
  
  if (isLatency) {
    return direction === 'down' ? 'text-green-600' : 'text-red-600';
  } else {
    return direction === 'up' ? 'text-green-600' : 'text-red-600';
  }
};

const getTrendBadge = (direction: 'up' | 'down' | 'stable', metricName: string): { variant: "default" | "secondary" | "destructive" | "outline", text: string } => {
  const isLatency = metricName.toLowerCase().includes('latency');
  
  if (direction === 'stable') {
    return { variant: 'secondary', text: 'STABLE' };
  }
  
  if (isLatency) {
    return direction === 'down' 
      ? { variant: 'default', text: 'IMPROVED' }
      : { variant: 'destructive', text: 'DEGRADED' };
  } else {
    return direction === 'up' 
      ? { variant: 'default', text: 'IMPROVED' }
      : { variant: 'destructive', text: 'DECLINED' };
  }
};

const formatValue = (value: number, metricName: string): string => {
  if (metricName.toLowerCase().includes('latency')) {
    return `${value.toFixed(0)}ms`;
  } else if (metricName.toLowerCase().includes('uptime')) {
    return `${value.toFixed(2)}%`;
  } else {
    return value.toLocaleString();
  }
};

const formatChangePercentage = (percentage: number): string => {
  const abs = Math.abs(percentage);
  const sign = percentage >= 0 ? '+' : '-';
  return `${sign}${abs.toFixed(1)}%`;
};

export function WeeklyComparisonTable({ comparisons }: WeeklyComparisonTableProps) {
  if (comparisons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-500" />
            Weekly Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No comparison data available</p>
            <p className="text-xs mt-1">Data will appear after at least one week of monitoring</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-500" />
          Weekly Performance Comparison
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Compare this week&apos;s performance with the previous week
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Metric</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-muted-foreground">This Week</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-muted-foreground">Last Week</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-muted-foreground">Change</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-muted-foreground">Trend</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((comparison, index) => {
                  const trendColor = getTrendColor(comparison.trend_direction, comparison.metric_name);
                  const trendBadge = getTrendBadge(comparison.trend_direction, comparison.metric_name);
                  
                  return (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="py-3 px-3">
                        <div className="font-medium text-sm">{comparison.metric_name}</div>
                      </td>
                      <td className="text-center py-3 px-3">
                        <div className="font-semibold">
                          {formatValue(comparison.current_week, comparison.metric_name)}
                        </div>
                      </td>
                      <td className="text-center py-3 px-3">
                        <div className="text-muted-foreground">
                          {formatValue(comparison.previous_week, comparison.metric_name)}
                        </div>
                      </td>
                      <td className="text-center py-3 px-3">
                        <div className={`font-medium flex items-center justify-center gap-1 ${trendColor}`}>
                          {getTrendIcon(comparison.trend_direction)}
                          <span className="text-sm">
                            {formatChangePercentage(comparison.change_percentage)}
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-3">
                        <Badge variant={trendBadge.variant} className="text-xs">
                          {trendBadge.text}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          
          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-3">Week-over-Week Summary:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-green-50 p-2 rounded border">
                <div className="text-green-700 font-medium mb-1">Improved Metrics</div>
                <div className="text-green-600">
                  {comparisons.filter(c => {
                    const isLatency = c.metric_name.toLowerCase().includes('latency');
                    return isLatency ? c.trend_direction === 'down' : c.trend_direction === 'up';
                  }).length} out of {comparisons.length}
                </div>
              </div>
              
              <div className="bg-red-50 p-2 rounded border">
                <div className="text-red-700 font-medium mb-1">Degraded Metrics</div>
                <div className="text-red-600">
                  {comparisons.filter(c => {
                    const isLatency = c.metric_name.toLowerCase().includes('latency');
                    return isLatency ? c.trend_direction === 'up' : c.trend_direction === 'down';
                  }).length} out of {comparisons.length}
                </div>
              </div>
              
              <div className="bg-gray-50 p-2 rounded border">
                <div className="text-gray-700 font-medium mb-1">Stable Metrics</div>
                <div className="text-gray-600">
                  {comparisons.filter(c => c.trend_direction === 'stable').length} out of {comparisons.length}
                </div>
              </div>
            </div>
          </div>

          
          <div className="space-y-2 text-xs text-muted-foreground">
            {comparisons.length > 0 && (
              <div>
                <strong>Key Insights:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  {comparisons.map((comparison, index) => {
                    const isImproved = comparison.metric_name.toLowerCase().includes('latency') 
                      ? comparison.trend_direction === 'down' 
                      : comparison.trend_direction === 'up';
                    
                    if (Math.abs(comparison.change_percentage) > 5) {
                      return (
                        <li key={index} className="list-disc">
                          <strong>{comparison.metric_name}</strong> {isImproved ? 'improved' : 'declined'} by{' '}
                          <strong>{Math.abs(comparison.change_percentage).toFixed(1)}%</strong> compared to last week
                        </li>
                      );
                    }
                    return null;
                  }).filter(Boolean)}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}