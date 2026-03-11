import {
  getDetallePedidoByPedidoIdModel,
  createDetallePedidoModel,  // ← Ya existe en tu model
  deleteDetallePedidoModel
} from "../models/detallePedidoCliente.model.js";

export const getDetallesByPedido = async (req, res) => {
  try {
    const pedidoId = req.params.id;
    console.log(`🔍 [BACKEND] Buscando detalles para pedido: ${pedidoId}`);
    
    const detalles = await getDetallePedidoByPedidoIdModel(pedidoId);
    
    console.log(`✅ [BACKEND] Detalles encontrados:`, {
      cantidad: detalles.length,
      detalles: detalles.map(d => ({
        id: d.DetallePedidoClienteId,
        producto: d.ProductoId,
        color: d.ColorId,
        cantidad: d.Cantidad
      }))
    });
    
    // 🔴 Asegurar que siempre sea un array
    if (!Array.isArray(detalles)) {
      console.warn(`⚠️ [BACKEND] Detalles no es array, convirtiendo:`, detalles);
      res.status(200).json([]);
      return;
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
// ← NUEVO CONTROLADOR
export const createDetalle = async (req, res) => {
  try {
    const { 
      PedidoClienteId, 
      ProductoId, 
      ServicioId, 
      Cantidad, 
      Tamaño, 
      Descripcion, 
      UrlImagen, 
      Precio, 
      ColorId 
    } = req.body;

    console.log("🎨 [BACKEND] createDetalle recibido:", {
      PedidoClienteId,
      ProductoId,
      ColorId,  // ✅ Verificar si llega aquí
      body: req.body
    });

    if (!PedidoClienteId) {
      return res.status(400).json({ error: "PedidoClienteId es obligatorio" });
    }

    if (!ProductoId && !ServicioId) {
      return res.status(400).json({ error: "Se requiere ProductoId o ServicioId" });
    }

    const nuevoDetalle = await createDetallePedidoModel({
      PedidoClienteId,
      ProductoId,
      ServicioId,
      Cantidad,
      Tamaño: Tamaño || null,
      Descripcion: Descripcion || "",
      UrlImagen: UrlImagen || null,
      Precio: Precio,       
      ColorId: ColorId || null  // ✅ Pasar el ColorId
    });

    console.log("✅ [BACKEND] Detalle creado:", nuevoDetalle);

    res.status(201).json(nuevoDetalle);
  } catch (error) {
    console.error("❌ [BACKEND] Error al crear detalle:", error);
    res.status(500).json({ error: "Error al crear detalle" });
  }
};

export const deleteDetalle = async (req, res) => {
  try {
    const result = await deleteDetallePedidoModel(req.params.id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Detalle no encontrado" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar detalle:", error);
    res.status(500).json({ error: "Error al eliminar detalle" });
  }
};
