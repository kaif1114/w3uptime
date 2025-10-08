"use client";

import { Button } from "@/components/ui/button";
import { Monitor } from "@/types/monitor";
import { Plus } from "lucide-react";
import Link from "next/link";
import { MonitorCard } from "./MonitorCards";

interface MonitorsListProps {
  monitors: Monitor[];
}

export function MonitorsList({ monitors }: MonitorsListProps) {
  if (monitors.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed">
        <div className="flex flex-col items-center gap-1 text-center">
          <h3 className="text-2xl font-bold tracking-tight">No monitors yet</h3>
          <p className="text-sm text-muted-foreground">
            You have Not created any monitors. Add one to get started.
          </p>
          <Link href="/monitors/add">
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add your first monitor
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {monitors.map((monitor) => (
        <MonitorCard key={monitor.id} monitor={monitor} />
      ))}
    </div>
  );
} 