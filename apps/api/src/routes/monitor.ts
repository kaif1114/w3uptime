import { Router } from "express";
import { createMonitor, deleteMonitor, getMonitor, getMonitors, patchMonitor, pauseMonitor } from "../controllers/monitor/monitor.controller";
import asyncMiddleware from "../middleware/async";

const router = Router();

router.post("/", asyncMiddleware(createMonitor));
router.get("/", asyncMiddleware(getMonitors)); // Move this before :monitorId to avoid conflicts
router.get("/:monitorId", asyncMiddleware(getMonitor));
router.patch("/:monitorId", asyncMiddleware(patchMonitor));
router.patch("/:monitorId/pause", asyncMiddleware(pauseMonitor));
router.delete("/:monitorId", asyncMiddleware(deleteMonitor));

export default router