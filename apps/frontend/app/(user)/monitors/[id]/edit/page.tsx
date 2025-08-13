"use client";

import { useParams } from "next/navigation";
import { useMonitor } from "@/hooks/useMonitors";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { EditMonitorForm } from "./edit-monitor-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EditMonitorPage() {
  const params = useParams();
  const monitorId = params.id as string;
  const { data: monitor, isLoading, error } = useMonitor(monitorId);

  if (!monitorId) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">Monitor not found</h3>
          <p className="text-muted-foreground mb-4">The monitor ID is missing or invalid.</p>
          <Link href="/monitors">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Monitors
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Link href={`/monitors/${monitorId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Monitor
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardHeader>
            <div className="animate-pulse space-y-2">
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Link href={`/monitors/${monitorId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Monitor
            </Button>
          </Link>
        </div>
        
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load monitor</h3>
          <p className="text-muted-foreground mb-4">Please try refreshing the page.</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!monitor) return null;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href={`/monitors/${monitorId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Monitor
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Monitor</CardTitle>
          <p className="text-muted-foreground">
            Update your monitor configuration and settings.
          </p>
        </CardHeader>
        <CardContent>
          <EditMonitorForm monitor={monitor} />
        </CardContent>
      </Card>
    </div>
  );
}
