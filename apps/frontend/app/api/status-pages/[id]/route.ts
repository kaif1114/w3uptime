import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

// Use the same in-memory store as index route
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalAny: any = globalThis as any;
if (!globalAny.__STATUS_PAGE_STORE__) {
  globalAny.__STATUS_PAGE_STORE__ = new Map<string, any>();
}
const store: Map<string, any> = globalAny.__STATUS_PAGE_STORE__;

const updateSchema = z.object({
  name: z.string().optional(),
  isPublished: z.boolean().optional(),
  logoUrl: z.string().url().nullable().optional(),
  logoHrefUrl: z.string().url().nullable().optional(),
  contactUrl: z.string().url().nullable().optional(),
  historyRange: z.enum(["7d", "30d", "90d"]).optional(),
  sections: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        resources: z.array(
          z.object({ type: z.literal("monitor"), monitorId: z.string() })
        ),
      })
    )
    .optional(),
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
    .optional(),
  updates: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        body: z.string().optional(),
        createdAt: z.string(),
      })
    )
    .optional(),
});

export const GET = withAuth(
  async (_req: NextRequest, user, _session, context) => {
    const { id } = (await context.params) as { id: string };
    const record = store.get(id);
    if (!record || record.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(record);
  }
);

export const PATCH = withAuth(
  async (req: NextRequest, user, _session, context) => {
    const { id } = (await context.params) as { id: string };
    let record = store.get(id);
    if (!record) {
      // In-memory store can be empty after a restart. Create a skeleton record so PATCH works.
      const now = new Date().toISOString();
      record = {
        id,
        userId: user.id,
        name: "Untitled",
        isPublished: false,
        logoUrl: null,
        logoHrefUrl: null,
        contactUrl: null,
        historyRange: "7d",
        sections: [],
        maintenances: [],
        updates: [],
        createdAt: now,
        updatedAt: now,
      };
    } else if (record.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }
    const updated = {
      ...record,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };
    store.set(id, updated);
    return NextResponse.json({
      message: "Status page updated",
      statusPage: updated,
    });
  }
);

export const DELETE = withAuth(
  async (_req: NextRequest, user, _session, context) => {
    const { id } = (await context.params) as { id: string };
    const record = store.get(id);
    if (!record || record.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    store.delete(id);
    return NextResponse.json({ message: "Status page deleted" });
  }
);
