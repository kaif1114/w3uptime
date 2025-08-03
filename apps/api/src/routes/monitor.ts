import { Router } from "express";
import { createMonitor, deleteMonitor, getMonitor, getMonitors, patchMonitor } from "../controllers/monitor/monitor.controller";
import asyncMiddleware from "../middleware/async";

const router = Router();


router.post("/", asyncMiddleware(createMonitor))
router.get("/:id", asyncMiddleware(getMonitor))
router.get("/", asyncMiddleware(getMonitors))
router.patch("/:monitorId", asyncMiddleware(patchMonitor))
router.delete("/:monitorId", asyncMiddleware(deleteMonitor))

export default router