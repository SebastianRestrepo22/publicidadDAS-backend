import { v4 as uuidv4 } from "uuid";
import { dbPool } from "../lib/db.js";

export const getDetallePedidoByPedidoIdModel = async (PedidoClienteId) => {
  try {
    if (!PedidoClienteId) {
      return [];
    }

    const query = `
      SELECT 
        d.DetallePedidoClienteId,
        d.PedidoClienteId,
        d.ProductoId,
        d.ServicioId,
        d.Cantidad,
        d.Descripcion,
        d.UrlImagen,
        d.Precio,
        d.ColorId,
        c.Nombre AS ColorNombre,
        p.Nombre AS ProductoNombre,
        s.Nombre AS ServicioNombre,
        (d.Cantidad * d.Precio) AS Subtotal
      FROM detallepedidosclientes d
      LEFT JOIN colores c ON d.ColorId = c.ColorId
      LEFT JOIN productos p ON d.ProductoId = p.ProductoId
      LEFT JOIN servicios s ON d.ServicioId = s.ServicioId
      WHERE d.PedidoClienteId = ?
    `;

    const [rows] = await dbPool.execute(query, [PedidoClienteId]);
    return rows;
    
  } catch (error) {
    console.error('❌ Error en getDetallePedidoByPedidoIdModel:', error);
    return [];
  }
};

// ========================================
// CREAR DETALLE DE PEDIDO (VERSIÓN SIMPLIFICADA)
// ========================================
export const createDetallePedidoModel = async ({
  PedidoClienteId,
  ProductoId,
  ServicioId,
  Cantidad,
  Descripcion,
  UrlImagen,
  Precio,
  ColorId
}) => {
  try {
    const DetallePedidoClienteId = uuidv4();
    
    // 🔴 IMPORTANTE: Tamaño y UrlImagenPersonalizada eliminados
    const query = `
      INSERT INTO detallepedidosclientes 
      (
        DetallePedidoClienteId, 
        PedidoClienteId, 
        ProductoId, 
        ServicioId, 
        Cantidad, 
        Descripcion, 
        UrlImagen, 
        Precio, 
        ColorId
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      DetallePedidoClienteId,
      PedidoClienteId,
      ProductoId || null,
      ServicioId || null,
      Cantidad,
      Descripcion || null,
      UrlImagen || null,
      Precio,
      ColorId || null
    ];
    
    const [result] = await dbPool.execute(query, values);
        
    // Obtener el detalle recién creado con nombres
    const [nuevoDetalle] = await dbPool.execute(
      `SELECT 
        d.DetallePedidoClienteId,
        d.PedidoClienteId,
        d.ProductoId,
        d.ServicioId,
        d.Cantidad,
        d.Descripcion,
        d.UrlImagen,
        d.Precio,
        d.ColorId,
        c.Nombre AS ColorNombre,
        p.Nombre AS ProductoNombre,
        s.Nombre AS ServicioNombre,
        (d.Cantidad * d.Precio) AS Subtotal
       FROM detallepedidosclientes d
       LEFT JOIN colores c ON d.ColorId = c.ColorId
       LEFT JOIN productos p ON d.ProductoId = p.ProductoId
       LEFT JOIN servicios s ON d.ServicioId = s.ServicioId
       WHERE d.DetallePedidoClienteId = ?`,
      [DetallePedidoClienteId]
    );
    
    return nuevoDetalle[0];
    
  } catch (error) {
    console.error("❌ Error en createDetallePedidoModel:", error);
    throw error;
  }
};

// ========================================
// ELIMINAR DETALLE DE PEDIDO POR ID
// ========================================
export const deleteDetallePedidoModel = async (id) => {
  try {
    const [result] = await dbPool.execute(
      "DELETE FROM detallepedidosclientes WHERE DetallePedidoClienteId = ?",
      [id]
    );
    return result;
  } catch (error) {
    console.error("❌ Error en deleteDetallePedidoModel:", error);
    throw error;
  }
};

// ========================================
// ELIMINAR TODOS LOS DETALLES DE UN PEDIDO
// ========================================
export const deleteDetallesByPedidoIdModel = async (pedidoId) => {
  try {
    
    const [result] = await dbPool.execute(
      "DELETE FROM detallepedidosclientes WHERE PedidoClienteId = ?",
      [pedidoId]
    );
    
    return result;
  } catch (error) {
    console.error("❌ [MODEL] Error en deleteDetallesByPedidoIdModel:", error);
    throw error;
  }
};

// ========================================
// ACTUALIZAR DETALLE DE PEDIDO
// ========================================
export const updateDetallePedidoModel = async (id, data) => {
  try {
    const allowedFields = [
      'ProductoId',
      'ServicioId',
      'Cantidad',
      'Descripcion',
      'UrlImagen',
      'Precio',
      'ColorId'
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
      UPDATE detallepedidosclientes
      SET ${fields.join(', ')}
      WHERE DetallePedidoClienteId = ?
    `;

    values.push(id);

    const [result] = await dbPool.execute(query, values);
    return result;
  } catch (error) {
    console.error("❌ Error en updateDetallePedidoModel:", error);
    throw error;
  }
};