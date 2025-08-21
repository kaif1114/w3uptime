

import "dotenv/config";
import express from "express";
import batchRouter from "./routes/batch";
import cors from "cors";
import 'dotenv/config';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors({
    origin: [process.env.FRONTEND_URL || "http://localhost:8000", process.env.HUB_URL || "http://localhost:8080"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));

app.get("/ping", (req, res) => {
  return res.status(200).json({ message: "pong" });
});

app.use("/batch", batchRouter);

const PORT = process.env.DATA_INGESTION_PORT || 4001;

app.listen(PORT, () => {
  console.log(`Data Ingestion Service running on port ${PORT}`);
});