// routes/productos.routes.js
import express from 'express';
import {
    postProducto,
    getAllProducto,
    getProductoById,
    updateProducto,
    deleteProducto,
    validarNombre,
    buscarProducto,
    cambiarEstadoProducto
} from '../controllers/productos.controller.js';

const router = express.Router();

// Rutas específicas primero
router.get('/validar-nombre', validarNombre);
router.get('/buscar', buscarProducto);

// Rutas con parámetros específicos
router.put('/:id/estado', cambiarEstadoProducto);

// Rutas CRUD básicas
router.post('/', postProducto);
router.get('/', getAllProducto);
router.get('/:id', getProductoById);
router.put('/:id', updateProducto);  
router.delete('/:id', deleteProducto);

export default router;