import { Router } from "express";
import { receiveBatch } from "../controllers/batch";

const router = Router();

router.post('/', receiveBatch);

export default router;