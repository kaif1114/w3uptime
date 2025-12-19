import { AssistantContext } from "./context-builder";
const AVAILABLE_TOOLS = [
  {
    type: "get_all_monitors",
    description: "Fetch all monitors for the current user",
    required: [],
    optional: [],
    returns: "Array of monitor objects with id, name, url, status",
  },
  {
    type: "get_monitor_data",
    description: "Get detailed information about a specific monitor including ticks, incidents, and status",
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
    description: "fetch all incidents for a monitor in certain time period",
    required: ["monitorId"],
    optional: ["status","limit"],
    returns: "Array of incident objects",
  },
];

const ALLOWED_ACTIONS = [
  {
    type: "create_monitor",
    required: ["name", "url"],
    optional: [
      "timeout",
      "checkInterval",
      "expectedStatusCodes",
      "escalationPolicyId",
    ],
  },
  {
    type: "pause_monitor",
    required: ["monitorId"],
  },
  {
    type: "resume_monitor",
    required: ["monitorId"],
  },
  {
    type: "delete_monitor",
    required: ["monitorId"],
  },
  {
    type: "create_escalation_policy",
    required: ["name"],
    optional: ["levels"],
  },
  {
    type: "remove_escalation_policy",
    required: ["escalationPolicyId"],
  },
  {
    type: "edit_escalation_policy",
    required: ["escalationPolicyId"],
    optional: ["name", "enabled", "levels"],
  },
  {
    type: "view_incident_timeline",
    required: ["incidentId"],
  },
  {
    type: "acknowledge_incident",
    required: ["incidentId"],
  },
  {
    type: "resolve_incident",
    required: ["incidentId"],
  },
];

/**
 * System prompt that sets the assistant's role.
 */
export function buildSystemPrompt(context: AssistantContext) {
  const monitorCount = context.summary.monitors.length;
  const incidentCount = context.summary.incidents.length;

  return [
    "You are W3Uptime's monitoring assistant.",
    "You help users understand monitor status, incidents, alerts, and analytics.",
    "Be concise, actionable, and clear.",
    "If required data for an action is missing, first ask the user to provide it instead of guessing.",
    "Only emit SUGGESTED_ACTIONS after all required fields for that action are available.",
    "When you emit SUGGESTED_ACTIONS, also include in your visible reply a short preview of the data you will send.",
    "When proposing executable actions, append a JSON block on its own line in this exact format:",
    "SUGGESTED_ACTIONS:",
    '[{ "type": "<action_type>", "label": "<short label>", "confirm": false, "data": { /* required fields */ } }]',
    "Only include actions from the allowed list and only when relevant. If no actions, omit SUGGESTED_ACTIONS.",
    `Allowed actions: ${ALLOWED_ACTIONS.map((a) => a.type).join(", ")}`,
    `User has ${monitorCount} monitors and ${incidentCount} recent incidents.`,
  ].join(" ");
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
    generatedAt: context.generatedAt,
  };

  return [
    { role: "system", content: systemPrompt },
    {
      role: "system",
      content: `Context JSON:\n${JSON.stringify(contextSummary, null, 2)}`,
    },
    ...history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];
}
