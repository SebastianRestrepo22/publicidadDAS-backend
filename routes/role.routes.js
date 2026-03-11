import express from 'express';
import {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  changeState,
  validarRol,
  buscarRoles,
  getAllPermissions,
  getRolePermissions,
  updateRolePermissions,
  getUserPermissions
} from '../controllers/role.controller.js';

const router = express.Router();

// Validaciones y búsquedas
router.get('/validar-rol', validarRol);
router.get('/buscar', buscarRoles);

// Permisos (ESPECÍFICAS)
router.get('/permisos/todos', getAllPermissions);
router.get('/usuario/:userId/permisos', getUserPermissions);

// CRUD roles
router.post('/', createRole);
router.get('/', getAllRoles);

// Permisos por rol
router.get('/:id/permisos', getRolePermissions);
router.put('/:id/permisos', updateRolePermissions);

// Estado
router.put('/:id/estado', changeState);

router.get('/:id', getRoleById);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;