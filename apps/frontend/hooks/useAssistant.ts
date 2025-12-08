import { useMutation, useQuery } from "@tanstack/react-query";
import { AssistantContextSummary, ChatResponse } from "@/types/assistant";

type SendMessageInput = {
  message: string;
  conversationId?: string;
  contextType?: string;
  contextId?: string;
};

async function sendAssistantMessage(
  data: SendMessageInput
): Promise<ChatResponse> {
  const response = await fetch("/api/assistant/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to send message");
  }

  return response.json();
}

async function fetchAssistantContext(): Promise<AssistantContextSummary> {
  const response = await fetch("/api/assistant/context", {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch assistant context");
  }
  return response.json();
}

export function useAssistantChat() {
  return useMutation({
    mutationFn: sendAssistantMessage,
  });
}

export function useAssistantContext() {
  return useQuery({
    queryKey: ["assistant-context"],
    queryFn: fetchAssistantContext,
    staleTime: 5 * 60 * 1000,
  });
}

