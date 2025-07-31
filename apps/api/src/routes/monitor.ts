import { Router } from "express";
import { createMonitor, getMonitor } from "../controllers/monitor/monitor.controller";

const router = Router();


router.post("/create", createMonitor)
router.get("/:id", getMonitor)

export default router