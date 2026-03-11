import { Router } from "express";
import { getColores } from "../controllers/color.controller.js";

const router = Router();

router.get("/", getColores);

export default router;
