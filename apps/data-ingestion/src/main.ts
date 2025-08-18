// Use CommonJS require so ts-node (CJS) resolves the CJS export of db/client
// This avoids TS1479 when importing an ESM package from a CJS module
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("db/client");
import express from "express";
import z from "zod";

const app = express();

app.get("/ping", (req, res) => {
  return res.status(200).json({ message: "pong" });
})

const batchRequestSchema = z.object({})

app.post("/batch", (req, res) => {})