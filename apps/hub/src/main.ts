import "dotenv/config";
import { createExpressServer } from "./server/expressServer";
import { createWebSocketServer } from "./services/websocketHandler";
import { startMonitorDistribution } from "./services/monitorDistribution";

const COST_PER_VALIDATION = 1;  // in lamports == 0.000000001 SOL

function startServer() {
  const { app, httpServer } = createExpressServer();
  
  createWebSocketServer(httpServer);
  
  startMonitorDistribution();

  httpServer.listen(8080, () => {
    console.log("HTTP server is running on port 8080");
  });
}

startServer();