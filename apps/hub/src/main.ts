// Use CommonJS require so ts-node (CJS) resolves the CJS export of db/client
// This avoids TS1479 when importing an ESM package from a CJS module
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("db/client");
import { ethers } from "ethers";
import type { Prisma } from "@prisma/client";
import { v7 as uuidv7 } from "uuid";
import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage, SignupIncomingMessage } from "common/types";
import http from "http";
import url from "url";
import "dotenv/config";

async function checkAuthentication(req: http.IncomingMessage): Promise<string | null> {
  const cookies = parseCookies(req.headers.cookie || "");
  const sessionId = cookies.sessionId;
  
  if (!sessionId) {
    return null;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
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

function parseCookies(cookieHeader: string): { [key: string]: string } {
  const cookies: { [key: string]: string } = {};
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.trim().split('=');
    if (parts.length === 2) {
      cookies[parts[0]] = parts[1];
    }
  });
  return cookies;
}

// HTTP server setup
const httpServer = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname;

  if (pathname === '/ping') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'OK' }));
    return;
  }

  // Authentication required for validator routes
  const userId = await checkAuthentication(req);
  if (!userId) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  if (pathname === '/validators') {
    try {
      const validatorCount = validators.length;
      res.writeHead(200);
      res.end(JSON.stringify({ count: validatorCount }));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  if (pathname?.startsWith('/validators/')) {
    const countryCode = pathname.split('/')[2];
    
    if (!countryCode) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Country code is required' }));
      return;
    }

    try {
      const countryValidators = validators.filter(v => 
        v.location.countryCode.toLowerCase() === countryCode.toLowerCase()
      );
      
      res.writeHead(200);
      res.end(JSON.stringify({ validators: countryValidators }));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
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
      status: "ACTIVE",
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
          
          await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.monitorTick.create({
              data: {
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
              },
            });

            await tx.user.update({
              where: { id: validatorId },
              data: {
                balance: { increment: COST_PER_VALIDATION },
              },
            });
          });
        }
      };
    });
  }
}, 10 * 1000);

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
  console.log("HTTP and WebSocket server is running on port 8080");
});
