
'use client';

import { Button } from "@/components/ui/button";
import { useMonitorDetails, usePauseMonitor } from "@/hooks/useMonitors";
import { MonitorStatus } from "@/types/monitor";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  Edit3,
  Globe,
  Pause,
  Play,
  Send,
  Shield
} from "lucide-react";
import Link from "next/link";
import { useState } from 'react';
import { MonitoringControls, TimePeriod } from "./MonitoringControls";
import { AnalyticsOverview } from "./AnalyticsOverview";
import { TimeSeriesChart } from "./TimeSeriesChart";
import { ValidatorMap } from "./ValidatorMap";
import { MapboxGlobeMap } from "./MapboxGlobeMap";
import { UptimeIncidentPanel } from "./UptimeIncidentPanel";
import { mockData } from "./mockData";
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


type TabType = 'overview' | 'global' | 'uptime' | 'performance';

export function MonitorDetails({ monitorId }: MonitorDetailsProps) {
  const { data: monitor, isLoading, error } = useMonitorDetails(monitorId);
  const pauseMonitor = usePauseMonitor();
  
  // State for tabs and controls
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('day');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handlePauseToggle = () => {
    if (monitor && monitor?.status) {
      const newStatus = monitor?.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      pauseMonitor.mutate({ id: monitorId, status: newStatus });
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 2000);
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'global', label: 'Global Map', icon: Globe },
    { id: 'uptime', label: 'Uptime & Incidents', icon: Shield },
    { id: 'performance', label: 'Performance', icon: BarChart3 }
  ];

  return (
    <div className="space-y-6">
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

      {/* Monitoring Controls */}
      <MonitoringControls
        timePeriod={timePeriod}
        updateFrequency="5m" // This could be made dynamic later
        autoRefresh={autoRefresh}
        onTimePeriodChange={setTimePeriod}
        onUpdateFrequencyChange={() => {}} // Placeholder for now
        onAutoRefreshToggle={() => setAutoRefresh(!autoRefresh)}
        onManualRefresh={handleManualRefresh}
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing}
      />

      {/* Tab Navigation */}
      <div>
        <div className="p-0"> 
          <div className="border-b">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`
                      flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
          
          <div className="p-6">
            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* commenting this out because we will implement it later */}
                {/* <AnalyticsOverview monitorId={monitorId} period={timePeriod} /> */}
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold">Overview</h2>
                    <p>This is the overview tab. It will display the monitor's performance data.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'global' && (
              <div className="space-y-6">
                <MapboxGlobeMap monitorId={monitorId} />
                <ValidatorMap monitorId={monitorId} />
              </div>
            )}

            {activeTab === 'uptime' && (
              // commenting this out because we will implement it later
              // <UptimeIncidentPanel
              //   uptimeData={mockData.uptimeData}
              //   incidents={mockData.incidents}
              //   monitorName={monitor?.url || 'Monitor'}
              // />
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Uptime & Incidents</h2>
                  <p>This is the uptime & incidents tab. It will display the monitor's uptime and incidents.</p>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-6">
                {/* Performance Tab Time Period Buttons */}
                <div className="flex flex-wrap gap-2">
                  {(['hour', 'day', 'week', 'month'] as const).map((period) => (
                    <Button
                      key={period}
                      variant={timePeriod === period ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimePeriod(period)}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </Button>
                  ))}
                </div>

                <TimeSeriesChart 
                  monitorId={monitorId}
                  period={timePeriod}
                  type="latency"
                />
                <TimeSeriesChart 
                  monitorId={monitorId}
                  period={timePeriod}
                  type="uptime"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
