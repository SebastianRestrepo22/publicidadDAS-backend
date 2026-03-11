import express from 'express';
import {
  getAllDetalles,
  getDetalleByCompraId,
  getDetalleById,
  createDetalle,
  deleteDetalle,
  updateDetalle
} from '../controllers/detalleCompras.controller.js';

const router = express.Router();

router.get('/', getAllDetalles);
router.get('/compra/:CompraId', getDetalleByCompraId);
router.get('/:id', getDetalleById);
router.post('/', createDetalle);
router.delete('/:id', deleteDetalle);
router.put('/:id', updateDetalle);



export default router;
