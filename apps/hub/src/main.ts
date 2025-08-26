// Use CommonJS require so ts-node (CJS) resolves the CJS export of db/client
// This avoids TS1479 when importing an ESM package from a CJS module
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("db/client");
import { ethers } from "ethers";
import { v7 as uuidv7 } from "uuid";
import { WebSocket, WebSocketServer } from "ws";
import { 
  IncomingMessage, 
  SignupIncomingMessage, 
  MonitorTickBatchRequest, 
  MonitorTickBatchResponse, 
  MonitorTickStatus 
} from "common/types";
import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import "dotenv/config";

async function checkAuthentication(req: express.Request): Promise<string | null> {
  const sessionId = req.cookies?.sessionId;
  console.log(sessionId);
  if (!sessionId) {
    return null;
  }

  try {
    const session = await prisma.session.findUnique({
      where: {  sessionId }
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session.userId;
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

// Express server setup
const app = express();
const httpServer = http.createServer(app);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  const userId = await checkAuthentication(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = userId;
  next();
};

app.get('/ping', (req, res) => {
  res.json({ status: 'OK' });
});

app.get('/validators', authenticateUser, (req, res) => {
  try {
    const { countrycode, city, postalcode, continent } = req.query;
    
    let filteredValidators = validators;
    
    // Apply filters based on query parameters
    if (countrycode) {
      filteredValidators = filteredValidators.filter(v => 
        v.location.countryCode.toLowerCase() === (countrycode as string).toLowerCase()
      );
    }
    
    if (city) {
      filteredValidators = filteredValidators.filter(v => 
        v.location.city.toLowerCase() === (city as string).toLowerCase()
      );
    }
    
    if (postalcode) {
      filteredValidators = filteredValidators.filter(v => 
        v.location.postalCode === postalcode
      );
    }
    
    if (continent) {
      filteredValidators = filteredValidators.filter(v => 
        v.location.continent.toLowerCase() === (continent as string).toLowerCase()
      );
    }
    
    const responseValidators = filteredValidators.map(v => ({
      validatorId: v.validatorId,
      location: {
        country: v.location.country,
        countryCode: v.location.countryCode,
        region: v.location.region,
        city: v.location.city,
        continent: v.location.continent,
        continentCode: v.location.continentCode,
        latitude: v.location.latitude,
        longitude: v.location.longitude,
        flag: v.location.flag
      }
    }));
    
    res.json({ validators: responseValidators });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/validators/count', authenticateUser, (req, res) => {
  try {
    const validatorCount = validators.length;
    res.json({ count: validatorCount });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});



const ws = new WebSocketServer({ server: httpServer });

const validators: {
  validatorId: string;
  publicKey: string;
  socket: WebSocket;
  location:{
    ip: string,
    country: string,
    countryCode: string,
    region: string,
    regionCode: string,
    city: string,
    postalCode: string,
    continent: string,
    continentCode: string,
    latitude: number,
    longitude: number,
    timezoneAbbreviation: string | null,
    flag: string | null,

  }
}[] = [];
const CALLBACKS: { [callbackId: string]: (message: IncomingMessage) => void } =
  {};

const COST_PER_VALIDATION = 1;

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
        const result: MonitorTickBatchResponse = await response.json();
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

function addToBatch(monitorTick: typeof monitorTickBuffer[0]) {
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

ws.on("connection", (socket: WebSocket) => {
  console.log("Client connected");
  socket.on("message", (messageRaw) => {
    const message: IncomingMessage = JSON.parse(messageRaw.toString());

    const verified = verifyMessage(
      message.signature,
      JSON.stringify(message.data),
      message.data.publicKey
    );
    if (!verified) {
      socket.send(
        JSON.stringify({
          type: "error",
          data: { message: "Invalid signature" },
        })
      );
      return;
    }

    if (message.type === "signup") {
      handleSignup(message.data, socket);
    } else if (message.type === "validate") {
      CALLBACKS[message.data.callbackId](message);
      delete CALLBACKS[message.data.callbackId];
    }
  });

  socket.on("close", () => {
    console.log("Client disconnected");
    validators.splice(
      validators.findIndex((v) => v.socket === socket),
      1
    );
  });
});

//for now the hub sends all of the monitors to all of the validators every 60 seconds, later on we will need to implement efficient algorithm for distributing the monitors to the validators
setInterval(async () => {
  const monitorsToValidate = await prisma.monitor.findMany({
    where: {
      status: {
        not: "PAUSED",
      },
    },
  });

  for (const monitor of monitorsToValidate) {
    validators.forEach((validator) => {
      const callbackId = uuidv7();
      console.log(
        `Sending validate to ${validator.validatorId} ${monitor.url}`
      );
      validator.socket.send(
        JSON.stringify({
          type: "validate",
          data: {
            url: monitor.url,
            callbackId,
          },
        })
      );

      CALLBACKS[callbackId] = async (message: IncomingMessage) => {
        if (message.type === "validate") {
          const { validatorId, status, latency } = message.data;
          const validatorData = validators.find(v => v.validatorId === validatorId);
          
          const monitorTick = {
            monitorId: monitor.id,
            validatorId: validatorId,
            status,
            latency,
            longitude: validatorData?.location.longitude || 0,
            latitude: validatorData?.location.latitude || 0,
            countryCode: validatorData?.location.countryCode || 'UNKNOWN',
            continentCode: validatorData?.location.continentCode || 'UNKNOWN',
            city: validatorData?.location.city || 'unknown',
            createdAt: new Date(),
          };
          
          addToBatch(monitorTick);
        }
      };
    });
  }
}, 30 * 1000);

function verifyMessage(
  signature: string,
  message: string,
  publicKey: string
): boolean {
  try {
    // Recover the address from the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    // Convert the public key to an address for comparison
    const publicKeyAddress = ethers.computeAddress(publicKey);

    // Compare the recovered address with the public key address
    return recoveredAddress.toLowerCase() === publicKeyAddress.toLowerCase();
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

async function getGeoLocation(ip: string) {
  const response = await fetch(
    `https://ipgeolocation.abstractapi.com/v1/?api_key=${process.env.ABSTRACTAPI_KEY}&ip_address=${ip}`
  );
  const data = await response.json();
  return data;
}

async function handleSignup(message: SignupIncomingMessage, socket: WebSocket) {
  try {
    let validator = await prisma.user.findFirst({
      where: {
        walletAddress: message.walletAddress.toLowerCase(),
      },
      include: {
        geoLocation: true,
      },
    });

    if (!validator) {
      const geoLocation = await getGeoLocation(message.ip);
      const newGeoLocation = await prisma.geoLocation.create({
        data: {
          ip: message.ip,
          country: geoLocation.country.toLowerCase(),
          countryCode: geoLocation.country_code,
          region: geoLocation.region,
          regionCode: geoLocation.region_code,
          city: geoLocation.city.toLowerCase(),
          postalCode: geoLocation.postal_code,
          continent: geoLocation.continent.toLowerCase(),
          continentCode: geoLocation.continent_code,
          latitude: geoLocation.latitude,
          longitude: geoLocation.longitude,
          timezoneAbbreviation: geoLocation.timezone.abbreviation || null,
          flag: geoLocation.flag.svg || null,
          updatedAt: new Date(),
        },
      });
      const newValidator = await prisma.user.create({
        data: {
          publicKey: message.publicKey,
          walletAddress: message.walletAddress.toLowerCase(),
          geoLocationId: newGeoLocation.id,
        },
      });

      socket.send(
        JSON.stringify({
          type: "signup",
          data: {
            validatorId: newValidator.id,
            callbackId: uuidv7(),
          },
        })
      );
      validators.push({
        validatorId: newValidator.id,
        publicKey: newValidator.publicKey,
        socket: socket,
        location:{
          ip: message.ip,
          country: geoLocation.country,
          countryCode: geoLocation.country_code,
          region: geoLocation.region,
          regionCode: geoLocation.region_code,
          city: geoLocation.city,
          postalCode: geoLocation.postal_code,
          continent: geoLocation.continent,
          continentCode: geoLocation.continent_code,
          latitude: geoLocation.latitude,
          longitude: geoLocation.longitude,
          timezoneAbbreviation: geoLocation.timezone.abbreviation || null,
          flag: geoLocation.flag.svg || null,
        }
       
      });
      return;
    }
    const hasIpChanged = validator?.geoLocation?.ip !== message.ip;
    if (hasIpChanged) {
      const oldGeoLocationId = validator.geoLocationId;
      const geoLocation = await getGeoLocation(message.ip);
      const newGeoLocation = await prisma.geoLocation.create({
        data: {
          ip: message.ip,
          country: geoLocation.country.toLowerCase(),
          countryCode: geoLocation.country_code,
          region: geoLocation.region,
          regionCode: geoLocation.region_code,
          city: geoLocation.city.toLowerCase(),
          postalCode: geoLocation.postal_code,
          continent: geoLocation.continent.toLowerCase(),
          continentCode: geoLocation.continent_code,
          latitude: geoLocation.latitude,
          longitude: geoLocation.longitude,
          timezoneAbbreviation: geoLocation.timezone.abbreviation || null,
          flag: geoLocation.flag.svg || null,
          updatedAt: new Date(),
        },
      });
      await prisma.user.update({
        where: {
          id: validator.id,
        },
        data: {
          geoLocationId: newGeoLocation.id,
        },
      });
      await prisma.geoLocation.delete({
        where: {
          id: oldGeoLocationId,
        },
      });
    }

    socket.send(
      JSON.stringify({
        type: "signup",
        data: {
          validatorId: validator.id,
          callbackId: uuidv7(),
        },
      })
    );
    validators.push({
      validatorId: validator.id,
      publicKey: validator.publicKey,
      socket: socket,
      location:{
        ip: message.ip,
        country: validator.geoLocation.country,
        countryCode: validator.geoLocation.countryCode,
        region: validator.geoLocation.region,
        regionCode: validator.geoLocation.regionCode,
        city: validator.geoLocation.city,
        postalCode: validator.geoLocation.postalCode,
        continent: validator.geoLocation.continent,
        continentCode: validator.geoLocation.continentCode,
        latitude: validator.geoLocation.latitude,
        longitude: validator.geoLocation.longitude,
        timezoneAbbreviation: validator.geoLocation.timezoneAbbreviation,
        flag: validator.geoLocation.flag,
      }
    });
  } catch (error) {
    console.error(error);
    socket.send(
      JSON.stringify({
        type: "error",
        data: { message: "Internal server error" },
      })
    );
  }
}

ws.on("error", (error) => {
  console.error("WebSocket error:", error);
});

ws.on("listening", () => {
  console.log("WebSocket server is running on port 8080");
});

httpServer.listen(8080, () => {
  console.log("HTTP server is running on port 8080");
});
