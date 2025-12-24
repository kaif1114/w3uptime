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
  thinkingSteps?: ThinkingStep[]; // Thinking process timeline
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
// Error Types
// ============================================================================

/**
 * Error type for chat-related errors
 * Extends Error with additional fields for HTTP status and rate limiting
 */
export interface ChatError extends Error {
  status?: number;
  resetIn?: number;
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

// ============================================================================
// AI SDK Stream Event Types (v6.0.3)
// ============================================================================

/**
 * Text delta event - incremental text content from AI streaming
 * This is the primary event type for streaming LLM responses
 */
export interface TextDeltaEvent {
  type: 'text-delta';
  id: string;
  delta: string; // The incremental text content
}

/**
 * Tool call event - AI is calling a tool
 */
export interface ToolCallStreamEvent {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

/**
 * Tool result event - result from tool execution
 */
export interface ToolResultStreamEvent {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result: unknown;
}

/**
 * Error event - an error occurred during streaming
 */
export interface ErrorEvent {
  type: 'error';
  error: string;
}

/**
 * Union type of all handled stream events
 */
export type StreamEvent = TextDeltaEvent | ToolCallStreamEvent | ToolResultStreamEvent | ErrorEvent;

/**
 * Type guard to check if parsed data is a TextDeltaEvent
 * Provides runtime type safety for stream event parsing
 */
export function isTextDeltaEvent(event: unknown): event is TextDeltaEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    event.type === 'text-delta' &&
    'delta' in event &&
    typeof event.delta === 'string'
  );
}

/**
 * Type guard to check if parsed data is a ToolCallStreamEvent
 */
export function isToolCallEvent(event: unknown): event is ToolCallStreamEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    event.type === 'tool-call'
  );
}

/**
 * Type guard to check if parsed data is a ToolResultStreamEvent
 */
export function isToolResultEvent(event: unknown): event is ToolResultStreamEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    event.type === 'tool-result'
  );
}

// ============================================================================
// Thinking Steps Types
// ============================================================================

/**
 * Status of a thinking/processing step
 */
export type StepStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

/**
 * A single step in the LLM's thinking/processing timeline
 */
export interface ThinkingStep {
  stepNumber: number;
  toolName: string;
  description: string; // User-friendly description
  status: StepStatus;
  args?: Record<string, unknown>; // Tool arguments
  result?: unknown; // Tool result
  error?: string; // Error message if failed
  startTime: string; // ISO timestamp
  endTime?: string; // ISO timestamp when completed
}
