// Use CommonJS require so ts-node (CJS) resolves the CJS export of db/client
// This avoids TS1479 when importing an ESM package from a CJS module
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("db/client");
import express from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { 
  MonitorTickBatchRequest, 
  MonitorTickBatchResponse, 
  MonitorTickStatus 
} from "common/types";
import "dotenv/config";

const app = express();
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.get("/ping", (req, res) => {
  return res.status(200).json({ message: "pong" });
});

const monitorTickItemSchema = z.object({
  monitorId: z.string().uuid(),
  validatorId: z.string().uuid(),
  status: z.nativeEnum(MonitorTickStatus),
  latency: z.number().min(0),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  countryCode: z.string().min(2).max(10),
  continentCode: z.string().min(2).max(10),
  city: z.string().min(1).max(100),
  createdAt: z.coerce.date()
});

const batchRequestSchema = z.object({
  batch: z.array(monitorTickItemSchema).min(1).max(100),
  batchId: z.string().uuid(),
  timestamp: z.string().datetime()
});

app.post("/batch", async (req, res) => {
  try {
    const validationResult = batchRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const response: MonitorTickBatchResponse = {
        success: false,
        message: "Validation failed",
        errors: validationResult.error.issues.map((err: any, index: number) => ({
          index,
          error: `${err.path.join('.')}: ${err.message}`
        }))
      };
      return res.status(400).json(response);
    }

    const { batch, batchId } = validationResult.data;
    const errors: { index: number; error: string }[] = [];
    let processedCount = 0;

    console.log(`Processing batch ${batchId} with ${batch.length} MonitorTicks`);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        try {
          await tx.monitorTick.create({
            data: {
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
            },
          });
          
          processedCount++;
        } catch (error) {
          console.error(`Error processing item ${i}:`, error);
          errors.push({
            index: i,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });

    const response: MonitorTickBatchResponse = {
      success: errors.length === 0,
      message: errors.length === 0 
        ? `Successfully processed ${processedCount} MonitorTicks` 
        : `Processed ${processedCount}/${batch.length} MonitorTicks with ${errors.length} errors`,
      processedCount,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`Batch ${batchId} completed: ${processedCount}/${batch.length} processed`);
    
    return res.status(errors.length === 0 ? 200 : 207).json(response);
    
  } catch (error) {
    console.error('Batch processing error:', error);
    const response: MonitorTickBatchResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    };
    return res.status(500).json(response);
  }
});

const PORT = process.env.DATA_INGESTION_PORT || 4001;

app.listen(PORT, () => {
  console.log(`Data Ingestion Service running on port ${PORT}`);
});