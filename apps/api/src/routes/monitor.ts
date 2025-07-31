import { Router } from "express";
import { createMonitor, deleteMonitor, getMonitor, getMonitors, patchMonitor } from "../controllers/monitor/monitor.controller";

const router = Router();


router.post("/", createMonitor)
router.get("/:id", getMonitor)
router.get("/", getMonitors)
router.patch("/:monitorId", patchMonitor)
router.delete("/:monitorId", deleteMonitor)

export default router