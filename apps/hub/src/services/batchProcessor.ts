import { v7 as uuidv7 } from "uuid";
import { 
  MonitorTickBatchRequest, 
  MonitorTickBatchResponse, 
  MonitorTickStatus 
} from "common/types";

const BUFFER_SIZE = 50;
const BUFFER_TIMEOUT = 10 * 1000;
const DATA_INGESTION_URL = process.env.DATA_INGESTION_URL || 'http://localhost:4001';

let monitorTickBuffer: {
  monitorId: string;
  validatorId: string;
  status: MonitorTickStatus;
  latency: number;
  longitude: number;
  latitude: number;
  countryCode: string;
  continentCode: string;
  city: string;
  createdAt: Date;
}[] = [];

let bufferTimer: NodeJS.Timeout | null = null;

async function sendBatch(batch: typeof monitorTickBuffer) {
  const batchRequest: MonitorTickBatchRequest = {
    batch: batch.map(item => ({...item})),
    batchId: uuidv7(),
    timestamp: new Date().toISOString()
  };

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(`Sending batch ${batchRequest.batchId} to data ingestion service (attempt ${attempt + 1}/${maxRetries})`);
      
      const response = await fetch(`${DATA_INGESTION_URL}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchRequest),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Batch ${batchRequest.batchId} processed successfully:`, result);
        return;
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      attempt++;
      console.error(`Batch ${batchRequest.batchId} attempt ${attempt} failed:`, error);
      
      if (attempt >= maxRetries) {
        console.error(`Failed to send batch ${batchRequest.batchId} after ${maxRetries} attempts. Data may be lost.`);
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

function processBatch() {
  if (monitorTickBuffer.length === 0) return;
  
  const batchToSend = [...monitorTickBuffer];
  monitorTickBuffer = [];
  
  if (bufferTimer) {
    clearTimeout(bufferTimer);
    bufferTimer = null;
  }
  
  sendBatch(batchToSend);
}

export function addToBatch(monitorTick: typeof monitorTickBuffer[0]) {
  monitorTickBuffer.push(monitorTick);
  
  if (monitorTickBuffer.length >= BUFFER_SIZE) {
    processBatch();
    return;
  }
  
  if (!bufferTimer) {
    bufferTimer = setTimeout(() => {
      processBatch();
    }, BUFFER_TIMEOUT);
  }
}