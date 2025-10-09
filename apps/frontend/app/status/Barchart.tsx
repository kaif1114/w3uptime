import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DailyStatus, DailyStatusData } from '@/types/monitor';
import React from 'react';

interface DailyStatusBarChartProps {
  data: DailyStatusData[];
  period?: number; 
  title?: string;
  showLegend?: boolean;
  className?: string;
}


const generateSampleDailyData = (days: number = 30 ): DailyStatusData[] => {
  const data: DailyStatusData[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
    const random = Math.random();
    
    let status: DailyStatus;
    let uptime: number;
    let successfulChecks: number;
    const totalChecks = 288; 
    
    if (random > 0.98) {
      status = 'down';
      uptime = Math.random() * 30; 
      successfulChecks = Math.floor(totalChecks * (uptime / 100));
    } else if (random > 0.92) {
      status = 'maintenance';
      uptime = 85 + Math.random() * 10; 
      successfulChecks = Math.floor(totalChecks * (uptime / 100));
    } else {
      status = 'up';
      uptime = 98 + Math.random() * 2; 
      successfulChecks = Math.floor(totalChecks * (uptime / 100));
    }
    
    data.push({
      date: date.toISOString().split('T')[0],
      status,
      uptime: Math.round(uptime * 100) / 100,
      totalChecks,
      successfulChecks,
      averageResponseTime: 200 + Math.random() * 400,
      incidents: status === 'down' ? Math.floor(Math.random() * 3) + 1 : 0
    });
  }
  
  return data;
};

const getStatusColor = (status: DailyStatus): string => {
  switch (status) {
    case 'up':
      return 'bg-green-500 hover:bg-green-600';
    case 'down':
      return 'bg-red-500 hover:bg-red-600';
    case 'partial':
      return 'bg-yellow-500 hover:bg-yellow-600';
    case 'maintenance':
      return 'bg-blue-500 hover:bg-blue-600';
    case 'unknown':
      return 'bg-gray-300 hover:bg-gray-400';
    default:
      return 'bg-gray-300 hover:bg-gray-400';
  }
};

const getStatusDotColor = (status: DailyStatus): string => {
  switch (status) {
    case 'up':
      return 'bg-green-500';
    case 'down':
      return 'bg-red-500';
    case 'partial':
      return 'bg-yellow-500';
    case 'maintenance':
      return 'bg-blue-500';
    case 'unknown':
      return 'bg-gray-300';
    default:
      return 'bg-gray-300';
  }
};

const getStatusText = (status: DailyStatus): string => {
  switch (status) {
    case 'up':
      return 'Operational';
    case 'down':
      return 'Major Outage';
    case 'maintenance':
      return 'Maintenance';
    case 'unknown':
      return 'Not monitored';
    default:
      return 'Not monitored';
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};


const StatusLegend = () => (
  <div className="flex flex-wrap gap-1 text-sm">
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded bg-green-500"></div>
      <span>Operational</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded bg-red-500"></div>
      <span>Major Outage</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded bg-blue-500"></div>
      <span>Maintenance</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded bg-gray-300"></div>
      <span>Not monitored</span>
    </div>
  </div>
);

const DailyStatusBarChart: React.FC<DailyStatusBarChartProps> = ({
  data,
  period = 30,
  title = "Daily Status History",
  showLegend = true,
  className = ""
}) => {
  
  const statusData = data.length > 0 ? data : generateSampleDailyData(period);
  
  const totalDays = statusData.length;
  const overallUptime = statusData.reduce((sum, day) => sum + day.uptime, 0) / totalDays;

  return (
    <TooltipProvider>
   
        <div>
          <div className="flex items-center justify-between">
            <div className="text-lg font-medium">{title}</div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {overallUptime.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                {period} days uptime
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          
          <div className="space-y-4">
            <div className="flex gap-1">
              {statusData.map((day, index) => {
                return (
                  <Tooltip key={day.date} delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div
                        className={`h-8 w-2 rounded-sm cursor-pointer transition-all duration-200 ${getStatusColor(day.status)}`}
                        role="button"
                        tabIndex={0}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="p-3 border rounded-lg bg-background shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusDotColor(day.status)}`}></div>
                        <span className="font-medium">{getStatusText(day.status)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground border-t pt-2">
                        {formatDate(day.date)}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            
            
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{formatDate(statusData[0]?.date || '')}</span>
              <span>← {period} days ago</span>
              <span>Today →</span>
              <span>{formatDate(statusData[statusData.length - 1]?.date || '')}</span>
            </div>
          </div>

          
          {showLegend && (
            <div className="pt-4 border-t">
              <div className="text-sm font-medium mb-3">Status Legend</div>
              <StatusLegend />
            </div>
          )}
        </div>
    
    </TooltipProvider>
  );
};

export default DailyStatusBarChart;
