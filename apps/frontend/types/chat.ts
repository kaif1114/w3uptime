// ============================================================================
// Chat Message Types
// ============================================================================

/**
 * Role of the message sender in the conversation
 */
export type MessageRole = 'user' | 'assistant' | 'tool';

/**
 * Represents a tool call made by the assistant
 */
export interface ToolCall {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

/**
 * Represents the result of a tool execution
 */
export interface ToolResult {
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}

/**
 * A single message in the conversation
 */
export interface Message {
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: string; // ISO 8601 format
}

// ============================================================================
// Page Context Types
// ============================================================================

/**
 * Type of page the user is currently viewing
 * Maps to actual app routes in apps/frontend/app/(user)/
 */
export type PageType =
  | 'monitor-detail'      // /monitors/[id]
  | 'dashboard'           // /overview
  | 'incidents'           // /incidents
  | 'incident-detail'     // /incidents/[id]
  | 'validators'          // /global-network
  | 'escalation-policies' // /escalation-policies
  | null;                 // No specific context

/**
 * Contextual information about the page the user is viewing
 * Used to make assistant responses context-aware
 */
export interface PageContext {
  pageType: PageType;
  monitorId?: string;
  incidentId?: string;
  escalationPolicyId?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request payload for chat API endpoint
 */
export interface ChatRequest {
  message: string;
  conversationId?: string;
  context?: PageContext;
}

/**
 * Response from chat API endpoint
 */
export interface ChatResponse {
  success: boolean;
  conversationId: string;
  stream?: ReadableStream;
  error?: string;
}

// ============================================================================
// Conversation Storage Types
// ============================================================================

/**
 * Conversation stored in Redis
 * Used for maintaining chat history across sessions
 */
export interface StoredConversation {
  conversationId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  metadata?: {
    lastContext?: PageContext;
    totalTokens?: number;
  };
}

/**
 * Context passed to tool execution functions
 * Provides authentication and page context
 */
export interface ToolExecutionContext {
  userId: string;
  sessionId: string;
  context?: PageContext;
}
