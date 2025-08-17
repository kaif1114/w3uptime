'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Download, 
  RefreshCw, 
  Play, 
  Pause,
  Settings,
  Filter,
  Calendar
} from 'lucide-react';

export type TimePeriod = '1h' | '6h' | '24h' | '7d' | '30d';
export type UpdateFrequency = '1m' | '3m' | '5m' | '15m' | '1h';
export type MetricType = 'latency' | 'uptime' | 'incidents' | 'all';

interface MonitoringControlsProps {
  timePeriod: TimePeriod;
  updateFrequency: UpdateFrequency;
  metricType: MetricType;
  autoRefresh: boolean;
  onTimePeriodChange: (period: TimePeriod) => void;
  onUpdateFrequencyChange: (frequency: UpdateFrequency) => void;
  onMetricTypeChange: (type: MetricType) => void;
  onAutoRefreshToggle: () => void;
  onManualRefresh: () => void;
  onExportData: () => void;
  lastUpdated?: Date;
  isRefreshing?: boolean;
}

const TIME_PERIOD_OPTIONS = [
  { value: '1h' as TimePeriod, label: '1 Hour', description: 'Last hour' },
  { value: '6h' as TimePeriod, label: '6 Hours', description: 'Last 6 hours' },
  { value: '24h' as TimePeriod, label: '24 Hours', description: 'Last day' },
  { value: '7d' as TimePeriod, label: '7 Days', description: 'Last week' },
  { value: '30d' as TimePeriod, label: '30 Days', description: 'Last month' }
];

const UPDATE_FREQUENCY_OPTIONS = [
  { value: '1m' as UpdateFrequency, label: '1 Minute', description: 'Real-time' },
  { value: '3m' as UpdateFrequency, label: '3 Minutes', description: 'High frequency' },
  { value: '5m' as UpdateFrequency, label: '5 Minutes', description: 'Standard' },
  { value: '15m' as UpdateFrequency, label: '15 Minutes', description: 'Low frequency' },
  { value: '1h' as UpdateFrequency, label: '1 Hour', description: 'Minimal updates' }
];

const METRIC_TYPE_OPTIONS = [
  { value: 'all' as MetricType, label: 'All Metrics', icon: Settings },
  { value: 'latency' as MetricType, label: 'Latency Only', icon: Clock },
  { value: 'uptime' as MetricType, label: 'Uptime Only', icon: RefreshCw },
  { value: 'incidents' as MetricType, label: 'Incidents Only', icon: Filter }
];

export function MonitoringControls({
  timePeriod,
  updateFrequency,
  metricType,
  autoRefresh,
  onTimePeriodChange,
  onUpdateFrequencyChange,
  onMetricTypeChange,
  onAutoRefreshToggle,
  onManualRefresh,
  onExportData,
  lastUpdated,
  isRefreshing = false
}: MonitoringControlsProps) {

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes === 0) return 'Just now';
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return date.toLocaleString();
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Time Period Control */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium min-w-0">Period:</span>
            <Select value={timePeriod} onValueChange={onTimePeriodChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIOD_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Update Frequency Control */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium min-w-0">Updates:</span>
            <Select value={updateFrequency} onValueChange={onUpdateFrequencyChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UPDATE_FREQUENCY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Metric Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium min-w-0">Show:</span>
            <Select value={metricType} onValueChange={onMetricTypeChange}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_TYPE_OPTIONS.map(option => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Spacer for larger screens */}
          <div className="hidden lg:flex lg:flex-1" />

          {/* Control Actions */}
          <div className="flex items-center gap-2">
            {/* Auto-refresh toggle */}
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={onAutoRefreshToggle}
              className="min-w-0"
            >
              {autoRefresh ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Auto-On
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Auto-Off
                </>
              )}
            </Button>

            {/* Manual refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={onManualRefresh}
              disabled={isRefreshing}
              className="min-w-0"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {/* Export data */}
            <Button
              variant="outline"
              size="sm"
              onClick={onExportData}
              className="min-w-0"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4 pt-4 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {lastUpdated && (
              <span>
                Last updated: {formatLastUpdated(lastUpdated)}
              </span>
            )}
            {autoRefresh && (
              <Badge variant="outline" className="text-xs">
                Auto-refresh: {UPDATE_FREQUENCY_OPTIONS.find(opt => opt.value === updateFrequency)?.label}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {TIME_PERIOD_OPTIONS.find(opt => opt.value === timePeriod)?.description}
            </Badge>
            {isRefreshing && (
              <Badge variant="secondary" className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Updating...
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}