import {
  getDetallePedidoByPedidoIdModel,
  createDetallePedidoModel,
  deleteDetallePedidoModel,
  updateDetallePedidoModel,
  deleteDetallesByPedidoIdModel
} from "../models/detallePedidoCliente.model.js";

export const getDetallesByPedido = async (req, res) => {
  // [1] Inicio y try
  try {
    // [2] Obtener ID del pedido de params
    const pedidoId = req.params.id;
    
    // [3] Consultar detalles en el modelo
    const detalles = await getDetallePedidoByPedidoIdModel(pedidoId);
    
    // [4] Validar si el resultado es un array
    if (!Array.isArray(detalles)) {
      // [5] Retornar array vacío si no es array (200)
      console.warn(`⚠️ [BACKEND] Detalles no es array, convirtiendo`);
      return res.status(200).json([]);
    }
    
    // [6] Retornar detalles (200)
    res.status(200).json(detalles);
  } catch (error) {
    // [7] Catch de error
    console.error(" [BACKEND] Error al obtener detalles:", error);
    // [8] Retornar error de servidor (500)
    res.status(500).json({ 
      error: "Error al obtener detalles",
      details: error.message 
    });
  }
};

export const createDetalle = async (req, res) => {
  // [1] Inicio y try
  try {
    // [2] Extraer campos del body
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

    // [3] Validar PedidoClienteId
    if (!PedidoClienteId) {
      // [4] Error 400: PedidoId obligatorio
      return res.status(400).json({ error: "PedidoClienteId es obligatorio" });
    }

    // [5] Validar Producto o Servicio
    if (!ProductoId && !ServicioId) {
      // [6] Error 400: Se requiere uno de los dos
      return res.status(400).json({ error: "Se requiere ProductoId o ServicioId" });
    }

    // [7] Validar Cantidad
    if (!Cantidad || Cantidad <= 0) {
      // [8] Error 400: Cantidad inválida
      return res.status(400).json({ error: "Cantidad debe ser mayor a 0" });
    }

    // [9] Validar Precio
    if (!Precio || Precio <= 0) {
      // [10] Error 400: Precio inválido
      return res.status(400).json({ error: "Precio debe ser mayor a 0" });
    }

    // [11] Crear registro en el modelo
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

    // [12] Retornar éxito (201)
    res.status(201).json(nuevoDetalle);
  } catch (error) {
    // [13] Catch de error
    console.error(" [BACKEND] Error al crear detalle:", error);
    // [14] Retornar 500
    res.status(500).json({ 
      error: "Error al crear detalle",
      details: error.message 
    });
  }
};

export const updateDetalle = async (req, res) => {
  // [1] Inicio y try
  try {
    // [2] Obtener ID y datos de actualización
    const { id } = req.params;
    const updates = req.body;

    // [3] Ejecutar actualización en el modelo
    const result = await updateDetallePedidoModel(id, updates);

    // [4] Validar si se encontró el detalle
    if (result.affectedRows === 0) {
      // [5] Error 404: No encontrado
      return res.status(404).json({ error: "Detalle no encontrado" });
    }

    // [6] Obtener detalle actualizado
    const [detalleActualizado] = await getDetallePedidoByPedidoIdModel(req.body.PedidoClienteId);
    
    // [7] Retornar éxito (200)
    res.status(200).json(detalleActualizado);
  } catch (error) {
    // [8] Catch de error
    console.error(" [BACKEND] Error al actualizar detalle:", error);
    // [9] Retornar 500
    res.status(500).json({ 
      error: "Error al actualizar detalle",
      details: error.message 
    });
  }
};

export const deleteDetalle = async (req, res) => {
  // [1] Inicio y try
  try {
    // [2] Ejecutar eliminación en el modelo
    const result = await deleteDetallePedidoModel(req.params.id);

    // [3] Validar si se encontró el detalle
    if (result.affectedRows === 0) {
      // [4] Error 404: No encontrado
      return res.status(404).json({ error: "Detalle no encontrado" });
    }

    // [5] Retornar éxito (204 No Content)
    res.status(204).send();
  } catch (error) {
    // [6] Catch de error
    console.error(" [BACKEND] Error al eliminar detalle:", error);
    // [7] Retornar 500
    res.status(500).json({ 
      error: "Error al eliminar detalle",
      details: error.message 
    });
  }
};

export const deleteDetallesByPedido = async (req, res) => {
  // [1] Inicio y try
  try {
    // [2] Obtener ID del pedido
    const { pedidoId } = req.params;
        
    // [3] Ejecutar eliminación masiva por ID de pedido
    const result = await deleteDetallesByPedidoIdModel(pedidoId);
        
    // [4] Retornar éxito con conteo de filas (200)
    res.status(200).json({ 
      message: "Detalles eliminados correctamente",
      affectedRows: result.affectedRows 
    });
  } catch (error) {
    // [5] Catch de error
    console.error(" [BACKEND] Error al eliminar detalles:", error);
    // [6] Retornar 500
    res.status(500).json({ 
      error: "Error al eliminar detalles",
      details: error.message 
    });
  }
};