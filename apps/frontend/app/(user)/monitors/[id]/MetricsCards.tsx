"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Clock, Shield, AlertTriangle } from "lucide-react";

interface MetricsCardsProps {
  monitorId: string;
  createdAt?: string;
  lastCheckedAt?: string | null;
  incidentCount?: number;
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

function formatUptime(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diff = now.getTime() - created.getTime();

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} min${minutes !== 1 ? 's' : ''}`);

  return parts.slice(0, 2).join(' ') || 'Just now';
}

function formatTimeAgo(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  
  const checkedTime = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now.getTime() - checkedTime.getTime()) / 1000);

  if (diff < 60) return `${diff} second${diff !== 1 ? 's' : ''} ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) !== 1 ? 's' : ''} ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? 's' : ''} ago`;
  
  return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) !== 1 ? 's' : ''} ago`;
}

export function MetricsCards({ monitorId, createdAt, lastCheckedAt: initialLastCheckedAt, incidentCount = 0 }: MetricsCardsProps) {
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(initialLastCheckedAt || null);
  const [liveTimeAgo, setLiveTimeAgo] = useState<string>('');

  // Update live time ago every second
  useEffect(() => {
    const updateTimeAgo = () => {
      setLiveTimeAgo(formatTimeAgo(lastCheckedAt));
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);

    return () => clearInterval(interval);
  }, [lastCheckedAt]);

  // Connect to SSE for real-time updates
  useEffect(() => {
    const eventSource = new EventSource(`/api/monitors/${monitorId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data);
        
        if (data.type === 'monitor_update' && data.monitorId === monitorId) {
          setLastCheckedAt(data.checkedAt || null);
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
  }, [monitorId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {/* Currently up for */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Currently up for</p>
              <p className="text-2xl font-bold">
                {createdAt ? formatUptime(createdAt) : '-'}
              </p>
            </div>
            <Shield className="h-8 w-8 text-green-500" />
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