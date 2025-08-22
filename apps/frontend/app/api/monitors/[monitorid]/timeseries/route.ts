import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const timeseriesQuerySchema = z.object({
  period: z.enum(['hour', 'day', 'week', 'month']).default('day'),
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
      period: searchParams.get('period') || 'day',
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { period } = validation.data;

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
    const timeseriesData = await prisma.$queryRawUnsafe(`
      SELECT 
        time_bucket::text as time_bucket,
        avg_latency,
        uptime_percentage,
        total_checks
      FROM get_monitor_timeseries($1, $2)
    `, monitorid, period);

    // Helper function to convert BigInt to Number
    const convertBigIntToNumber = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return Number(obj);
      if (Array.isArray(obj)) return obj.map(convertBigIntToNumber);
      if (typeof obj === 'object') {
        const converted: any = {};
        for (const key in obj) {
          converted[key] = convertBigIntToNumber(obj[key]);
        }
        return converted;
      }
      return obj;
    };

    return NextResponse.json({
      monitorId: monitorid,
      period,
      data: convertBigIntToNumber(timeseriesData) || [],
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