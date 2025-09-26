"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function SlackCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
      const state = searchParams.get("state");

      if (errorParam) {
        setError(`OAuth Error: ${errorParam}`);
        setIsProcessing(false);
        return;
      }

      if (!code) {
        setError("No authorization code received");
        setIsProcessing(false);
        return;
      }

      try {
        const response = await fetch("/api/slack/oauth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, state }),
        });

        const data = await response.json();

        if (response.ok) {
          router.push("/slack/success");
        } else {
          router.push(`/slack/error?message=${encodeURIComponent(data.error || "Integration failed")}`);
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
        router.push("/slack/error?message=Network%20error%20occurred");
      }
    };

    handleOAuthCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Integration Failed</CardTitle>
            <CardDescription>There was an error with the Slack integration</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing Integration
          </CardTitle>
          <CardDescription>Setting up your Slack integration...</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please wait while we complete the setup process.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}