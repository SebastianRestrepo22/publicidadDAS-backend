import express from 'express';
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  validarCorreo,
  validarCedula,
  validarTelefono,
  buscarUsuarios,
  resetPassword,
  showResetForm,
  searchUsuarios, 
  getAllUsuariosSimple,
  searchUsuariosForPedidos
} from '../controllers/user.controller.js';

const router = express.Router();

// RUTAS ESTÁTICAS (deben ir PRIMERO)

// Rutas para autocompletado y búsqueda
router.get('/search', searchUsuarios);           // GET /user/search?search=&page=1&limit=5
router.get('/all', getAllUsuariosSimple);        // GET /user/all
router.get('/for-pedidos', searchUsuariosForPedidos); // GET /user/for-pedidos?search=term

// Rutas de validación y búsqueda existente
router.get('/validar-correo', validarCorreo);
router.get('/validar-cedula', validarCedula);
router.get('/validar-telefono', validarTelefono);
router.get('/buscar', buscarUsuarios);

// RUTAS GENERALES
router.post('/', createUser);                     // POST /user
router.get('/', getAllUsers);                     // GET /user (todos los usuarios)

// RUTAS DE RESET PASSWORD
router.get('/restablecer/:token', showResetForm); // GET /user/restablecer/:token
router.post('/auth/reset-password/:token', resetPassword); // POST /user/auth/reset-password/:token

// RUTAS CON PARÁMETROS (deben ir ÚLTIMAS)
router.get('/:id', getUserById);                  // GET /user/:id
router.put('/:id', updateUser);                   // PUT /user/:id
router.delete('/:id', deleteUser);                // DELETE /user/:id

export default router;