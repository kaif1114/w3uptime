
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { MonitorsHeader } from "./MonitorHeaders";
import { MonitorsClient } from "./MonitorsClient";

export default function MonitorsPage() {
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

  return (
    <div className=" px-6 py-6">
      {header}
      <MonitorsClient />
    </div>
  );
} 