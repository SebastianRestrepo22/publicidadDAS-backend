import express from 'express';
import {
  getAllProveedores,
  getProveedorById,
  createProveedor,
  deleteProveedor,
  updateProveedor,
  getProveedoresPaginated,
  buscarProveedores,
  validarCampoUnico
} from '../controllers/proveedores.controller.js';

const router = express.Router();

// Ruta principal con paginación
router.get('/', getProveedoresPaginated);

// Ruta de búsqueda con paginación
router.get('/buscar', buscarProveedores);


// Rutas de validación en tiempo real
router.get('/validar-campo', validarCampoUnico);

// Ruta para obtener todos los proveedores (compatibilidad)
router.get('/todos', getAllProveedores);

// Rutas CRUD
router.get('/:id', getProveedorById);
router.post('/', createProveedor);
router.put('/:id', updateProveedor);
router.delete('/:id', deleteProveedor);

export default router;