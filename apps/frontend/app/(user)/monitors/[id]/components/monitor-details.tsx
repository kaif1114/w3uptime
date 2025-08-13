"use client";

import { useMonitorDetails } from "@/hooks/useMonitors";
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
  AlertTriangle
} from "lucide-react";
import { MonitorStatus } from "@/types/monitor";
import { ResponseTimeChart } from "./response-time-chart";
import { UptimeTable } from "./uptime-table";

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
  const { data, isLoading, error } = useMonitorDetails(monitorId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
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

  if (!data) return null;

  const { monitor, stats } = data;

  return (
    <div className="space-y-6">
      {/* Monitor Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(monitor.status)}`} />
          <div>
            <h1 className="text-2xl font-bold">{monitor.name}</h1>
            <p className="text-muted-foreground">Checked every {monitor.checkInterval / 60} minutes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Send className="mr-2 h-4 w-4" />
            Send test alert
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Incidents
          </Button>
          <Button variant="outline" size="sm">
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
          <Button variant="outline" size="sm">
            <Cog className="mr-2 h-4 w-4" />
            Configure
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently up for</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentlyUpFor}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last checked at</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lastCheckedAt}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidents</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.incidentsCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Response Times Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Response times</CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Europe</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span>Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>TLS handshake</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>Data transfer</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponseTimeChart data={data.responseTimeData} />
        </CardContent>
      </Card>

      {/* Uptime Table */}
      <Card>
        <CardHeader>
          <CardTitle>Uptime Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <UptimeTable stats={stats} />
        </CardContent>
      </Card>
    </div>
  );
} 