// Use CommonJS require so ts-node (CJS) resolves the CJS export of db/client
// This avoids TS1479 when importing an ESM package from a CJS module
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("db/client");
import { ethers } from "ethers";
import type { Prisma } from "@prisma/client";
import { v7 as uuidv7 } from "uuid";
import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage, SignupIncomingMessage } from "common/types";
import "dotenv/config";

const ws = new WebSocketServer({ port: 8080 });

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
          await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.monitorTick.create({
              data: {
                monitorId: monitor.id,
                validatorId: validatorId,
                status,
                latency,
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
  console.log("Server is running on port 8080");
});
