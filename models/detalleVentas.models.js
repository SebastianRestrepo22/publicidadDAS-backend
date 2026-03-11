import { v4 as uuidv4 } from "uuid";
import { dbPool } from "../lib/db.js";

// Obtener detalles por venta
export const getDetalleVentaByVentaIdModel = async (ventaId) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT 
        dv.*,
        p.Nombre AS ProductoNombre,
        s.Nombre AS ServicioNombre,
        st.NombreTamano,
        c.Nombre AS ColorNombre,
        c.Hex AS ColorHex
      FROM detalleventas dv
      LEFT JOIN productos p ON dv.ProductoId = p.ProductoId
      LEFT JOIN servicios s ON dv.ServicioId = s.ServicioId
      LEFT JOIN servicio_tamanos st ON dv.ServicioTamanoId = st.ServicioTamanoId
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

// Crear detalle de venta desde pedido
export const createDetallesVentaFromPedidoModel = async (connection, VentaId, detallesPedido) => {
  try {
    const detallesCreados = [];
    
    for (const detalle of detallesPedido) {
      const DetalleVentaId = uuidv4();
      
      let tipoItem = null;
      let productoId = null;
      let servicioId = null;
      let servicioTamanoId = null;
      let nombreSnapshot = "";
      let descripcionPersonalizada = detalle.Descripcion || null;
      let urlImagenPersonalizada = detalle.UrlImagen || null;
      
      if (detalle.ProductoId) {
        tipoItem = 'producto';
        productoId = detalle.ProductoId;
        
        const [productoRows] = await connection.query(
          "SELECT Nombre FROM productos WHERE ProductoId = ?",
          [detalle.ProductoId]
        );
        nombreSnapshot = productoRows.length > 0 ? productoRows[0].Nombre : "Producto";
        
      } else if (detalle.ServicioId) {
        tipoItem = 'servicio';
        servicioId = detalle.ServicioId;
        
        const [servicioRows] = await connection.query(
          "SELECT Nombre FROM servicios WHERE ServicioId = ?",
          [detalle.ServicioId]
        );
        nombreSnapshot = servicioRows.length > 0 ? servicioRows[0].Nombre : "Servicio";
        
        if (detalle.Tamaño) {
          const [tamanoRows] = await connection.query(
            "SELECT ServicioTamanoId FROM servicio_tamanos WHERE ServicioId = ? AND NombreTamano = ?",
            [detalle.ServicioId, detalle.Tamaño]
          );
          if (tamanoRows.length > 0) {
            servicioTamanoId = tamanoRows[0].ServicioTamanoId;
          }
        }
      }
      
      const subtotal = detalle.Cantidad * detalle.Precio;
      
      await connection.query(
        `INSERT INTO detalleventas (
          DetalleVentaId, VentaId, TipoItem, ProductoId, ServicioId,
          ServicioTamanoId, NombreSnapshot, Cantidad, PrecioUnitario,
          Descuento, Subtotal, ColorId, DescripcionPersonalizada, UrlImagenPersonalizada
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          DetalleVentaId,
          VentaId,
          tipoItem,
          productoId,
          servicioId,
          servicioTamanoId,
          nombreSnapshot,
          detalle.Cantidad,
          detalle.Precio,
          detalle.Descuento || 0,
          subtotal,
          detalle.ColorId || null,
          descripcionPersonalizada,
          urlImagenPersonalizada
        ]
      );
      
      detallesCreados.push(DetalleVentaId);
    }
    
    return detallesCreados;
    
  } catch (error) {
    console.error("Error en createDetallesVentaFromPedidoModel:", error);
    throw error;
  }
};

// Crear detalle de venta manual
export const createDetalleVentaManualModel = async (connection, detalleData) => {
  try {
    const DetalleVentaId = uuidv4();
    const {
      VentaId,
      TipoItem,
      ProductoId,
      ServicioId,
      ServicioTamanoId,
      NombreSnapshot,
      Cantidad,
      PrecioUnitario,
      Descuento = 0,
      Subtotal,
      ColorId,
      DescripcionPersonalizada,
      UrlImagenPersonalizada
    } = detalleData;
    
    await connection.query(
      `INSERT INTO detalleventas (
        DetalleVentaId, VentaId, TipoItem, ProductoId, ServicioId,
        ServicioTamanoId, NombreSnapshot, Cantidad, PrecioUnitario,
        Descuento, Subtotal, ColorId, DescripcionPersonalizada, UrlImagenPersonalizada
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        DetalleVentaId,
        VentaId,
        TipoItem,
        ProductoId || null,
        ServicioId || null,
        ServicioTamanoId || null,
        NombreSnapshot,
        Cantidad,
        PrecioUnitario,
        Descuento,
        Subtotal,
        ColorId || null,
        DescripcionPersonalizada || null,
        UrlImagenPersonalizada || null
      ]
    );
    
    return DetalleVentaId;
    
  } catch (error) {
    console.error("Error en createDetalleVentaManualModel:", error);
    throw error;
  }
};

// Eliminar detalles de venta (solo usado al anular)
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