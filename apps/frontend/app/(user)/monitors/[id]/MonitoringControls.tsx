'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw } from "lucide-react";

export type TimePeriod = 'day' | 'week' | 'month';
export type UpdateFrequency = '30s' | '1m' | '5m' | '15m' | '30m';

interface MonitoringControlsProps {
  timePeriod: TimePeriod;
  updateFrequency: UpdateFrequency;
  autoRefresh: boolean;
  onTimePeriodChange: (period: TimePeriod) => void;
  onUpdateFrequencyChange: (freq: UpdateFrequency) => void;
  onAutoRefreshToggle: () => void;
  onManualRefresh: () => void;
  lastUpdated: Date;
  isRefreshing: boolean;
}

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  'day': 'Last Day', 
  'week': 'Last Week',
  'month': 'Last Month',
};

export function MonitoringControls({
  timePeriod,
  autoRefresh,
  onTimePeriodChange,
  onAutoRefreshToggle,
  onManualRefresh,
  lastUpdated,
  isRefreshing
}: MonitoringControlsProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-4">
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Period:</span>
              <Select value={timePeriod} onValueChange={onTimePeriodChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIME_PERIOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Auto-refresh:</span>
              <Button 
                variant={autoRefresh ? "default" : "outline"} 
                size="sm"
                onClick={onAutoRefreshToggle}
              >
                {autoRefresh ? 'On' : 'Off'}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Last updated:</span>
              <Badge variant="outline">
                {lastUpdated.toLocaleTimeString()}
              </Badge>
            </div>

            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onManualRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

          </div>
        </div>
      </CardContent>
    </Card>
  );
}