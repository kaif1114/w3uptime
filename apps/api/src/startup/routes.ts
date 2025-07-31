import { Express } from "express";
import monitorRouter from "../routes/monitor";
import authMiddleware  from "../middleware/auth";

export function routes(app: Express) {
  app.use("/monitor", authMiddleware, monitorRouter);
}
