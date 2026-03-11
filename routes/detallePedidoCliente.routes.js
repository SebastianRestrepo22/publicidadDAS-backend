import { Router } from "express";
import {
    getDetallesByPedido,
    createDetalle,  
    deleteDetalle
} from "../controllers/detallePedidoCliente.controller.js";

const router = Router();

router.get("/:id", getDetallesByPedido);
router.post("/", createDetalle);
router.delete("/:id", deleteDetalle);
  

export default router;