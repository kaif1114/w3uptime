
'use client';

import { useMonitorDetails, usePauseMonitor } from "@/hooks/useMonitors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Send, 
  Calendar, 
  Cog, 
  TrendingUp, 
  Clock,
  Activity,
  AlertTriangle,
  Edit3
} from "lucide-react";
import { MonitorStatus } from "@/types/monitor";
import Link from "next/link";
import { ResponseTimeChart } from "./ResponseTimeChart";
import { UptimeTable } from "./UptimeTable";

interface MonitorDetailsProps {
  monitorId: string;
}

function getStatusColor(status: MonitorStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-500";
    case "PAUSED":
      return "bg-yellow-500";
    case "DISABLED":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
}

function getStatusText(status: MonitorStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Up";
    case "PAUSED":
      return "Paused";
    case "DISABLED":
      return "Down";
    default:
      return "Unknown";
  }
}

function getStatusVariant(status: MonitorStatus) {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "PAUSED":
      return "secondary";
    case "DISABLED":
      return "destructive";
    default:
      return "secondary";
  }
}

export function MonitorDetails({ monitorId }: MonitorDetailsProps) {
  const { data: monitor, isLoading, error } = useMonitorDetails(monitorId);
  const pauseMonitor = usePauseMonitor();

  const handlePauseToggle = () => {
    if (monitor && monitor?.status) {
      const newStatus = monitor?.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      pauseMonitor.mutate({ id: monitorId, status: newStatus });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load monitor details</h3>
        <p className="text-muted-foreground">Please try refreshing the page.</p>
      </div>
    );
  }

  if (!monitor) return null;

  return (
    <div className="space-y-8">
      {/* Monitor Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(monitor?.status)}`} />
          <div>
            <h1 className="text-2xl font-bold">{monitor?.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="text-lg font-medium">{getStatusText(monitor?.status)}</span>
              <span>•</span>
              <span>Checked every {monitor?.checkInterval / 60} minutes</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm">
            <Send className="mr-2 h-4 w-4" />
            Send test alert
          </Button>
          <Link href={`/incidents?monitor=${monitorId}`}>
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Incidents
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePauseToggle}
            disabled={pauseMonitor.isPending}
          >
            {monitor.status === "ACTIVE" ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Resume
              </>
            )}
          </Button>
          <Link href={`/monitors/${monitorId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Currently up for</p>
              <p className="text-2xl font-bold">10:20 AM</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Last checked at</p>
              <p className="text-2xl font-bold">9:20 AM</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Incidents</p>
              <p className="text-2xl font-bold">10.03 Seconds</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Times Chart */}
      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Response times</CardTitle>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-purple-500"></div>
              <span>Name lookup</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-blue-400"></div>
              <span>Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-green-500"></div>
              <span>TLS handshake</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-teal-400"></div>
              <span>Data transfer</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* <ResponseTimeChart data={data.responseTimeData} /> */}
        </CardContent>
      </Card>

      {/* Uptime Table */}
      {/* <UptimeTable stats={stats} />  */}
    </div>
  );
}
