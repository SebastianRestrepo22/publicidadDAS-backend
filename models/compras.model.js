import { v4 as uuidv4 } from 'uuid';
import { dbPool } from '../lib/db.js';

const sanitize = (v) => (v === undefined ? null : v);

// Obtener todas las compras
export const getAllCompras = async () => {
  const [rows] = await dbPool.execute('SELECT * FROM Compras'); 
  return rows;
};

// Obtener compra por ID
export const getCompraById = async (id) => {
  const [rows] = await dbPool.execute(
    'SELECT * FROM Compras WHERE CompraId = ?', 
    [id]);
  return rows[0];
};

// Crear compra
export const createCompra = async ({ ProveedorId, Total, FechaRegistro, Estado }) => {
  const CompraId = uuidv4();

  await dbPool.execute(
    `INSERT INTO Compras 
    (CompraId, ProveedorId, Total, FechaRegistro, Estado) 
    VALUES (?, ?, ?, ?, ?)`,
    [CompraId, sanitize(ProveedorId), sanitize(Total), sanitize(FechaRegistro), Estado || 'pendiente']
  );
  return { CompraId, ProveedorId, Total, FechaRegistro, Estado };
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
  const { ProveedorId, Total, FechaRegistro, Estado, MotivoCancelacion } = data;

  const [result] = await dbPool.execute(
    `UPDATE Compras
    SET ProveedorId = ?, Total = ?, FechaRegistro = ?, Estado = ?, MotivoCancelacion = ?
    WHERE CompraId = ?`,
    [
        sanitize(ProveedorId), 
        sanitize(Total), 
        sanitize(FechaRegistro), 
        Estado,
        sanitize(MotivoCancelacion),
        id
    ]
  );

  return result;
};

// Actualizar solo el estado de la compra
export const updateCompraEstado = async (id, estado, motivoCancelacion = null) => {
  const [result] = await dbPool.execute(
    `UPDATE Compras
    SET Estado = ?, MotivoCancelacion = ?
    WHERE CompraId = ?`,
    [estado, sanitize(motivoCancelacion), id]
  );

  return result;
};

// Obtener detalles de una compra
export const getDetallesByCompraId = async (compraId) => {
  const [rows] = await dbPool.execute(
    'SELECT * FROM DetalleCompras WHERE CompraId = ?',
    [compraId]
  );
  return rows;
};

// Actualizar stock de un producto
export const actualizarStockProducto = async (productoId, cantidad) => {
  // Verificar si el producto existe
  const [producto] = await dbPool.execute(
    'SELECT Stock FROM Productos WHERE ProductoId = ?',
    [productoId]
  );

  if (producto.length === 0) {
    throw new Error(`Producto ${productoId} no encontrado`);
  }

  // Actualizar stock (sumar porque es una compra)
  const stockActual = producto[0].Stock || 0;
  const nuevoStock = stockActual + cantidad;

  await dbPool.execute(
    'UPDATE Productos SET Stock = ? WHERE ProductoId = ?',
    [nuevoStock, productoId]
  );

  return { productoId, stockAnterior: stockActual, stockNuevo: nuevoStock };
};

// Obtener compras pendientes con más de 1 hora
export const getComprasPendientesExpiradas = async () => {
  const [rows] = await dbPool.execute(`
    SELECT * FROM Compras 
    WHERE Estado = 'pendiente' 
    AND FechaRegistro <= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    AND (MotivoCancelacion IS NULL OR MotivoCancelacion = '')
  `);
  return rows;
};

// Anular compra automáticamente
export const anularCompraAutomatica = async (id, motivo) => {
  const [result] = await dbPool.execute(
    `UPDATE Compras
     SET Estado = 'anulada', 
         MotivoCancelacion = ?
     WHERE CompraId = ? AND Estado = 'pendiente'`,
    [motivo, id]
  );
  return result;
};

// Verificar si una compra puede anularse automáticamente
export const puedeAnularseAutomaticamente = async (id) => {
  const [rows] = await dbPool.execute(`
    SELECT * FROM Compras 
    WHERE CompraId = ? 
    AND Estado = 'pendiente' 
    AND FechaRegistro <= DATE_SUB(NOW(), INTERVAL 1 HOUR)
  `, [id]);
  return rows.length > 0;
};