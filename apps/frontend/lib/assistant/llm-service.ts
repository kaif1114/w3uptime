import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { buildAssistantContext, AssistantContext } from "./context-builder";
import { buildMessages, buildSystemPrompt } from "./prompt-builder";

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

type HistoryMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type LLMRequest = {
  userId: string;
  userMessage: string;
  contextType?: AssistantContext["contextType"];
  contextId?: string;
  history?: HistoryMessage[];
};

export async function generateAssistantReply({
  userId,
  userMessage,
  contextType,
  contextId,
  history = [],
}: LLMRequest) {
  if (!openai) {
    throw new Error("OpenAI client is not configured. Missing API key.");
  }

  const context = await buildAssistantContext(userId, {
    contextType,
    contextId,
  });

  const systemPrompt = buildSystemPrompt(context);
  const messages = buildMessages({
    systemPrompt,
    history,
    userMessage,
    context,
  }) as ChatCompletionMessageParam[];

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.6,
    max_tokens: 600,
  });

  const content = completion.choices[0]?.message?.content?.trim() || "";

  return {
    content,
    contextUsed: context,
  };
}
