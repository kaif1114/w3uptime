"use client";

import { Button } from "@/components/ui/button";
import { useDeleteMonitor, useMonitorDetails, useMonitorIncidents, usePauseMonitor } from "@/hooks/useMonitors";
import { MonitorStatus } from "@/types/monitor";
import {
  AlertTriangle,
  Edit3,
  Pause,
  Play,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useChatContext } from "@/providers/ChatContextProvider";
import { DeleteConfirmDialog } from "../DeleteConfirmDialog";
import { MetricsCards } from "./MetricsCards";
import { TimePeriod } from "./MonitoringControls";
import { TimeSeriesChart } from "./TimeSeriesChart";

interface MonitorDetailsProps {
  monitorId: string;
}

function getStatusColor(status: MonitorStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-500";
    case "PAUSED":
      return "bg-yellow-500";
    case "DOWN":
      return "bg-red-500";
    case "RECOVERING":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
}

function getStatusText(status: MonitorStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "PAUSED":
      return "Paused";
    case "DOWN":
      return "Down";
    case "RECOVERING":
      return "Recovering";
    default:
      return "Unknown";
  }
}

export function MonitorDetails({ monitorId }: MonitorDetailsProps) {
  const { setContext } = useChatContext();
  const { data: monitor, isLoading, error, refetch: refetchMonitor } = useMonitorDetails(monitorId);
  const { data: incidentsData } = useMonitorIncidents(monitorId);
  const pauseMonitor = usePauseMonitor();
  const deleteMonitor = useDeleteMonitor();
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [timePeriod, setTimePeriod] = useState<TimePeriod>("day");

  useEffect(() => {
    setContext({
      pageType: 'monitor-detail',
      monitorId,
    });

    return () => {
      setContext(null);
    };
  }, [monitorId, setContext]);

  const handlePauseToggle = () => {
    if (monitor && monitor?.status) {
      const newStatus = monitor?.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      pauseMonitor.mutate(
        { id: monitorId, status: newStatus },
        {
          onSuccess: () => {
            toast.success(`Monitor ${newStatus === "PAUSED" ? "paused" : "resumed"} successfully`);
          },
          onError: (error) => {
            toast.error(`Failed to ${newStatus === "PAUSED" ? "pause" : "resume"} monitor: ${error.message}`);
          }
        }
      );
    }
  };

  const handleDelete = () => {
    deleteMonitor.mutate(monitorId, {
      onSuccess: () => {
        toast.success("Monitor deleted successfully");
        setShowDeleteDialog(false);
        
        router.push("/monitors");
      },
      onError: (error) => {
        toast.error(`Failed to delete monitor: ${error.message}`);
      }
    });
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
        <h3 className="text-lg font-semibold mb-2">
          Failed to load monitor details
        </h3>
        <p className="text-muted-foreground">Please try refreshing the page.</p>
      </div>
    );
  }

  if (!monitor) return null;

  return (
    <>
      <div className="space-y-6">
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${getStatusColor(monitor?.status)}`}
            />
            <div>
            <div className=" items-center gap-4">
          
              <h1 className="text-2xl font-bold">
              {monitor?.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </h1>
                <h1 className="text-md font-medium  text-muted-foreground">
                  {getStatusText(monitor?.status)}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteMonitor.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        
        <MetricsCards
          monitorId={monitorId}
          createdAt={monitor?.createdAt}
          lastCheckedAt={monitor?.lastCheckedAt}
          incidentCount={incidentsData?.incidentCount || 0}
          refetchMonitor={refetchMonitor}
          currentStatus={monitor?.status}
          lastIncidentResolvedAt={monitor?.lastIncidentResolvedAt}
          hasOngoingIncident={monitor?.hasOngoingIncident}
          ongoingIncidentStartedAt={monitor?.ongoingIncidentStartedAt}
        />

        
        <div>
          <div className="p-0">
            <div className="p-6">
              
              <div className="space-y-6">
                
                <div className="flex flex-wrap gap-2">
                  {(["day", "week", "month"] as const).map((period) => (
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
            </div>
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        monitorName={monitor.name}
        isLoading={deleteMonitor.isPending}
      />
    </>
  );
}
