import express from 'express';
import { 
    createClient, 
    getAllClients, 
    getClienteById, 
    updateCliente, 
    deleteCliente,
    buscarClientes
} from '../controllers/clientes.controller.js';

const router = express.Router();

// Crear cliente
router.post('/', createClient);

// Obtener todos los clientes
router.get('/', getAllClients);

router.get('/buscar', buscarClientes);

// Obtener cliente por ID
router.get('/:id', getClienteById);

// Actualizar cliente
router.put('/:id', updateCliente);

// Eliminar cliente
router.delete('/:id', deleteCliente);

export default router;
