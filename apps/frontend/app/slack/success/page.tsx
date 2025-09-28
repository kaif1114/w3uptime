import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SlackSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-green-900">Integration Successful!</CardTitle>
          <CardDescription>
            Your Slack workspace has been successfully connected to W3Uptime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-sm text-green-800">
              You can now receive incident notifications and alerts directly in your Slack channels.
              Configure your escalation policies to use Slack notifications.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/settings">
                Go to Settings
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/escalation-policies">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Configure Escalation Policies
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}