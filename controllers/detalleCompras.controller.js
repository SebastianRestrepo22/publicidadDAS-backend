import {
    getAllDetallesModel,
    getDetalleByIdModel,
    getDetalleByCompraIdModel,
    createDetalleModel,
    deleteDetalleModel,
    updateDetalleModel,
    actualizarStockProducto  
} from '../models/detalleCompras.model.js';

// Obtener todos los detalles
export const getAllDetalles = async (req, res) => {
  try {
    const detalles = await getAllDetallesModel();
    res.json(detalles);
  } catch (err) {
    console.error("Error al obtener detalles:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Obtener detalle por ID
export const getDetalleById = async (req, res) => {
  const id = req.params.id;

  try {
    const detalle = await getDetalleByIdModel(id);
    if (!detalle) return res.status(404).json({ message: "Detalle no encontrado" });

    res.json(detalle);
  } catch (err) {
    console.error("Error al obtener detalle por ID:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Obtener detalles por ID de compra 
export const getDetalleByCompraId = async (req, res) => {
  try {
    // Verificar si viene como query param o como param de ruta
    const CompraId = req.query.CompraId || req.params.CompraId;
    
    console.log("🔵 [getDetalleByCompraId] Buscando detalles para compra:", CompraId);
    
    if (!CompraId) {
      return res.status(400).json({ error: "CompraId es requerido" });
    }
    
    const detalles = await getDetalleByCompraIdModel(CompraId);
    console.log("🟢 [getDetalleByCompraId] Detalles obtenidos del modelo:", detalles.length);
    
    // Procesar cada detalle para asegurar que colores sea un array
    const detallesProcesados = detalles.map(detalle => {
      // Crear una copia del objeto
      const detalleProcesado = { ...detalle };
      
      // Procesar colores
      if (detalleProcesado.colores) {
        // Si es un string, intentar parsearlo
        if (typeof detalleProcesado.colores === 'string') {
          try {
            // Si el string es "[object Object]", es un error - devolver array vacío
            if (detalleProcesado.colores === '[object Object]') {
              console.error("🔴 [getDetalleByCompraId] Error: colores es [object Object] para detalle:", detalleProcesado.DetalleCompraId);
              detalleProcesado.colores = [];
            } else {
              // Intentar parsear el JSON
              const parsed = JSON.parse(detalleProcesado.colores);
              detalleProcesado.colores = Array.isArray(parsed) ? parsed : [];
            }
          } catch (e) {
            console.error("🔴 [getDetalleByCompraId] Error parseando colores:", e.message);
            detalleProcesado.colores = [];
          }
        } 
        // Si ya es un array, dejarlo como está
        else if (Array.isArray(detalleProcesado.colores)) {
          // Ya es un array, verificar que sea válido
          console.log("🟢 [getDetalleByCompraId] colores ya es array, longitud:", detalleProcesado.colores.length);
        } 
        // Si no es ni string ni array, establecer como array vacío
        else {
          console.log("🟡 [getDetalleByCompraId] colores no es string ni array, tipo:", typeof detalleProcesado.colores);
          detalleProcesado.colores = [];
        }
      } else {
        detalleProcesado.colores = [];
      }
      
      return detalleProcesado;
    });
    
    console.log("🟢 [getDetalleByCompraId] Enviando respuesta con", detallesProcesados.length, "detalles");
    res.json(detallesProcesados);
    
  } catch (err) {
    console.error("🔴 [getDetalleByCompraId] ERROR:", err);
    console.error("🔴 Stack:", err.stack);
    res.status(500).json({ 
      error: err.message,
      message: "Error interno del servidor al obtener detalles"
    });
  }
};

// Crear nuevo detalle - SIN ACTUALIZAR STOCK MANUALMENTE (el trigger se encarga)
export const createDetalle = async (req, res) => {
  const { CompraId, ProductoId, Cantidad, Descripcion, PrecioUnitario, colores } = req.body;

  if (!CompraId || !Cantidad) {
    return res.status(400).json({
      error: "CompraId y Cantidad son obligatorios"
    });
  }

  try {
    // 🔥 CREAR EL DETALLE SIN ACTUALIZAR STOCK MANUALMENTE
    // El trigger trg_compra_stock_colores se encargará de actualizar el stock automáticamente
    const result = await createDetalleModel({
      CompraId,
      ProductoId: ProductoId || null,
      Cantidad,
      Descripcion: Descripcion || null,
      PrecioUnitario: PrecioUnitario || 0,
      colores: colores || [] // Enviar array de colores
    });

    // 🔥 ELIMINAR LA ACTUALIZACIÓN MANUAL DE STOCK
    // NO se debe llamar a actualizarStockProducto aquí porque el trigger ya lo hace
    // Si se mantiene esta llamada, el stock se duplicará
    
    console.log(`✅ Detalle creado. El trigger se encargará del stock automáticamente`);

    // Obtener el detalle completo para devolverlo
    const detalleCompleto = await getDetalleByIdModel(result.DetalleCompraId);

    res.status(201).json(detalleCompleto);
  } catch (err) {
    console.error("Error al crear el detalle:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Actualizar detalle - CON ACTUALIZACIÓN DE STOCK MANUAL
export const updateDetalle = async (req, res) => {
  const id = req.params.id;
  const { ProductoId, Cantidad, Descripcion, PrecioUnitario, colores } = req.body;

  if (!id || id.length !== 36) {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    // 1. Obtener el detalle actual para saber el stock anterior
    const detalleActual = await getDetalleByIdModel(id);
    if (!detalleActual) {
      return res.status(404).json({ message: "Detalle no encontrado" });
    }

    // 2. REVERTIR el stock anterior (restar lo que se había sumado)
    if (detalleActual.colores && detalleActual.colores.length > 0) {
      // Revertir stock por color
      for (const color of detalleActual.colores) {
        await actualizarStockProducto(
          detalleActual.ProductoId,
          color.ColorId,
          -color.Stock  // Negativo para revertir
        );
      }
    } else {
      // Revertir stock general
      await actualizarStockProducto(
        detalleActual.ProductoId,
        null,
        -detalleActual.Cantidad  // Negativo para revertir
      );
    }

    // 3. Actualizar el detalle
    const result = await updateDetalleModel(id, {
      ProductoId: ProductoId || null,
      Cantidad,
      Descripcion: Descripcion || null,
      PrecioUnitario: PrecioUnitario || 0,
      colores: colores || []
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Detalle no encontrado" });
    }

    // 4. APLICAR el nuevo stock
    if (colores && colores.length > 0) {
      for (const color of colores) {
        await actualizarStockProducto(
          ProductoId,
          color.ColorId,
          color.Stock
        );
      }
    } else {
      await actualizarStockProducto(ProductoId, null, Cantidad);
    }

    res.json({ message: "Detalle actualizado correctamente" });
  } catch (err) {
    console.error("Error al actualizar detalle:", err);
    res.status(500).json({ error: err.message });
  }
};

// Eliminar detalle - REVERTIR STOCK MANUALMENTE
export const deleteDetalle = async (req, res) => {
  const id = req.params.id;

  try {
    // 1. Obtener el detalle para saber qué stock revertir
    const detalle = await getDetalleByIdModel(id);
    if (!detalle) {
      return res.status(404).json({ message: "Detalle no encontrado" });
    }

    // 2. REVERTIR el stock (restar lo que se había sumado)
    if (detalle.colores && detalle.colores.length > 0) {
      for (const color of detalle.colores) {
        await actualizarStockProducto(
          detalle.ProductoId,
          color.ColorId,
          -color.Stock
        );
      }
    } else {
      await actualizarStockProducto(
        detalle.ProductoId,
        null,
        -detalle.Cantidad
      );
    }

    // 3. Eliminar el detalle
    const result = await deleteDetalleModel(id);

    res.json({ message: "Detalle eliminado correctamente y stock revertido" });
  } catch (err) {
    console.error("Error al eliminar detalle:", err.message);
    res.status(500).json({ error: err.message });
  }
};