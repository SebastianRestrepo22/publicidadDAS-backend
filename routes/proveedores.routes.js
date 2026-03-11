import express from 'express';
import {
   getAllProveedores,
   getProveedorById,
   createProveedor,
   deleteProveedor,
   updateProveedor
} from '../controllers/proveedores.controller.js';

const router = express.Router();

router.get('/', getAllProveedores);
router.get('/:id', getProveedorById);
router.post('/', createProveedor);
router.put("/:id" , updateProveedor);
router.delete('/:id', deleteProveedor);

export default router;
