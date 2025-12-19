export type ConversationContext =
  | "GENERAL"
  | "MONITOR"
  | "INCIDENT"
  | "ANALYTICS"
  | "ALERT"
  | "ESCALATION";

export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export interface ConversationSummary {
  id: string;
  title?: string | null;
  contextType?: ConversationContext | null;
  contextId?: string | null;
  lastMessageAt: string;
  messageCount: number;
}

export interface AssistantMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  metadata?: {
    suggestedActions?: SuggestedAction[];
    contextUsed?: Record<string, unknown>;
    toolResults?: ToolResult[];
    toolsUsed?: string[];
  };
}

export interface ChatResponse {
  message: AssistantMessage;
  conversationId: string;
  suggestions?: string[];
  toolResults?: ToolResult[];
  toolsUsed?: string[];
}

export interface ToolCall {
  type: string;
  data?: Record<string, unknown>;
}

export interface ToolResult {
  toolType: string;
  result: unknown;
  error?: string;
}

export type SuggestedAction = {
  type: string;
  label?: string;
  confirm?: boolean;
  data?: Record<string, unknown>;
};

export interface AssistantContextSummary {
  monitors: Array<{
    id: string;
    name: string;
    url: string;
    status: string;
    hasOngoingIncident: boolean;
    lastCheckedAt?: string | null;
  }>;
  incidents: Array<{
    id: string;
    title: string;
    status: string;
    monitorId: string;
    monitorName: string;
    createdAt: string;
  }>;
  analytics: Array<{
    monitorId: string;
    monitorName: string;
    healthScore?: number | null;
    uptime?: number | null;
    avgLatency?: number | null;
    recentInsights?: string[];
  }>;
}
