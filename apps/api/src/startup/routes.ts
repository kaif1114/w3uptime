import { Express } from "express";
import monitorRouter from "../routes/monitor";

export function routes(app: Express) {
  app.use("/monitor", monitorRouter);
}
