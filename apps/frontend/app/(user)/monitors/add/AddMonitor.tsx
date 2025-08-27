"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import MonitorsHeader from "../MonitorHeaders";
import AddMonitorForm from "./AddMonitorForm";

export default function AddMonitor() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <MonitorsHeader
        title="Create monitor"
        description="Configure your monitor. Advanced configuration is available below."
        action={
          <Link href="/monitors">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Monitors
            </Button>
          </Link>
        }
      />

      <AddMonitorForm onSuccess={() => router.push("/monitors")} />
    </div>
  );
} 