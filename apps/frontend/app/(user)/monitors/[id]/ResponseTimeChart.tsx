"use client";

import { ResponseTimeData } from "@/types/monitor";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ResponseTimeChartProps {
  data: ResponseTimeData[];
}

interface MultiMetricData {
  timestamp: string;
  nameLookup: number;
  connection: number;
  tlsHandshake: number;
  dataTransfer: number;
}

export function ResponseTimeChart({ data }: ResponseTimeChartProps) {
  const [timeRange, setTimeRange] = useState<"Day" | "Week" | "Month">("Day");

  
  const generateSampleData = (): MultiMetricData[] => {
    const now = new Date();
    const points = [];
    const intervals = timeRange === "Day" ? 48 : timeRange === "Week" ? 7 * 24 : 30 * 24;
    
    for (let i = intervals; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * (timeRange === "Day" ? 30 : 60) * 60 * 1000));
      
      
      const nameLookup = 50 + Math.random() * 100; 
      const connection = 100 + Math.random() * 200; 
      const tlsHandshake = 200 + Math.random() * 300; 
      const dataTransfer = 300 + Math.random() * 400; 
      
      points.push({
        timestamp: timestamp.toISOString(),
        nameLookup,
        connection,
        tlsHandshake,
        dataTransfer
      });
    }
    
    return points;
  };

  const chartData = generateSampleData();
  
  
  const chartHeight = 400;
  const chartWidth = 1000;
  const padding = 60;

  
  const allValues = chartData.flatMap(d => [d.nameLookup, d.connection, d.tlsHandshake, d.dataTransfer]);
  const maxResponseTime = Math.max(...allValues);
  const minResponseTime = Math.min(...allValues);

  const getX = (index: number) => padding + (index * (chartWidth - 2 * padding)) / (chartData.length - 1);
  const getY = (responseTime: number) => 
    padding + ((maxResponseTime - responseTime) * (chartHeight - 2 * padding)) / (maxResponseTime - minResponseTime);

  
  const generatePath = (metric: keyof Pick<MultiMetricData, 'nameLookup' | 'connection' | 'tlsHandshake' | 'dataTransfer'>) => {
    return chartData
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${getX(index)} ${getY(point[metric])}`)
      .join(' ');
  };

  const metrics = [
    { key: 'nameLookup' as const, color: '#8b5cf6', name: 'Name lookup' },
    { key: 'connection' as const, color: '#60a5fa', name: 'Connection' },
    { key: 'tlsHandshake' as const, color: '#34d399', name: 'TLS handshake' },
    { key: 'dataTransfer' as const, color: '#2dd4bf', name: 'Data transfer' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {(["Day", "Week", "Month"] as const).map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange(range)}
          >
            {range}
          </Button>
        ))}
      </div>
      
      <div className="w-full overflow-x-auto">
        <svg width={chartWidth} height={chartHeight + 40} className="bg-background rounded-lg max-w-full">
          
          <rect width={chartWidth} height={chartHeight + 40} fill="currentColor" className="fill-background" />
          
          
          {Array.from({ length: 6 }).map((_, i) => {
            const y = padding + (i * (chartHeight - 2 * padding)) / 5;
            return (
              <g key={i}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth={1}
                  className="stroke-border"
                  opacity={0.3}
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="currentColor"
                  className="fill-muted-foreground"
                >
                  {Math.round(maxResponseTime - (i * (maxResponseTime - minResponseTime)) / 5)}ms
                </text>
              </g>
            );
          })}
          
          
          {chartData.map((point, index) => {
            if (index % Math.ceil(chartData.length / 6) === 0) {
              const x = getX(index);
              const time = new Date(point.timestamp);
              return (
                <g key={index}>
                  <line
                    x1={x}
                    y1={padding}
                    x2={x}
                    y2={chartHeight - padding}
                    stroke="currentColor"
                    strokeWidth={1}
                    className="stroke-border"
                    opacity={0.3}
                  />
                  <text
                    x={x}
                    y={chartHeight - padding + 20}
                    textAnchor="middle"
                    fontSize="11"
                    fill="currentColor"
                    className="fill-muted-foreground"
                  >
                    {timeRange === "Day" 
                      ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : time.toLocaleDateString([], { month: 'short', day: 'numeric' })
                    }
                  </text>
                </g>
              );
            }
            return null;
          })}

          
          {metrics.map((metric) => (
            <path
              key={metric.key}
              d={generatePath(metric.key)}
              fill="none"
              stroke={metric.color}
              strokeWidth={2}
              opacity={0.8}
            />
          ))}
        </svg>
      </div>

      <div className="text-sm text-muted-foreground text-center">
        <span>Average response times: </span>
        {metrics.map((metric, index) => {
          const avg = Math.round(chartData.reduce((sum, d) => sum + d[metric.key], 0) / chartData.length);
          return (
            <span key={metric.key}>
              <span style={{ color: metric.color }}>{metric.name}: {avg}ms</span>
              {index < metrics.length - 1 && " • "}
            </span>
          );
        })}
      </div>
    </div>
  );
}