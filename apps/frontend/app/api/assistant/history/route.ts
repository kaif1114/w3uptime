import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { prisma } from "db/client";

export const GET = withAuth(async (req: NextRequest, user, _session) => {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const limit = Number(searchParams.get("limit") || "50");
    const offset = Number(searchParams.get("offset") || "0");

    if (conversationId) {
      const messages = await prisma.conversationMessage.findMany({
        where: { conversationId, conversation: { userId: user.id } },
        orderBy: { createdAt: "asc" },
        skip: offset,
        take: Math.min(limit, 100),
      });

      return NextResponse.json({
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
          metadata: m.metadata ?? undefined,
        })),
        total: messages.length,
      });
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: Math.min(limit, 50),
      select: {
        id: true,
        title: true,
        contextType: true,
        contextId: true,
        updatedAt: true,
        messages: { select: { id: true }, take: 1 },
      },
    });

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title ?? undefined,
        contextType: c.contextType ?? undefined,
        contextId: c.contextId ?? undefined,
        lastMessageAt: c.updatedAt,
        messageCount: c.messages.length,
      })),
      total: conversations.length,
    });
  } catch (error) {
    console.error("[assistant history] error", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
});
