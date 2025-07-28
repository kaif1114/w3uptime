import { Router } from "express";
import { exampleController } from "../controllers/example.controller";

const router = Router();

router.get("/", exampleController);

export default router;