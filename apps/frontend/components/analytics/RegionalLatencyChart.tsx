'use client';

import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAvailableRegions } from "@/hooks/useAnalytics";
import { useMonitorRegionalTimeseries } from "@/hooks/useAnalytics";
import { EnhancedTimePeriod } from "@/types/analytics";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo, useState } from "react";

interface RegionalLatencyChartProps {
  monitorId: string;
  period: EnhancedTimePeriod | string;
  defaultRegionType?: 'continent' | 'country';
  customPeriod?: { startDate: string; endDate: string };
}

export function RegionalLatencyChart({ monitorId, period, defaultRegionType = 'country', customPeriod }: RegionalLatencyChartProps) {
  const [regionType, setRegionType] = useState<'continent' | 'country'>(defaultRegionType);
  const { data: regions, isLoading: loadingRegions } = useAvailableRegions(regionType, monitorId);
  const firstRegionCode = regions?.regions?.[0]?.region_id ?? '';
  const [regionCode, setRegionCode] = useState<string>(firstRegionCode);

  const effectiveRegionCode = regionCode || firstRegionCode;
  const { data, isLoading, error } = useMonitorRegionalTimeseries(
    monitorId,
    regionType,
    effectiveRegionCode,
    (typeof period === 'string' ? period : 'day') as 'day' | 'week' | 'month' | 'custom',
    typeof period === 'object' && period === 'custom'
      ? (customPeriod ? { start: customPeriod.startDate, end: customPeriod.endDate } : undefined)
      : (typeof period === 'string' && period === 'custom' && customPeriod
          ? { start: customPeriod.startDate, end: customPeriod.endDate }
          : undefined)
  );

  const chartData = useMemo(() => {
    if (!data?.data) return [];
    return data.data.map(p => ({
      time: p.time_bucket,
      latency: p.avg_latency,
    }));
  }, [data]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Latency by Region</CardTitle>
        <div className="flex gap-2">
          <Select value={regionType} onValueChange={(v) => { setRegionType(v as 'continent' | 'country'); setRegionCode(''); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Region type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="country">Country</SelectItem>
              <SelectItem value="continent">Continent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={effectiveRegionCode} onValueChange={setRegionCode} disabled={loadingRegions || (regions?.regions?.length ?? 0) === 0}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={loadingRegions ? 'Loading…' : 'Select region'} />
            </SelectTrigger>
            <SelectContent>
              {(regions?.regions ?? []).map(r => (
                <SelectItem key={r.region_id} value={r.region_id}>{r.region_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-80 bg-muted rounded animate-pulse" />
        ) : error ? (
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
            <p className="text-destructive">Failed to load regional timeseries</p>
          </div>
        ) : (chartData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No data for selection</div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: unknown) => [`${value}ms`, 'Latency']}
                />
                <Line type="monotone" dataKey="latency" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}


