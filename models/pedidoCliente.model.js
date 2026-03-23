import { v4 as uuidv4 } from "uuid";
import { dbPool } from "../lib/db.js";

export const getClienteByIdModel = async (cedulaId) => {
  const [rows] = await dbPool.execute(
    `SELECT CedulaId, NombreCompleto, CorreoElectronico FROM usuarios WHERE CedulaId = ?`,
    [cedulaId]
  );
  return rows[0];
};

export const getAllPedidosClientesModel = async (clienteId = null) => {
  let query = `
    SELECT
      p.PedidoClienteId,
      p.ClienteId,
      COALESCE(u.NombreCompleto, p.ClienteNombre) AS NombreCliente,
      p.FechaRegistro,
      p.Total,
      p.Estado,
      p.MetodoPago,
      p.Voucher,
      p.NombreRecibe,
      p.TelefonoEntrega,
      p.DireccionEntrega,
      p.TipoCliente,
      p.ClienteNombre,
      p.ClienteTelefono,
      p.ClienteCorreo,
      p.Origen,  -- ← NUEVO CAMPO
      -- 🔥 Información de la venta si existe
      v.VentaId,
      v.Estado AS EstadoVenta,
      CASE WHEN v.VentaId IS NOT NULL THEN true ELSE false END AS EsVenta
    FROM pedidosclientes p
    LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId
    LEFT JOIN ventas v ON p.PedidoClienteId = v.PedidoClienteId
  `;

  const params = [];

  if (clienteId) {
    query += " WHERE p.ClienteId = ?";
    params.push(clienteId);
  }

  query += " ORDER BY p.FechaRegistro DESC";

  const [rows] = await dbPool.execute(query, params);
  return rows;
};

export const getPedidoClienteByIdModel = async (pedidoId) => {
  const [rows] = await dbPool.execute(
    `
    SELECT
      p.PedidoClienteId,
      p.ClienteId,
      COALESCE(u.NombreCompleto, p.ClienteNombre) AS NombreCliente,
      p.FechaRegistro,
      p.Total,
      p.Estado,
      p.MetodoPago,
      p.Voucher,
      p.NombreRecibe,
      p.TelefonoEntrega,
      p.DireccionEntrega,
      p.TipoCliente,
      p.ClienteNombre,
      p.ClienteTelefono,
      p.ClienteCorreo,
      p.Origen  -- ← NUEVO CAMPO
    FROM pedidosclientes p
    LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId
    WHERE p.PedidoClienteId = ?
    `,
    [pedidoId]
  );
  return rows[0];
};

export const createPedidoClienteModel = async ({
  ClienteId,
  FechaRegistro,
  Total,
  MetodoPago = "transferencia",
  Voucher = null,
  NombreRecibe = null,
  TelefonoEntrega = null,
  DireccionEntrega = null,
  Estado = "pendiente",
  TipoCliente = "registrado",
  ClienteNombre = null,
  ClienteTelefono = null,
  ClienteCorreo = null,
  Origen = "admin" // Nuevo campo
}) => {
  const PedidoClienteId = uuidv4();

  console.log('📝 [MODEL] Creando pedido con estado:', Estado);
  console.log('📝 [MODEL] Método de pago:', MetodoPago);
  console.log('📝 [MODEL] Origen:', Origen);

  await dbPool.execute(
    `
    INSERT INTO pedidosclientes 
    (
      PedidoClienteId, 
      ClienteId, 
      FechaRegistro, 
      Total, 
      Estado, 
      MetodoPago, 
      Voucher, 
      NombreRecibe, 
      TelefonoEntrega, 
      DireccionEntrega,
      TipoCliente,
      ClienteNombre,
      ClienteTelefono,
      ClienteCorreo,
      Origen
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      PedidoClienteId,
      ClienteId ?? null,
      FechaRegistro,
      Total,
      Estado,
      MetodoPago,
      Voucher ?? null,
      NombreRecibe ?? null,
      TelefonoEntrega ?? null,
      DireccionEntrega ?? null,
      TipoCliente,
      ClienteNombre ?? null,
      ClienteTelefono ?? null,
      ClienteCorreo ?? null,
      Origen // Nuevo campo
    ]
  );

  const [rows] = await dbPool.execute(
    `
    SELECT
      p.PedidoClienteId,
      p.ClienteId,
      COALESCE(u.NombreCompleto, p.ClienteNombre) AS NombreCliente,
      p.FechaRegistro,
      p.Total,
      p.Estado,
      p.MetodoPago,
      p.Voucher,
      p.NombreRecibe,
      p.TelefonoEntrega,
      p.DireccionEntrega,
      p.TipoCliente,
      p.ClienteNombre,
      p.ClienteTelefono,
      p.ClienteCorreo,
      p.Origen
    FROM pedidosclientes p
    LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId
    WHERE p.PedidoClienteId = ?
    `,
    [PedidoClienteId]
  );

  console.log('✅ [MODEL] Pedido guardado con estado:', rows[0]?.Estado);
  console.log('✅ [MODEL] Origen guardado:', rows[0]?.Origen);

  return rows[0];
};

export const updatePedidoClienteModel = async (id, data) => {
  const allowedFields = [
    'ClienteId',
    'FechaRegistro',
    'Total',
    'Estado',
    'MetodoPago',
    'Voucher',
    'NombreRecibe',
    'TelefonoEntrega',
    'DireccionEntrega',
  ];

  const fields = [];
  const values = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(data[field]);
    }
  }

  if (fields.length === 0) {
    return { affectedRows: 0 };
  }

  const query = `
    UPDATE pedidosclientes
    SET ${fields.join(', ')}
    WHERE PedidoClienteId = ?
  `;

  values.push(id);

  const [result] = await dbPool.execute(query, values);
  return result;
};

export const deletePedidoClienteModel = async (id) => {
  const [result] = await dbPool.execute(
    "DELETE FROM pedidosclientes WHERE PedidoClienteId = ?",
    [id]
  );
  return result;
};

export const getPedidosClientesPaginated = async ({ 
  page = 1, 
  limit = 10, 
  filtroCampo = null, 
  filtroValor = null,
  tipoPago = null 
}) => {
  try {
    const offset = (page - 1) * limit;
    let params = [];
    let whereClause = '';

    // Construir WHERE clause simple
    if (tipoPago) {
      whereClause = 'WHERE p.MetodoPago = ?';
      params.push(tipoPago);
    }

    // Consulta principal con array de parámetros bien formado
    const query = `
      SELECT
        p.PedidoClienteId,
        p.ClienteId,
        COALESCE(u.NombreCompleto, p.ClienteNombre) AS NombreCliente,
        p.FechaRegistro,
        p.Total,
        p.Estado,
        p.MetodoPago,
        p.Voucher,
        p.NombreRecibe,
        p.TelefonoEntrega,
        p.DireccionEntrega,
        p.TipoCliente,
        p.ClienteNombre,
        p.ClienteTelefono,
        p.ClienteCorreo,
        p.Origen
      FROM pedidosclientes p
      LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId
      ${whereClause}
      ORDER BY p.FechaRegistro DESC
      LIMIT ? OFFSET ?
    `;

    // Crear array de parámetros correctamente
    const queryParams = [...params, limit, offset];
    
    console.log('📝 [MODEL] Query:', query);
    console.log('📝 [MODEL] Params:', queryParams);

    const [rows] = await dbPool.execute(query, queryParams);

    // Consulta para total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM pedidosclientes p
      LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId
      ${whereClause}
    `;

    const [countResult] = await dbPool.execute(countQuery, params);

    return {
      data: rows,
      totalItems: countResult[0].total,
      currentPage: Number(page),
      itemsPerPage: Number(limit)
    };
  } catch (error) {
    console.error('❌ [MODEL] Error:', error);
    throw error;
  }
};

export const buscarPedidosClientesPaginated = async ({ 
  page, 
  limit, 
  columna, 
  valor,
  tipoPago 
}) => {
  try {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    let whereClause = '';
    let params = [];
    const whereConditions = [];

    if (columna && valor) {
      whereConditions.push(`${columna} LIKE ?`);
      params.push(`%${valor}%`);
    }

    if (tipoPago) {
      whereConditions.push('p.MetodoPago = ?');
      params.push(tipoPago);
    }

    if (whereConditions.length > 0) {
      whereClause = 'WHERE ' + whereConditions.join(' AND ');
    }

    // Query con literales para LIMIT y OFFSET
    const query = `
      SELECT
        p.PedidoClienteId,
        p.ClienteId,
        COALESCE(u.NombreCompleto, p.ClienteNombre) AS NombreCliente,
        p.FechaRegistro,
        p.Total,
        p.Estado,
        p.MetodoPago,
        p.Voucher,
        p.NombreRecibe,
        p.TelefonoEntrega,
        p.DireccionEntrega,
        p.TipoCliente,
        p.ClienteNombre,
        p.ClienteTelefono,
        p.ClienteCorreo,
        p.Origen
      FROM pedidosclientes p
      LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId
      ${whereClause}
      ORDER BY p.FechaRegistro DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const [rows] = await dbPool.query(query, params);

    // Query para contar
    const countQuery = `
      SELECT COUNT(*) as total
      FROM pedidosclientes p
      LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId
      ${whereClause}
    `;

    const [countResult] = await dbPool.execute(countQuery, params);

    return {
      data: rows,
      totalItems: countResult[0].total,
      currentPage: pageNum,
      itemsPerPage: limitNum
    };
  } catch (error) {
    console.error('❌ Error en buscarPedidosClientesPaginated:', error);
    throw error;
  }
};