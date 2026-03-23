import express from 'express';
import {
  getAllCategorias,
  getCategoriaById,
  createCategoria,
  deleteCategoria,
  updateCategoria,
  getCategoriasPaginated,
  buscarCategorias
} from '../controllers/categoria.controller.js';

const router = express.Router();

// 🔥 Ruta principal con paginación (GET /api/categorias)
router.get('/', getCategoriasPaginated);

// 🔥 Ruta de búsqueda con paginación (GET /api/categorias/buscar)
router.get('/buscar', buscarCategorias);

router.get('/todas', getAllCategorias);


// Rutas específicas (deben ir después de las rutas dinámicas con parámetros)
router.get('/:id', getCategoriaById);
router.post('/', createCategoria);
router.put('/:id', updateCategoria);
router.delete('/:id', deleteCategoria);



export default router;