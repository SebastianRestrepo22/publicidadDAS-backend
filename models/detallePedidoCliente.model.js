import { v4 as uuidv4 } from "uuid";
import { dbPool } from "../lib/db.js";

// ========================================
// OBTENER DETALLES POR ID DE PEDIDO
// ========================================
export const getDetallePedidoByPedidoIdModel = async (PedidoClienteId) => {
  try {
    console.log(`🔍 [MODEL] Buscando detalles con colores para pedido: ${PedidoClienteId}`);
    
    const [rows] = await dbPool.execute(
      `SELECT 
        d.DetallePedidoClienteId,
        d.PedidoClienteId,
        d.ProductoId,
        d.ServicioId,
        d.Cantidad,
        d.Tamaño,
        d.Descripcion,
        d.UrlImagen,
        d.UrlImagenPersonalizada,
        d.Precio,
        d.ColorId,
        c.Nombre AS ColorNombre
       FROM detallePedidosClientes d
       LEFT JOIN colores c ON d.ColorId = c.ColorId
       WHERE d.PedidoClienteId = ?`,
      [PedidoClienteId]
    );
    
    // Calcula Subtotal en JS (no en DB)
    const detallesConSubtotal = rows.map(row => ({
      ...row,
      Subtotal: (row.Cantidad || 0) * (row.Precio || 0)
    }));
    
    console.log(`✅ [MODEL] Detalles con colores cargados: ${detallesConSubtotal.length}`);
    return detallesConSubtotal;
  } catch (error) {
    console.error("❌ [MODEL] Error en getDetallePedidoByPedidoIdModel:", error);
    throw error;
  }
};

// ========================================
// CREAR DETALLE DE PEDIDO
// ========================================
export const createDetallePedidoModel = async ({
  PedidoClienteId,
  ProductoId,
  ServicioId,
  Cantidad,
  Tamaño,
  Descripcion,
  UrlImagen,
  UrlImagenPersonalizada,
  Precio,
  ColorId
}) => {
  try {
    const DetallePedidoClienteId = uuidv4();
    
    const query = `
      INSERT INTO detallePedidosClientes 
      (
        DetallePedidoClienteId, 
        PedidoClienteId, 
        ProductoId, 
        ServicioId, 
        Cantidad, 
        Tamaño, 
        Descripcion, 
        UrlImagen, 
        UrlImagenPersonalizada,
        Precio, 
        ColorId
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      DetallePedidoClienteId,
      PedidoClienteId,
      ProductoId || null,
      ServicioId || null,
      Cantidad,
      Tamaño,
      Descripcion,
      UrlImagen,
      UrlImagenPersonalizada,
      Precio,
      ColorId || null
    ];
    
    console.log("📝 [MODEL] Insertando detalle:", {
      DetallePedidoClienteId,
      ProductoId,
      ColorId,
      UrlImagenPersonalizada: UrlImagenPersonalizada ? "✓ tiene imagen" : "sin imagen",
      valores: values
    });
    
    const [result] = await dbPool.execute(query, values);
    
    console.log("✅ [MODEL] Detalle creado con ID:", DetallePedidoClienteId);
    return { DetallePedidoClienteId: DetallePedidoClienteId };
    
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
      "DELETE FROM detallePedidosClientes WHERE DetallePedidoClienteId = ?",
      [id]
    );
    return result;
  } catch (error) {
    console.error("❌ Error en deleteDetallePedidoModel:", error);
    throw error;
  }
};

// ========================================
// ✅ NUEVA FUNCIÓN: ELIMINAR TODOS LOS DETALLES DE UN PEDIDO
// ========================================
export const deleteDetallesByPedidoIdModel = async (pedidoId) => {
  try {
    console.log(`🗑️ [MODEL] Eliminando todos los detalles del pedido: ${pedidoId}`);
    
    const [result] = await dbPool.execute(
      "DELETE FROM detallePedidosClientes WHERE PedidoClienteId = ?",
      [pedidoId]
    );
    
    console.log(`✅ [MODEL] ${result.affectedRows} detalles eliminados del pedido ${pedidoId}`);
    return result;
  } catch (error) {
    console.error("❌ [MODEL] Error en deleteDetallesByPedidoIdModel:", error);
    throw error;
  }
};