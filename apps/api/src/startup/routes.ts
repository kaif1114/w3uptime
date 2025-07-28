import { Express } from "express";
import exampleRouter from "../routes/example";

export function routes(app: Express) {
  app.use("/example", exampleRouter);
}
