import { assign } from "nodemailer/lib/shared/index.js";
import { dbPool } from "../lib/db.js";

// Obtener rol por nombre
export const getRoleByName = async (nombre) => {
  const [roles] = await dbPool.query(
    'SELECT * FROM roles WHERE Nombre = ?',
    [nombre]
  );
  return roles[0]; // Devuelve el primer resultado
};

export const getRoleIdByName = async (nombre) => {
  const [rows] = await dbPool.query(
    'SELECT RoleId AS id FROM roles WHERE Nombre = ? LIMIT 1',
    [nombre]
  );

  return rows;
};

export const systemRole = async (id) => {
  const [roles] = await dbPool.query(
    'SELECT IsSystem, Nombre FROM roles WHERE RoleId = ?',
    [id]
  );
  return roles;
}

// Crear rol
export const createDataRole = async ({ RoleId, Nombre, Estado = 'Activo', IsSystem = false }) => {
  await dbPool.query(
    'INSERT INTO roles (RoleId, Nombre, Estado, IsSystem) VALUES (?, ?, ?, ?)',
    [RoleId, Nombre, Estado, IsSystem]
  );
};

// Obtener todos los roles
export const getDataAllRoles = async () => {
  const [roles] = await dbPool.query('SELECT * FROM roles');
  return roles;
};

export const getDataRolesById = async (id) => {
  const [roles] = await dbPool.query('SELECT * FROM roles WHERE RoleId = ?',
    [id]
  );
  return roles;
}

export const updateDataRoles = async ({ Nombre, Estado, id }) => {
  const [result] = await dbPool.query(
    'UPDATE roles SET Nombre = ?, Estado = ? WHERE RoleId = ?',
    [Nombre, Estado, id]
  );
  return result;
};

export const rolesAsociados = async (id) => {
  const [roles] = await dbPool.query('SELECT * FROM usuarios WHERE RoleId = ?',
    [id]
  );
  return roles;
};

export const deleteDataRole = async (id) => {
  await dbPool.query('DELETE FROM roles WHERE RoleId = ?',
    [id]
  );
};

export const changeDataStatus = async (estado, id) => {
  const [result] = await dbPool.query(
    'UPDATE roles SET Estado = ? WHERE RoleId = ?',
    [estado, id]
  );
  return result;
};

export const validarDataRol = async (rol) => {
  const [roles] = await dbPool.query('SELECT * FROM roles WHERE Nombre = ?',
    [rol]
  );
  return roles;
};

export const buscarRolesModel = async (columna, valor) => {
  if (columna === 'Estado') {
    const valorNormalizado =
      valor.toLowerCase() === 'activo' ? 'Activo' :
        valor.toLowerCase() === 'inactivo' ? 'Inactivo' :
          valor;

    const [rows] = await dbPool.query(
      `SELECT * FROM roles WHERE Estado = ?`,
      [valorNormalizado]
    );

    return rows;
  }

  const [rows] = await dbPool.query(
    `SELECT * FROM roles WHERE ${columna} LIKE ?`,
    [`%${valor}%`]
  );

  return rows;
};

export const getdataPermisos = async () => {
  const [permisos] = await dbPool.query(
    'SELECT * FROM permisos ORDER BY Modulo, Nombre'
  );
  return permisos;
};

export const getDataRolePermissions = async (id) => {
  const [permisos] = await dbPool.query(
    `SELECT p.* FROM permisos p
       JOIN rol_permisos rp ON p.PermisoId = rp.PermisoId
       WHERE rp.RoleId = ?`,
    [id]
  );
  return permisos;
}

export const deletePermissos = async (id) => {
  await dbPool.query(
    'DELETE FROM rol_permisos WHERE RoleId = ?',
    [id]
  )
}

export const existenPermisos = async ({ placeholders, permisos }) => {
  const [existentes] = await dbPool.query(
    `SELECT PermisoId FROM permisos WHERE PermisoId IN (${placeholders})`,
    permisos
  );
  return existentes;
};

export const actualizarPermisos = async (id, permisoId) => {
  await dbPool.query(
    'INSERT INTO rol_permisos (RoleId, PermisoId) VALUES (?, ?)',
    [id, permisoId]
  );
  return id, permisoId;
};

export const getDataRolUser = async (userId) => {
  const [users] = await dbPool.query(
    'SELECT RoleId FROM usuarios WHERE CedulaId = ?',
    [userId]
  );
  return users;
};

export const getDataPermissonRol = async (RoleId) => {
  const [permisos] = await dbPool.query(
    `SELECT p.PermisoId, p.Nombre, p.Modulo 
       FROM permisos p
       JOIN rol_permisos rp ON p.PermisoId = rp.PermisoId
       WHERE rp.RoleId = ?`,
    [RoleId]
  );
  return permisos;
};

export const getDataRolesPaginated = async ({ page = 1, limit = 10, filtroCampo = null, filtroValor = null }) => {
  const offset = (page - 1) * limit;
  let whereClause = '';
  let params = [];

  if (filtroCampo && filtroValor) {
    if (filtroCampo === 'Estado') {
      const valorNormalizado = filtroValor.toLowerCase() === 'activo' ? 'Activo' : 
                               filtroValor.toLowerCase() === 'inactivo' ? 'Inactivo' : filtroValor;
      whereClause = 'WHERE Estado = ?';
      params.push(valorNormalizado);
    } else if (filtroCampo === 'Nombre' || filtroCampo === 'RoleId') {
      whereClause = `WHERE ${filtroCampo} LIKE ?`;
      params.push(`%${filtroValor}%`);
    }
  }

  // Consulta principal con LIMIT/OFFSET
  const [rows] = await dbPool.query(
    `SELECT * FROM roles ${whereClause} ORDER BY Nombre LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Consulta para obtener el total de registros (necesario para totalPages)
  const [countResult] = await dbPool.query(
    `SELECT COUNT(*) as total FROM roles ${whereClause}`,
    params
  );

  return {
    data: rows,
    totalItems: countResult[0].total,
    currentPage: Number(page),
    itemsPerPage: Number(limit)
  };
};

export const buscarRolesPaginated = async ({ page, limit, columna, valor }) => {
  return await getDataRolesPaginated({ page, limit, filtroCampo: columna, filtroValor: valor });
};