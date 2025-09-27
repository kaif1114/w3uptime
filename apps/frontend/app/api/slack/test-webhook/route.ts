import { NextRequest, NextResponse } from "next/server";
import { SlackWebhookAPI } from "@/lib/slack";
import { withAuth } from "@/lib/auth";

export const POST = withAuth(
  async (req: NextRequest, user, session) => {
    try {
      const body = await req.json();
      const { webhookUrl } = body;

      if (!webhookUrl) {
        return NextResponse.json(
          { error: "Webhook URL is required" },
          { status: 400 }
        );
      }

      // Validate webhook URL format
      try {
        new URL(webhookUrl);
      } catch {
        return NextResponse.json(
          { error: "Invalid webhook URL format" },
          { status: 400 }
        );
      }

      // Test the webhook
      const webhook = new SlackWebhookAPI(webhookUrl);
      const success = await webhook.testWebhook();

      if (success) {
        return NextResponse.json(
          { message: "Webhook test successful" },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { error: "Webhook test failed" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Error testing Slack webhook:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);