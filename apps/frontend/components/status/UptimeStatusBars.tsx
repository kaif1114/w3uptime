"use client";

import React, { useState } from 'react';
import { useUptimeStatusBars } from '@/hooks/useUptimeStatusBars';
import { CheckCircle } from 'lucide-react';

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

interface TooltipData {
  bar: StatusBar;
  position: { x: number; y: number };
}

export const UptimeStatusBars: React.FC<UptimeStatusBarsProps> = ({ 
  monitorId, 
  period 
}) => {
  const { data: statusBars, isLoading, error } = useUptimeStatusBars(monitorId, period);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  if (isLoading) {
    // Show skeleton bars while loading  
    const skeletonCount = period === "24h" ? 24 : period === "7d" ? 7 : 30;
    return (
      <div className="flex items-center justify-center w-full space-x-px">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-6 bg-muted animate-pulse max-w-3"
          />
        ))}
      </div>
    );
  }

  if (error || !statusBars) {
    // Show empty bars on error
    const errorCount = period === "24h" ? 24 : period === "7d" ? 7 : 30;
    return (
      <div className="flex items-center justify-center w-full space-x-px">
        {Array.from({ length: errorCount }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-6 bg-muted max-w-3"
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

  const formatTooltipDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusText = (bar: StatusBar) => {
    if (bar.status === 'no-data') return "No data";
    if (bar.uptime_percentage >= 95) return "Operational";
    return "Outage";
  };

  const handleBarHover = (bar: StatusBar, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      bar,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      }
    });
  };

  const handleBarLeave = () => {
    setTooltip(null);
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-center w-full space-x-px">
        {statusBars.map((bar) => (
          <div
            key={bar.id}
            className={`flex-1 h-6 transition-all duration-200 hover:scale-y-110 cursor-pointer max-w-3 ${getBarColor(bar)}`}
            onMouseEnter={(e) => handleBarHover(bar, e)}
            onMouseLeave={handleBarLeave}
          />
        ))}
      </div>
      
      {/* Tooltip */}
      {tooltip && (
        <div 
          className="fixed z-50 px-3 py-2 bg-card border border-border rounded-lg shadow-lg"
          style={{
            left: tooltip.position.x - 50, // Center the tooltip
            top: tooltip.position.y - 80,
          }}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-card-foreground">
              {getStatusText(tooltip.bar)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {formatTooltipDate(tooltip.bar.timestamp)}
          </div>
        </div>
      )}
    </div>
  );
};