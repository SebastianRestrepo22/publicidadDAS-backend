import express from 'express';
import {
  getAllCompras,
  getCompraById,
  createCompra,
  updateCompra,
  getComprasPaginated,
  buscarCompras
} from '../controllers/compras.controller.js';

const router = express.Router();

//  Ruta principal con paginación
router.get('/', getComprasPaginated);

//  Ruta de búsqueda con paginación
router.get('/buscar', buscarCompras);

//  Ruta para obtener TODAS las compras (sin paginación) - compatibilidad
router.get('/todas', getAllCompras);

//  Rutas CRUD estándar
router.get('/:id', getCompraById);
router.post('/', createCompra);
router.put('/:id', updateCompra);



export default router;