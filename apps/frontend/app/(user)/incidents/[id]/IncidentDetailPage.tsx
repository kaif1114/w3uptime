"use client";

import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useIncident } from "@/hooks/useIncident";
import { useUpdateIncident } from "@/hooks/useIncidents";
import { useChatContext } from "@/providers/ChatContextProvider";
import { format } from "date-fns";
import {
  Copy,
  Loader2,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import IncidentTimeline from "./IncidentTimeline";

export default function IncidentDetailPage({
  incidentId,
}: {
  incidentId: string;
}) {
  const { setContext } = useChatContext();
  const {
    data,
    isLoading,
    error,
    refetch: refetchIncident,
  } = useIncident(incidentId);
  const updateIncidentMutation = useUpdateIncident();

  useEffect(() => {
    setContext({
      pageType: 'incident-detail',
      incidentId,
    });

    return () => {
      setContext(null);
    };
  }, [incidentId, setContext]);

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

  if (error || !data) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-500 mb-4">
              Error loading incident: {error?.message || "Incident not found"}
            </p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

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
    if (!data) return;

    try {
      await updateIncidentMutation.mutateAsync({
        id: data.incident.id,
        data: { status: "ACKNOWLEDGED" },
      });
      toast.success("Incident acknowledged");
      refetchIncident();
    } catch (error) {
      console.error(error);
      toast.error("Failed to acknowledge incident");
    }
  };

  const handleResolve = async () => {
    if (!data) return;

    try {
      await updateIncidentMutation.mutateAsync({
        id: data.incident.id,
        data: { status: "RESOLVED" },
      });
      toast.success("Incident resolved");
      refetchIncident();
    } catch (error) {
      console.error(error);
      toast.error("Failed to resolve incident");
    }
  };

  return (
    <div className="space-y-6 px-6">
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <h1 className="text-xl font-semibold">
              {data?.incident?.Monitor?.name || "No Monitor Name"}
            </h1>
          </div>
          <Badge
            variant="outline"
            className={`flex items-center gap-2 ${getStatusColor(data?.incident?.status || "ONGOING")}`}
          >
            {data?.incident?.status}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline">Escalate</Button>
          {data?.incident?.status === "ONGOING" && (
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
          {data?.incident?.status === "ACKNOWLEDGED" && (
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
          {data?.incident?.status === "RESOLVED" && (
            <Badge
              variant="outline"
              className="bg-green-500/10 text-green-500 border-green-500/20"
            >
              Resolved
            </Badge>
          )}
        </div>
      </div>

      
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {format(
            new Date(data?.incident?.createdAt || ""),
            "MMM d, yyyy 'at' h:mm a"
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {data?.incident?.status === "ONGOING" && "Not acknowledged yet"}
          {data?.incident?.status === "ACKNOWLEDGED" &&
            "Acknowledged - awaiting resolution"}
          {data?.incident?.status === "RESOLVED" &&
            `Resolved ${data?.incident?.resolvedAt ? format(data?.incident?.resolvedAt, "MMM d 'at' h:mm a") : ""}`}
        </div>
      </div>

      
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="">
            <CardTitle className="text-md font-medium text-muted-foreground">
              Cause
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl">
              {data?.incident?.cause === "TEST"
                ? "Test incident"
                : "URL unavailable"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="">
            <CardTitle className="text-md font-medium text-muted-foreground">
              Started at
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl">
              {format(
                new Date(data?.incident?.createdAt || ""),
                "MMM d 'at' h:mm a"
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="">
            <CardTitle className="text-md font-medium text-muted-foreground">
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant="outline"
              className={`${getStatusColor(data?.incident?.status || "ONGOING")} text-2xl`}
            >
              {data?.incident?.status}
            </Badge>
          </CardContent>
        </Card>
      </div>

      
      <div className="space-y-2">
        <h3 className="text-md font-medium">Checked URL</h3>
        <div className="bg-muted p-3 rounded-md flex items-center justify-between">
          <code className="text-sm">
            GET {data?.incident?.Monitor?.url || "No URL"}
          </code>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() =>
              copyToClipboard(`GET ${data?.incident?.Monitor?.url || "No URL"}`)
            }
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      
      <div className="space-y-2">
        <h3 className="text-md font-medium">Escalation</h3>
        <p className="text-xl">
          {data?.incident?.Monitor?.escalationPolicy?.name ||
            "No escalation policy assigned"}
        </p>
      </div>

      <Separator />

      
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <IncidentTimeline incidentId={incidentId} />
      </div>
    </div>
  );
}
