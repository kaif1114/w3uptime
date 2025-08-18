'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMonitorTimeSeries } from "@/hooks/useMonitors";
import { AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';

interface TimeSeriesChartProps {
  monitorId: string;
  period: string;
  bucketSize: string;
  type: 'latency' | 'uptime';
}

export function TimeSeriesChart({ monitorId, period, bucketSize, type }: TimeSeriesChartProps) {
  const { data: timeseriesData, isLoading, error } = useMonitorTimeSeries(monitorId, period, bucketSize);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{type} Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-80 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{type} Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
            <p className="text-destructive">Failed to load {type} data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timeseriesData?.data || timeseriesData.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{type} Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No {type} data available for this period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart
  const chartData = timeseriesData.data.map(point => ({
    time: new Date(point.time_bucket).getTime(),
    timeFormatted: format(new Date(point.time_bucket), bucketSize.includes('day') ? 'MMM dd' : 'MMM dd HH:mm'),
    latency: Math.round(point.avg_latency || 0),
    uptime: Math.round(point.uptime_percentage || 0),
    checks: point.total_checks,
  }));

  const formatTooltipValue = (value: any, name: string) => {
    if (name === 'latency') return [`${value}ms`, 'Latency'];
    if (name === 'uptime') return [`${value}%`, 'Uptime'];
    return [value, name];
  };

  const formatTooltipLabel = (label: any) => {
    if (typeof label === 'number') {
      return format(new Date(label), bucketSize.includes('day') ? 'MMM dd, yyyy' : 'MMM dd, yyyy HH:mm');
    }
    return label;
  };

  if (type === 'latency') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Response Time Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="timeFormatted"
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  className="text-xs"
                  label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={formatTooltipValue}
                  labelFormatter={formatTooltipLabel}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="latency" 
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Period: {period}</span>
            <span>Resolution: {bucketSize}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Uptime chart
  return (
    <Card>
      <CardHeader>
        <CardTitle>Uptime Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="timeFormatted"
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                className="text-xs"
                domain={[0, 100]}
                label={{ value: 'Uptime (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={formatTooltipValue}
                labelFormatter={formatTooltipLabel}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Area 
                type="monotone" 
                dataKey="uptime" 
                stroke="hsl(var(--green-500))"
                fill="hsl(var(--green-500))"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Period: {period}</span>
          <span>Resolution: {bucketSize}</span>
        </div>
      </CardContent>
    </Card>
  );
}