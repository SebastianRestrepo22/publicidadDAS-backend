import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dayjs from "dayjs"; // para manejar expiraciones
import crypto from "crypto";
import { correoExiste, createByAdmin, deleteDataUser, getAllDataClientes, getClientById, getUserSystem, obtenerUsuarioActualizado, pedidosUsuarios, telefonoDataExistente, traerDatosActuales, updateDataUser, validarDataCedula, getClientesPaginated } from '../models/user.model.js';
import { sendResetPasswordEmail } from '../utils/email.js';
import { getRoleIdByName } from '../models/role.model.js';


export const createClient = async (req, res) => {
    const {
        CedulaId,
        TipoDocumentoId,
        NombreCompleto,
        Telefono,
        CorreoElectronico,
        Direccion,
        Contrasena
    } = req.body;

    try {
        const existente = await correoExiste(CorreoElectronico);

        if (existente) {
            return res.status(409).json({ message: 'Usuario ya existe' });
        };

        // Verifica si la cédula ya existe
        const cedulaExistente = await validarDataCedula(CedulaId);
        if (cedulaExistente.length > 0) {
            return res.status(409).json({
                message: 'Esta cédula ya está registrada'
            });
        };

        // Verifica si el teléfono ya existe
        const telefonoExistente = await telefonoDataExistente(Telefono);
        if (telefonoExistente.length > 0) {
            return res.status(409).json({
                message: 'Este teléfono ya está registrado'
            });
        };

        // Busca el rol cliente
        const rows = await getRoleIdByName('cliente');
        if (rows.length === 0) {
            return res.status(400).json({
                message: "Rol 'cliente' no encontrado en BD"
            });
        }

        const RoleId = rows[0].id;

        if (!Contrasena) {
            // Usuario creado por admin sin contraseña → enviar link de creación
            const resetToken = crypto.randomBytes(32).toString("hex");
            const resetTokenExpire = dayjs().add(1, "hour").toDate();

            await createByAdmin({ CedulaId, TipoDocumentoId, NombreCompleto, Telefono, CorreoElectronico, Direccion, RoleId, resetToken, resetTokenExpire });
            // Enviar correo con link al frontend   
            await sendResetPasswordEmail(CorreoElectronico, resetToken);

        }

        res.status(201).json({ message: 'Usuario creado exitosamente' });
    } catch (error) {
        console.error('Error al crear el cliente, ', error);
        return res.status(500).json({ message: 'Error interno en el servidor.' })
    }
}

// Listar todos los clientes
export const getAllClients = async (req, res) => {
  try {
    const { page = 1, limit = 10, filtroCampo, filtroValor } = req.query;

    const result = await getClientesPaginated({
      page: Math.max(1, parseInt(page) || 1),
      limit: Math.max(1, parseInt(limit) || 10),
      filtroCampo: filtroCampo || null,
      filtroValor: filtroValor || null
    });

    // Validación defensiva
    const data = result && result.data && Array.isArray(result.data) ? result.data : [];
    const totalItems = typeof result?.totalItems === 'number' ? result.totalItems : 0;
    const currentPage = typeof result?.currentPage === 'number' ? result.currentPage : 1;
    const itemsPerPage = Math.max(1, parseInt(limit) || 10);

    // Si no hay datos y la página > 1, volver a página 1
    if (data.length === 0 && currentPage > 1 && totalItems > 0) {
      const fallback = await getClientesPaginated({
        page: 1,
        limit: itemsPerPage,
        filtroCampo: filtroCampo || null,
        filtroValor: filtroValor || null
      });
      const fallbackData = fallback && fallback.data && Array.isArray(fallback.data) ? fallback.data : [];
      const fallbackTotal = typeof fallback?.totalItems === 'number' ? fallback.totalItems : 0;
      
      return res.status(200).json({
        data: fallbackData,
        pagination: {
          totalItems: fallbackTotal,
          totalPages: Math.ceil(fallbackTotal / itemsPerPage),
          currentPage: 1,
          itemsPerPage: itemsPerPage
        }
      });
    }

    // Respuesta con estructura CORRECTA
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
    console.error('Error en getAllClients:', error);
    // Fallback con estructura CORRECTA
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

// Obtener cliente por ID 
export const getClienteById = async (req, res) => {
    const { id } = req.params;

    try {
        const roleRows = await getRoleIdByName('cliente');

        if (roleRows.length === 0) {
            return res.status(400).json({ message: "Rol cliente no existe" });
        }

        const roleId = roleRows[0].id; 

        const cliente = await getClientById(id, roleId);

        if (!cliente) {
            return res.status(404).json({ message: "Cliente no encontrado" });
        }

        res.status(200).json(cliente);

    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

//Actualizar el cliente
export const updateCliente = async (req, res) => {
    const { id } = req.params;

    try {
        // Obtener el RoleId del rol cliente
        const roleRows = await getRoleIdByName('cliente');

        if (roleRows.length === 0) {
            return res.status(400).json({ message: "Rol cliente no existe" });
        }

        const roleIdCliente = roleRows[0].id;

        // Traer datos actuales del usuario
        const rows = await traerDatosActuales({ CedulaId: id });

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const currentUser = rows[0];

        // Validar que realmente sea cliente
        if (currentUser.RoleId !== roleIdCliente) {
            return res.status(403).json({
                message: 'El usuario no pertenece al rol cliente'
            });
        }

        // Construir objeto actualizado (SIN permitir cambiar rol)
        const updatedUser = {
            TipoDocumentoId: req.body.TipoDocumentoId ?? currentUser.TipoDocumentoId,
            NombreCompleto: req.body.NombreCompleto ?? currentUser.NombreCompleto,
            Telefono: req.body.Telefono ?? currentUser.Telefono,
            CorreoElectronico: req.body.CorreoElectronico ?? currentUser.CorreoElectronico,
            Direccion: req.body.Direccion ?? currentUser.Direccion,
            RoleId: roleIdCliente // Forzado
        };

        // Actualizar
        await updateDataUser({ id, updatedUser });

        // Obtener usuario actualizado
        const users = await obtenerUsuarioActualizado(id);
        const userUpdated = users[0];

        res.status(200).json({
            message: 'Cliente actualizado correctamente',
            user: userUpdated
        });

    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const deleteCliente = async (req, res) => {
    const { id } = req.params;

    try {
        // Obtener RoleId del cliente
        const roleRows = await getRoleIdByName('cliente');

        if (roleRows.length === 0) {
            return res.status(400).json({ message: "Rol cliente no existe" });
        }

        const roleIdCliente = roleRows[0].id; // usando alias consistente

        // Buscar usuario
        const users = await getUserSystem(id);

        if (users.length === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        const user = users[0];

        // Verificar que sea cliente
        if (user.RoleId !== roleIdCliente) {
            return res.status(403).json({
                message: 'El usuario no pertenece al rol cliente'
            });
        }

        // Verificar pedidos asociados
        const pedidos = await pedidosUsuarios(id);

        if (pedidos.length > 0) {
            return res.status(409).json({
                message: 'No se puede eliminar el cliente porque tiene pedidos asociados'
            });
        }

        // Eliminar cliente
        await deleteDataUser(id);

        res.status(200).json({ message: 'Cliente eliminado correctamente' });

    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Elimina esta línea:
// import { searchClientesModel } from '../models/pedidoCliente.model.js';

// Y modifica la función para usar dbPool directamente:
export const searchClientesForPedidos = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 5 } = req.query;
    
    // Consulta directa a la base de datos
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        u.CedulaId,
        u.NombreCompleto,
        u.Telefono,
        u.CorreoElectronico
      FROM usuarios u
      JOIN roles r ON u.RoleId = r.RoleId
      WHERE r.Nombre = 'cliente'
    `;
    
    const params = [];
    
    if (search && search.trim() !== "") {
      query += ` AND (
        u.CedulaId LIKE ? OR 
        u.NombreCompleto LIKE ? OR 
        u.Telefono LIKE ? OR 
        u.CorreoElectronico LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }
    
    query += ` ORDER BY u.NombreCompleto ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const [rows] = await dbPool.query(query, params);
    
    // Obtener total
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM usuarios u
      JOIN roles r ON u.RoleId = r.RoleId
      WHERE r.Nombre = 'cliente'
    `;
    
    const countParams = [];
    
    if (search && search.trim() !== "") {
      countQuery += ` AND (
        u.CedulaId LIKE ? OR 
        u.NombreCompleto LIKE ? OR 
        u.Telefono LIKE ? OR 
        u.CorreoElectronico LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }
    
    const [countResult] = await dbPool.query(countQuery, countParams);
    const total = countResult[0]?.total || 0;
        
    res.status(200).json({
      clientes: rows,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('❌ Error al buscar clientes:', error);
    res.status(500).json({ 
      message: 'Error al buscar clientes',
      error: error.message 
    });
  }
};

export const buscarClientes = async (req, res) => {
  const { campo, valor, page = 1, limit = 10 } = req.query;

  const columnasPermitidas = {
    cedula: 'cedula',
    nombre: 'nombre',
    correo: 'correo',
    telefono: 'telefono',
    direccion: 'direccion',
    tipoDocumento: 'tipoDocumento'
  };

  const filtroCampo = columnasPermitidas[campo?.toLowerCase()];
  
  if (campo && !filtroCampo) {
    return res.status(400).json({ message: 'Campo de búsqueda inválido' });
  }

  try {
    const result = await getClientesPaginated({
      page: Math.max(1, parseInt(page) || 1),
      limit: Math.max(1, parseInt(limit) || 10),
      filtroCampo: filtroCampo || null,
      filtroValor: valor || null
    });

    const data = result && result.data && Array.isArray(result.data) ? result.data : [];
    const totalItems = typeof result?.totalItems === 'number' ? result.totalItems : 0;
    const currentPage = typeof result?.currentPage === 'number' ? result.currentPage : 1;
    const itemsPerPage = Math.max(1, parseInt(limit) || 10);

    // Respuesta con estructura CORRECTA
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
    console.error('Error en buscarClientes:', error);
    // Fallback con estructura CORRECTA
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
