import { AssistantContext } from "./context-builder";

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
