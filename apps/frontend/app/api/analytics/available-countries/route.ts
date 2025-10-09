import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { RawAvailableCountryResult } from "@/types/analytics";

const availableCountriesQuerySchema = z.object({
  monitorId: z.string().optional(),
  continent: z.string().optional(), 
});


export const GET = withAuth(async (
  req: NextRequest,
  user,
  session
) => {
  try {
    const { searchParams } = new URL(req.url);
    
    const validation = availableCountriesQuerySchema.safeParse({
      monitorId: searchParams.get('monitorId') || undefined,
      continent: searchParams.get('continent') || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { monitorId, continent } = validation.data;

    
    if (monitorId) {
      const monitor = await prisma.monitor.findFirst({
        where: {
          id: monitorId,
          userId: user.id,
        },
      });

      if (!monitor) {
        return NextResponse.json(
          { error: "Monitor not found" },
          { status: 404 }
        );
      }
    }

    
    const whereConditions = [];
    const params = [];
    
    if (monitorId) {
      whereConditions.push(`"monitorId" = $${params.length + 1}`);
      params.push(monitorId);
    }
    
    if (continent) {
      whereConditions.push(`"continentCode" = $${params.length + 1}`);
      params.push(continent);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const availableCountries = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT 
        "countryCode" as country_code,
        "countryCode" as country_name,
        "continentCode" as continent_code,
        COUNT(*)::BIGINT as data_count,
        ROUND(AVG(latency)::NUMERIC, 2) as avg_latency,
        COUNT(*) FILTER (WHERE status = 'GOOD')::BIGINT as successful_checks,
        COUNT(*)::BIGINT as total_checks
      FROM "MonitorTick" 
      WHERE "countryCode" IS NOT NULL ${continent ? `AND "continentCode" = $1` : ''}
      ${monitorId ? `AND "monitorId" = $${continent ? 2 : 1}` : ''}
      GROUP BY "countryCode", "continentCode"
      ORDER BY data_count DESC, avg_latency ASC
    `, ...(continent ? [continent] : []), ...(monitorId ? [monitorId] : []));

    
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

    
    const transformedCountries = (availableCountries as RawAvailableCountryResult[]).map(country => ({
      country_code: country.country_code,
      country_name: country.country_name,
      continent_code: country.continent_code,
      data_count: Number(country.data_count || 0),
      avg_latency: Number(Number(country.avg_latency || 0).toFixed(2)),
      success_rate: country.total_checks > 0 
        ? Number(((Number(country.successful_checks || 0) / Number(country.total_checks || 1)) * 100).toFixed(2))
        : 0,
      total_checks: Number(country.total_checks || 0),
    }));

    return NextResponse.json({
      continent: continent || null,
      monitorId: monitorId || null,
      countries: transformedCountries,
      total: transformedCountries.length,
      generatedAt: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching available countries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});