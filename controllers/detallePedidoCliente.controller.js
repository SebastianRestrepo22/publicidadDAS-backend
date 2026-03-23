import {
  getDetallePedidoByPedidoIdModel,
  createDetallePedidoModel,
  deleteDetallePedidoModel,
  updateDetallePedidoModel,
  deleteDetallesByPedidoIdModel
} from "../models/detallePedidoCliente.model.js";

// ========================================
// OBTENER DETALLES POR ID DE PEDIDO
// ========================================
export const getDetallesByPedido = async (req, res) => {
  try {
    const pedidoId = req.params.id;
    
    const detalles = await getDetallePedidoByPedidoIdModel(pedidoId);
    
    // Asegurar que siempre sea un array
    if (!Array.isArray(detalles)) {
      console.warn(`⚠️ [BACKEND] Detalles no es array, convirtiendo`);
      return res.status(200).json([]);
    }
    
    res.status(200).json(detalles);
  } catch (error) {
    console.error("❌ [BACKEND] Error al obtener detalles:", error);
    res.status(500).json({ 
      error: "Error al obtener detalles",
      details: error.message 
    });
  }
};

// ========================================
// CREAR DETALLE
// ========================================
export const createDetalle = async (req, res) => {
  try {
    const { 
      PedidoClienteId, 
      ProductoId, 
      ServicioId, 
      Cantidad, 
      Descripcion, 
      UrlImagen, 
      Precio, 
      ColorId 
    } = req.body;

    // Validaciones
    if (!PedidoClienteId) {
      return res.status(400).json({ error: "PedidoClienteId es obligatorio" });
    }

    if (!ProductoId && !ServicioId) {
      return res.status(400).json({ error: "Se requiere ProductoId o ServicioId" });
    }

    if (!Cantidad || Cantidad <= 0) {
      return res.status(400).json({ error: "Cantidad debe ser mayor a 0" });
    }

    if (!Precio || Precio <= 0) {
      return res.status(400).json({ error: "Precio debe ser mayor a 0" });
    }

    const nuevoDetalle = await createDetallePedidoModel({
      PedidoClienteId,
      ProductoId,
      ServicioId,
      Cantidad: parseInt(Cantidad),
      Descripcion: Descripcion || null,
      UrlImagen: UrlImagen || null,
      Precio: parseFloat(Precio),
      ColorId: ColorId || null
    });

    res.status(201).json(nuevoDetalle);
  } catch (error) {
    console.error("❌ [BACKEND] Error al crear detalle:", error);
    res.status(500).json({ 
      error: "Error al crear detalle",
      details: error.message 
    });
  }
};

// ========================================
// ACTUALIZAR DETALLE
// ========================================
export const updateDetalle = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const result = await updateDetallePedidoModel(id, updates);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Detalle no encontrado" });
    }

    // Obtener el detalle actualizado
    const [detalleActualizado] = await getDetallePedidoByPedidoIdModel(req.body.PedidoClienteId);
    
    res.status(200).json(detalleActualizado);
  } catch (error) {
    console.error("❌ [BACKEND] Error al actualizar detalle:", error);
    res.status(500).json({ 
      error: "Error al actualizar detalle",
      details: error.message 
    });
  }
};

// ========================================
// ELIMINAR DETALLE
// ========================================
export const deleteDetalle = async (req, res) => {
  try {
    const result = await deleteDetallePedidoModel(req.params.id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Detalle no encontrado" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("❌ [BACKEND] Error al eliminar detalle:", error);
    res.status(500).json({ 
      error: "Error al eliminar detalle",
      details: error.message 
    });
  }
};

// ========================================
// ELIMINAR TODOS LOS DETALLES DE UN PEDIDO
// ========================================
export const deleteDetallesByPedido = async (req, res) => {
  try {
    const { pedidoId } = req.params;
        
    const result = await deleteDetallesByPedidoIdModel(pedidoId);
        
    res.status(200).json({ 
      message: "Detalles eliminados correctamente",
      affectedRows: result.affectedRows 
    });
  } catch (error) {
    console.error("❌ [BACKEND] Error al eliminar detalles:", error);
    res.status(500).json({ 
      error: "Error al eliminar detalles",
      details: error.message 
    });
  }
};