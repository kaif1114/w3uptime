import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import {
  getAllMonitors,
  getMonitorData,
  getEscalationPolicies,
  getIncidents,
  getStatusPageLink,
  getAllIncidentsForMonitor,
} from "@/lib/assistant/ToolHandlers";

type ToolBody = {
  toolType?: string;
  toolData?: Record<string, unknown>;
};

export const POST = withAuth(async (req: NextRequest, user, _session) => {
  try {
    const body = (await req.json()) as ToolBody;
    const { toolType, toolData } = body;

    if (!toolType) {
      return NextResponse.json(
        { error: "toolType is required" },
        { status: 400 }
      );
    }

    let result: unknown;

    switch (toolType) {
      case "get_all_monitors":
        result = await getAllMonitors(user.id);
        break;

      case "get_monitor_data":
        const monitorId = toolData?.monitorId as string | undefined;
        if (!monitorId) {
          return NextResponse.json(
            { error: "monitorId is required for get_monitor_data" },
            { status: 400 }
          );
        }
        result = await getMonitorData(user.id, monitorId);
        break;

      case "get_escalation_policies":
        result = await getEscalationPolicies(user.id);
        break;

      case "get_incidents":
        const incidentFilters = {
          monitorId: toolData?.monitorId as string | undefined,
          status: toolData?.status as
            | "ONGOING"
            | "ACKNOWLEDGED"
            | "RESOLVED"
            | undefined,
          limit: toolData?.limit
            ? Number(toolData.limit)
            : undefined,
        };
        result = await getIncidents(user.id, incidentFilters);
        break;

      case "get_status_page_link":
        const statusPageId = toolData?.statusPageId as string | undefined;
        result = await getStatusPageLink(user.id, statusPageId);
        break;

      case "get_all_incidents_for_monitor":
        const monitorIdForIncidents = toolData?.monitorId as
          | string
          | undefined;
        if (!monitorIdForIncidents) {
          return NextResponse.json(
            {
              error:
                "monitorId is required for get_all_incidents_for_monitor",
            },
            { status: 400 }
          );
        }
        const incidentFiltersForMonitor = {
          status: toolData?.status as
            | "ONGOING"
            | "ACKNOWLEDGED"
            | "RESOLVED"
            | undefined,
          limit: toolData?.limit
            ? Number(toolData.limit)
            : undefined,
        };
        result = await getAllIncidentsForMonitor(
          user.id,
          monitorIdForIncidents,
          incidentFiltersForMonitor
        );
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported tool type: ${toolType}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("[assistant tools] error", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Tool execution failed",
      },
      { status: 400 }
    );
  }
});
