import express from 'express';
import {
  getAllCategorias,
  getCategoriaById,
  createCategoria,
  deleteCategoria,
  updateCategoria
} from '../controllers/categoria.controller.js';

const router = express.Router();

router.get('/', getAllCategorias);
router.get('/:id', getCategoriaById);
router.post('/', createCategoria);
router.delete('/:id', deleteCategoria);
router.put('/:id', updateCategoria);

export default router;
