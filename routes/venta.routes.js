import express from 'express';
import { Router } from "express";
import {
  getVentas,
  getVentaById,
  createVentaDesdePedido,
  createVentaManual,
  anularVenta,
  getDetallesByVenta
} from "../controllers/ventas.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { upload } from '../middleware/upload.js';

const router = Router();

// La ruta de creación manual DEBE ir ANTES del authMiddleware general
// porque necesita procesar el FormData con multer primero
router.post('/manual', upload.array('imagenes'), authMiddleware, createVentaManual);

// Todas las demás rutas requieren autenticación
router.use(authMiddleware);

// Obtener todas las ventas
router.get("/", getVentas);

// Obtener venta por ID
router.get("/:id", getVentaById);

// Obtener detalles de una venta
router.get("/:id/detalles", getDetallesByVenta);

// Crear venta desde pedido
router.post("/desde-pedido", createVentaDesdePedido);

// Anular venta (NO eliminar)
router.put("/:id/anular", anularVenta);

console.log("Rutas de ventas registradas correctamente");
export default router;