// Use CommonJS require so ts-node (CJS) resolves the CJS export of db/client
// This avoids TS1479 when importing an ESM package from a CJS module
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("db/client");
import { ethers } from "ethers";
import type { Prisma } from "@prisma/client";
import { v7 as uuidv7 } from "uuid";
import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage, SignupIncomingMessage } from "common/types";

const ws = new WebSocketServer({ port: 8080 });

const validators: {
  validatorId: string;
  publicKey: string;
  socket: WebSocket;
  ip: string;
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
  console.log("Validators:", validators);

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
                userId: validatorId,
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

async function handleSignup(message: SignupIncomingMessage, socket: WebSocket) {
  try {
    const validator = await prisma.user.findUnique({
      where: {
        walletAddress: message.publicKey,
      },
    });

    if (!validator) {
      const newValidator = await prisma.user.create({
        data: {
          walletAddress: message.publicKey,
          ip: message.ip,
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
        publicKey: newValidator.walletAddress,
        socket: socket,
        ip: message.ip,
      });
      return;
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
      publicKey: validator.walletAddress,
      socket: socket,
      ip: message.ip,
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

