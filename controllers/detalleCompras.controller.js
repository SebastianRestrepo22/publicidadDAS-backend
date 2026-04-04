import {
    getAllDetallesModel,
    getDetalleByIdModel,
    getDetalleByCompraIdModel,
    createDetalleModel,
    deleteDetalleModel,
    updateDetalleModel,
    actualizarStockProducto  
} from '../models/detalleCompras.model.js';



export const getAllDetalles = async (req, res) => {
    // [1] Inicio y try
    try {
        // [2] Consultar todos los detalles en el modelo
        const detalles = await getAllDetallesModel();
        
        // Procesar cada detalle para parsear colores
        const detallesProcesados = detalles.map(procesarColores);
        
        // [3] Retornar detalles (200)
        res.json(detallesProcesados);
    } catch (err) {
        // [4] Catch de error
        console.error("Error al obtener detalles:", err.message);
        // [5] Retornar error de servidor (500)
        res.status(500).json({ error: err.message });
    }
};

export const getDetalleById = async (req, res) => {
    // [1] Obtener ID de params
    const id = req.params.id;

    // [2] Inicio try
    try {
        // [3] Consultar detalle por ID
        const detalle = await getDetalleByIdModel(id);
        // [4] Validar si existe el detalle
        if (!detalle) {
            // [5] Error 404: No encontrado
            return res.status(404).json({ message: "Detalle no encontrado" });
        }

        // Procesar colores
        const detalleProcesado = procesarColores(detalle);
        
        // [6] Retornar detalle (200)
        res.json(detalleProcesado);
    } catch (err) {
        // [7] Catch de error
        console.error("Error al obtener detalle por ID:", err.message);
        // [8] Retornar error de servidor (500)
        res.status(500).json({ error: err.message });
    }
};

export const getDetalleByCompraId = async (req, res) => {
    // [1] Inicio try
    try {
        // [2] Obtener CompraId de query o params
        const CompraId = req.query.CompraId || req.params.CompraId;
        
        // [3] Validar CompraId
        if (!CompraId) {
            // [4] Error 400: Requerido
            return res.status(400).json({ error: "CompraId es requerido" });
        }
        
        // [5] Consultar detalles por CompraId
        const detalles = await getDetalleByCompraIdModel(CompraId);
        
        // [6] Procesar colores para cada detalle
        const detallesProcesados = detalles.map(procesarColores);
        
        // [7] Retornar detalles procesados (200)
        res.json(detallesProcesados);
        
    } catch (err) {
        // [8] Catch de error
        console.error(" [getDetalleByCompraId] ERROR:", err);
        // [9] Retornar error de servidor (500)
        res.status(500).json({ 
            error: err.message,
            message: "Error interno del servidor al obtener detalles"
        });
    }
};

export const createDetalle = async (req, res) => {
    // [1] Extraer campos del body
    const { CompraId, ProductoId, Cantidad, Descripcion, PrecioUnitario, colores } = req.body;

    // [2] Validar campos obligatorios
    if (!CompraId || !Cantidad) {
        // [3] Error 400
        return res.status(400).json({
            error: "CompraId y Cantidad son obligatorios"
        });
    }

    // [4] Inicio try
    try {
        // [5] Crear detalle en el modelo
        const result = await createDetalleModel({
            CompraId,
            ProductoId: ProductoId || null,
            Cantidad,
            Descripcion: Descripcion || null,
            PrecioUnitario: PrecioUnitario || 0,
            colores: colores || []
        });

        console.log("🔄 Actualizando stock manualmente...");
        
        // [6] Validar si hay detalles por color
        if (colores && colores.length > 0) {
            // [7] Bucle para actualizar stock por color
            for (const color of colores) {
                const stockColor = Number(color.Stock) || 0;
                // [8] Actualizar si stock es positivo
                if (stockColor > 0) {
                    await actualizarStockProducto(
                        ProductoId,
                        color.ColorId,
                        stockColor
                    );
                }
            }
        } else {
            // [9] Actualización de stock general
            await actualizarStockProducto(ProductoId, null, Cantidad);
        }

        // [10] Obtener detalle completo recién creado
        const detalleCompleto = await getDetalleByIdModel(result.DetalleCompraId);
        
        // Procesar colores antes de retornar
        const detalleProcesado = procesarColores(detalleCompleto);
        
        // [11] Retornar éxito (201)
        res.status(201).json(detalleProcesado);
        
    } catch (err) {
        // [12] Catch de error
        console.error(" Error al crear el detalle:", err.message);
        // [13] Retornar 500
        res.status(500).json({ error: err.message });
    }
};

export const updateDetalle = async (req, res) => {
    // [1] Obtener ID y campos del body
    const id = req.params.id;
    const { ProductoId, Cantidad, Descripcion, PrecioUnitario, colores } = req.body;

    // [2] Validar formato de ID
    if (!id || id.length !== 36) {
        // [3] Error 400
        return res.status(400).json({ error: "ID inválido" });
    }

    // [4] Inicio try
    try {
        // [5] Obtener detalle actual para revertir stock
        const detalleActual = await getDetalleByIdModel(id);
        // [6] Validar existencia
        if (!detalleActual) {
            // [7] Error 404
            return res.status(404).json({ message: "Detalle no encontrado" });
        }

        // [8] Revertir stock (restar entrada anterior)
        if (detalleActual.colores && detalleActual.colores.length > 0) {
            for (const color of detalleActual.colores) {
                await actualizarStockProducto(
                    detalleActual.ProductoId,
                    color.ColorId,
                    -color.Stock  
                );
            }
        } else {
            await actualizarStockProducto(
                detalleActual.ProductoId,
                null,
                -detalleActual.Cantidad  
            );
        }

        // [9] Actualizar detalle en el modelo
        const result = await updateDetalleModel(id, {
            ProductoId: ProductoId || null,
            Cantidad,
            Descripcion: Descripcion || null,
            PrecioUnitario: PrecioUnitario || 0,
            colores: colores || []
        });

        // [10] Validar si se afectaron filas
        if (result.affectedRows === 0) {
            // [11] Error 404
            return res.status(404).json({ message: "Detalle no encontrado" });
        }

        // [12] Aplicar nuevo stock
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

        // [13] Retornar éxito (200)
        res.json({ message: "Detalle actualizado correctamente" });
    } catch (err) {
        // [14] Catch de error
        console.error("Error al actualizar detalle:", err);
        // [15] Retornar 500
        res.status(500).json({ error: err.message });
    }
};

export const deleteDetalle = async (req, res) => {
    // [1] Obtener ID
    const id = req.params.id;

    // [2] Inicio try
    try {
        // [3] Obtener detalle para revertir stock
        const detalle = await getDetalleByIdModel(id);
        // [4] Validar existencia
        if (!detalle) {
            // [5] Error 404
            return res.status(404).json({ message: "Detalle no encontrado" });
        }

        // [6] Revertir stock antes de eliminar
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

        // [7] Ejecutar eliminación en el modelo
        const result = await deleteDetalleModel(id);

        // [8] Retornar éxito (200)
        res.json({ message: "Detalle eliminado correctamente y stock revertido" });
    } catch (err) {
        // [9] Catch de error
        console.error("Error al eliminar detalle:", err.message);
        // [10] Retornar 500
        res.status(500).json({ error: err.message });
    }
};