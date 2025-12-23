import OpenAI from "openai";
import {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionMessageToolCall,
} from "openai/resources/chat/completions";
import { buildAssistantContext, AssistantContext } from "./context-builder";
import { buildMessages, buildSystemPrompt } from "./prompt-builder";
import { TOOL_DEFINITIONS, supportsToolCalling } from "./tool-definitions";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.LLM_MODEL || "gpt-3.5-turbo";

if (!apiKey) {
  console.warn(
    "[assistant] No CHATGPT_API or OPENAI_API_KEY found. Assistant responses will fail."
  );
}

const openai = apiKey
  ? new OpenAI({
      apiKey,
    })
  : null;

export type HistoryMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ChatCompletionMessageToolCall[];
};

type LLMRequest = {
  userId: string;
  userMessage: string;
  contextType?: AssistantContext["contextType"];
  contextId?: string;
  history?: HistoryMessage[];
  /** If true, include tool definitions in the request */
  enableTools?: boolean;
  /** Tool results to include (for follow-up calls after tool execution) */
  toolResults?: Array<{
    tool_call_id: string;
    content: string;
  }>;
};

export type LLMResponse = {
  content: string;
  contextUsed: AssistantContext;
  /** Tool calls requested by the model (Function Calling) */
  toolCalls?: ChatCompletionMessageToolCall[];
  /** Whether this response used Function Calling or text-based fallback */
  usedFunctionCalling: boolean;
  /** Finish reason from the model */
  finishReason?: string;
};

/**
 * Generate an assistant reply using OpenAI.
 *
 * Supports both:
 * - OpenAI Function Calling (structured, reliable) for supported models
 * - Text-based tool calling (fallback) for older models
 *
 * @param enableTools - Set to true for initial request, false for follow-up after tool execution
 */
export async function generateAssistantReply({
  userId,
  userMessage,
  contextType,
  contextId,
  history = [],
  enableTools = true,
  toolResults,
}: LLMRequest): Promise<LLMResponse> {
  if (!openai) {
    throw new Error("OpenAI client is not configured. Missing API key.");
  }

  const context = await buildAssistantContext(userId, {
    contextType,
    contextId,
  });

  const systemPrompt = buildSystemPrompt(context);
  const baseMessages = buildMessages({
    systemPrompt,
    history,
    userMessage,
    context,
  }) as ChatCompletionMessageParam[];

  // Add tool results if this is a follow-up call
  let messages = baseMessages;
  if (toolResults && toolResults.length > 0) {
    const toolMessages: ChatCompletionToolMessageParam[] = toolResults.map(
      (result) => ({
        role: "tool" as const,
        tool_call_id: result.tool_call_id,
        content: result.content,
      })
    );
    messages = [...baseMessages, ...toolMessages];
  }

  const usesFunctionCalling = supportsToolCalling(model);

  // Build completion options
  const completionOptions: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages,
    // Lower temperature for factual accuracy (was 0.6)
    temperature: 0.2,
    max_tokens: 2000,
    // Slightly restrict randomness for more consistent outputs
    top_p: 0.9,
    // Reduce repetition
    frequency_penalty: 0.1,
  };

  // Add tools for supported models (only on initial request, not follow-up)
  if (enableTools && usesFunctionCalling && !toolResults) {
    completionOptions.tools = TOOL_DEFINITIONS;
    completionOptions.tool_choice = "auto";
  }

  const completion = await openai.chat.completions.create(completionOptions);

  const message = completion.choices[0]?.message;
  const content = message?.content?.trim() || "";
  const toolCalls = message?.tool_calls;
  const finishReason = completion.choices[0]?.finish_reason;

  return {
    content,
    contextUsed: context,
    toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
    usedFunctionCalling: usesFunctionCalling,
    finishReason,
  };
}

/**
 * Generate a follow-up response after tool execution.
 * This is called after tools have been executed and we need the LLM to
 * synthesize the results into a final response.
 *
 * The prompt instructs the model to respond directly without mentioning
 * that it fetched data (silent tool execution UX).
 */
export async function generateFollowUpReply({
  userId,
  originalMessage,
  contextType,
  contextId,
  history = [],
  assistantMessageWithToolCalls,
  toolResults,
}: {
  userId: string;
  originalMessage: string;
  contextType?: AssistantContext["contextType"];
  contextId?: string;
  history?: HistoryMessage[];
  assistantMessageWithToolCalls: {
    content: string | null;
    tool_calls: ChatCompletionMessageToolCall[];
  };
  toolResults: Array<{
    tool_call_id: string;
    name: string;
    result: unknown;
    error?: string;
  }>;
}): Promise<LLMResponse> {
  if (!openai) {
    throw new Error("OpenAI client is not configured. Missing API key.");
  }

  const context = await buildAssistantContext(userId, {
    contextType,
    contextId,
  });

  const systemPrompt = buildSystemPrompt(context);
  const baseMessages = buildMessages({
    systemPrompt,
    history,
    userMessage: originalMessage,
    context,
  }) as ChatCompletionMessageParam[];

  // Build the conversation with tool call and results
  const messagesWithTools: ChatCompletionMessageParam[] = [
    ...baseMessages,
    // The assistant's message that requested tool calls
    {
      role: "assistant" as const,
      content: assistantMessageWithToolCalls.content,
      tool_calls: assistantMessageWithToolCalls.tool_calls,
    },
    // Tool results
    ...toolResults.map(
      (result): ChatCompletionToolMessageParam => ({
        role: "tool" as const,
        tool_call_id: result.tool_call_id,
        content: result.error
          ? `Error: ${result.error}`
          : JSON.stringify(result.result, null, 2),
      })
    ),
  ];

  const completion = await openai.chat.completions.create({
    model,
    messages: messagesWithTools,
    temperature: 0.2,
    max_tokens: 2000,
    top_p: 0.9,
    frequency_penalty: 0.1,
    // No tools on follow-up - we just want the final response
  });

  const message = completion.choices[0]?.message;
  const content = message?.content?.trim() || "";

  return {
    content,
    contextUsed: context,
    usedFunctionCalling: true,
    finishReason: completion.choices[0]?.finish_reason,
  };
}

/**
 * Get the current model being used.
 */
export function getCurrentModel(): string {
  return model;
}

/**
 * Check if the current model supports Function Calling.
 */
export function currentModelSupportsTools(): boolean {
  return supportsToolCalling(model);
}
