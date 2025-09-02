import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MonitorDetails } from "./MonitorDetails";

interface MonitorDetailsPageProps {
  params: Promise<{ id: string }>;
} 

export default async function MonitorDetailsPage({ params }: MonitorDetailsPageProps) {
  const { id } = await params;
  const monitorId = id;

  if (!monitorId) {
    return (
      <div className="">
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
    <div className="">
      <MonitorDetails monitorId={monitorId} />
    </div>
  );
}   