// routes/pedidoCliente.routes.js
import { Router } from "express";
import {
  getMisPedidos,
  getPedidosClientes,
  getPedidoClienteById,
  createPedidoCliente,
  updatePedidoCliente,
  deletePedidoCliente,
  uploadVoucherToPedido,
  buscarPedidos  // ← NUEVO: Importar función de búsqueda
} from "../controllers/pedidoCliente.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { uploadVoucher } from "../lib/upload.js";

const router = Router();

// ===== RUTAS DE BÚSQUEDA (antes que las dinámicas) =====
router.get("/buscar", buscarPedidos);  //  Ruta para búsqueda con paginación

// ===== RUTAS POST Y PUT (con Multer) =====
router.post("/", uploadVoucher.single('voucher'), createPedidoCliente);
router.put("/:id", uploadVoucher.single('voucher'), updatePedidoCliente);

// ===== RUTA PARA SUBIR VOUCHER =====
router.post("/:id/voucher", uploadVoucher.single('voucher'), uploadVoucherToPedido);

// ===== RUTAS GET - ESPECÍFICAS PRIMERO =====
router.get("/mis-pedidos", authMiddleware, getMisPedidos);
router.get("/", getPedidosClientes);  // Esta ruta ya maneja paginación vía query params

// ===== RUTA DINÁMICA (siempre al final) =====
router.get("/:id", getPedidoClienteById);

// ===== RUTA DELETE =====

router.delete("/:id", deletePedidoCliente);

export default router;