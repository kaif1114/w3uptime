import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "common/types";
import { verifyMessage } from "../services/signature";
import { handleSignup, removeValidator } from "../services/validatorManager";
import { applyGoodTick, applyBadTick } from "../services/reputation";
import { CALLBACKS } from "../services/monitorDistribution";
import http from "http";

export function createWebSocketServer(httpServer: http.Server): WebSocketServer {
  const ws = new WebSocketServer({ server: httpServer });

  ws.on("connection", (socket: WebSocket) => {
    console.log("Client connected");
    socket.on("message", async (messageRaw) => {
      const message: IncomingMessage = JSON.parse(messageRaw.toString());

      const verified = verifyMessage(
        message.signature,
        JSON.stringify(message.data),
        message.data.publicKey
      );
      if (!verified) {
        message.type === "validate" && (await applyBadTick(message.data.publicKey));
        socket.send(
          JSON.stringify({
            type: "error",
            data: { message: "Invalid signature" },
          })
        );
        return;
      }
      await applyGoodTick(message.data.publicKey);

      if (message.type === "signup") {
        handleSignup(message.data, socket);
      } else if (message.type === "validate") {
        CALLBACKS[message.data.callbackId](message);
        delete CALLBACKS[message.data.callbackId];
      }
    });

    socket.on("close", () => {
      console.log("Client disconnected");
      removeValidator(socket);
    });
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

  ws.on("listening", () => {
    console.log("WebSocket server is running on port 8080");
  });

  return ws;
}