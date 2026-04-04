import { v4 as uuidv4 } from "uuid";
import { dbPool } from "../lib/db.js";

export const getDetalleVentaByVentaIdModel = async (ventaId) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT 
        dv.*,
        p.Nombre AS ProductoNombre,
        s.Nombre AS ServicioNombre,
        c.Nombre AS ColorNombre,
        c.Hex AS ColorHex
      FROM detalleventas dv
      LEFT JOIN productos p ON dv.ProductoId = p.ProductoId
      LEFT JOIN servicios s ON dv.ServicioId = s.ServicioId
      LEFT JOIN colores c ON dv.ColorId = c.ColorId
      WHERE dv.VentaId = ?`,
      [ventaId]
    );
    return rows;
  } catch (error) {
    console.error("Error en getDetalleVentaByVentaIdModel:", error);
    throw error;
  }
};

export const createDetallesVentaFromPedidoModel = async (connection, VentaId, detallesPedido) => {
  try {

    for (const detalle of detallesPedido) {
      const DetalleVentaId = uuidv4();
      
      // Determinar el tipo de item y nombre snapshot
      let tipoItem = detalle.ProductoId ? 'producto' : 'servicio';
      let nombreSnapshot = '';

      // Obtener nombres si es necesario
      if (detalle.ProductoId) {
        const [producto] = await connection.query(
          "SELECT Nombre FROM productos WHERE ProductoId = ?",
          [detalle.ProductoId]
        );
        nombreSnapshot = producto[0]?.Nombre || 'Producto';
      } else if (detalle.ServicioId) {
        const [servicio] = await connection.query(
          "SELECT Nombre FROM servicios WHERE ServicioId = ?",
          [detalle.ServicioId]
        );
        nombreSnapshot = servicio[0]?.Nombre || 'Servicio';
      }

      // Calcular subtotal
      const subtotalDetalle = (detalle.Cantidad || 0) * (detalle.Precio || 0);

      await connection.query(
        `INSERT INTO detalleventas (
          DetalleVentaId, VentaId, TipoItem, ProductoId, ServicioId,
          NombreSnapshot, Cantidad, PrecioUnitario, Descuento, Subtotal, ColorId, DescripcionPersonalizada
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          DetalleVentaId,
          VentaId,
          tipoItem,
          detalle.ProductoId || null,
          detalle.ServicioId || null,
          nombreSnapshot,
          detalle.Cantidad || 1,
          detalle.Precio || 0,
          0, // Descuento por defecto 0
          subtotalDetalle,
          detalle.ColorId || null,
          detalle.Descripcion || null
        ]
      );
    }
    
    return true;
  } catch (error) {
    console.error("Error en createDetallesVentaFromPedidoModel:", error);
    throw error;
  }
};

export const createDetalleVentaManualModel = async (connection, detalleData) => {
  try {
    const DetalleVentaId = uuidv4();
    const {
      VentaId,
      TipoItem,
      ProductoId,
      ServicioId,
      NombreSnapshot,
      Cantidad,
      PrecioUnitario,
      Descuento = 0,
      Subtotal,
      ColorId,
      DescripcionPersonalizada
    } = detalleData;
    
    // ¡CORREGIDO! Ahora hay 12 parámetros para 12 columnas
    await connection.query(
      `INSERT INTO detalleventas (
        DetalleVentaId, VentaId, TipoItem, ProductoId, ServicioId,
        NombreSnapshot, Cantidad, PrecioUnitario,
        Descuento, Subtotal, ColorId, DescripcionPersonalizada
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        DetalleVentaId,
        VentaId,
        TipoItem,
        ProductoId || null,
        ServicioId || null,
        NombreSnapshot,
        Cantidad,
        PrecioUnitario,
        Descuento,
        Subtotal,
        ColorId || null,
        DescripcionPersonalizada || null  // ← Este es el parámetro que faltaba
      ]
    );
    
    return DetalleVentaId;
    
  } catch (error) {
    console.error("Error en createDetalleVentaManualModel:", error);
    throw error;
  }
};

export const deleteDetallesByVentaIdModel = async (connection, ventaId) => {
  try {
    const [result] = await connection.query(
      "DELETE FROM detalleventas WHERE VentaId = ?",
      [ventaId]
    );
    return result;
  } catch (error) {
    console.error("Error en deleteDetallesByVentaIdModel:", error);
    throw error;
  }
};