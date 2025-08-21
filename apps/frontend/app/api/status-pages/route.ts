import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { randomUUID } from "crypto";

// In-memory store for demo purposes. Replace with DB later.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalAny: any = globalThis as any;
if (!globalAny.__STATUS_PAGE_STORE__) {
  globalAny.__STATUS_PAGE_STORE__ = new Map<string, any>();
}
const store: Map<string, any> = globalAny.__STATUS_PAGE_STORE__;

const createSchema = z.object({
  name: z.string().min(1),
  isPublished: z.boolean().optional().default(false),
  // Accept any string for logo so we can support uploads/data URLs during prototyping
  logoUrl: z.string().optional().nullable(),
  logoHrefUrl: z.string().optional().nullable(),
  contactUrl: z.string().optional().nullable(),
  historyRange: z.enum(["7d", "30d", "90d"]).optional().default("7d"),
  sections: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        resources: z.array(
          z.object({ type: z.literal("monitor"), monitorId: z.string() })
        ),
      })
    )
    .optional()
    .default([]),
  maintenances: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        start: z.string(),
        end: z.string(),
        status: z.enum(["scheduled", "in_progress", "completed"]),
      })
    )
    .optional()
    .default([]),
  updates: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        body: z.string().optional(),
        createdAt: z.string(),
      })
    )
    .optional()
    .default([]),
});

export const GET = withAuth(async (_req: NextRequest, user) => {
  const items = Array.from(store.values()).filter((s) => s.userId === user.id);
  return NextResponse.json({
    statusPages: items.map((i) => ({
      id: i.id,
      name: i.name,
      isPublished: i.isPublished,
      historyRange: i.historyRange,
    })),
  });
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }
    const id = randomUUID();
    const now = new Date().toISOString();
    const record = {
      id,
      userId: user.id,
      name: parsed.data.name,
      isPublished: parsed.data.isPublished ?? false,
      logoUrl: parsed.data.logoUrl ?? null,
      logoHrefUrl: parsed.data.logoHrefUrl ?? null,
      contactUrl: parsed.data.contactUrl ?? null,
      historyRange: parsed.data.historyRange ?? "7d",
      sections: parsed.data.sections ?? [],
      maintenances: parsed.data.maintenances ?? [],
      updates: parsed.data.updates ?? [],
      createdAt: now,
      updatedAt: now,
    };
    store.set(id, record);
    return NextResponse.json(
      { message: "Status page created", statusPage: record },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
