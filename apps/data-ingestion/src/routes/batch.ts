import { Router } from "express";
import { receiveBatch } from "../controllers/batch";

const router = Router();

router.post('/batch', receiveBatch);

export default router;