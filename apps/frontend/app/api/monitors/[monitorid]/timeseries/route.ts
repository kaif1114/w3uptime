import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const timeseriesQuerySchema = z.object({
  period: z.enum(['1hr', '1day', '3days', '1week', '2weeks', '30days', '90days']).default('30days'),
  bucket: z.enum(['1 minute', '5 minutes', '15 minutes', '30 minutes', '1 hour', '4 hours', '1 day']).default('1 hour'),
});

// GET /api/monitors/[monitorid]/timeseries - Get time series data for charts
export const GET = withAuth(async (
  req: NextRequest,
  user,
  session,
  { params }: { params: Promise<{ monitorid: string }> }
) => {
  try {
    const { monitorid } = await params;
    const { searchParams } = new URL(req.url);
    
    const validation = timeseriesQuerySchema.safeParse({
      period: searchParams.get('period') || '30days',
      bucket: searchParams.get('bucket') || '1 hour',
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { period, bucket } = validation.data;

    // Verify monitor ownership
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorid,
        userId: user.id,
      },
    });

    if (!monitor) {
      return NextResponse.json(
        { error: "Monitor not found" },
        { status: 404 }
      );
    }

    // Get time series data
    const timeseriesData = await prisma.$queryRaw`
      SELECT * FROM get_monitor_timeseries(${monitorid}, ${period}, ${bucket})
    `;

    return NextResponse.json({
      monitorId: monitorid,
      period,
      bucketSize: bucket,
      data: timeseriesData || [],
      generatedAt: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching monitor timeseries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});