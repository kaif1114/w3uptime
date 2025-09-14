import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const regionalTimeseriesQuerySchema = z.object({
  region: z.string(), // Region code (continent, country, or city)
  regionType: z.enum(['continent', 'country', 'city']).default('continent'),
  period: z.enum(['day', 'week', 'month']).default('day'),
  startTime: z.string().optional(), // ISO string for custom periods
  endTime: z.string().optional(), // ISO string for custom periods
});

// GET /api/analytics/regional-timeseries - Get regional timeseries data
export const GET = withAuth(async (
  req: NextRequest,
  user,
  session
) => {
  try {
    const { searchParams } = new URL(req.url);
    
    const validation = regionalTimeseriesQuerySchema.safeParse({
      region: searchParams.get('region'),
      regionType: searchParams.get('regionType') || 'continent',
      period: searchParams.get('period') || 'day',
      startTime: searchParams.get('startTime') || undefined,
      endTime: searchParams.get('endTime') || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { region, regionType, period, startTime, endTime } = validation.data;

    let timeseriesData: any[] = [];

    try {
      // Call the appropriate timeseries function based on region type
      switch (regionType) {
        case 'continent':
          timeseriesData = await prisma.$queryRawUnsafe(
            `SELECT * FROM get_continent_timeseries($1::TEXT, $2::TEXT, $3::TIMESTAMPTZ, $4::TIMESTAMPTZ)`, 
            region, 
            period,
            startTime ? new Date(startTime).toISOString() : null,
            endTime ? new Date(endTime).toISOString() : null
          );
          break;
        
        case 'country':
          timeseriesData = await prisma.$queryRawUnsafe(
            `SELECT * FROM get_country_timeseries($1::TEXT, $2::TEXT, $3::TIMESTAMPTZ, $4::TIMESTAMPTZ)`, 
            region, 
            period,
            startTime ? new Date(startTime).toISOString() : null,
            endTime ? new Date(endTime).toISOString() : null
          );
          break;
        
        case 'city':
          // For cities, we need to split "City, CountryCode" format
          const [cityName, countryCode] = region.includes(',') 
            ? region.split(', ').map(s => s.trim())
            : [region, null];
          
          timeseriesData = await prisma.$queryRawUnsafe(
            `SELECT * FROM get_city_timeseries($1::TEXT, $2::TEXT, $3::TEXT, $4::TIMESTAMPTZ, $5::TIMESTAMPTZ)`, 
            cityName, 
            countryCode,
            period,
            startTime ? new Date(startTime).toISOString() : null,
            endTime ? new Date(endTime).toISOString() : null
          );
          break;
      }
    } catch (dbError) {
      console.error("Database query error:", dbError);
      // Return empty data if query fails rather than erroring out
      timeseriesData = [];
    }

    // Helper function to convert BigInt to Number
    const convertBigIntToNumber = (obj: unknown): unknown => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return Number(obj);
      if (Array.isArray(obj)) return obj.map(convertBigIntToNumber);
      if (typeof obj === 'object') {
        const converted: Record<string, unknown> = {};
        for (const key in obj) {
          converted[key] = convertBigIntToNumber((obj as Record<string, unknown>)[key]);
        }
        return converted;
      }
      return obj;
    };

    // Transform data to match frontend expectations
    const transformedData = (timeseriesData as any[]).map(point => ({
      time_bucket: point.timestamp_bucket instanceof Date 
        ? point.timestamp_bucket.toISOString() 
        : point.timestamp_bucket,
      avg_latency: Number(point.avg_latency || 0),
      uptime_percentage: point.total_ticks > 0 
        ? Number(((Number(point.successful_ticks || 0) / Number(point.total_ticks || 1)) * 100).toFixed(2))
        : 0,
      total_checks: Number(point.total_ticks || 0),
      successful_checks: Number(point.successful_ticks || 0),
      failed_checks: Number((point.total_ticks || 0) - (point.successful_ticks || 0)),
      min_latency: Number(point.min_latency || 0),
      max_latency: Number(point.max_latency || 0),
      median_latency: Number(point.median_latency || 0),
      p95_latency: Number(point.p95_latency || 0),
    }));

    return NextResponse.json({
      region,
      regionType,
      period,
      startTime: startTime || null,
      endTime: endTime || null,
      data: transformedData,
      dataPoints: transformedData.length,
      generatedAt: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching regional timeseries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});