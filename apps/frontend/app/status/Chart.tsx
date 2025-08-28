'use client';

import { useState } from 'react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {  CheckCircle } from 'lucide-react';

interface ChartDataPoint {
  timestamp: string;
  responseTime: number;
  uptime: number;
  status: 'up' | 'down' | 'maintenance';
}

interface ChartProps {
  data: ChartDataPoint[];
  monitorName: string;
  period?: '24h' | '7d' | '30d';
}

export function ResponseTimeChart({ data, monitorName, period = '24h' }: ChartProps) {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>(period);

  // Transform data for chart
  const chartData = data.map(point => ({
    time: format(new Date(point.timestamp), timeRange === '24h' ? 'HH:mm' : 'MMM dd'),
    responseTime: point.responseTime,
    timestamp: point.timestamp
  }));

  const formatTooltip = (value: any, name: string) => {
    if (name === 'responseTime') {
      return [`${value.toFixed(2)}ms`, 'Response Time'];
    }
    return [value, name];
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Response times</h3>
        <Select value={timeRange} onValueChange={(value: '24h' | '7d' | '30d') => setTimeRange(value)}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24h</SelectItem>
            <SelectItem value="7d">7d</SelectItem>
            <SelectItem value="30d">30d</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={formatTooltip}
              labelFormatter={(label) => `Time: ${label}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Line 
              type="monotone" 
              dataKey="responseTime" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={false}
              name="Response Time"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function UptimeBarChart({ data, monitorName, period = '24h' }: ChartProps) {
  // Generate sample uptime data for the bar chart
  const generateUptimeBars = () => {
    const bars = [];
    const hours = period === '24h' ? 24 : period === '7d' ? 7 : 30;
    
    for (let i = 0; i < hours; i++) {
      const isUp = Math.random() > 0.1; // 90% uptime
      const isMaintenance = Math.random() > 0.95; // 5% maintenance
      
      let status = 'up';
      if (isMaintenance) status = 'maintenance';
      else if (!isUp) status = 'down';
      
      bars.push({
        hour: i,
        status,
        color: status === 'up' ? '#10b981' : status === 'down' ? '#ef4444' : '#f59e0b'
      });
    }
    
    return bars;
  };

  const uptimeBars = generateUptimeBars();
  const uptimePercentage = (uptimeBars.filter(bar => bar.status === 'up').length / uptimeBars.length) * 100;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="font-medium text-gray-900">{monitorName}</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-green-600 font-semibold">{uptimePercentage.toFixed(3)}% uptime</span>
          <div className="flex items-center space-x-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-gray-600">Operational</span>
          </div>
        </div>
      </div>
      
      <div className="flex space-x-1 h-8">
        {uptimeBars.map((bar, index) => (
          <div
            key={index}
            className={`flex-1 rounded-sm ${
              bar.status === 'up' ? 'bg-green-500' : 
              bar.status === 'down' ? 'bg-red-500' : 'bg-yellow-500'
            }`}
            title={`Hour ${bar.hour}: ${bar.status}`}
          />
        ))}
      </div>
      
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{period === '24h' ? '12:00am' : period === '7d' ? '7 days ago' : '30 days ago'}</span>
        <span>{period === '24h' ? '11:59pm' : 'Today'}</span>
      </div>
    </div>
  );
}

export function UptimeChart({ data, monitorName, period = '24h' }: ChartProps) {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>(period);

  // Transform data for chart
  const chartData = data.map(point => ({
    time: format(new Date(point.timestamp), timeRange === '24h' ? 'HH:mm' : 'MMM dd'),
    uptime: point.uptime,
    timestamp: point.timestamp
  }));

  const formatTooltip = (value: any, name: string) => {
    if (name === 'uptime') {
      return [`${value.toFixed(2)}%`, 'Uptime'];
    }
    return [value, name];
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Uptime Percentage</h3>
        <Select value={timeRange} onValueChange={(value: '24h' | '7d' | '30d') => setTimeRange(value)}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24h</SelectItem>
            <SelectItem value="7d">7d</SelectItem>
            <SelectItem value="30d">30d</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              domain={[0, 100]}
              label={{ value: 'Uptime (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={formatTooltip}
              labelFormatter={(label) => `Time: ${label}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Area 
              type="monotone" 
              dataKey="uptime" 
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.2}
              strokeWidth={2}
              name="Uptime"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Combined chart component that shows all charts
export function MonitorCharts({ data, monitorName, period = '24h' }: ChartProps) {
  return (
    <div className="space-y-6">
      <UptimeBarChart data={data} monitorName={monitorName} period={period} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResponseTimeChart data={data} monitorName={monitorName} period={period} />
        <UptimeChart data={data} monitorName={monitorName} period={period} />
      </div>
    </div>
  );
}
