import { NextRequest, NextResponse } from "next/server";
import { getSessionOnServer } from "@/lib/GetSessionOnServer";
import { prisma } from "db/client";

export async function GET() {
  try {
    const session = await getSessionOnServer();
    if (!session?.authenticated || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integrations = await prisma.slackIntegration.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      select: {
        id: true,
        teamId: true,
        teamName: true,
        scope: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        defaultChannelId: true,
        defaultChannelName: true,
        webhookUrl: true,
      },
    });

    return NextResponse.json({ integrations });
  } catch (error) {
    console.error("Error fetching Slack integrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionOnServer();
    if (!session?.authenticated || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get("id");

    if (!integrationId) {
      return NextResponse.json({ error: "Integration ID is required" }, { status: 400 });
    }

    
    const integration = await prisma.slackIntegration.findFirst({
      where: {
        id: integrationId,
        userId: session.user.id,
      },
    });

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    
    await prisma.slackIntegration.update({
      where: { id: integrationId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Slack integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}