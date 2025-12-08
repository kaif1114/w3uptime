"use server";

import { prisma } from "db/client";
import type { PrismaClient } from "@prisma/client";
import { ConversationContext } from "@/types/assistant";

const client = prisma as PrismaClient & {
  conversation: any;
  conversationMessage: any;
};

export async function getConversationHistory(
  userId: string,
  conversationId?: string,
  limit = 50
) {
  if (conversationId) {
    const messages = await client.conversationMessage.findMany({
      where: { conversation: { userId }, conversationId },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return { messages };
  }

  const conversations = await client.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      contextType: true,
      contextId: true,
      updatedAt: true,
      messages: {
        select: { id: true },
      },
    },
  });

  return {
    conversations: conversations.map((c: (typeof conversations)[number]) => ({
      id: c.id,
      title: c.title ?? undefined,
      contextType: c.contextType ?? undefined,
      contextId: c.contextId ?? undefined,
      lastMessageAt: c.updatedAt.toISOString(),
      messageCount: c.messages.length,
    })),
  };
}

export async function createConversation(
  userId: string,
  contextType?: ConversationContext,
  contextId?: string
) {
  return client.conversation.create({
    data: {
      userId,
      contextType,
      contextId,
    },
  });
}

export async function deleteConversation(
  userId: string,
  conversationId: string
) {
  await client.conversation.delete({
    where: { id: conversationId, userId },
  });
  return true;
}
