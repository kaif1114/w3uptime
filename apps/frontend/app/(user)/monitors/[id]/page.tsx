"use client";

import { useParams } from "next/navigation";
import { MonitorDetails } from "./monitor-details";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function MonitorDetailsPage() {
  const params = useParams();
  const monitorId = params.id as string;

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

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href="/monitors">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Monitors
          </Button>
        </Link>
      </div>
      
      <MonitorDetails monitorId={monitorId} />
    </div>
  );
} 