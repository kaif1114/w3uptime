"use client";

import { useState } from "react";
import { Incident } from "@/types/incident";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Clock,
  Globe,
  Shield,
  MessageSquare,
  Copy,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import IncidentTimeline from "./IncidentTimeline";
import IncidentActions from "./IncidentActions";

interface IncidentDetailPageProps {
  incident: Incident;
}

export default function IncidentDetailPage({
  incident,
}: IncidentDetailPageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
          <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
            Escalate
          </Button>
          <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
            Acknowledge
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Date/Time and acknowledgment status */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {format(new Date(incident.createdAt), "MMM d, yyyy 'at' h:mm a")}
        </div>
        {incident.status === "ONGOING" && (
          <div className="text-sm text-muted-foreground">
            Not acknowledged yet
          </div>
        )}
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
        <IncidentTimeline incident={incident} />
      </div>
    </div>
  );
}
