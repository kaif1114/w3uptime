'use client';

import { useMonitors } from "@/hooks/useMonitors";
import { MonitorsList } from "./MonitorList";
import { MonitorsLoading } from "./loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export function MonitorsClient() {
  const { data, isLoading, error, refetch } = useMonitors();

  if (isLoading) {
    return <MonitorsLoading />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load monitors. Please try again.
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2" 
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No monitors found. Please create your first monitor to get started.
        </AlertDescription>
      </Alert>
    );
  }

  return <MonitorsList initialData={data} />;
}
