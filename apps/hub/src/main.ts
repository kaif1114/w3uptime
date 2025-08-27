import "dotenv/config";
import { createExpressServer } from "./server/expressServer";
import { createWebSocketServer } from "./websocket/websocketHandler";
import { startMonitorDistribution } from "./monitoring/monitorDistribution";

const COST_PER_VALIDATION = 1;

function startServer() {
  const { app, httpServer } = createExpressServer();
  
  createWebSocketServer(httpServer);
  
  startMonitorDistribution();

  httpServer.listen(8080, () => {
    console.log("HTTP server is running on port 8080");
  });
}

startServer();