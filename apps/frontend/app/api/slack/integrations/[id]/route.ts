import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { withAuth } from "@/lib/auth";

export const PATCH = withAuth(
  async (
    req: NextRequest,
    user,
    session,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const { webhookUrl } = body;

      // Verify the integration belongs to the user
      const integration = await prisma.slackIntegration.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!integration) {
        return NextResponse.json(
          { error: "Integration not found" },
          { status: 404 }
        );
      }

      // Update the integration
      const updatedIntegration = await prisma.slackIntegration.update({
        where: { id },
        data: { webhookUrl },
      });

      return NextResponse.json(
        {
          message: "Integration updated successfully",
          integration: updatedIntegration,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error updating Slack integration:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);