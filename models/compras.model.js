import { v4 as uuidv4 } from 'uuid';
import { dbPool } from '../lib/db.js';

const sanitize = (v) => (v === undefined ? null : v);

// Obtener todas las compras (sin paginación)
export const getAllCompras = async () => {
  const [rows] = await dbPool.execute('SELECT * FROM Compras ORDER BY FechaRegistro DESC'); 
  return rows;
};

// Obtener compra por ID
export const getCompraById = async (id) => {
  const [rows] = await dbPool.execute(
    'SELECT * FROM Compras WHERE CompraId = ?', 
    [id]);
  return rows[0];
};

// Crear compra - SIEMPRE APROBADO
export const createCompra = async ({ ProveedorId, Total, FechaRegistro }) => {
  const CompraId = uuidv4();

  await dbPool.execute(
    `INSERT INTO Compras 
    (CompraId, ProveedorId, Total, FechaRegistro, Estado) 
    VALUES (?, ?, ?, ?, ?)`,
    [CompraId, sanitize(ProveedorId), sanitize(Total), sanitize(FechaRegistro), 'aprobado']
  );
  return { CompraId, ProveedorId, Total, FechaRegistro, Estado: 'aprobado' };
};

// Eliminar compra
export const deleteCompra = async (id) => {
  const [result] = await dbPool.execute(
    'DELETE FROM Compras WHERE CompraId = ?', 
    [id]);
  return result;
};

// Actualizar compra completa
export const updateCompra = async (id, data) => {
  const { ProveedorId, Total, FechaRegistro } = data;

  const [result] = await dbPool.execute(
    `UPDATE Compras
    SET ProveedorId = ?, Total = ?, FechaRegistro = ?
    WHERE CompraId = ?`,
    [
        sanitize(ProveedorId), 
        sanitize(Total), 
        sanitize(FechaRegistro), 
        id
    ]
  );

  return result;
};

// Obtener detalles de una compra
export const getDetallesByCompraId = async (compraId) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT * FROM detalle_compras WHERE CompraId = ?`,
      [compraId]
    );
    return rows;
  } catch (error) {
    console.error('Error al obtener detalles:', error);
    throw error;
  }
};

// Actualizar stock de un producto
export const actualizarStockProducto = async (productoId, cantidad) => {
  const [producto] = await dbPool.execute(
    'SELECT Stock FROM productos WHERE ProductoId = ?',
    [productoId]
  );

  if (producto.length === 0) {
    throw new Error(`Producto ${productoId} no encontrado`);
  }

  const stockActual = producto[0].Stock || 0;
  const nuevoStock = stockActual + cantidad;

  await dbPool.execute(
    'UPDATE productos SET Stock = ? WHERE ProductoId = ?',
    [nuevoStock, productoId]
  );

  return { productoId, stockAnterior: stockActual, stockNuevo: nuevoStock };
};

// Obtener compras con paginación y filtros
export const getComprasPaginated = async ({ 
  page = 1, 
  limit = 10, 
  filtroCampo = null, 
  filtroValor = null,
  sortBy = 'FechaRegistro',
  sortOrder = 'DESC'
}) => {
  const offset = (page - 1) * limit;
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const offsetNum = Math.max(0, parseInt(offset, 10) || 0);
  
  let whereClause = '';
  let params = [];
  let countParams = [];

  if (filtroCampo && filtroValor && filtroValor.trim() !== '') {
    const campoMap = {
      id: 'CompraId',
      proveedor: 'ProveedorId',
      fecha: 'FechaRegistro',
      total: 'Total'
    };

    const columna = campoMap[filtroCampo] || filtroCampo;
    const valorLimpio = filtroValor.trim();

    if (columna === 'CompraId' || columna === 'ProveedorId') {
      whereClause = `WHERE ${columna} LIKE ?`;
      params.push(`%${valorLimpio}%`);
      countParams.push(valorLimpio);
    } else if (columna === 'FechaRegistro') {
      whereClause = `WHERE DATE(${columna}) = ?`;
      params.push(valorLimpio);
      countParams.push(valorLimpio);
    } else if (columna === 'Total') {
      const valorNum = parseFloat(valorLimpio);
      if (!isNaN(valorNum)) {
        whereClause = `WHERE ${columna} = ?`;
        params.push(valorNum);
        countParams.push(valorNum);
      }
    } else {
      whereClause = `WHERE ${columna} LIKE ?`;
      params.push(`%${valorLimpio}%`);
      countParams.push(valorLimpio);
    }
  }

  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const columnasPermitidas = ['CompraId', 'ProveedorId', 'FechaRegistro', 'Total'];
  const sortColumn = columnasPermitidas.includes(sortBy) ? sortBy : 'FechaRegistro';

  try {
    let query = `SELECT * FROM Compras ${whereClause} ORDER BY ${sortColumn} ${order} LIMIT ? OFFSET ?`;
    let queryParams = [...params, limitNum, offsetNum];
    
    const [rows] = await dbPool.query(query, queryParams);

    let countQuery = `SELECT COUNT(*) as total FROM Compras ${whereClause}`;
    const [countResult] = countParams.length > 0 
      ? await dbPool.query(countQuery, countParams)
      : await dbPool.query(countQuery);

    return {
       rows,
      totalItems: countResult[0]?.total || 0,
      currentPage: page,
      itemsPerPage: limitNum
    };
  } catch (error) {
    console.error("❌ Error detallado en getComprasPaginated:", error);
    throw error;
  }
};

// Buscar compras con paginación
export const buscarComprasPaginated = async ({ page, limit, columna, valor }) => {
  return await getComprasPaginated({ 
    page, 
    limit, 
    filtroCampo: columna, 
    filtroValor: valor 
  });
};