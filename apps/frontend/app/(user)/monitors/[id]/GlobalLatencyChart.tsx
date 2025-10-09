'use client';

import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, subHours } from 'date-fns';
import { AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface LatencyDataPoint {
  timestamp: Date;
  northAmerica: number;
  europe: number;
  asia: number;
  oceania: number;
  southAmerica: number;
  africa: number;
  incidents: boolean;
}

interface GlobalLatencyChartProps {
  data: LatencyDataPoint[];
  incidents: Array<{ start: Date; end: Date; title: string }>;
}

type TimePeriod = '1h' | '6h' | '24h' | '7d' | '30d';
type UpdateFrequency = '1m' | '3m' | '5m' | '15m' | '1h';

const TIME_PERIOD_OPTIONS = [
  { value: '1h' as TimePeriod, label: '1 Hour' },
  { value: '6h' as TimePeriod, label: '6 Hours' },
  { value: '24h' as TimePeriod, label: '24 Hours' },
  { value: '7d' as TimePeriod, label: '7 Days' },
  { value: '30d' as TimePeriod, label: '30 Days' }
];

const UPDATE_FREQUENCY_OPTIONS = [
  { value: '1m' as UpdateFrequency, label: '1 Minute' },
  { value: '3m' as UpdateFrequency, label: '3 Minutes' },
  { value: '5m' as UpdateFrequency, label: '5 Minutes' },
  { value: '15m' as UpdateFrequency, label: '15 Minutes' },
  { value: '1h' as UpdateFrequency, label: '1 Hour' }
];

const REGION_COLORS = {
  northAmerica: '#3b82f6', 
  europe: '#10b981', 
  asia: '#f59e0b', 
  oceania: '#8b5cf6', 
  southAmerica: '#ef4444', 
  africa: '#06b6d4' 
};

export function GlobalLatencyChart({ data, incidents }: GlobalLatencyChartProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('24h');
  const [updateFreq, setUpdateFreq] = useState<UpdateFrequency>('5m');
  const [showIncidents, setShowIncidents] = useState(true);

  const filteredData = useMemo(() => {
    const now = new Date();
    let cutoffTime: Date;

    switch (timePeriod) {
      case '1h': cutoffTime = subHours(now, 1); break;
      case '6h': cutoffTime = subHours(now, 6); break;
      case '24h': cutoffTime = subHours(now, 24); break;
      case '7d': cutoffTime = subDays(now, 7); break;
      case '30d': cutoffTime = subDays(now, 30); break;
    }

    return data
      .filter(point => point.timestamp >= cutoffTime)
      .map(point => ({
        ...point,
        formattedTime: format(point.timestamp, timePeriod === '1h' || timePeriod === '6h' ? 'HH:mm' : 'MMM dd HH:mm')
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [data, timePeriod]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return { avg: 0, min: 0, max: 0, p95: 0 };

    const allLatencies = filteredData.flatMap(point => [
      point.northAmerica, point.europe, point.asia, 
      point.oceania, point.southAmerica, point.africa
    ]);

    const avg = Math.round(allLatencies.reduce((sum, val) => sum + val, 0) / allLatencies.length);
    const min = Math.min(...allLatencies);
    const max = Math.max(...allLatencies);
    
    
    const sorted = allLatencies.sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index] || 0;

    return { avg, min: Math.round(min), max: Math.round(max), p95: Math.round(p95) };
  }, [filteredData]);

  const incidentMarkers = useMemo(() => {
    return incidents.filter(incident => {
      const now = new Date();
      let cutoffTime: Date;
      
      switch (timePeriod) {
        case '1h': cutoffTime = subHours(now, 1); break;
        case '6h': cutoffTime = subHours(now, 6); break;
        case '24h': cutoffTime = subHours(now, 24); break;
        case '7d': cutoffTime = subDays(now, 7); break;
        case '30d': cutoffTime = subDays(now, 30); break;
      }
      
      return incident.start >= cutoffTime || incident.end >= cutoffTime;
    });
  }, [incidents, timePeriod]);

  const formatTooltip = (value: number, name: string) => {
    const regionNames = {
      northAmerica: 'North America',
      europe: 'Europe',
      asia: 'Asia',
      oceania: 'Oceania',
      southAmerica: 'South America',
      africa: 'Africa'
    };
    return [`${value}ms`, regionNames[name as keyof typeof regionNames] || name];
  };

  return (
    <div>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Global Latency Performance
          </CardTitle>
          
          <div className="flex flex-wrap items-center gap-2">
            <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIOD_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={updateFreq} onValueChange={(value: UpdateFrequency) => setUpdateFreq(value)}>
              <SelectTrigger className="w-32">
                <Clock className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UPDATE_FREQUENCY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showIncidents ? "default" : "outline"}
              size="sm"
              onClick={() => setShowIncidents(!showIncidents)}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Incidents
            </Button>
          </div>
        </div>

        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Average</p>
            <p className="text-xl font-bold">{stats.avg}ms</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">P95</p>
            <p className="text-xl font-bold">{stats.p95}ms</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Min</p>
            <p className="text-xl font-bold text-green-600">{stats.min}ms</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Max</p>
            <p className="text-xl font-bold text-red-600">{stats.max}ms</p>
          </div>
        </div>
      </div>

      <div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="formattedTime" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={formatTooltip}
                labelFormatter={(label) => `Time: ${label}`}
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Legend />

              
              {showIncidents && incidentMarkers.map((incident, index) => (
                <ReferenceLine
                  key={index}
                  x={format(incident.start, timePeriod === '1h' || timePeriod === '6h' ? 'HH:mm' : 'MMM dd HH:mm')}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{ value: "Incident", position: "top" }}
                />
              ))}

              
              <Line 
                type="monotone" 
                dataKey="northAmerica" 
                stroke={REGION_COLORS.northAmerica} 
                strokeWidth={2}
                dot={false}
                name="North America"
              />
              <Line 
                type="monotone" 
                dataKey="europe" 
                stroke={REGION_COLORS.europe} 
                strokeWidth={2}
                dot={false}
                name="Europe"
              />
              <Line 
                type="monotone" 
                dataKey="asia" 
                stroke={REGION_COLORS.asia} 
                strokeWidth={2}
                dot={false}
                name="Asia"
              />
              <Line 
                type="monotone" 
                dataKey="oceania" 
                stroke={REGION_COLORS.oceania} 
                strokeWidth={2}
                dot={false}
                name="Oceania"
              />
              <Line 
                type="monotone" 
                dataKey="southAmerica" 
                stroke={REGION_COLORS.southAmerica} 
                strokeWidth={2}
                dot={false}
                name="South America"
              />
              <Line 
                type="monotone" 
                dataKey="africa" 
                stroke={REGION_COLORS.africa} 
                strokeWidth={2}
                dot={false}
                name="Africa"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}