import express from 'express';
import {
    postService,
    getAllService,
    getServiceById,
    updateService,
    deleteService,
    validarNombre,
    buscarService,
    cambiarEstadoService
} from '../controllers/servicios.controller.js';

const router = express.Router();

// Validar si el nombre ya existe
router.get('/validar-nombre', validarNombre);

// Buscar servicios con filtros
router.get('/buscar', buscarService);

// Crear servicio
router.post('/', postService);

// Obtener todos los servicios
router.get('/', getAllService);

// Obtener servicio por ID
router.get('/:id', getServiceById);

// Actualizar servicio
router.put('/:ServicioId', updateService);

// Cambiar estado del servicio
router.patch('/:id/estado', cambiarEstadoService);

// Eliminar servicio
router.delete('/:id', deleteService);

export default router;