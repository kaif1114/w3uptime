import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { prisma } from "db/client";
import { generateAssistantReply } from "@/lib/assistant/llm-service";
import { ConversationContext, SuggestedAction } from "@/types/assistant";

type ChatBody = {
  message?: string;
  conversationId?: string;
  contextType?: ConversationContext;
  contextId?: string;
};

export const POST = withAuth(async (req: NextRequest, user, _session) => {
  try {
    const body = (await req.json()) as ChatBody;
    const { message, conversationId, contextType, contextId } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Ensure conversation exists (or create new)
    const conversation =
      (conversationId
        ? await prisma.conversation.findFirst({
            where: { id: conversationId, userId: user.id },
          })
        : null) ||
      (await prisma.conversation.create({
        data: {
          userId: user.id,
          contextType,
          contextId,
          title: message.slice(0, 80),
        },
      }));

    // Fetch recent history (limited to keep prompt small)
    const recentMessages = await prisma.conversationMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 12,
    });

    // Add the user's new message to history prior to LLM call
    const history = [
      ...recentMessages.map((m) => ({
        role: m.role.toLowerCase() as "user" | "assistant" | "system",
        content: m.content,
      })),
      { role: "user" as const, content: message.trim() },
    ];

    // Ask the LLM
    const llmResult = await generateAssistantReply({
      userId: user.id,
      userMessage: message.trim(),
      contextType: contextType ?? conversation.contextType ?? undefined,
      contextId: contextId ?? conversation.contextId ?? undefined,
      history,
    });

    // Extract suggested actions if the model followed the SUGGESTED_ACTIONS convention
    let suggestedActions: SuggestedAction[] = [];

    let assistantContent = llmResult.content;
    const marker = "SUGGESTED_ACTIONS:";
    const markerIndex = assistantContent.lastIndexOf(marker);
    if (markerIndex !== -1) {
      const actionsBlock = assistantContent
        .slice(markerIndex + marker.length)
        .trim();
      const contentWithoutActions = assistantContent
        .slice(0, markerIndex)
        .trim();
      if (contentWithoutActions) assistantContent = contentWithoutActions;

      try {
        const parsed = JSON.parse(actionsBlock);
        if (Array.isArray(parsed)) {
          suggestedActions = parsed
            .filter(
              (a) =>
                a &&
                typeof a.type === "string" &&
                (!a.label || typeof a.label === "string")
            )
            .map((a) => ({
              type: a.type,
              label: a.label,
              confirm: Boolean(a.confirm),
              data:
                a.data && typeof a.data === "object"
                  ? (a.data as Record<string, unknown>)
                  : undefined,
            }));
        }
      } catch {
        // ignore malformed suggestions
      }
    }

    // Validation: keep only actions with required fields present
    const ACTION_SPECS: Record<
      string,
      { required: string[]; optional?: string[] }
    > = {
      create_monitor: {
        required: ["name", "url"],
        optional: [
          "timeout",
          "checkInterval",
          "expectedStatusCodes",
          "escalationPolicyId",
        ],
      },
      pause_monitor: { required: ["monitorId"] },
      resume_monitor: { required: ["monitorId"] },
      delete_monitor: { required: ["monitorId"] },
      create_escalation_policy: { required: ["name"], optional: ["levels"] },
      remove_escalation_policy: { required: ["escalationPolicyId"] },
      edit_escalation_policy: {
        required: ["escalationPolicyId"],
        optional: ["name", "enabled", "levels"],
      },
      view_incident_timeline: { required: ["incidentId"] },
      acknowledge_incident: { required: ["incidentId"] },
      resolve_incident: { required: ["incidentId"] },
    };

    const validatedActions: SuggestedAction[] = suggestedActions.filter(
      (action) => {
        const spec = ACTION_SPECS[action.type];
        if (!spec) return false;
        const data = action.data || {};
        return spec.required.every(
          (field) =>
            data[field] !== undefined &&
            data[field] !== null &&
            data[field] !== ""
        );
      }
    );

    const contextUsedSafe = JSON.parse(
      JSON.stringify(llmResult.contextUsed ?? null)
    );

    // Persist messages
    const [userMsg, assistantMsg] = await Promise.all([
      prisma.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: "USER",
          content: message.trim(),
        },
      }),
      prisma.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: assistantContent,
          metadata: {
            contextUsed: contextUsedSafe,
            suggestedActions: validatedActions,
          },
        },
      }),
    ]);

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      conversationId: conversation.id,
      message: {
        id: assistantMsg.id,
        role: assistantMsg.role,
        content: assistantMsg.content,
        metadata: assistantMsg.metadata,
        createdAt: assistantMsg.createdAt,
      },
    });
  } catch (error) {
    console.error("[assistant chat] error", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
});
