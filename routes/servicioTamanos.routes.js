import express from 'express';
import {
    postTamano,
    getTamanosServicio,
    putTamano,
    deleteTamanoController,
    putTamanosServicio
} from '../controllers/servicioTamanos.controller.js';

const router = express.Router();

// Rutas para tamaños individuales
router.post('/:ServicioId/tamanos', postTamano);
router.get('/:ServicioId/tamanos', getTamanosServicio);
router.put('/:ServicioId/tamanos', putTamanosServicio); // Actualizar todos los tamaños

// Rutas para tamaño específico
router.put('/tamano/:ServicioTamanoId', putTamano);
router.delete('/tamano/:ServicioTamanoId', deleteTamanoController);

export default router;