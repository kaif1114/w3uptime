// Use CommonJS require so ts-node (CJS) resolves the CJS export of db/client
// This avoids TS1479 when importing an ESM package from a CJS module
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("db/client");
import { MonitorTickBatchResponse } from "common/types";
import { Request, Response } from "express";
import z from "zod";

const monitorTickItemSchema = z.object({
  monitorId: z.string().uuid(),
  validatorId: z.string().uuid(),
  status: z.enum(["GOOD", "BAD"]),
  latency: z.number().min(0),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  countryCode: z.string().min(2).max(10),
  continentCode: z.string().min(2).max(10),
  city: z.string().min(1).max(100),
  createdAt: z.coerce.date(),
});

const batchRequestSchema = z.object({
  batch: z.array(monitorTickItemSchema).min(1).max(100),
  batchId: z.uuid(),
  timestamp: z.string().datetime(),
});

export async function receiveBatch(req: Request, res: Response) {
  try {
    const validationResult = batchRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      const response: MonitorTickBatchResponse = {
        success: false,
        message: "Validation failed",
        errors: validationResult.error.issues.map(
          (err: any, index: number) => ({
            index,
            error: `${err.path.join(".")}: ${err.message}`,
          })
        ),
      };
      return res.status(400).json(response);
    }

    const { batch, batchId } = validationResult.data;
    let processedCount = 0;

    console.log(
      `Processing batch ${batchId} with ${batch.length} MonitorTicks`
    );

    try {
      const result = await prisma.monitorTick.createMany({
        data: batch.map((item) => ({
          monitorId: item.monitorId,
          validatorId: item.validatorId,
          status: item.status,
          latency: item.latency,
          longitude: item.longitude,
          latitude: item.latitude,
          countryCode: item.countryCode,
          continentCode: item.continentCode,
          city: item.city,
          createdAt: item.createdAt,
        })),
        skipDuplicates: true,
      });

      processedCount = result.count;
    } catch (error) {
      console.error("Batch processing error:", error);
      const response: MonitorTickBatchResponse = {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Database error during batch insert",
      };
      return res.status(500).json(response);
    }

    const response: MonitorTickBatchResponse = {
      success: true,
      message: `Successfully processed ${processedCount} MonitorTicks`,
      processedCount,
    };

    console.log(
      `Batch ${batchId} completed: ${processedCount}/${batch.length} processed`
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error("Batch processing error:", error);
    const response: MonitorTickBatchResponse = {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
    return res.status(500).json(response);
  }
}
