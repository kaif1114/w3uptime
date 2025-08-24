"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Shield,
  Loader2
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import IncidentTimeline from "./IncidentTimeline";
import { useIncident } from "@/hooks/useIncident";
import { useUpdateIncident } from "@/hooks/useIncidents";



export default function IncidentDetailPage({
  incidentId,
}: {
  incidentId: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: incident, isLoading, error } = useIncident(incidentId);
  const updateIncidentMutation = useUpdateIncident();
  
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-500">Loading incident details...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !incident) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-500 mb-4">
              Error loading incident: {error?.message || "Incident not found"}
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ONGOING":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "ACKNOWLEDGED":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "RESOLVED":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ONGOING":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "ACKNOWLEDGED":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "RESOLVED":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-red-500/10 text-red-500 border-red-500/20";
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleAcknowledge = async () => {
    if (!incident) return;
    
    try {
      await updateIncidentMutation.mutateAsync({
        id: incident.id,
        data: { status: "ACKNOWLEDGED" }
      });
      toast.success("Incident acknowledged");
    } catch (error) {
      toast.error("Failed to acknowledge incident");
    }
  };

  const handleResolve = async () => {
    if (!incident) return;
    
    try {
      await updateIncidentMutation.mutateAsync({
        id: incident.id,
        data: { status: "RESOLVED" }
      });
      toast.success("Incident resolved");
    } catch (error) {
      toast.error("Failed to resolve incident");
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "Ongoing";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Incidents</span>
        <ChevronRight className="h-4 w-4" />
        <span>{incident.Monitor.name}</span>
      </div>

      {/* Header - Aligned like reference UI */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <h1 className="text-xl font-semibold">{incident.Monitor.name}</h1>
          </div>
          <Badge
            variant="outline"
            className={`flex items-center gap-2 ${getStatusColor(incident.status)}`}
          >
            {incident.status}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline">Escalate</Button>
          {incident.status === "ONGOING" && (
            <Button 
              variant="default"
              onClick={handleAcknowledge}
              disabled={updateIncidentMutation.isPending}
            >
              {updateIncidentMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Acknowledge
            </Button>
          )}
          {incident.status === "ACKNOWLEDGED" && (
            <Button 
              variant="default"
              onClick={handleResolve}
              disabled={updateIncidentMutation.isPending}
            >
              {updateIncidentMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Resolve
            </Button>
          )}
          {incident.status === "RESOLVED" && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              Resolved
            </Badge>
          )}
        </div>
      </div>

      {/* Date/Time and acknowledgment status */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {format(new Date(incident.createdAt), "MMM d, yyyy 'at' h:mm a")}
        </div>
        <div className="text-sm text-muted-foreground">
          {incident.status === "ONGOING" && "Not acknowledged yet"}
          {incident.status === "ACKNOWLEDGED" && "Acknowledged - awaiting resolution"}
          {incident.status === "RESOLVED" && `Resolved ${incident.resolvedAt ? format(incident.resolvedAt, "MMM d 'at' h:mm a") : ""}`}
        </div>
      </div>

      {/* Incident Details - Three side-by-side boxes */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Started at
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {format(new Date(incident.createdAt), "MMM d 'at' h:mm a")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Length
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{formatDuration(incident.downtime)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant="outline"
              className={`${getStatusColor(incident.status)}`}
            >
              {incident.status}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Cause - Inline with details */}
      <div className="text-sm">
        <span className="font-medium">Cause:</span>{" "}
        {incident.description || "No description provided"}
      </div>

      {/* Checked URL */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Checked URL</h3>
        <div className="bg-muted p-3 rounded-md flex items-center justify-between">
          <code className="text-sm">GET {incident.Monitor.url}</code>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => copyToClipboard(`GET ${incident.Monitor.url}`)}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Escalation */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Escalation</h3>
        <p className="text-sm">
          {incident.Monitor.escalationPolicy?.name ||
            "No escalation policy assigned"}
        </p>
      </div>

      {/* Replay Section */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Replay</h3>
        <p className="text-sm text-muted-foreground">
          Use this command to simulate the request:
        </p>
        <div className="relative">
          <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
            <code>
              {`curl -L --connect-timeout 20 --max-time 30 \\
-H 'User-Agent: W3Uptime Bot Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome' \\
'${incident.Monitor.url}'`}
            </code>
          </pre>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0"
            onClick={() =>
              copyToClipboard(
                `curl -L --connect-timeout 20 --max-time 30 -H 'User-Agent: W3Uptime Bot Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome' '${incident.Monitor.url}'`
              )
            }
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Metadata</h3>
        <Button variant="outline" size="sm">
          + Add
        </Button>
      </div>

      <Separator />

      {/* Timeline */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <IncidentTimeline incidentId={incidentId} />
      </div>
    </div>
  );
}
