import { WebSocketServer } from "ws";

const ws = new WebSocketServer({ port: 8080 });

ws.on("connection", (socket) => {
    console.log("Client connected");
    socket.on("message", (message) => {
        console.log(`Received message: ${message}`);
    });
});


console.log("Server is running on port 8080");