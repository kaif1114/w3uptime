import { WebSocketServer, WebSocket } from "ws";
import {
  IncomingMessage,
  SignupIncomingMessage,
  ValidateIncomingMessage,
} from "./types";
import { prisma } from "db/client";
import { randomUUID } from "crypto";
import { ethers } from "ethers";

const ws = new WebSocketServer({ port: 8080 });

const validators: {
  validatorId: string;
  publicKey: string;
  socket: WebSocket;
  ip: string;
}[] = [];
const callbacks: {
  [callbackId: string]: { callback: (data: IncomingMessage) => void };
}[] = [];



ws.on("connection", (socket) => {
  console.log("Client connected");
  socket.on("message", (messageRaw) => {
    const message: IncomingMessage = JSON.parse(messageRaw.toString());
    const verified = verifyMessage(
      message.signedMessage,
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
      handleValidate(message.data, socket);
    }
  });
});

async function handleValidate(
  data: ValidateIncomingMessage,
  socket: WebSocket
) {
  try {

    const validator = validators.find(
      (v) => v.validatorId === data.validatorId
    );
    if (!validator) {
      socket.send(
        JSON.stringify({
          type: "error",
          data: { message: "Validator not found" },
        })
      );
      return;
    }

    console.log("Validated data:", data);


     
    await prisma.monitorTick.create({
        data: {
            status: data.status,
            latency: data.latency,
            monitorId: data.monitorId,
            validatorId: data.validatorId,
        }
    })

    socket.send(
      JSON.stringify({
        type: "validate",
        data: {
          success: true,
          message: "Validation data received and verified",
        },
      })
    );
  } catch (error) {
    console.error("Error handling validation:", error);
    socket.send(
      JSON.stringify({
        type: "error",
        data: { message: "Internal server error" },
      })
    );
  }
}

function verifyMessage(
  signature: string,
  message: string,
  publicKey: string
): boolean {
  try {
    // Recover the address from the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    // Convert the public key to an address for comparison
    // Note: This assumes the public key is in the correct format
    // You might need to adjust this based on your public key format
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
    const validator = await prisma.validator.findUnique({
      where: {
        publicKey: message.publicKey,
      },
    });

    if (!validator) {
      const newValidator = await prisma.validator.create({
        data: {
          publicKey: message.publicKey,
          ip: message.ip,
        },
      });

      socket.send(
        JSON.stringify({
          type: "signup",
          data: {
            validatorId: newValidator.id,
            callbackId: randomUUID(),
          },
        })
      );
      validators.push({
        validatorId: newValidator.id,
        publicKey: newValidator.publicKey,
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
          callbackId: randomUUID(),
        },
      })
    );
    validators.push({
      validatorId: validator.id,
      publicKey: validator.publicKey,
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

console.log("Server is running on port 8080");
