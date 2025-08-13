"use client";

import { useMonitors } from "@/hooks/useMonitors";
import { MonitorsList } from "./monitors-list";
import { MonitorsLoading } from "./loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";
import Link from "next/link";
import { MonitorsHeader } from "./monitors-header";

export default function MonitorsPage() {
  const { data, isLoading, error, refetch } = useMonitors();

  console.log("Monitors page state:", { data, isLoading, error });

  const header = (
    <MonitorsHeader
      title="Monitors"
      description="Monitor your websites and APIs for uptime and performance."
      action={
        <Link href="/monitors/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Monitor
          </Button>
        </Link>
      }
    />
  );

  if (isLoading) {
    console.log("Showing loading state");
    return (
      <div className="container mx-auto px-4 py-6">
        {header}
        <MonitorsLoading />
      </div>
    );
  }

  if (error) {
    console.log("Showing error state:", error);
    return (
      <div className="container mx-auto px-4 py-6">
        {header}
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
      </div>
    );
  }

  console.log("Showing monitors list with data:", data);
  return (
    <div className="container mx-auto px-4 py-6">
      {header}
      {data && <MonitorsList initialData={data} />}
    </div>
  );
} 