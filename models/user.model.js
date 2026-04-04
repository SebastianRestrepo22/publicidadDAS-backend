import { dbPool } from "../lib/db.js";

// Crear usuario
export const createUsuario = async ({
  CedulaId,
  TipoDocumentoId,
  NombreCompleto,
  Telefono,
  CorreoElectronico,
  Direccion,
  Contrasena,
  RoleId
}) => {
  await dbPool.query(
    `INSERT INTO usuarios 
     (CedulaId, tipodocumentoId, NombreCompleto, Telefono, CorreoElectronico, Direccion, Contrasena, RoleId) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [CedulaId, TipoDocumentoId, NombreCompleto, Telefono, CorreoElectronico, Direccion, Contrasena, RoleId]
  );
};

export const getAllDataUsers = async () => {

  const roles = await rolCliente();
  const clienteRoleId = roles[0]?.RoleId;

  const [rows] = await dbPool.query(`
    SELECT 
      u.CedulaId,
      u.TipoDocumentoId,
      td.Nombre AS TipoDocumentoNombre,
      u.NombreCompleto,
      u.Telefono,
      u.CorreoElectronico,
      u.Direccion,
      u.RoleId,
      u.IsSystem,
      r.Nombre AS RolNombre
    FROM usuarios u
    JOIN roles r ON u.RoleId = r.RoleId
    JOIN tipodocumento td ON u.TipoDocumentoId = td.TipoDocumentoId
    WHERE u.RoleId != ?
    ORDER BY u.NombreCompleto ASC
  `, [clienteRoleId]);

  return rows;
};

export const contarAdmins = async () => {
  const [[result]] = await dbPool.query(`
    SELECT COUNT(*) AS total
    FROM usuarios u
    JOIN roles r ON u.RoleId = r.RoleId
    WHERE r.Nombre = 'Administrador'
  `);

  return result.total; // número, no array
};

// Buscar usuario por correo
export const getUsuarioByCorreo = async (CorreoElectronico) => {
  const [rows] = await dbPool.query(
    `SELECT u.*, r.Nombre AS RoleNombre 
     FROM usuarios u 
     JOIN roles r ON u.RoleId = r.RoleId 
     WHERE u.CorreoElectronico = ?`,
    [CorreoElectronico]
  );
  return rows[0];
};

// Buscar usuario por ID
export const getUsuarioById = async (id) => {
  const [rows] = await dbPool.query(`
    SELECT 
      u.CedulaId,
      u.TipoDocumentoId,
      u.NombreCompleto,
      u.Telefono,
      u.CorreoElectronico,
      u.Direccion,
      u.RoleId,
      u.IsSystem,
      r.Nombre AS RolNombre
    FROM usuarios u
    JOIN roles r ON u.RoleId = r.RoleId
    WHERE u.CedulaId = ?
  `, [id]);

  return rows[0];
};

export const getUserSystem = async (id) => {
  const [rows] = await dbPool.query(`
    SELECT 
      u.CedulaId,
      u.RoleId,
      u.IsSystem,
      r.Nombre AS RolNombre
    FROM usuarios u
    JOIN roles r ON u.RoleId = r.RoleId
    WHERE u.CedulaId = ?
  `, [id]);

  return rows;
};

export const traerDatosActuales = async (id) => {
  const [rows] = await dbPool.query(
    'SELECT * FROM usuarios WHERE CedulaId = ?',
    [id.CedulaId]
  );
  return rows;
};

// Verificar si correo ya existe
export const correoExiste = async (correo) => {
  const [rows] = await dbPool.query(
    'SELECT * FROM usuarios WHERE CorreoElectronico = ?',
    [correo]
  );
  return rows.length > 0;
};

export const rolCliente = async () => {
  const [roles] = await dbPool.query(
    'SELECT * FROM roles WHERE Nombre = ?',
    ['cliente']
  );
  return roles;
};

export const createByAdmin = async ({
  CedulaId,
  TipoDocumentoId,
  NombreCompleto,
  Telefono,
  CorreoElectronico,
  Direccion,
  RoleId,
  resetToken,
  resetTokenExpire
}) => {
  await dbPool.query(
    `INSERT INTO usuarios 
         (CedulaId, TipoDocumentoId, NombreCompleto, Telefono, CorreoElectronico, Direccion, Contrasena, RoleId, resetToken, resetTokenExpire)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      CedulaId,
      TipoDocumentoId,
      NombreCompleto,
      Telefono,
      CorreoElectronico,
      Direccion,
      null, //Contrasena NULL
      RoleId,
      resetToken,
      resetTokenExpire
    ]
  );
};

export const updateDataUser = async ({ id, updatedUser }) => {
  await dbPool.query(
    `UPDATE usuarios SET TipoDocumentoId=?, NombreCompleto=?, Telefono=?, CorreoElectronico=?, Direccion=?, RoleId=? WHERE CedulaId=?`,
    [
      updatedUser.TipoDocumentoId,
      updatedUser.NombreCompleto,
      updatedUser.Telefono,
      updatedUser.CorreoElectronico,
      updatedUser.Direccion,
      updatedUser.RoleId, // Usar el RoleId actualizado
      id
    ]
  );
};

export const obtenerUsuarioActualizado = async (id) => {
  const [rows] = await dbPool.query(
    `SELECT u.*, r.Nombre AS RolNombre 
       FROM usuarios u 
       LEFT JOIN roles r ON u.RoleId = r.RoleId 
       WHERE u.CedulaId = ?`,
    [id]
  );
  return rows;
};

export const pedidosUsuarios = async (id) => {
  const [rows] = await dbPool.query(
    'SELECT * FROM pedidosclientes WHERE ClienteId = ?',
    [id]
  );
  return rows;
}

export const deleteDataUser = async (id) => {
  const [rows] = await dbPool.query(
    'DELETE FROM usuarios WHERE CedulaId = ?',
    [id]
  );
  return rows;
};

export const validarDataCedula = async (cedula) => {
  const [rows] = await dbPool.query(
    'SELECT * FROM usuarios WHERE CedulaId = ?',
    [cedula]
  );
  return rows;
};

export const telefonoDataExistente = async (telefono) => {
  const [rows] = await dbPool.query(
    'SELECT * FROM usuarios WHERE Telefono = ?',
    [telefono]
  );
  return rows;
}

export const buscarUsuarioData = async (columna, valor) => {
  const [rows] = await dbPool.query(
    `SELECT 
      u.*, 
      r.Nombre AS RolNombre, 
      td.Nombre AS TipoDocumentoNombre
   FROM usuarios u
   JOIN roles r ON u.RoleId = r.RoleId
   JOIN tipodocumento td ON u.TipoDocumentoId = td.TipoDocumentoId
   WHERE ${columna} LIKE ?`,
    [`%${valor}%`]
  );
  return rows;
};

export const resetTokenModel = async (token) => {
  const [rows] = dbPool.query(
    'SELECT * FROM usuarios WHERE resetToken = ? AND resetTokenExpire > ?',
    [token, new Date()]
  );
  return rows;
};

export const hashPassword = async (hash) => {
  await dbPool.query(
    'UPDATE usuarios SET Contrasena = ?, resetToken = NULL, resetTokenExpire = NULL WHERE CedulaId = ?',
    [hash, users[0].CedulaId]
  );
};

/**
 * Buscar usuarios por término de búsqueda con paginación
 */
export const searchUsuariosModel = async (searchTerm = "", page = 1, limit = 10) => {
  try {
    // Convertir a números enteros
    page = parseInt(page);
    limit = parseInt(limit);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        CedulaId, 
        NombreCompleto, 
        Telefono, 
        CorreoElectronico,
        Direccion
      FROM usuarios
      WHERE 1=1
    `;

    const params = [];

    if (searchTerm && searchTerm.trim() !== "") {
      query += ` AND (
        CedulaId LIKE ? OR 
        NombreCompleto LIKE ? OR 
        Telefono LIKE ? OR 
        CorreoElectronico LIKE ?
      )`;
      const searchPattern = `%${searchTerm}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Agregar orden y paginación
    query += ` ORDER BY NombreCompleto ASC LIMIT ? OFFSET ?`;

    // Asegurarnos de que limit y offset sean números y agregarlos a params
    params.push(limit, offset);

    // Usar dbPool.query en lugar de execute
    const [rows] = await dbPool.query(query, params);

    // Obtener total para paginación
    let countQuery = `SELECT COUNT(*) as total FROM usuarios WHERE 1=1`;
    const countParams = [];

    if (searchTerm && searchTerm.trim() !== "") {
      countQuery += ` AND (
        CedulaId LIKE ? OR 
        NombreCompleto LIKE ? OR 
        Telefono LIKE ? OR 
        CorreoElectronico LIKE ?
      )`;
      const searchPattern = `%${searchTerm}%`;
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const [countResult] = await dbPool.query(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    return {
      usuarios: rows || [],
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    };
  } catch (error) {
    console.error("Error en searchUsuariosModel:", error);
    throw error;
  }
};

/**
 * Obtener todos los usuarios (sin paginación, para selección simple)
 */
export const getAllUsuariosSimpleModel = async () => {
  try {
    const [rows] = await dbPool.execute(`
      SELECT 
        CedulaId, 
        NombreCompleto, 
        Telefono, 
        CorreoElectronico,
        Direccion
      FROM usuarios 
      ORDER BY NombreCompleto ASC
    `);
    return rows || [];
  } catch (error) {
    console.error("Error en getAllUsuariosSimpleModel:", error);
    throw error;
  }
};

/**
 * Buscar usuarios solo por cédula o nombre (más específico) - para pedidos
 */
export const searchUsuariosForPedidosModel = async (searchTerm = "") => {
  try {
    let query = `
      SELECT 
        CedulaId, 
        NombreCompleto, 
        Telefono, 
        CorreoElectronico
      FROM usuarios
      WHERE 1=1
    `;

    const params = [];

    if (searchTerm && searchTerm.trim() !== "") {
      query += ` AND (
        CedulaId LIKE ? OR 
        NombreCompleto LIKE ?
      )`;
      const searchPattern = `%${searchTerm}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ` ORDER BY NombreCompleto ASC LIMIT 50`;

    const [rows] = await dbPool.execute(query, params);
    return rows || [];
  } catch (error) {
    console.error("Error en searchUsuariosForPedidosModel:", error);
    throw error;
  }
};

export const createUserWalkinModel = async (userData) => {
  const {
    CedulaId,
    NombreCompleto,
    Telefono,
    CorreoElectronico,
    Direccion = null,
    RoleId = 3 // Rol de cliente
  } = userData;

  const hashedPassword = await bcrypt.hash('walkin123', 10);

  // Crear nuevo usuario walk-in
  await createUserWalkinModel({
    CedulaId: walkinCedula,
    NombreCompleto: ClienteNombre?.trim() || 'Cliente Walk-in',
    Telefono: ClienteTelefono?.trim() || null,
    CorreoElectronico: ClienteCorreo?.trim() || null,
    Direccion: null,
    RoleId: 3
  });

  return { CedulaId, NombreCompleto };
};

//Obtener los clientes
export const getAllDataClientes = async (roleId) => {
  const [rows] = await dbPool.query(`
    SELECT 
      u.CedulaId,
      u.TipoDocumentoId,
      td.Nombre AS TipoDocumentoNombre,
      u.NombreCompleto,
      u.Telefono,
      u.CorreoElectronico,
      u.Direccion,
      u.RoleId,
      u.IsSystem,
      r.Nombre AS RolNombre
    FROM usuarios u
    JOIN roles r ON u.RoleId = r.RoleId
    JOIN tipodocumento td ON u.TipoDocumentoId = td.TipoDocumentoId
    WHERE u.RoleId = ?
    ORDER BY u.NombreCompleto ASC
  `, [roleId]);

  return rows;
}

// Buscar usuario por ID
export const getClientById = async (id, roleId) => {
  const [rows] = await dbPool.query(`
    SELECT 
      u.CedulaId,
      u.NombreCompleto,
      u.Telefono,
      u.CorreoElectronico,
      u.Direccion,
      u.RoleId,
      u.IsSystem,
      r.Nombre AS RolNombre
    FROM usuarios u
    JOIN roles r ON u.RoleId = r.RoleId
    WHERE u.CedulaId = ?
      AND u.RoleId = ?
  `, [id, roleId]);

  return rows[0];
};

/**
 * Obtener usuarios con paginación y filtros
 */
export const getUsuariosPaginated = async ({
  page = 1,
  limit = 10,
  filtroCampo = null,
  filtroValor = null,
  excluirRoleId = null
}) => {
  const offset = (page - 1) * limit;
  let whereConditions = ['1=1'];
  let params = [];

  // Excluir rol cliente si se especifica
  if (excluirRoleId) {
    whereConditions.push('u.RoleId != ?');
    params.push(excluirRoleId);
  }

  // Mapeo de campos del frontend a columnas reales
  const columnasMap = {
    cedula: 'u.CedulaId',
    nombre: 'u.NombreCompleto',
    correo: 'u.CorreoElectronico',
    telefono: 'u.Telefono',
    direccion: 'u.Direccion',
    rol: 'r.Nombre',
    tipoDocumento: 'td.Nombre'
  };

  if (filtroCampo && filtroValor && columnasMap[filtroCampo]) {
    whereConditions.push(`${columnasMap[filtroCampo]} LIKE ?`);
    params.push(`%${filtroValor}%`);
  }

  const whereClause = whereConditions.length > 1 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Consulta principal con JOINs y paginación
  const [rows] = await dbPool.query(`
    SELECT 
      u.CedulaId,
      u.TipoDocumentoId,
      td.Nombre AS TipoDocumentoNombre,
      u.NombreCompleto,
      u.Telefono,
      u.CorreoElectronico,
      u.Direccion,
      u.RoleId,
      u.IsSystem,
      r.Nombre AS RolNombre
    FROM usuarios u
    JOIN roles r ON u.RoleId = r.RoleId
    JOIN tipodocumento td ON u.TipoDocumentoId = td.TipoDocumentoId
    ${whereClause}
    ORDER BY u.NombreCompleto ASC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  // Consulta de conteo para totalPages
  const [countResult] = await dbPool.query(`
    SELECT COUNT(*) as total 
    FROM usuarios u
    JOIN roles r ON u.RoleId = r.RoleId
    ${whereClause}
  `, params);

  return {
    data: rows,
    totalItems: countResult[0]?.total || 0,
    currentPage: Number(page),
    itemsPerPage: Number(limit)
  };
};

/**
 * Obtener clientes con paginación y filtros
 */
export const getClientesPaginated = async ({
  page = 1,
  limit = 10,
  filtroCampo = null,
  filtroValor = null
}) => {
  const offset = (page - 1) * limit;
  let whereConditions = [];
  let params = [];

  // 🔥 FILTRO OBLIGATORIO: Solo clientes (RoleId con Nombre = 'cliente')
  whereConditions.push("r.Nombre = 'cliente'");

  // Mapeo de campos del frontend a columnas reales
  const columnasMap = {
    cedula: 'u.CedulaId',
    nombre: 'u.NombreCompleto',
    correo: 'u.CorreoElectronico',
    telefono: 'u.Telefono',
    direccion: 'u.Direccion',
    tipoDocumento: 'td.Nombre'
  };

  // Agregar filtro de búsqueda si existe
  if (filtroCampo && filtroValor && columnasMap[filtroCampo]) {
    whereConditions.push(`${columnasMap[filtroCampo]} LIKE ?`);
    params.push(`%${filtroValor}%`);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // 🔹 Consulta principal con JOINs y paginación
  const [rows] = await dbPool.query(`
    SELECT 
      u.CedulaId,
      u.TipoDocumentoId,
      td.Nombre AS TipoDocumentoNombre,
      u.NombreCompleto,
      u.Telefono,
      u.CorreoElectronico,
      u.Direccion,
      u.RoleId,
      u.IsSystem,
      r.Nombre AS RolNombre
    FROM usuarios u
    INNER JOIN roles r ON u.RoleId = r.RoleId
    INNER JOIN tipodocumento td ON u.TipoDocumentoId = td.TipoDocumentoId
    ${whereClause}
    ORDER BY u.NombreCompleto ASC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  // 🔹 Consulta de conteo para totalPages (MISMO WHERE que la principal)
  const [countResult] = await dbPool.query(`
    SELECT COUNT(*) as total 
    FROM usuarios u
    INNER JOIN roles r ON u.RoleId = r.RoleId
    ${whereClause}
  `, params);

  // ✅ RETORNO con clave "data" explícita
  return {
    data: rows,
    totalItems: countResult[0]?.total || 0,
    currentPage: Number(page),
    itemsPerPage: Number(limit)
  };
};