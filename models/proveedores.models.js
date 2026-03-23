import { v4 as uuidv4 } from 'uuid';
import { dbPool } from '../lib/db.js';

const sanitize = (v) => (v === undefined ? null : v);

// ========== FUNCIONES EXISTENTES ==========
export const getAllProveedores = async () => {
  const [rows] = await dbPool.query('SELECT * FROM proveedores ORDER BY NombreProveedor');
  return rows;
};

export const getProveedorById = async (id) => {
  const [rows] = await dbPool.query(
    'SELECT * FROM proveedores WHERE ProveedorId = ?',
    [id]
  );
  return rows[0];
};

export const createProveedor = async ({ ProveedorId, nombreProveedor, nit, telefono, correo, direccion, estado }) => {
  await dbPool.query(
    `INSERT INTO proveedores
    (ProveedorId, NombreProveedor, Nit, Telefono, Correo, Direccion, Estado)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ProveedorId, nombreProveedor, nit, telefono, correo, direccion, estado]
  );
  return { ProveedorId, nombreProveedor, nit, telefono, correo, direccion, estado };
};

export const deleteProveedor = async (id) => {
  const [result] = await dbPool.query(
    'DELETE FROM proveedores WHERE ProveedorId = ?',
    [id]
  );
  return result;
};

export const updateProveedor = async (id, data) => {
  const { nombreProveedor, nit, telefono, correo, direccion, estado } = data;
  const [result] = await dbPool.query(
    `UPDATE proveedores
    SET NombreProveedor = ?, Nit = ?, Telefono = ?, Correo = ?, Direccion = ?, Estado = ?
    WHERE ProveedorId = ?`,
    [
      sanitize(nombreProveedor),
      sanitize(nit),
      sanitize(telefono),
      sanitize(correo),
      sanitize(direccion),
      sanitize(estado),
      id
    ]
  );
  return result;
};

// ========== NUEVAS FUNCIONES PARA VALIDACIÓN ==========

/**
 * Verifica si un campo ya existe en la base de datos
 * @param {string} campo - Nombre del campo a validar
 * @param {string} valor - Valor a verificar
 * @param {string} excludeId - ID a excluir (para edición)
 * @returns {Promise<boolean>} - true si existe, false si no
 */
// ========== NUEVA FUNCIÓN PARA VALIDACIÓN ==========
export const verificarCampoUnico = async (campo, valor, excludeId = null) => {
  const campoMap = {
    nombreProveedor: 'NombreProveedor',
    correo: 'Correo',
    nit: 'Nit'
  };

  const columna = campoMap[campo];
  if (!columna) {
    throw new Error(`Campo no válido: ${campo}`);
  }

  let query = `SELECT COUNT(*) as count FROM proveedores WHERE ${columna} = ?`;
  let params = [valor];

  // Si estamos editando, excluimos el registro actual
  if (excludeId) {
    query += ' AND ProveedorId != ?';
    params.push(excludeId);
  }

  const [rows] = await dbPool.query(query, params);
  return rows[0].count > 0;
};

// ========== FUNCIONES DE PAGINACIÓN ==========
export const getProveedoresPaginated = async ({
  page = 1,
  limit = 10,
  filtroCampo = null,
  filtroValor = null
}) => {
  const offset = (page - 1) * limit;
  let whereClause = '';
  let params = [];

  if (filtroCampo && filtroValor) {
    const campoMap = {
      id: 'ProveedorId',
      nombre: 'NombreProveedor',
      nit: 'Nit',
      telefono: 'Telefono',
      correo: 'Correo',
      direccion: 'Direccion',
      estado: 'Estado'
    };
    const columna = campoMap[filtroCampo] || filtroCampo;

    if (columna === 'ProveedorId') {
      whereClause = 'WHERE ProveedorId = ?';
      params.push(filtroValor);
    } else if (columna === 'Estado') {
      const valorNormalizado = filtroValor.toLowerCase() === 'activo' ? 1 :
        filtroValor.toLowerCase() === 'inactivo' ? 0 : filtroValor;
      whereClause = 'WHERE Estado = ?';
      params.push(valorNormalizado);
    } else {
      whereClause = `WHERE ${columna} LIKE ?`;
      params.push(`%${filtroValor}%`);
    }
  }

  const [rows] = await dbPool.query(
    `SELECT * FROM proveedores ${whereClause} ORDER BY NombreProveedor LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countResult] = await dbPool.query(
    `SELECT COUNT(*) as total FROM proveedores ${whereClause}`,
    params
  );

  return {
    data: rows,
    totalItems: countResult[0].total,
    currentPage: Number(page),
    itemsPerPage: Number(limit)
  };
};

export const buscarProveedoresPaginated = async ({ page, limit, columna, valor }) => {
  return await getProveedoresPaginated({
    page,
    limit,
    filtroCampo: columna,
    filtroValor: valor
  });
};