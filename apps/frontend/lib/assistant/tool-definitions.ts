import { ChatCompletionTool } from "openai/resources/chat/completions";

/**
 * OpenAI Function Calling tool definitions.
 * These provide structured, type-safe tool calling instead of text-based parsing.
 */
export const TOOL_DEFINITIONS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_all_monitors",
      description:
        "Fetch all monitors for the current user including their status, URLs, and recent incidents. Use this when the user asks about their monitors list, overall monitoring status, or wants to see all their monitors.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_monitor_data",
      description:
        "Get detailed information about a specific monitor including uptime stats, average latency, recent check results (ticks), incidents, and escalation policy. ALWAYS use this before answering questions about a specific monitor's performance, uptime, or status.",
      parameters: {
        type: "object",
        properties: {
          monitorId: {
            type: "string",
            description:
              "The unique ID of the monitor to fetch detailed data for. Get this from get_all_monitors if not provided by the user.",
          },
        },
        required: ["monitorId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_escalation_policies",
      description:
        "List all escalation policies for the current user, including their notification levels, contacts, channels (email/slack/webhook), and which monitors use them. Use this when the user asks about alerts, notifications, escalation settings, or contact emails.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_incidents",
      description:
        "Fetch incidents with optional filters. Use this to get information about outages, downtime events, or problems with monitors. Can filter by monitor, status (ONGOING/ACKNOWLEDGED/RESOLVED), and limit results.",
      parameters: {
        type: "object",
        properties: {
          monitorId: {
            type: "string",
            description:
              "Optional: Filter incidents by a specific monitor ID. Omit to get incidents across all monitors.",
          },
          status: {
            type: "string",
            enum: ["ONGOING", "ACKNOWLEDGED", "RESOLVED"],
            description:
              "Optional: Filter by incident status. ONGOING = active issues, ACKNOWLEDGED = someone is working on it, RESOLVED = fixed.",
          },
          limit: {
            type: "number",
            description:
              "Optional: Maximum number of incidents to return. Default is 20.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_status_page_link",
      description:
        "Get the public URL for a status page. Use this when the user asks for their public status page link or URL to share with customers.",
      parameters: {
        type: "object",
        properties: {
          statusPageId: {
            type: "string",
            description:
              "Optional: Specific status page ID. If not provided, returns the most recent status page.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_all_incidents_for_monitor",
      description:
        "Fetch all incidents for a specific monitor. Use this when the user asks about the incident history or problems for a particular monitor.",
      parameters: {
        type: "object",
        properties: {
          monitorId: {
            type: "string",
            description:
              "The unique ID of the monitor to fetch incidents for. Required.",
          },
          status: {
            type: "string",
            enum: ["ONGOING", "ACKNOWLEDGED", "RESOLVED"],
            description: "Optional: Filter by incident status.",
          },
          limit: {
            type: "number",
            description:
              "Optional: Maximum number of incidents to return. Default is 50.",
          },
        },
        required: ["monitorId"],
      },
    },
  },
];

/**
 * Map of tool names to their handler function signatures.
 * Used for type-safe tool execution.
 */
export type ToolName =
  | "get_all_monitors"
  | "get_monitor_data"
  | "get_escalation_policies"
  | "get_incidents"
  | "get_status_page_link"
  | "get_all_incidents_for_monitor";

/**
 * Check if function calling is supported by the model.
 * Function calling requires gpt-3.5-turbo-0613 or later, or gpt-4.
 */
export function supportsToolCalling(model: string): boolean {
  const supportedPrefixes = [
    "gpt-4",
    "gpt-3.5-turbo-0613",
    "gpt-3.5-turbo-1106",
    "gpt-3.5-turbo-0125",
    "gpt-3.5-turbo-16k",
  ];

  // gpt-3.5-turbo without date suffix defaults to latest (supports tools)
  if (model === "gpt-3.5-turbo") {
    return true;
  }

  return supportedPrefixes.some(
    (prefix) => model.startsWith(prefix) || model.includes(prefix)
  );
}

/**
 * Allowed actions for write operations (not tools).
 * These are suggested to the user and executed on confirmation.
 */
export const ALLOWED_ACTIONS = [
  {
    type: "create_monitor",
    description: "Create a new monitor to track a URL",
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
    description: "Temporarily pause monitoring for a monitor",
    required: ["monitorId"],
  },
  {
    type: "resume_monitor",
    description: "Resume monitoring for a paused monitor",
    required: ["monitorId"],
  },
  {
    type: "delete_monitor",
    description: "Permanently delete a monitor",
    required: ["monitorId"],
  },
  {
    type: "create_escalation_policy",
    description: "Create a new escalation policy for alerts",
    required: ["name"],
    optional: ["levels"],
  },
  {
    type: "remove_escalation_policy",
    description: "Delete an escalation policy",
    required: ["escalationPolicyId"],
  },
  {
    type: "edit_escalation_policy",
    description: "Modify an existing escalation policy",
    required: ["escalationPolicyId"],
    optional: ["name", "enabled", "levels"],
  },
  {
    type: "view_incident_timeline",
    description: "View the detailed timeline of an incident",
    required: ["incidentId"],
  },
  {
    type: "acknowledge_incident",
    description: "Mark an incident as acknowledged (someone is working on it)",
    required: ["incidentId"],
  },
  {
    type: "resolve_incident",
    description: "Mark an incident as resolved",
    required: ["incidentId"],
  },
] as const;

export type ActionType = (typeof ALLOWED_ACTIONS)[number]["type"];

