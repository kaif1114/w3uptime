import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { RawRegionQueryResult } from "@/types/analytics";

const availableRegionsQuerySchema = z.object({
  monitorId: z.string().optional(),
  regionType: z.enum(['continent', 'country', 'city']).default('continent'),
});


export const GET = withAuth(async (
  req: NextRequest,
  user,
  session
) => {
  try {
    const { searchParams } = new URL(req.url);
    
    const validation = availableRegionsQuerySchema.safeParse({
      monitorId: searchParams.get('monitorId') || undefined,
      regionType: searchParams.get('regionType') || 'continent',
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { monitorId, regionType } = validation.data;

    
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

    let availableRegions: RawRegionQueryResult[] = [];

    
    switch (regionType) {
      case 'continent': {
        let sql = `
          SELECT DISTINCT 
            "continentCode" as region_id,
            "continentCode" as region_name,
            COUNT(*)::BIGINT as data_count
          FROM "MonitorTick" 
          WHERE "continentCode" IS NOT NULL`;
        const params: unknown[] = [];
        if (monitorId) {
          sql += ` AND "monitorId" = $1`;
          params.push(monitorId);
        }
        sql += ` GROUP BY "continentCode" ORDER BY data_count DESC`;
        availableRegions = await prisma.$queryRawUnsafe(sql, ...params);
        break;
      }

      case 'country': {
        let sql = `
          SELECT DISTINCT 
            "countryCode" as region_id,
            "countryCode" as region_name,
            "continentCode",
            COUNT(*)::BIGINT as data_count
          FROM "MonitorTick" 
          WHERE "countryCode" IS NOT NULL`;
        const params: unknown[] = [];
        if (monitorId) {
          sql += ` AND "monitorId" = $1`;
          params.push(monitorId);
        }
        sql += ` GROUP BY "countryCode", "continentCode" ORDER BY data_count DESC`;
        availableRegions = await prisma.$queryRawUnsafe(sql, ...params);
        break;
      }

      case 'city': {
        let sql = `
          SELECT DISTINCT 
            CONCAT(city, ', ', "countryCode") as region_id,
            city as region_name,
            "countryCode",
            "continentCode",
            COUNT(*)::BIGINT as data_count
          FROM "MonitorTick" 
          WHERE city IS NOT NULL AND "countryCode" IS NOT NULL`;
        const params: unknown[] = [];
        if (monitorId) {
          sql += ` AND "monitorId" = $1`;
          params.push(monitorId);
        }
        sql += ` GROUP BY city, "countryCode", "continentCode" ORDER BY data_count DESC`;
        availableRegions = await prisma.$queryRawUnsafe(sql, ...params);
        break;
      }
    }

    
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

    return NextResponse.json({
      regionType,
      monitorId: monitorId || null,
      regions: convertBigIntToNumber(availableRegions) || [],
      total: availableRegions.length,
      generatedAt: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching available regions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});