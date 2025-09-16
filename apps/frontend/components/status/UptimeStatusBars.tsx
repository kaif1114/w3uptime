"use client";

import React from 'react';
import { useUptimeStatusBars } from '@/hooks/useUptimeStatusBars';

interface UptimeStatusBarsProps {
  monitorId: string;
  period: "24h" | "7d" | "30d";
}

interface StatusBar {
  id: string;
  timestamp: string;
  status: 'up' | 'down' | 'no-data';
  uptime_percentage: number;
}

export const UptimeStatusBars: React.FC<UptimeStatusBarsProps> = ({ 
  monitorId, 
  period 
}) => {
  const { data: statusBars, isLoading, error } = useUptimeStatusBars(monitorId, period);

  if (isLoading) {
    // Show skeleton bars while loading  
    const skeletonCount = period === "24h" ? 24 : period === "7d" ? 7 : 30;
    return (
      <div className="flex items-center space-x-px">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="w-1 h-6 bg-gray-200 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error || !statusBars) {
    // Show empty bars on error
    const errorCount = period === "24h" ? 24 : period === "7d" ? 7 : 30;
    return (
      <div className="flex items-center space-x-px">
        {Array.from({ length: errorCount }).map((_, i) => (
          <div
            key={i}
            className="w-1 h-6 bg-gray-200"
            title="No data available"
          />
        ))}
      </div>
    );
  }

  const getBarColor = (bar: StatusBar) => {
    if (bar.status === 'no-data') return 'bg-gray-200';
    if (bar.uptime_percentage >= 95) return 'bg-green-500';
    return 'bg-red-500';
  };

  const formatTooltipDate = (timestamp: string, period: string) => {
    const date = new Date(timestamp);
    if (period === "24h") {
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric',
        hour12: true
      });
    }
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatUptimeText = (percentage: number) => {
    if (percentage === 0) return "No data";
    return `${percentage.toFixed(1)}% uptime`;
  };

  return (
    <div className="flex items-center space-x-px">
      {statusBars.map((bar) => (
        <div
          key={bar.id}
          className={`w-1 h-6 transition-all duration-200 hover:scale-110 cursor-pointer ${getBarColor(bar)}`}
          title={`${formatTooltipDate(bar.timestamp, period)}: ${formatUptimeText(bar.uptime_percentage)}`}
        />
      ))}
    </div>
  );
};