// routes/pedidoCliente.routes.js
import { Router } from "express";
import {
  getMisPedidos,
  getPedidosClientes,
  getPedidoClienteById,
  createPedidoCliente,
  updatePedidoCliente,
  deletePedidoCliente,
  uploadVoucherToPedido  
} from "../controllers/pedidoCliente.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { uploadVoucher } from "../lib/upload.js";

const router = Router();

// ===== RUTAS POST Y PUT (con Multer) =====
router.post("/", uploadVoucher.single('voucher'), createPedidoCliente);
router.put("/:id", uploadVoucher.single('voucher'), updatePedidoCliente);

// ===== NUEVA RUTA: Subir voucher a pedido existente =====
// ⚠️ IMPORTANTE: Esta ruta debe ir ANTES de /:id para que no sea interceptada
router.post("/:id/voucher", uploadVoucher.single('voucher'), uploadVoucherToPedido);

// ===== RUTAS GET - ESPECÍFICAS PRIMERO, DINÁMICAS DESPUÉS =====
router.get("/mis-pedidos", authMiddleware, getMisPedidos);
router.get("/", getPedidosClientes);
router.get("/:id", getPedidoClienteById);
router.delete("/:id", deletePedidoCliente);

console.log("✅ Rutas de pedidos registradas");
export default router;