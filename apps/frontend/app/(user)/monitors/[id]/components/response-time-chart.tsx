"use client";

import { ResponseTimeData } from "@/types/monitor";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ResponseTimeChartProps {
  data: ResponseTimeData[];
}

export function ResponseTimeChart({ data }: ResponseTimeChartProps) {
  const [timeRange, setTimeRange] = useState<"Day" | "Week" | "Month">("Day");

  // Generate sample data for visualization
  const generateSampleData = () => {
    const now = new Date();
    const points = [];
    const intervals = timeRange === "Day" ? 24 : timeRange === "Week" ? 7 * 24 : 30 * 24;
    
    for (let i = intervals; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const responseTime = 200 + Math.random() * 400; // Random response time between 200-600ms
      points.push({
        timestamp: timestamp.toISOString(),
        responseTime,
        status: Math.random() > 0.05 ? "success" : "failure" as const
      });
    }
    
    return points;
  };

  const chartData = data.length > 0 ? data : generateSampleData();
  
  // Simple SVG-based chart
  const maxResponseTime = Math.max(...chartData.map(d => d.responseTime));
  const minResponseTime = Math.min(...chartData.map(d => d.responseTime));
  const chartHeight = 300;
  const chartWidth = 800;
  const padding = 40;

  const getX = (index: number) => padding + (index * (chartWidth - 2 * padding)) / (chartData.length - 1);
  const getY = (responseTime: number) => 
    padding + ((maxResponseTime - responseTime) * (chartHeight - 2 * padding)) / (maxResponseTime - minResponseTime);

  const pathData = chartData
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${getX(index)} ${getY(point.responseTime)}`)
    .join(' ');

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
        <svg width={chartWidth} height={chartHeight} className="border rounded">
          {/* Grid lines */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = padding + (i * (chartHeight - 2 * padding)) / 4;
            return (
              <g key={i}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {Math.round(maxResponseTime - (i * (maxResponseTime - minResponseTime)) / 4)}ms
                </text>
              </g>
            );
          })}
          
          {/* Time axis */}
          {chartData.map((point, index) => {
            if (index % Math.ceil(chartData.length / 8) === 0) {
              const x = getX(index);
              const time = new Date(point.timestamp);
              return (
                <g key={index}>
                  <line
                    x1={x}
                    y1={padding}
                    x2={x}
                    y2={chartHeight - padding}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={chartHeight - padding + 20}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#6b7280"
                  >
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </text>
                </g>
              );
            }
            return null;
          })}

          {/* Response time line */}
          <path
            d={pathData}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
          />

          {/* Data points */}
          {chartData.map((point, index) => (
            <circle
              key={index}
              cx={getX(index)}
              cy={getY(point.responseTime)}
              r={3}
              fill={point.status === "success" ? "#3b82f6" : "#ef4444"}
              className="hover:r-5 transition-all cursor-pointer"
            >
              <title>{`${point.responseTime.toFixed(0)}ms at ${new Date(point.timestamp).toLocaleString()}`}</title>
            </circle>
          ))}
        </svg>
      </div>

      <div className="text-sm text-muted-foreground text-center">
        Average response time: {Math.round(chartData.reduce((sum, d) => sum + d.responseTime, 0) / chartData.length)}ms
      </div>
    </div>
  );
} 