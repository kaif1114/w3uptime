import { AssistantContext } from "./context-builder";
import { ALLOWED_ACTIONS } from "./tool-definitions";

/**
 * Text-based tool descriptions for fallback mode (older models without Function Calling).
 * When Function Calling is available, these are not used.
 */
const TEXT_BASED_TOOLS = [
  {
    type: "get_all_monitors",
    description: "Fetch all monitors for the current user",
    required: [],
    optional: [],
    returns: "Array of monitor objects with id, name, url, status",
  },
  {
    type: "get_monitor_data",
    description:
      "Get detailed information about a specific monitor including ticks, incidents, and status",
    required: ["monitorId"],
    optional: [],
    returns: "Monitor object with full details",
  },
  {
    type: "get_escalation_policies",
    description: "List all escalation policies for the current user",
    required: [],
    optional: [],
    returns: "Array of escalation policy objects with levels",
  },
  {
    type: "get_incidents",
    description: "Fetch incidents with optional filters",
    required: [],
    optional: ["monitorId", "status", "limit"],
    returns: "Array of incident objects",
  },
  {
    type: "get_status_page_link",
    description: "Get the public URL for a status page",
    required: [],
    optional: ["statusPageId"],
    returns: "Status page URL string",
  },
  {
    type: "get_all_incidents_for_monitor",
    description: "Fetch all incidents for a monitor in a certain time period",
    required: ["monitorId"],
    optional: ["status", "limit"],
    returns: "Array of incident objects",
  },
];

/**
 * Anti-hallucination rules that prevent the model from making up data.
 */
const ANTI_HALLUCINATION_RULES = [
  "=== CRITICAL RULES - NEVER VIOLATE ===",
  "1. NEVER invent, guess, or fabricate monitor IDs, incident IDs, URLs, emails, or any data",
  "2. If you don't have specific data, use a tool to fetch it - NEVER make assumptions",
  "3. ALWAYS use tools to fetch current data before answering questions about status, uptime, or incidents",
  "4. The context snapshot may be outdated - prefer fresh tool results over context data",
  "5. If a tool returns empty results or an error, say 'No data found' or report the error - NEVER make up results",
  "6. For actions requiring IDs (monitorId, incidentId, etc.), ALWAYS fetch the ID first using tools if not provided",
  "7. When citing statistics (uptime %, latency, incident count), only use numbers from actual tool results",
  "8. If you're unsure about something, say 'I don't have that information' rather than guessing",
];

/**
 * UX behavior rules for silent tool execution.
 * The assistant should not narrate its process - just provide answers.
 */
const SILENT_UX_RULES = [
  "=== RESPONSE BEHAVIOR ===",
  "1. NEVER announce that you are fetching data or calling tools",
  "2. NEVER say phrases like 'Let me fetch that', 'I need to get', 'Let me check', 'Based on the data I retrieved'",
  "3. When you need data, call the tool and respond with the FINAL answer only",
  "4. Do NOT narrate your process - just provide the answer directly",
  "5. Respond as if you already have the information",
  "",
  "BAD EXAMPLES (never do this):",
  "- 'Let me fetch the escalation policy... The email is john@example.com'",
  "- 'I need to check your monitor status first. Based on the data...'",
  "- 'Let me get that information for you...'",
  "",
  "GOOD EXAMPLES (do this):",
  "- 'The email associated with your escalation policy is john@example.com'",
  "- 'Your API monitor is currently UP with 99.9% uptime over the last 24 hours.'",
  "- 'You have 3 active monitors, all currently healthy.'",
];

/**
 * Build the system prompt with anti-hallucination guardrails.
 *
 * @param context - The assistant context with user data summary
 * @param useFunctionCalling - If true, omit text-based tool instructions (Function Calling handles it)
 */
export function buildSystemPrompt(
  context: AssistantContext,
  useFunctionCalling = true
): string {
  const monitorCount = context.summary.monitors.length;
  const incidentCount = context.summary.incidents.length;

  const sections: string[] = [
    "You are W3Uptime's monitoring assistant.",
    "You help users understand monitor status, incidents, alerts, escalation policies, and analytics.",
    "Be concise, actionable, and accurate.",
    "",
    ...ANTI_HALLUCINATION_RULES,
    "",
    ...SILENT_UX_RULES,
  ];

  // Only include text-based tool instructions for older models
  if (!useFunctionCalling) {
    const toolDescriptions = TEXT_BASED_TOOLS.map(
      (tool) =>
        `- ${tool.type}: ${tool.description}. Required: ${tool.required.join(", ") || "none"}. Optional: ${tool.optional.join(", ") || "none"}. Returns: ${tool.returns}`
    ).join("\n");

    sections.push(
      "",
      "=== TOOLS (Read-Only Data Fetching) - TEXT MODE ===",
      "You have access to tools that fetch fresh data from the system.",
      "When you need to call a tool, append a JSON block on its own line in this exact format:",
      "TOOL_CALLS:",
      '[{ "type": "<tool_type>", "data": { /* required and optional fields */ } }]',
      "You can call multiple tools by including multiple objects in the array.",
      "Available tools:",
      toolDescriptions
    );
  }

  // Actions section (write operations suggested to user)
  const actionsList = ALLOWED_ACTIONS.map((a) => a.type).join(", ");
  sections.push(
    "",
    "=== ACTIONS (Write Operations) ===",
    "Actions modify data (create, update, delete). They are SUGGESTED to the user, not executed automatically.",
    "If required data for an action is missing, use tools to fetch it first, or ask the user - NEVER guess.",
    "Only emit SUGGESTED_ACTIONS when all required fields are available and verified.",
    "Include a short preview of the action data in your response.",
    "Format:",
    "SUGGESTED_ACTIONS:",
    '[{ "type": "<action_type>", "label": "<button label>", "confirm": true, "data": { /* all required fields */ } }]',
    `Allowed actions: ${actionsList}`
  );

  // Context summary
  sections.push(
    "",
    "=== CONTEXT ===",
    `User has ${monitorCount} monitors and ${incidentCount} recent incidents.`,
    `Context generated at: ${context.generatedAt}`,
    "WARNING: This context is a snapshot and may be stale. ALWAYS use tools to fetch current data for status questions."
  );

  return sections.join("\n");
}

type HistoryMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type BuildMessagesParams = {
  systemPrompt: string;
  history: HistoryMessage[];
  userMessage: string;
  context: AssistantContext;
};

/**
 * Build the message array for the LLM, including context as a
 * compact JSON block the model can reason over.
 */
export function buildMessages({
  systemPrompt,
  history,
  userMessage,
  context,
}: BuildMessagesParams) {
  const contextSummary = {
    contextType: context.contextType,
    contextId: context.contextId,
    focus: context.focus,
    summary: context.summary,
    _metadata: {
      generatedAt: context.generatedAt,
      warning:
        "This is a snapshot that may be outdated. Use tools for current data.",
    },
  };

  return [
    { role: "system", content: systemPrompt },
    {
      role: "system",
      content: `Context Snapshot (may be stale):\n${JSON.stringify(contextSummary, null, 2)}`,
    },
    ...history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];
}
