"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MonitorStatus } from "@/types/monitor";
import { AlertTriangle, Clock, Shield } from "lucide-react";
import { useEffect, useState } from "react";

interface MetricsCardsProps {
  monitorId: string;
  createdAt?: string;
  lastCheckedAt?: string | null;
  incidentCount?: number;
  refetchMonitor: () => void;
  currentStatus: MonitorStatus;
  lastIncidentResolvedAt?: string | null;
  hasOngoingIncident?: boolean;
  ongoingIncidentStartedAt?: string | null;
}

interface SSEMessage {
  type: string;
  monitorId: string;
  status?: string;
  latency?: number;
  checkedAt?: string;
  location?: {
    city: string;
    countryCode: string;
    continentCode: string;
    latitude: number;
    longitude: number;
  };
}

function formatUptime(
  createdAt: string,
  lastIncidentResolvedAt?: string | null,
  hasOngoingIncident?: boolean,
  ongoingIncidentStartedAt?: string | null
): { text: string; isDown: boolean } {
  // If there's an ongoing incident, the monitor is currently down
  if (hasOngoingIncident && ongoingIncidentStartedAt) {
    const started = new Date(ongoingIncidentStartedAt);
    const now = new Date();
    const diff = now.getTime() - started.getTime();

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} min${minutes !== 1 ? 's' : ''}`);

    return {
      text: parts.slice(0, 2).join(' ') || 'Just now',
      isDown: true,
    };
  }

  // Use the most recent resolved incident time if available
  const startTime = lastIncidentResolvedAt || createdAt;
  const started = new Date(startTime);
  const now = new Date();
  const diff = now.getTime() - started.getTime();

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} min${minutes !== 1 ? 's' : ''}`);

  return {
    text: parts.slice(0, 2).join(' ') || 'Just now',
    isDown: false,
  };
}

function formatTimeAgo(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  
  try {
    const checkedTime = new Date(timestamp);
    const now = new Date();
    
    // Check if the timestamp is valid
    if (isNaN(checkedTime.getTime())) {
      return 'Invalid time';
    }
    
    const diff = Math.floor((now.getTime() - checkedTime.getTime()) / 1000);

    // Handle negative differences (future timestamps)
    if (diff < 0) {
      return 'Just now';
    }

    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff} second${diff !== 1 ? 's' : ''} ago`;
    
    const minutes = Math.floor(diff / 60);
    if (diff < 3600) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(diff / 3600);
    if (diff < 86400) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    
    const days = Math.floor(diff / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } catch (error) {
    console.error('Error formatting time ago:', error);
    return 'Unknown';
  }
}

export function MetricsCards({ 
  monitorId, 
  createdAt, 
  lastCheckedAt: initialLastCheckedAt, 
  incidentCount = 0, 
  refetchMonitor, 
  currentStatus,
  lastIncidentResolvedAt,
  hasOngoingIncident,
  ongoingIncidentStartedAt
}: MetricsCardsProps) {
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(initialLastCheckedAt || null);
  const [liveTimeAgo, setLiveTimeAgo] = useState<string>('');
  const [liveUptime, setLiveUptime] = useState<{ text: string; isDown: boolean }>({ text: '', isDown: false });

  // Update live time ago every second
  useEffect(() => {
    const updateTimeAgo = () => {
      setLiveTimeAgo(formatTimeAgo(lastCheckedAt));
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);

    return () => clearInterval(interval);
  }, [lastCheckedAt]);

  // Update live uptime every second
  useEffect(() => {
    const updateUptime = () => {
      if (createdAt) {
        setLiveUptime(formatUptime(createdAt, lastIncidentResolvedAt, hasOngoingIncident, ongoingIncidentStartedAt));
      }
    };

    updateUptime();
    const interval = setInterval(updateUptime, 1000);

    return () => clearInterval(interval);
  }, [createdAt, lastIncidentResolvedAt, hasOngoingIncident, ongoingIncidentStartedAt]);

  // Connect to SSE for real-time updates
  useEffect(() => {
    const eventSource = new EventSource(`/api/monitors/${monitorId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data);
        console.log("Message received:", data);
        if (data.type === 'monitor_update' && data.monitorId === monitorId) {
          setLastCheckedAt(data.checkedAt || null);
          // Refetch monitor data whenever status changes to DOWN or ACTIVE
          // This ensures we get updated incident information (ongoing or resolved)
          if(data.status === 'DOWN' || data.status === 'ACTIVE') {
            refetchMonitor();
          }
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
    };

    return () => {
      eventSource.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitorId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {/* Currently up for / down for */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {liveUptime.isDown ? 'Currently down for' : 'Currently up for'}
              </p>
              <p className="text-2xl font-bold">
                {liveUptime.text || '-'}
              </p>
            </div>
            {liveUptime.isDown ? (
              <AlertTriangle className="h-8 w-8 text-red-500" />
            ) : (
              <Shield className="h-8 w-8 text-green-500" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Last checked at */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Last checked at</p>
              <p className="text-2xl font-bold">
                {liveTimeAgo || 'Never'}
              </p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      {/* Incidents */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Incidents</p>
              <p className="text-2xl font-bold">{incidentCount}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}