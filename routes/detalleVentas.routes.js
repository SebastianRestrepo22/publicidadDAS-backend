import { Router } from "express";
import {
  getDetallesByVenta,
  createDetalle
} from "../controllers/detalleVentas.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router({ mergeParams: true });

router.use(authMiddleware);

router.get("/", getDetallesByVenta);
router.post("/", createDetalle);

export default router;