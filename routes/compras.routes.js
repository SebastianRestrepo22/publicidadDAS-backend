import express from 'express';
import {
  getAllCompras,
  getCompraById,
  createCompra,
  deleteCompra,
  updateCompra,
  updateCompraEstado
} from '../controllers/compras.controller.js';

const router = express.Router();

router.get('/', getAllCompras);
router.get('/:id', getCompraById);
router.post('/', createCompra);
router.delete('/:id', deleteCompra);
router.put('/:id', updateCompra);

router.patch('/:id/estado', updateCompraEstado);

router.post('/auto-cancelar', async (req, res) => {
  try {
    const resultado = await anularComprasExpiradas();
    res.json({
      message: 'Proceso de anulación automática completado',
      ...resultado
    });
  } catch (error) {
    console.error('Error en anulación automática:', error);
    res.status(500).json({ error: error.message });
  }
});


export default router;
