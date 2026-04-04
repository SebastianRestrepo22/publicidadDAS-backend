import {
  getDetalleVentaByVentaIdModel,
  createDetalleVentaManualModel
} from "../models/detalleVentas.models.js";
import { getVentaByIdModel } from "../models/venta.models.js";

export const getDetallesByVenta = async (req, res) => {
  try {
    const { ventaId } = req.params;
    
    const venta = await getVentaByIdModel(ventaId);
    if (!venta) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }
    
    const detalles = await getDetalleVentaByVentaIdModel(ventaId);
    res.status(200).json(detalles);
  } catch (error) {
    console.error("Error al obtener detalles:", error);
    res.status(500).json({ error: "Error al obtener detalles" });
  }
};

export const createDetalle = async (req, res) => {
  try {
    const { ventaId } = req.params;
    const detalleData = req.body;
    
    const venta = await getVentaByIdModel(ventaId);
    if (!venta) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }
    
    if (venta.Estado === 'anulado') {
      return res.status(400).json({ error: "No se pueden agregar detalles a una venta anulada" });
    }
    
    detalleData.VentaId = ventaId;
    const detalleId = await createDetalleVentaManualModel(detalleData);
    
    const detalles = await getDetalleVentaByVentaIdModel(ventaId);
    
    res.status(201).json({
      success: true,
      message: "Detalle creado exitosamente",
      detalles
    });
  } catch (error) {
    console.error("Error al crear detalle:", error);
    res.status(500).json({ error: "Error al crear detalle" });
  }
};