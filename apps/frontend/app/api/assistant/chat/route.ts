import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { prisma } from "db/client";
import {
  generateAssistantReply,
  generateFollowUpReply,
  currentModelSupportsTools,
  HistoryMessage,
} from "@/lib/assistant/llm-service";
import {
  getAllMonitors,
  getMonitorData,
  getEscalationPolicies,
  getIncidents,
  getStatusPageLink,
  getAllIncidentsForMonitor,
} from "@/lib/assistant/ToolHandlers";
import { ToolName } from "@/lib/assistant/tool-definitions";
import { summarizeToolResult } from "@/lib/assistant/result-summarizer";
import {
  validateResponse,
  logValidationWarnings,
  ToolResult as ValidationToolResult,
} from "@/lib/assistant/response-validator";
import {
  ConversationContext,
  SuggestedAction,
  ToolCall,
  ToolResult,
} from "@/types/assistant";
import { ChatCompletionMessageToolCall } from "openai/resources/chat/completions";

type ChatBody = {
  message?: string;
  conversationId?: string;
  contextType?: ConversationContext;
  contextId?: string;
};

/**
 * Execute a tool by name and return the result.
 */
async function executeTool(
  userId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ result: unknown; error?: string }> {
  try {
    let result: unknown;

    switch (toolName) {
      case "get_all_monitors":
        result = await getAllMonitors(userId);
        break;

      case "get_monitor_data":
        if (!args.monitorId) {
          throw new Error("monitorId is required");
        }
        result = await getMonitorData(userId, args.monitorId as string);
        break;

      case "get_escalation_policies":
        result = await getEscalationPolicies(userId);
        break;

      case "get_incidents":
        result = await getIncidents(userId, {
          monitorId: args.monitorId as string | undefined,
          status: args.status as
            | "ONGOING"
            | "ACKNOWLEDGED"
            | "RESOLVED"
            | undefined,
          limit: args.limit ? Number(args.limit) : undefined,
        });
        break;

      case "get_status_page_link":
        result = await getStatusPageLink(
          userId,
          args.statusPageId as string | undefined
        );
        break;

      case "get_all_incidents_for_monitor":
        if (!args.monitorId) {
          throw new Error("monitorId is required");
        }
        result = await getAllIncidentsForMonitor(
          userId,
          args.monitorId as string,
          {
            status: args.status as
              | "ONGOING"
              | "ACKNOWLEDGED"
              | "RESOLVED"
              | undefined,
            limit: args.limit ? Number(args.limit) : undefined,
          }
        );
        break;

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    return { result };
  } catch (error) {
    return {
      result: null,
      error: (error as Error).message || "Tool execution error",
    };
  }
}

/**
 * Handle OpenAI Function Calling tool calls.
 */
async function handleFunctionCalling(
  userId: string,
  toolCalls: ChatCompletionMessageToolCall[]
): Promise<{
  toolResults: ToolResult[];
  toolsUsed: string[];
  formattedResults: Array<{
    tool_call_id: string;
    name: string;
    result: unknown;
    error?: string;
  }>;
}> {
  const toolResults: ToolResult[] = [];
  const toolsUsed: string[] = [];
  const formattedResults: Array<{
    tool_call_id: string;
    name: string;
    result: unknown;
    error?: string;
  }> = [];

  const executions = toolCalls.map(async (toolCall) => {
    const functionName = toolCall.function.name;
    let args: Record<string, unknown> = {};

    try {
      args = JSON.parse(toolCall.function.arguments || "{}");
    } catch {
      // Invalid JSON in arguments
      const errorResult: ToolResult = {
        toolType: functionName,
        result: null,
        error: "Invalid tool arguments",
      };
      toolResults.push(errorResult);
      formattedResults.push({
        tool_call_id: toolCall.id,
        name: functionName,
        result: null,
        error: "Invalid tool arguments",
      });
      return;
    }

    const { result, error } = await executeTool(userId, functionName, args);

    toolsUsed.push(functionName);
    toolResults.push({
      toolType: functionName,
      result: error ? null : result,
      error,
    });
    formattedResults.push({
      tool_call_id: toolCall.id,
      name: functionName,
      result: error ? null : result,
      error,
    });
  });

  await Promise.all(executions);

  return { toolResults, toolsUsed, formattedResults };
}

/**
 * Handle text-based tool calling (fallback for older models).
 */
async function handleTextBasedToolCalling(
  userId: string,
  content: string
): Promise<{
  toolResults: ToolResult[];
  toolsUsed: string[];
  contentWithoutTools: string;
  toolCalls: ToolCall[];
}> {
  const toolResults: ToolResult[] = [];
  const toolsUsed: string[] = [];
  let toolCalls: ToolCall[] = [];
  let contentWithoutTools = content;

  const toolMarker = "TOOL_CALLS:";
  const toolMarkerIndex = content.lastIndexOf(toolMarker);

  if (toolMarkerIndex === -1) {
    return { toolResults, toolsUsed, contentWithoutTools, toolCalls };
  }

  const toolBlock = content.slice(toolMarkerIndex + toolMarker.length).trim();
  contentWithoutTools = content.slice(0, toolMarkerIndex).trim();

  try {
    const parsed = JSON.parse(toolBlock);
    if (!Array.isArray(parsed)) {
      return { toolResults, toolsUsed, contentWithoutTools, toolCalls };
    }

    toolCalls = parsed.filter(
      (tc) =>
        tc &&
        typeof tc.type === "string" &&
        (!tc.data || typeof tc.data === "object")
    ) as ToolCall[];

    // Execute tools
    for (const toolCall of toolCalls) {
      const { result, error } = await executeTool(
        userId,
        toolCall.type,
        toolCall.data || {}
      );

      toolsUsed.push(toolCall.type);
      toolResults.push({
        toolType: toolCall.type,
        result: error ? null : result,
        error,
      });
    }
  } catch (parseError) {
    console.error(
      "[assistant chat] Failed to parse text-based tool calls:",
      parseError
    );
    // Return content without the malformed tool block
  }

  return { toolResults, toolsUsed, contentWithoutTools, toolCalls };
}

/**
 * Extract suggested actions from response text.
 */
function extractSuggestedActions(content: string): {
  actions: SuggestedAction[];
  contentWithoutActions: string;
} {
  const marker = "SUGGESTED_ACTIONS:";
  const markerIndex = content.lastIndexOf(marker);

  if (markerIndex === -1) {
    return { actions: [], contentWithoutActions: content };
  }

  const actionsBlock = content.slice(markerIndex + marker.length).trim();
  const contentWithoutActions = content.slice(0, markerIndex).trim();

  try {
    const parsed = JSON.parse(actionsBlock);
    if (!Array.isArray(parsed)) {
      return { actions: [], contentWithoutActions };
    }

    const actions: SuggestedAction[] = parsed
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

    return { actions, contentWithoutActions };
  } catch {
    return { actions: [], contentWithoutActions };
  }
}

/**
 * Validate and filter suggested actions.
 */
function validateActions(actions: SuggestedAction[]): SuggestedAction[] {
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

  return actions.filter((action) => {
    const spec = ACTION_SPECS[action.type];
    if (!spec) return false;
    const data = action.data || {};
    return spec.required.every(
      (field) =>
        data[field] !== undefined && data[field] !== null && data[field] !== ""
    );
  });
}

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

    const history: HistoryMessage[] = recentMessages.map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant" | "system",
      content: m.content,
    }));

    // Initial LLM call
    let llmResult = await generateAssistantReply({
      userId: user.id,
      userMessage: message.trim(),
      contextType: contextType ?? conversation.contextType ?? undefined,
      contextId: contextId ?? conversation.contextId ?? undefined,
      history,
      enableTools: true,
    });

    let assistantContent = llmResult.content;
    let toolResults: ToolResult[] = [];
    let toolsUsed: string[] = [];

    const useFunctionCalling =
      llmResult.usedFunctionCalling && currentModelSupportsTools();

    // Handle tool calls based on method
    if (useFunctionCalling && llmResult.toolCalls?.length) {
      // OpenAI Function Calling (structured, reliable)
      const { toolResults: results, toolsUsed: used, formattedResults } =
        await handleFunctionCalling(user.id, llmResult.toolCalls);

      toolResults = results;
      toolsUsed = used;

      if (formattedResults.length > 0) {
        // Make follow-up call with tool results
        const followUpResult = await generateFollowUpReply({
          userId: user.id,
          originalMessage: message.trim(),
          contextType: contextType ?? conversation.contextType ?? undefined,
          contextId: contextId ?? conversation.contextId ?? undefined,
          history,
          assistantMessageWithToolCalls: {
            content: llmResult.content,
            tool_calls: llmResult.toolCalls,
          },
          toolResults: formattedResults,
        });

        assistantContent = followUpResult.content;
      }
    } else if (!useFunctionCalling) {
      // Text-based fallback for older models
      const {
        toolResults: results,
        toolsUsed: used,
        contentWithoutTools,
        toolCalls,
      } = await handleTextBasedToolCalling(user.id, llmResult.content);

      if (toolCalls.length > 0) {
        toolResults = results;
        toolsUsed = used;

        // Make follow-up call with summarized tool results
        const toolResultsText = results
          .map((tr) => {
            if (tr.error) {
              return `[${tr.toolType}] ERROR: ${tr.error}`;
            }
            return `[${tr.toolType}] Result:\n${summarizeToolResult(tr.toolType as ToolName, tr.result)}`;
          })
          .join("\n\n");

        const followUpHistory: HistoryMessage[] = [
          ...history,
          {
            role: "assistant" as const,
            content: contentWithoutTools || llmResult.content,
          },
          {
            role: "user" as const,
            // Silent UX: Don't mention fetching data
            content: `[INTERNAL DATA - Do not mention that you fetched this]\n\n${toolResultsText}\n\nRespond directly with the answer. Do NOT say "based on the data" or mention that you fetched anything.`,
          },
        ];

        const followUpResult = await generateAssistantReply({
          userId: user.id,
          userMessage: message.trim(),
          contextType: contextType ?? conversation.contextType ?? undefined,
          contextId: contextId ?? conversation.contextId ?? undefined,
          history: followUpHistory,
          enableTools: false, // No tools on follow-up
        });

        assistantContent = followUpResult.content;
      } else {
        assistantContent = contentWithoutTools || llmResult.content;
      }
    }

    // Extract and validate suggested actions
    const { actions: suggestedActions, contentWithoutActions } =
      extractSuggestedActions(assistantContent);
    assistantContent = contentWithoutActions || assistantContent;

    const validatedActions = validateActions(suggestedActions);

    // Validate response for potential hallucinations
    const validationResult = validateResponse(
      assistantContent,
      toolResults as ValidationToolResult[],
      llmResult.contextUsed,
      toolsUsed.length > 0
    );

    if (!validationResult.isValid) {
      logValidationWarnings(validationResult, assistantContent);
    }

    // Prepare metadata for storage (must be JSON-serializable)
    const contextUsedSafe = JSON.parse(
      JSON.stringify(llmResult.contextUsed ?? null)
    );

    const metadataSafe = JSON.parse(
      JSON.stringify({
        contextUsed: contextUsedSafe,
        suggestedActions: validatedActions,
        toolResults: toolResults.length > 0 ? toolResults : undefined,
        toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
        usedFunctionCalling: useFunctionCalling,
        validationWarnings: validationResult.warnings.length > 0
          ? validationResult.warnings
          : undefined,
      })
    );

    // Persist messages
    const [, assistantMsg] = await Promise.all([
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
