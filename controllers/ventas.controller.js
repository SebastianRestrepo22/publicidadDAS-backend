import { v4 as uuidv4 } from "uuid";
import { dbPool } from "../lib/db.js";
import {
  getAllVentasModel,
  getVentaByIdModel,
  createVentaFromPedidoModel,
  createVentaManualModel,
  existeVentaParaPedidoModel,
  getVentasPaginated,
  anularVentaModel,
  rechazarVentaModel,
} from "../models/venta.models.js";
import {
  getDetalleVentaByVentaIdModel,
  createDetallesVentaFromPedidoModel,
  createDetalleVentaManualModel
} from "../models/detalleVentas.models.js";
import { sendVentaFacturaEmail, sendVentaAnuladaEmail, sendVentaRechazadaEmail  } from "../utils/email.js";

export const getVentas = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      filtroCampo,
      filtroValor,
      fechaInicio,
      fechaFin
    } = req.query;

    const result = await getVentasPaginated({
      page: Math.max(1, parseInt(page) || 1),
      limit: Math.max(1, parseInt(limit) || 10),
      filtroCampo: filtroCampo || null,
      filtroValor: filtroValor || null,
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null
    });

    const data = result && result.data && Array.isArray(result.data) ? result.data : [];
    const totalItems = typeof result?.totalItems === 'number' ? result.totalItems : 0;
    const currentPage = typeof result?.currentPage === 'number' ? result.currentPage : 1;
    const itemsPerPage = Math.max(1, parseInt(limit) || 10);

    if (data.length === 0 && currentPage > 1 && totalItems > 0) {
      const fallback = await getVentasPaginated({
        page: 1,
        limit: itemsPerPage,
        filtroCampo: filtroCampo || null,
        filtroValor: filtroValor || null,
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null
      });
      const fallbackData = fallback && fallback.data && Array.isArray(fallback.data) ? fallback.data : [];
      const fallbackTotal = typeof fallback?.totalItems === 'number' ? fallback.totalItems : 0;

      return res.status(200).json({
        data: fallbackData,
        pagination: {
          totalItems: fallbackTotal,
          totalPages: Math.ceil(fallbackTotal / itemsPerPage),
          currentPage: 1,
          itemsPerPage: itemsPerPage
        }
      });
    }

    res.status(200).json({
      data: data,
      pagination: {
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / itemsPerPage),
        currentPage: currentPage,
        itemsPerPage: itemsPerPage
      }
    });

  } catch (error) {
    console.error('Error en getVentas:', error);
    res.status(200).json({
      data: [],
      pagination: {
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: parseInt(req.query.limit) || 10
      }
    });
  }
};

export const getVentaById = async (req, res) => {
  try {
    const venta = await getVentaByIdModel(req.params.id);
    if (!venta) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }
    venta.detalle = await getDetalleVentaByVentaIdModel(req.params.id);
    res.status(200).json(venta);
  } catch (error) {
    console.error("Error al obtener venta:", error);
    res.status(500).json({ error: "Error al obtener venta" });
  }
};

export const createVentaDesdePedido = async (req, res) => {
  const connection = await dbPool.getConnection();
  try {
    const { PedidoClienteId, UsuarioVendedorId } = req.body;

    if (!PedidoClienteId) {
      return res.status(400).json({ error: "PedidoClienteId es obligatorio" });
    }

    await connection.beginTransaction();

    const existe = await existeVentaParaPedidoModel(PedidoClienteId);
    if (existe) {
      await connection.rollback();
      return res.status(400).json({ error: "Ya existe una venta para este pedido" });
    }

    // MODIFICADO: Consultar explícitamente MetodoPago para pasarlo al model
    const [pedidoRows] = await connection.query(
      `SELECT 
        PedidoClienteId, MetodoPago, ClienteId, ClienteNombre, ClienteTelefono, 
        ClienteCorreo, Total, TipoCliente, Estado, FechaRegistro, Voucher,
        NombreRecibe, TelefonoEntrega, DireccionEntrega
      FROM pedidosclientes 
      WHERE PedidoClienteId = ?`,
      [PedidoClienteId]
    );

    if (pedidoRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    const pedido = pedidoRows[0];

    // NUEVO: Extraer MetodoPago para pasarlo al model
    const metodoPago = pedido.MetodoPago;

    const [detallesRows] = await connection.query(
      `SELECT * FROM detallepedidosclientes WHERE PedidoClienteId = ?`,
      [PedidoClienteId]
    );
    if (detallesRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: "El pedido no tiene detalles" });
    }

    // MODIFICADO: Pasar metodoPago y connection al model
    const result = await createVentaFromPedidoModel(pedido, UsuarioVendedorId || null, metodoPago, connection);

    if (!result.success) {
      await connection.rollback();
      return res.status(400).json({ error: "Error al crear la venta" });
    }

    const VentaId = result.VentaId;

    // Los detalles se crean AQUÍ (una sola vez) con la función dedicada
    await createDetallesVentaFromPedidoModel(connection, VentaId, detallesRows);

    await connection.commit();

    const ventaCreada = await getVentaByIdModel(VentaId);
    const detallesCompletos = await getDetalleVentaByVentaIdModel(VentaId);
    ventaCreada.detalle = detallesCompletos;

    // Solo enviar factura si está pagado (no si está pendiente)
    if (ventaCreada.Estado === 'pagado' && ventaCreada.ClienteCorreo) {
      try {
        await sendVentaFacturaEmail(
          ventaCreada.ClienteCorreo,
          ventaCreada.ClienteNombre || 'Cliente',
          ventaCreada.VentaId,
          ventaCreada.Total,
          detallesCompletos
        );
      } catch (emailError) {
        console.error("Error enviando correo de factura:", emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: "Venta creada exitosamente desde el pedido",
      venta: ventaCreada
    });

  } catch (error) {
    await connection.rollback();
    console.error("Error al crear venta desde pedido:", error);
    res.status(500).json({ error: "Error al crear venta desde pedido" });
  } finally {
    connection.release();
  }
};

export const createVentaManual = async (req, res) => {
  const connection = await dbPool.getConnection();

  try {
    const ventaData = req.body;

    if (!ventaData) {
      return res.status(400).json({
        success: false,
        error: "No se recibieron datos de la venta"
      });
    }

    const { detalles, UsuarioVendedorId, ClienteCorreo, ClienteNombre } = ventaData;

    if (!UsuarioVendedorId) {
      return res.status(400).json({
        success: false,
        error: "UsuarioVendedorId es obligatorio"
      });
    }

    if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Debe incluir al menos un detalle"
      });
    }

    await connection.beginTransaction();

    const VentaId = await createVentaManualModel(ventaData, connection);

    for (const detalle of detalles) {
      await createDetalleVentaManualModel(connection, {
        VentaId,
        TipoItem: detalle.TipoItem,
        ProductoId: detalle.ProductoId,
        ServicioId: detalle.ServicioId,
        NombreSnapshot: detalle.NombreSnapshot,
        Cantidad: parseInt(detalle.Cantidad) || 1,
        PrecioUnitario: parseFloat(detalle.PrecioUnitario) || 0,
        Descuento: detalle.Descuento || 0,
        Subtotal: parseFloat(detalle.Subtotal) || 0,
        ColorId: detalle.ColorId,
        DescripcionPersonalizada: detalle.DescripcionPersonalizada
      });
    }

    await connection.commit();

    if (ClienteCorreo) {
      try {
        const detallesCompletos = await getDetalleVentaByVentaIdModel(VentaId);
        await sendVentaFacturaEmail(
          ClienteCorreo,
          ClienteNombre || 'Cliente',
          VentaId,
          ventaData.Total,
          detallesCompletos
        );
      } catch (emailError) {
        console.error("Error enviando correo de factura:", emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: "Venta creada exitosamente",
      VentaId
    });

  } catch (error) {
    await connection.rollback();
    console.error("Error en createVentaManual:", error);

    let mensajeError = error.message;
    if (error.message.includes('Stock insuficiente')) {
      mensajeError = error.message;
    } else if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
      mensajeError = 'La operación tomó demasiado tiempo. Por favor intenta de nuevo.';
    } else {
      mensajeError = "Error al crear la venta";
    }

    res.status(500).json({
      success: false,
      error: mensajeError
    });

  } finally {
    connection.release();
  }
};

export const anularVenta = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  const connection = await dbPool.getConnection();

  try {
    const venta = await getVentaByIdModel(id);
    if (!venta) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    if (venta.Estado === 'anulado') {
      return res.status(400).json({ error: "La venta ya está anulada" });
    }

    if (venta.Origen === 'manual') {
      const safeFecha = typeof venta.FechaVenta === 'string' ? venta.FechaVenta.replace(' ', 'T') : venta.FechaVenta;
      const fechaVenta = new Date(safeFecha);
      const ahora = new Date();
      const diferenciaMs = ahora - fechaVenta;
      const diferenciaHoras = diferenciaMs / (1000 * 60 * 60);

      const TIEMPO_LIMITE_HORAS = 1;

      if (diferenciaHoras > TIEMPO_LIMITE_HORAS) {
        return res.status(400).json({
          success: false,
          error: `Ya no es posible anular esta venta manual. Han pasado más de ${TIEMPO_LIMITE_HORAS} hora desde su creación.`,
          codigo: 'TIEMPO_EXCEDIDO',
          tiempoLimiteHoras: TIEMPO_LIMITE_HORAS,
          fechaVenta: venta.FechaVenta,
          horasTranscurridas: Math.round(diferenciaHoras * 10) / 10
        });
      }
    }

    await connection.beginTransaction();

    const result = await anularVentaModel(id, motivo);

    if (!result.success) {
      await connection.rollback();
      return res.status(400).json({ error: result.message || "No se pudo anular la venta" });
    }

    await connection.commit();

    const ventaAnulada = await getVentaByIdModel(id);
    ventaAnulada.detalle = await getDetalleVentaByVentaIdModel(id);

    if (ventaAnulada.ClienteCorreo) {
      try {
        await sendVentaAnuladaEmail(
          ventaAnulada.ClienteCorreo,
          ventaAnulada.ClienteNombre || 'Cliente',
          ventaAnulada.VentaId,
          ventaAnulada.Total
        );
      } catch (emailError) {
        console.error("Error enviando correo de anulación:", emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: "Venta anulada correctamente",
      venta: ventaAnulada,
      tiempoTranscurrido: venta.Origen === 'manual'
        ? Math.round(((new Date() - new Date(venta.FechaVenta)) / (1000 * 60 * 60)) * 10) / 10 + " horas"
        : "Sin límite de tiempo"
    });

  } catch (error) {
    await connection.rollback();
    console.error("Error al anular venta:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error al anular venta"
    });
  } finally {
    connection.release();
  }
};

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
    const detalleId = await createDetalleVentaManualModel(dbPool, detalleData);

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

export const crearVentaDesdePedidoId = async (PedidoClienteId, UsuarioVendedorId = null) => {
  const connection = await dbPool.getConnection();
  try {
    if (!PedidoClienteId) throw new Error("PedidoClienteId es obligatorio");

    await connection.beginTransaction();

    const [ventaExistente] = await connection.query(
      "SELECT VentaId FROM ventas WHERE PedidoClienteId = ?",
      [PedidoClienteId]
    );
    if (ventaExistente.length > 0) {
      await connection.rollback();
      return { success: false, alreadyExists: true, VentaId: ventaExistente[0].VentaId };
    }

    const [pedidoRows] = await connection.query(
      `SELECT 
        PedidoClienteId, MetodoPago, ClienteId, ClienteNombre, ClienteTelefono, 
        ClienteCorreo, Total, TipoCliente, Estado, FechaRegistro, Voucher,
        NombreRecibe, TelefonoEntrega, DireccionEntrega, Origen
      FROM pedidosclientes 
      WHERE PedidoClienteId = ?`,
      [PedidoClienteId]
    );

    if (pedidoRows.length === 0) {
      await connection.rollback();
      throw new Error("Pedido no encontrado");
    }
    const pedido = pedidoRows[0];

    const [detallesRows] = await connection.query(
      `SELECT * FROM detallepedidosclientes WHERE PedidoClienteId = ?`,
      [PedidoClienteId]
    );
    if (detallesRows.length === 0) {
      await connection.rollback();
      throw new Error("El pedido no tiene detalles");
    }

    // DETERMINAR ESTADO SEGÚN ORIGEN
    const esLanding = pedido.Origen === 'cliente';
    const estadoVenta = esLanding ? 'pendiente' : 'pagado';
    
    // PASAR EL ESTADO COMO QUINTO PARÁMETRO
    const result = await createVentaFromPedidoModel(pedido, UsuarioVendedorId, null, connection, estadoVenta);

    if (!result.success) {
      await connection.rollback();
      return result;
    }

    const VentaId = result.VentaId;

    await createDetallesVentaFromPedidoModel(connection, VentaId, detallesRows);

    await connection.commit();

    const ventaCreada = await getVentaByIdModel(VentaId);
    const detallesCompletos = await getDetalleVentaByVentaIdModel(VentaId);
    ventaCreada.detalle = detallesCompletos;

    return {
      success: true,
      VentaId: VentaId,
      venta: ventaCreada,
      alreadyExists: false
    };

  } catch (error) {
    await connection.rollback();
    console.error("Error en crearVentaDesdePedidoId:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// ========================================
// ACTUALIZAR ESTADO DE VENTA 
// ========================================
export const actualizarEstadoVenta = async (req, res) => {
  const { id } = req.params;
  const { Estado, motivo } = req.body;
  const connection = await dbPool.getConnection();

  try {
    // Validar que el nuevo estado sea permitido (AGREGAR 'rechazado')
    const estadosPermitidos = ['pagado', 'anulado', 'pendiente', 'rechazado'];
    if (!Estado || !estadosPermitidos.includes(Estado)) {
      return res.status(400).json({
        error: "Estado no válido",
        permitidos: estadosPermitidos
      });
    }

    const venta = await getVentaByIdModel(id);
    if (!venta) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    // Validaciones de negocio
    if (venta.Estado === 'anulado' && Estado !== 'anulado') {
      return res.status(400).json({ error: "No se puede modificar una venta anulada" });
    }

    if (venta.Estado === 'rechazado' && Estado !== 'rechazado') {
      return res.status(400).json({ error: "No se puede modificar una venta rechazada" });
    }

    if (venta.Estado === 'pagado' && (Estado === 'pendiente' || Estado === 'rechazado')) {
      return res.status(400).json({ error: "No se puede revertir una venta pagada" });
    }

    await connection.beginTransaction();

    // Si se rechaza, actualizar con motivo
    if (Estado === 'rechazado') {
      const [result] = await connection.query(
        "UPDATE ventas SET Estado = ?, MotivoRechazo = ? WHERE VentaId = ?",
        [Estado, motivo || null, id]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(400).json({ error: "No se pudo actualizar el estado" });
      }
    }
    // Si se anula, ejecutar lógica de devolución de stock (el trigger ya lo hace)
    else if (Estado === 'anulado' && venta.Estado !== 'anulado') {
      const [result] = await connection.query(
        "UPDATE ventas SET Estado = ?, MotivoAnulacion = ? WHERE VentaId = ?",
        [Estado, motivo || null, id]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(400).json({ error: "No se pudo actualizar el estado" });
      }
    } else {
      // Actualización normal de estado
      const [result] = await connection.query(
        "UPDATE ventas SET Estado = ? WHERE VentaId = ?",
        [Estado, id]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(400).json({ error: "No se pudo actualizar el estado" });
      }
    }

    await connection.commit();

    // Obtener venta actualizada
    const ventaActualizada = await getVentaByIdModel(id);
    ventaActualizada.detalle = await getDetalleVentaByVentaIdModel(id);

    // Enviar correos según el nuevo estado
    if (Estado === 'rechazado' && ventaActualizada.ClienteCorreo) {
      try {
        await sendVentaRechazadaEmail(
          ventaActualizada.ClienteCorreo,
          ventaActualizada.ClienteNombre || 'Cliente',
          ventaActualizada.VentaId,
          ventaActualizada.Total,
          motivo || 'Voucher inválido o falta de pago'
        );
      } catch (emailError) {
        console.error("⚠️ Error enviando correo de rechazo:", emailError);
      }
    }

    // Si se marca como 'pagado' y viene de transferencia/QR, enviar factura
    if (Estado === 'pagado' && venta.Origen === 'pedido') {
      try {
        const [pedido] = await connection.query(
          "SELECT MetodoPago FROM pedidosclientes WHERE PedidoClienteId = ?",
          [venta.PedidoClienteId]
        );

        if (pedido[0]?.MetodoPago === 'transferencia' || pedido[0]?.MetodoPago === 'QR') {
          if (ventaActualizada.ClienteCorreo) {
            await sendVentaFacturaEmail(
              ventaActualizada.ClienteCorreo,
              ventaActualizada.ClienteNombre || 'Cliente',
              ventaActualizada.VentaId,
              ventaActualizada.Total,
              ventaActualizada.detalle
            );
          }
        }
      } catch (emailError) {
        console.error("⚠️ Error enviando factura al actualizar estado:", emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: "Estado actualizado correctamente",
      venta: ventaActualizada
    });

  } catch (error) {
    await connection.rollback();
    console.error("❌ Error en actualizarEstadoVenta:", error);
    res.status(500).json({
      error: "Error al actualizar el estado de la venta",
      details: error.message
    });
  } finally {
    connection.release();
  }
};

export const rechazarVenta = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  const connection = await dbPool.getConnection();

  try {
    const venta = await getVentaByIdModel(id);
    if (!venta) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    if (venta.Estado === 'rechazado') {
      return res.status(400).json({ error: "La venta ya está rechazada" });
    }

    if (venta.Estado === 'anulado') {
      return res.status(400).json({ error: "No se puede rechazar una venta anulada" });
    }

    if (venta.Estado === 'pagado') {
      return res.status(400).json({ error: "No se puede rechazar una venta ya pagada" });
    }

    await connection.beginTransaction();

    const result = await rechazarVentaModel(id, motivo);

    if (!result.success) {
      await connection.rollback();
      return res.status(400).json({ error: result.message || "No se pudo rechazar la venta" });
    }

    await connection.commit();

    const ventaRechazada = await getVentaByIdModel(id);
    ventaRechazada.detalle = await getDetalleVentaByVentaIdModel(id);

    // Enviar correo de notificación al cliente
    if (ventaRechazada.ClienteCorreo) {
      try {
        await sendVentaRechazadaEmail(
          ventaRechazada.ClienteCorreo,
          ventaRechazada.ClienteNombre || 'Cliente',
          ventaRechazada.VentaId,
          ventaRechazada.Total,
          motivo || 'Voucher inválido o falta de pago'
        );
      } catch (emailError) {
        console.error("Error enviando correo de rechazo:", emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: "Venta rechazada correctamente",
      venta: ventaRechazada
    });

  } catch (error) {
    await connection.rollback();
    console.error("Error al rechazar venta:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error al rechazar venta"
    });
  } finally {
    connection.release();
  }
};