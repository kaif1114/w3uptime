import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { EditMonitorForm } from "./EditMonitorForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EditMonitorPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMonitorPage({ params }: EditMonitorPageProps) {
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
          <EditMonitorForm monitorId={monitorId} />
        </CardContent>
      </Card>
    </div>
  );
}
