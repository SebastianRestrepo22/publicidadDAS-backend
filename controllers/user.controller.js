import bcrypt from 'bcrypt';
import { sendResetPasswordEmail } from '../utils/email.js';
import dayjs from "dayjs"; // para manejar expiraciones
import crypto from "crypto";
import {
    buscarUsuarioData, correoExiste, createByAdmin, deleteDataUser, getAllDataUsers, getUsuarioById, hashPassword, obtenerUsuarioActualizado, pedidosUsuarios, resetTokenModel, rolCliente, telefonoDataExistente, traerDatosActuales, updateDataUser, validarDataCedula, searchUsuariosModel,
    getAllUsuariosSimpleModel,
    searchUsuariosForPedidosModel,
    getUserSystem,
    contarAdmins,
    getUsuariosPaginated
} from '../models/user.model.js';

// Crear usuario
export const createUser = async (req, res) => {
    const {
        CedulaId,
        TipoDocumentoId,
        NombreCompleto,
        Telefono,
        CorreoElectronico,
        Direccion,
        Contrasena,
        RoleId
    } = req.body;

    try {
        const existente = await correoExiste(CorreoElectronico);

        if (existente) {
            return res.status(409).json({ message: 'Usuario ya existe' });
        }

        if (!Contrasena) {
            // Usuario creado por admin sin contraseña → enviar link de creación
            const resetToken = crypto.randomBytes(32).toString("hex");
            const resetTokenExpire = dayjs().add(1, "hour").toDate();

            await createByAdmin({ 
                CedulaId, 
                TipoDocumentoId, 
                NombreCompleto, 
                Telefono, 
                CorreoElectronico, 
                Direccion, 
                RoleId, 
                resetToken, 
                resetTokenExpire 
            });
            
            // Enviar correo con link al frontend   
            await sendResetPasswordEmail(CorreoElectronico, resetToken);

            return res.status(201).json({ 
                message: 'Usuario creado exitosamente. Se ha enviado un correo para establecer la contraseña.' 
            });
        }

        // Si tiene contraseña (registro normal), crear usuario con contraseña
        const hashedPassword = await bcrypt.hash(Contrasena, 10);
        await createUsuario({
            CedulaId,
            TipoDocumentoId,
            NombreCompleto,
            Telefono,
            CorreoElectronico,
            Direccion,
            Contrasena: hashedPassword,
            RoleId
        });

        res.status(201).json({ message: 'Usuario creado exitosamente' });

    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Listar todos los usuarios
export const getAllUsers = async (req, res) => {
  try {
    const rolesCliente = await rolCliente();
    const clienteRoleId = rolesCliente[0]?.RoleId;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const filtroCampo = req.query.filtroCampo || null;
    const filtroValor = req.query.filtroValor || null;

    const result = await getUsuariosPaginated({ 
      page, 
      limit, 
      filtroCampo, 
      filtroValor,
      excluirRoleId: clienteRoleId
    });

    // Validación segura de datos
    const data = result && result.data && Array.isArray(result.data) ? result.data : [];
    const totalItems = result && typeof result.totalItems === 'number' ? result.totalItems : 0;
    const currentPage = result && typeof result.currentPage === 'number' ? result.currentPage : page;

    // Si no hay datos y la página > 1, volver a página 1
    if (data.length === 0 && page > 1 && totalItems > 0) {
      const fallback = await getUsuariosPaginated({ 
        page: 1, 
        limit, 
        filtroCampo, 
        filtroValor,
        excluirRoleId: clienteRoleId
      });
      const fallbackData = fallback && fallback.data && Array.isArray(fallback.data) ? fallback.data : [];
      const fallbackTotal = fallback && typeof fallback.totalItems === 'number' ? fallback.totalItems : 0;
      
      return res.status(200).json({
        data: fallbackData,
        pagination: {
          totalItems: fallbackTotal,
          totalPages: Math.ceil(fallbackTotal / limit),
          currentPage: 1,
          itemsPerPage: limit
        }
      });
    }

    res.status(200).json({
      data: data,
      pagination: {
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: currentPage,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Error en getAllUsers:', error);
    res.status(200).json({
      data: [],
      pagination: {
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: parseInt(req.query.limit) || 10
      }
    });
  }
};

// Obtener usuario por ID 
export const getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await getUsuarioById(id);  // Ahora user es un objeto o undefined

        if (!user) {  // Si no existe
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.status(200).json(user);  // Retornamos el objeto
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Actualizar usuario
export const updateUser = async (req, res) => {
    const { id } = req.params;

    try {
        const rows = await traerDatosActuales({ CedulaId: id });

        if (rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const currentUser = rows[0];

        // Obtener RoleId del cliente
        const rolesCliente = await rolCliente();
        const clienteRoleId = rolesCliente[0]?.RoleId;

        // Bloquear intento de asignar rol cliente
        if (req.body.RoleId === clienteRoleId) {
            return res.status(403).json({
                message: 'No se puede asignar el rol Cliente desde el módulo de usuarios'
            });
        }

        // Crear objeto con campos actualizados - IMPORTANTE: Incluir RoleId del body
        const updatedUser = {
            TipoDocumentoId: req.body.TipoDocumentoId ?? currentUser.TipoDocumentoId,
            NombreCompleto: req.body.NombreCompleto ?? currentUser.NombreCompleto,
            Telefono: req.body.Telefono ?? currentUser.Telefono,
            CorreoElectronico: req.body.CorreoElectronico ?? currentUser.CorreoElectronico,
            Direccion: req.body.Direccion ?? currentUser.Direccion,
            RoleId: req.body.RoleId ?? currentUser.RoleId
        };

        await updateDataUser({ id, updatedUser });

        // Obtener el usuario actualizado con información del rol
        const users = await obtenerUsuarioActualizado(id)

        const userUpdated = users[0];

        res.status(200).json({
            message: 'Usuario actualizado correctamente',
            user: userUpdated // Devolver el usuario actualizado
        });

    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Eliminar usuario
export const deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        const users = await getUserSystem(id);

        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const user = users[0];

        // Usuario del sistema
        if (user.IsSystem) {
            return res.status(403).json({
                message: 'Este usuario es crítico del sistema y no puede eliminarse'
            });
        }

        // Último administrador
        if (user.RolNombre === 'Administrador') {
            const totalAdmins = await contarAdmins();

            if (totalAdmins <= 1) {
                return res.status(409).json({
                    message: 'No se puede eliminar el último administrador del sistema'
                });
            }
        }

        // Pedidos asociados
        const pedidos = await pedidosUsuarios(id);
        if (pedidos.length > 0) {
            return res.status(409).json({
                message: 'No se puede eliminar el usuario porque tiene pedidos asociados'
            });
        }

        await deleteDataUser(id);

        res.status(200).json({ message: 'Usuario eliminado correctamente' });

    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};


// Validar si correo ya existe
export const validarCorreo = async (req, res) => {
    const { correo } = req.query;
    try {
        const existe = await correoExiste(correo);
        res.status(200).json({ exists: existe });
    } catch (error) {
        console.error('Error al validar correo:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Validar si la cedula ya existe
export const validarCedula = async (req, res) => {
    const { cedula } = req.query;

    try {
        const usuarios = await validarDataCedula(cedula);

        res.status(200).json({ exists: usuarios.length > 0 });
    } catch (error) {
        console.error('Error en /validar-cedula:', error);
        res.status(500).json({ message: 'Error al validar la cedula' });
    }
};

// Validar si el telefono ya existe
export const validarTelefono = async (req, res) => {
    const { telefono } = req.query;

    try {
        const usuarios = await telefonoDataExistente(telefono);

        res.status(200).json({ exists: usuarios.length > 0 });
    } catch (error) {
        console.error('Error en /validar-telefono:', error);
        res.status(500).json({ message: 'Error al validar el telefono' });
    }
};

// Buscar usuarios
export const buscarUsuarios = async (req, res) => {
  const { campo, valor, page = 1, limit = 10 } = req.query;

  const columnasPermitidas = {
    cedula: 'cedula',
    nombre: 'nombre', 
    correo: 'correo',
    telefono: 'telefono',
    direccion: 'direccion',
    rol: 'rol',
    tipoDocumento: 'tipoDocumento'
  };

  const filtroCampo = columnasPermitidas[campo];
  
  if (campo && !filtroCampo) {
    return res.status(400).json({ message: 'Campo de búsqueda inválido' });
  }

  try {
    const rolesCliente = await rolCliente();
    const clienteRoleId = rolesCliente[0]?.RoleId;

    const result = await getUsuariosPaginated({ 
      page: Math.max(1, parseInt(page) || 1), 
      limit: Math.max(1, parseInt(limit) || 10), 
      filtroCampo: filtroCampo || null, 
      filtroValor: valor || null,
      excluirRoleId: clienteRoleId
    });

    // Validación segura de datos
    const data = result && result.data && Array.isArray(result.data) ? result.data : [];
    const totalItems = result && typeof result.totalItems === 'number' ? result.totalItems : 0;
    const currentPage = result && typeof result.currentPage === 'number' ? result.currentPage : 1;
    const itemsPerPage = Math.max(1, parseInt(limit) || 10);

    res.status(200).json({
      data: data,
      pagination: {
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / itemsPerPage),
        currentPage: currentPage,
        itemsPerPage: itemsPerPage
      }
    });

  } catch (error) {
    console.error('Error en buscarUsuarios:', error);
    res.status(200).json({
      data: [],
      pagination: {
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: parseInt(limit) || 10
      }
    });
  }
};

export const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { nuevaContrasena } = req.body;

    if (!nuevaContrasena) {
        return res.status(400).json({ message: "Debe proporcionar una nueva contraseña" });
    }

    try {
        const users = await resetTokenModel(token);

        if (users.length === 0) return res.status(400).json({ message: "Token inválido o expirado" });

        const hash = await bcrypt.hash(nuevaContrasena, 10);
        await hashPassword(hash)

        res.status(200).json({ message: "Contraseña establecida correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};


export const showResetForm = async (req, res) => {
    const { token } = req.params;

    try {
        const users = await resetTokenModel(token);

        if (users.length === 0) {
            // Token inválido o expirado → puedes redirigir a una página de error en frontend
            return res.redirect('http://localhost:3000/reset-password-invalid');
        }

        // Redirigir al frontend pasando el token
        // Por ejemplo, tu frontend React tendría una ruta /reset-password/:token
        res.redirect(`http://localhost:3000/reset-password/${token}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error interno del servidor');
    }
};


//

export const searchUsuarios = async (req, res) => {
    try {
        const { search = "", page = 1, limit = 10 } = req.query;

        console.log(` Buscando usuarios: "${search}", página ${page}, límite ${limit}`);

        const result = await searchUsuariosModel(search, parseInt(page), parseInt(limit));

        console.log(`✅ Encontrados ${result.total} usuarios`);

        res.status(200).json({
            success: true,
            clientes: result.usuarios,
            total: result.total,
            pages: result.pages,
            currentPage: result.currentPage
        });
    } catch (error) {
        console.error('❌ Error al buscar usuarios:', error);
        res.status(500).json({
            success: false,
            error: 'Error al buscar usuarios',
            message: error.message
        });
    }
};

/**
 * Obtener todos los usuarios (para dropdown simple)
 * GET /user/all
 */
export const getAllUsuariosSimple = async (req, res) => {
    try {
        const usuarios = await getAllUsuariosSimpleModel();

        res.status(200).json({
            success: true,
            clientes: usuarios  // Asegúrate de que esto sea "clientes" no "usuarios"
        });
    } catch (error) {
        console.error('❌ Error al obtener usuarios:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener usuarios',
            message: error.message
        });
    }
};
/**
 * Búsqueda rápida para pedidos
 * GET /user/for-pedidos?search=term
 */
export const searchUsuariosForPedidos = async (req, res) => {
    try {
        const { search = "" } = req.query;

        console.log(`Búsqueda rápida para pedidos: "${search}"`);

        const usuarios = await searchUsuariosForPedidosModel(search);

        res.status(200).json({
            success: true,
            clientes: usuarios,
            total: usuarios.length
        });
    } catch (error) {
        console.error('❌ Error en búsqueda rápida:', error);
        res.status(500).json({
            success: false,
            error: 'Error en búsqueda de usuarios',
            message: error.message
        });
    }
};

/**
 * Obtener usuario por cédula (para validación)
 * GET /user/cedula/:cedula
 */
export const getUsuarioByCedula = async (req, res) => {
    try {
        const { cedula } = req.params;

        const usuario = await getUsuarioById(cedula); // Esta función ya existe en tu modelo

        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            cliente: {
                CedulaId: usuario.CedulaId,
                NombreCompleto: usuario.NombreCompleto,
                Telefono: usuario.Telefono,
                CorreoElectronico: usuario.CorreoElectronico
            }
        });
    } catch (error) {
        console.error('❌ Error al obtener usuario por cédula:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener usuario',
            message: error.message
        });
    }
};