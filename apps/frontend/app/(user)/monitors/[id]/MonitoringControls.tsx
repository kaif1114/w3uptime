'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw } from "lucide-react";
import { useState } from 'react';

export type TimePeriod = '1hr' | '1day' | '3days' | '1week' | '2weeks' | '30days' | '90days';
export type UpdateFrequency = '30s' | '1m' | '5m' | '15m' | '30m';
export type BucketSize = '1 minute' | '5 minutes' | '15 minutes' | '30 minutes' | '1 hour' | '4 hours' | '1 day';

interface MonitoringControlsProps {
  timePeriod: TimePeriod;
  updateFrequency: UpdateFrequency;
  bucketSize: BucketSize;
  autoRefresh: boolean;
  onTimePeriodChange: (period: TimePeriod) => void;
  onUpdateFrequencyChange: (freq: UpdateFrequency) => void;
  onBucketSizeChange: (bucket: BucketSize) => void;
  onAutoRefreshToggle: () => void;
  onManualRefresh: () => void;
  onExportData: () => void;
  lastUpdated: Date;
  isRefreshing: boolean;
}

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  '1hr': '1 Hour',
  '1day': '1 Day', 
  '3days': '3 Days',
  '1week': '1 Week',
  '2weeks': '2 Weeks',
  '30days': '30 Days',
  '90days': '90 Days',
};

const BUCKET_SIZE_LABELS: Record<BucketSize, string> = {
  '1 minute': '1 Minute',
  '5 minutes': '5 Minutes',
  '15 minutes': '15 Minutes',
  '30 minutes': '30 Minutes',
  '1 hour': '1 Hour',
  '4 hours': '4 Hours',
  '1 day': '1 Day',
};

export function MonitoringControls({
  timePeriod,
  updateFrequency,
  bucketSize,
  autoRefresh,
  onTimePeriodChange,
  onUpdateFrequencyChange,
  onBucketSizeChange,
  onAutoRefreshToggle,
  onManualRefresh,
  onExportData,
  lastUpdated,
  isRefreshing
}: MonitoringControlsProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {/* Time Period Selector */}
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

            {/* Bucket Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Resolution:</span>
              <Select value={bucketSize} onValueChange={onBucketSizeChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BUCKET_SIZE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Auto Refresh Toggle */}
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
            {/* Last Updated */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Last updated:</span>
              <Badge variant="outline">
                {lastUpdated.toLocaleTimeString()}
              </Badge>
            </div>

            {/* Manual Refresh */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onManualRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {/* Export Data */}
            <Button variant="outline" size="sm" onClick={onExportData}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}