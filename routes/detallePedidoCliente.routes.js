import { Router } from "express";
import {
    getDetallesByPedido,
    createDetalle,  
    deleteDetalle,
    updateDetalle,
    deleteDetallesByPedido
} from "../controllers/detallePedidoCliente.controller.js";

const router = Router();

// Rutas específicas primero
router.get("/:id", getDetallesByPedido);
router.delete("/pedido/:pedidoId", deleteDetallesByPedido);  // ← AHORA SÍ EXPORTADA

// Rutas CRUD
router.post("/", createDetalle);
router.put("/:id", updateDetalle);
router.delete("/:id", deleteDetalle);

export default router;