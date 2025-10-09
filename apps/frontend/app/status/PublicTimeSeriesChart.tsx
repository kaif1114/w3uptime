'use client';

import { Button } from "@/components/ui/button";
import { usePublicMonitorTimeSeries } from "@/hooks/usePublicStatusPage";
import { format } from 'date-fns';
import { AlertTriangle } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface PublicTimeSeriesChartProps {
  monitorId: string;
  period: string;
  type: 'latency' | 'uptime';
  selectedPeriod: "24h" | "7d" | "30d";
  onPeriodChange: (period: "24h" | "7d" | "30d") => void;
}

export function PublicTimeSeriesChart({ monitorId, period, type, selectedPeriod, onPeriodChange }: PublicTimeSeriesChartProps) {
  const { data: timeseriesData, isLoading, error } = usePublicMonitorTimeSeries(monitorId, period);

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="capitalize">{type} Over Time</h1>
          <div className="flex space-x-2">
            {["24h", "7d", "30d"].map((periodOption) => (
              <Button
                key={periodOption}
                variant={selectedPeriod === periodOption ? "default" : "outline"}
                size="sm"
                onClick={() => onPeriodChange(periodOption as "24h" | "7d" | "30d")}
              >
                {periodOption}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <div className="animate-pulse">
            <div className="h-80 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="capitalize">{type} Over Time</h1>
          <div className="flex space-x-2">
            {["24h", "7d", "30d"].map((periodOption) => (
              <Button
                key={periodOption}
                variant={selectedPeriod === periodOption ? "default" : "outline"}
                size="sm"
                onClick={() => onPeriodChange(periodOption as "24h" | "7d" | "30d")}
              >
                {periodOption}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
            <p className="text-destructive">Failed to load {type} data</p>
          </div>
        </div>
      </div>
    );
  }

  if (!timeseriesData?.data || timeseriesData.data.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="capitalize">{type} Over Time</h1>
          <div className="flex space-x-2">
            {["24h", "7d", "30d"].map((periodOption) => (
              <Button
                key={periodOption}
                variant={selectedPeriod === periodOption ? "default" : "outline"}
                size="sm"
                onClick={() => onPeriodChange(periodOption as "24h" | "7d" | "30d")}
              >
                {periodOption}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No {type} data available for this period</p>
          </div>
        </div>
      </div>
    );
  }

  
  const chartData = timeseriesData.data.map(point => {
    
    const timeValue = point.time_bucket && typeof point.time_bucket === 'string' 
      ? point.time_bucket 
      : new Date().toISOString(); 
    
    const dateObj = new Date(timeValue);
    const isValidDate = !isNaN(dateObj.getTime());
    
    
    const getTimeFormat = (period: string) => {
      switch(period) {
        case 'hour': return 'HH:mm';
        case 'day': return 'HH:mm';
        case 'week': return 'MMM dd';
        case 'month': return 'MMM dd';
        default: return 'MMM dd HH:mm';
      }
    };
    
    return {
      time: isValidDate ? dateObj.getTime() : Date.now(),
      timeFormatted: isValidDate 
        ? format(dateObj, getTimeFormat(period))
        : 'Invalid Date',
      latency: Math.round(Number(point.avg_latency) || 0),
      uptime: Math.round(Number(point.uptime_percentage) || 0),
      checks: Number(point.total_checks) || 0,
    };
  });

  const formatTooltipValue = (value: unknown, name: string): [string, string] => {
    if (name === 'latency') return [`${value}ms`, 'Latency'];
    if (name === 'uptime') return [`${value}%`, 'Uptime'];
    return [String(value), name];
  };

  const formatTooltipLabel = (label: unknown): string => {
    if (typeof label === 'number') {
      return format(new Date(label), 'MMM dd, yyyy HH:mm');
    }
    return String(label);
  };

  if (type === 'latency') {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1>Response Time Over Time</h1>
          <div className="flex space-x-2">
            {["24h", "7d", "30d"].map((periodOption) => (
              <Button
                key={periodOption}
                variant={selectedPeriod === periodOption ? "default" : "outline"}
                size="sm"
                onClick={() => onPeriodChange(periodOption as "24h" | "7d" | "30d")}
              >
                {periodOption}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
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
                <Line 
                  type="monotone" 
                  dataKey="latency" 
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Period: {period}</span>
          </div>
        </div>
      </div>
    );
  }

  
  return (
      <div>
      <div className="flex items-center justify-between mb-4">
        <h1>Uptime Over Time</h1>
        <div className="flex space-x-2">
          {["24h", "7d", "30d"].map((periodOption) => (
            <Button
              key={periodOption}
              variant={selectedPeriod === periodOption ? "default" : "outline"}
              size="sm"
              onClick={() => onPeriodChange(periodOption as "24h" | "7d" | "30d")}
            >
              {periodOption}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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
                <Line 
                  type="monotone" 
                  dataKey="uptime" 
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Period: {period}</span>
        </div>
      </div>
    </div>
  );
}