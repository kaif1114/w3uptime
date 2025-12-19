import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { prisma } from "db/client";
import { generateAssistantReply } from "@/lib/assistant/llm-service";
import {
  getAllMonitors,
  getMonitorData,
  getEscalationPolicies,
  getIncidents,
  getStatusPageLink,
  getAllIncidentsForMonitor,
} from "@/lib/assistant/ToolHandlers";
import { ConversationContext, SuggestedAction, ToolCall, ToolResult } from "@/types/assistant";

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
    let llmResult = await generateAssistantReply({
      userId: user.id,
      userMessage: message.trim(),
      contextType: contextType ?? conversation.contextType ?? undefined,
      contextId: contextId ?? conversation.contextId ?? undefined,
      history,
    });

    // Extract tool calls if the model followed the TOOL_CALLS convention
    let toolCalls: ToolCall[] = [];
    let toolResults: ToolResult[] = [];
    let toolsUsed: string[] = [];

    let assistantContent = llmResult.content;
    const toolMarker = "TOOL_CALLS:";
    const toolMarkerIndex = assistantContent.lastIndexOf(toolMarker);

    if (toolMarkerIndex !== -1) {
      const toolBlock = assistantContent
        .slice(toolMarkerIndex + toolMarker.length)
        .trim();
      const contentWithoutTools = assistantContent
        .slice(0, toolMarkerIndex)
        .trim();

      try {
        const parsed = JSON.parse(toolBlock);
        if (Array.isArray(parsed)) {
          toolCalls = parsed.filter(
            (tc) =>
              tc &&
              typeof tc.type === "string" &&
              (!tc.data || typeof tc.data === "object")
          ) as ToolCall[];

          // Execute tools
          if (toolCalls.length > 0) {
            const toolExecutionPromises = toolCalls.map(async (toolCall) => {
              try {
                let result: unknown;

                switch (toolCall.type) {
                  case "get_all_monitors":
                    result = await getAllMonitors(user.id);
                    break;
                  case "get_monitor_data":
                    if (!toolCall.data?.monitorId) {
                      throw new Error("monitorId is required");
                    }
                    result = await getMonitorData(
                      user.id,
                      toolCall.data.monitorId as string
                    );
                    break;
                  case "get_escalation_policies":
                    result = await getEscalationPolicies(user.id);
                    break;
                  case "get_incidents":
                    result = await getIncidents(user.id, {
                      monitorId: toolCall.data?.monitorId as string | undefined,
                      status: toolCall.data?.status as
                        | "ONGOING"
                        | "ACKNOWLEDGED"
                        | "RESOLVED"
                        | undefined,
                      limit: toolCall.data?.limit
                        ? Number(toolCall.data.limit)
                        : undefined,
                    });
                    break;
                  case "get_status_page_link":
                    result = await getStatusPageLink(
                      user.id,
                      toolCall.data?.statusPageId as string | undefined
                    );
                    break;
                  case "get_all_incidents_for_monitor":
                    if (!toolCall.data?.monitorId) {
                      throw new Error("monitorId is required");
                    }
                    result = await getAllIncidentsForMonitor(
                      user.id,
                      toolCall.data.monitorId as string,
                      {
                        status: toolCall.data?.status as
                          | "ONGOING"
                          | "ACKNOWLEDGED"
                          | "RESOLVED"
                          | undefined,
                        limit: toolCall.data?.limit
                          ? Number(toolCall.data.limit)
                          : undefined,
                      }
                    );
                    break;
                  default:
                    throw new Error(`Unknown tool type: ${toolCall.type}`);
                }

                toolsUsed.push(toolCall.type);
                return {
                  toolType: toolCall.type,
                  result,
                } as ToolResult;
              } catch (error) {
                return {
                  toolType: toolCall.type,
                  result: null,
                  error: (error as Error).message || "Tool execution error",
                } as ToolResult;
              }
            });

            toolResults = await Promise.all(toolExecutionPromises);

            // Make a follow-up LLM call with tool results
            const toolResultsText = toolResults
              .map((tr) => {
                if (tr.error) {
                  return `${tr.toolType}: Error - ${tr.error}`;
                }
                return `${tr.toolType}: ${JSON.stringify(tr.result, null, 2)}`;
              })
              .join("\n\n");

            const followUpHistory = [
              ...history,
              {
                role: "assistant" as const,
                content: contentWithoutTools || assistantContent,
              },
              {
                role: "user" as const,
                content: `Tool Results:\n${toolResultsText}\n\nPlease provide your response based on this data.`,
              },
            ];

            llmResult = await generateAssistantReply({
              userId: user.id,
              userMessage: `Tool Results:\n${toolResultsText}`,
              contextType: contextType ?? conversation.contextType ?? undefined,
              contextId: contextId ?? conversation.contextId ?? undefined,
              history: followUpHistory,
            });

            assistantContent = llmResult.content;
          } else {
            // No valid tool calls, use original content
            assistantContent = contentWithoutTools || assistantContent;
          }
        }
      } catch {
        // ignore malformed tool calls, use original content
      }
    }

    // Extract suggested actions if the model followed the SUGGESTED_ACTIONS convention
    let suggestedActions: SuggestedAction[] = [];

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

    // Prepare metadata for storage (must be JSON-serializable)
    const metadataSafe = JSON.parse(
      JSON.stringify({
        contextUsed: contextUsedSafe,
        suggestedActions: validatedActions,
        toolResults: toolResults.length > 0 ? toolResults : undefined,
        toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
      })
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
          metadata: metadataSafe,
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
      toolResults: toolResults.length > 0 ? toolResults : undefined,
      toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
    });
  } catch (error) {
    console.error("[assistant chat] error", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
});
