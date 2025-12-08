import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAssistantContextSummary } from "@/lib/assistant/context-builder";

export const GET = withAuth(async (_req, user, _session) => {
  try {
    const context = await getAssistantContextSummary(user.id);
    return NextResponse.json(context);
  } catch (error) {
    console.error("[assistant context] error", error);
    return NextResponse.json(
      { error: "Failed to fetch assistant context" },
      { status: 500 }
    );
  }
});
