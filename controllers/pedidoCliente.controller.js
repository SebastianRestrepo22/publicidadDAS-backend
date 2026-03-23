import { sendPedidoEstadoEmail, sendVoucherEmail } from "../utils/email.js";
import {
  getAllPedidosClientesModel,
  getPedidoClienteByIdModel,
  createPedidoClienteModel,
  updatePedidoClienteModel,
  deletePedidoClienteModel,
  getClienteByIdModel,
  getPedidosClientesPaginated,
  buscarPedidosClientesPaginated
} from "../models/pedidoCliente.model.js";
import {
  createDetallePedidoModel,
  getDetallePedidoByPedidoIdModel,
  deleteDetallePedidoModel,
  deleteDetallesByPedidoIdModel
} from "../models/detallePedidoCliente.model.js";
import { crearVentaDesdePedidoId } from "./ventas.controller.js";
import { v4 as uuidv4 } from "uuid";
import fs from 'fs';
import { dbPool } from "../lib/db.js";

export const getPedidosClientes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filtroCampo = req.query.filtroCampo || null;
    const filtroValor = req.query.filtroValor || null;
    const tipoPago = req.query.tipoPago || null;

    const offset = (page - 1) * limit;
    let whereClause = '';
    let params = [];

    // Construir WHERE clause
    const whereConditions = [];

    // NUEVO: Excluir pedidos de landing (origen = 'cliente')
    whereConditions.push(`p.Origen != 'cliente'`);

    if (tipoPago) {
      whereConditions.push('p.MetodoPago = ?');
      params.push(tipoPago);
    }

    if (filtroCampo && filtroValor) {
      let campoDB;
      switch (filtroCampo) {
        case 'PedidoClienteId':
          campoDB = 'p.PedidoClienteId';
          break;
        case 'NombreCliente':
          campoDB = 'COALESCE(u.NombreCompleto, p.ClienteNombre)';
          break;
        case 'FechaRegistro':
          campoDB = 'p.FechaRegistro';
          break;
        case 'MetodoPago':
          campoDB = 'p.MetodoPago';
          break;
        case 'Estado':
          campoDB = 'p.Estado';
          break;
        default:
          campoDB = filtroCampo;
      }

      whereConditions.push(`${campoDB} LIKE ?`);
      params.push(`%${filtroValor}%`);
    }

    // MISMA LÓGICA: Solo mostrar pedidos que deben estar en el módulo de pedidos
    whereConditions.push(`(
      p.MetodoPago = 'contra_entrega' 
      OR 
      (p.MetodoPago IN ('transferencia', 'efectivo', 'QR') AND p.Estado != 'aprobado')
    )`);

    if (whereConditions.length > 0) {
      whereClause = 'WHERE ' + whereConditions.join(' AND ');
    }

    // ⚠️ IMPORTANTE: Usar literales para LIMIT y OFFSET
    const query = `
      SELECT
        p.PedidoClienteId,
        p.ClienteId,
        COALESCE(u.NombreCompleto, p.ClienteNombre) AS NombreCliente,
        p.FechaRegistro,
        p.Total,
        p.Estado,
        p.MetodoPago,
        p.Voucher,
        p.NombreRecibe,
        p.TelefonoEntrega,
        p.DireccionEntrega,
        p.TipoCliente,
        p.ClienteNombre,
        p.ClienteTelefono,
        p.ClienteCorreo,
        p.Origen
      FROM pedidosclientes p
      LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId
      ${whereClause}
      ORDER BY p.FechaRegistro DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Ejecutar consulta principal
    const [rows] = await dbPool.query(query, params);

    // Consulta para total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM pedidosclientes p
      LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId
      ${whereClause}
    `;

    const [countResult] = await dbPool.execute(countQuery, params);

    // Obtener detalles para cada pedido
    for (let p of rows) {
      try {
        p.detalle = await getDetallePedidoByPedidoIdModel(p.PedidoClienteId);
      } catch (detalleError) {
        console.error(`⚠️ Error obteniendo detalles para pedido ${p.PedidoClienteId}:`, detalleError.message);
        p.detalle = [];
      }
    }

    res.status(200).json({
      data: rows,
      pagination: {
        totalItems: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
        currentPage: page,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('❌ [CONTROLLER] Error al obtener pedidos:', error);
    res.status(500).json({
      error: "Error al obtener pedidos",
      details: error.message
    });
  }
};

export const buscarPedidos = async (req, res) => {
  const { campo, valor, page = 1, limit = 10, tipoPago } = req.query;

  const columnasPermitidas = {
    id: 'p.PedidoClienteId',
    cliente: 'COALESCE(u.NombreCompleto, p.ClienteNombre)',
    fecha: 'p.FechaRegistro',
    metodo: 'p.MetodoPago',
    estado: 'p.Estado'
  };

  const columna = columnasPermitidas[campo];

  if (!columna) {
    return res.status(400).json({ message: 'Campo de búsqueda inválido' });
  }

  try {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '';
    let params = [];

    // Construir condiciones WHERE
    const whereConditions = [];

    // NUEVO: Excluir pedidos de landing (origen = 'cliente')
    whereConditions.push(`p.Origen != 'cliente'`);

    // Búsqueda por campo específico
    if (campo && valor) {
      whereConditions.push(`${columna} LIKE ?`);
      params.push(`%${valor}%`);
    }

    // Filtro por tipo de pago
    if (tipoPago) {
      whereConditions.push('p.MetodoPago = ?');
      params.push(tipoPago);
    }

    // MISMA LÓGICA: Solo mostrar pedidos que deben estar en el módulo de pedidos
    whereConditions.push(`(
      p.MetodoPago = 'contra_entrega' 
      OR 
      (p.MetodoPago IN ('transferencia', 'efectivo', 'QR') AND p.Estado != 'aprobado')
    )`);

    if (whereConditions.length > 0) {
      whereClause = 'WHERE ' + whereConditions.join(' AND ');
    }

    // ⚠️ IMPORTANTE: Usar literales para LIMIT y OFFSET
    const query = `
      SELECT
        p.PedidoClienteId,
        p.ClienteId,
        COALESCE(u.NombreCompleto, p.ClienteNombre) AS NombreCliente,
        p.FechaRegistro,
        p.Total,
        p.Estado,
        p.MetodoPago,
        p.Voucher,
        p.NombreRecibe,
        p.TelefonoEntrega,
        p.DireccionEntrega,
        p.TipoCliente,
        p.ClienteNombre,
        p.ClienteTelefono,
        p.ClienteCorreo,
        p.Origen
      FROM pedidosclientes p
      LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId
      ${whereClause}
      ORDER BY p.FechaRegistro DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const [rows] = await dbPool.query(query, params);

    // Consulta para total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM pedidosclientes p
      LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId
      ${whereClause}
    `;

    const [countResult] = await dbPool.execute(countQuery, params);
    // Obtener detalles para cada pedido
    for (let p of rows) {
      try {
        p.detalle = await getDetallePedidoByPedidoIdModel(p.PedidoClienteId);
      } catch (detalleError) {
        console.error(`⚠️ Error obteniendo detalles para pedido ${p.PedidoClienteId}:`, detalleError.message);
        p.detalle = [];
      }
    }

    res.status(200).json({
      data: rows,
      pagination: {
        totalItems: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limitNum),
        currentPage: pageNum,
        itemsPerPage: limitNum
      }
    });

  } catch (error) {
    console.error('❌ [BUSCAR] Error al buscar pedidos:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// ========================================
// ✅ CREAR PEDIDO (CORREGIDO - LANDING VA A VENTAS COMO PENDIENTE)
// ========================================
export const createPedidoCliente = async (req, res) => {
  let nuevoPedido = null;

  try {

    let pedidoData;
    if (typeof req.body.pedido === 'string') {
      try {
        pedidoData = JSON.parse(req.body.pedido);
      } catch (error) {
        return res.status(400).json({
          error: 'Datos del pedido inválidos',
          details: error.message
        });
      }
    } else {
      pedidoData = req.body;
    }

    const {
      ClienteId,
      FechaRegistro,
      Total,
      MetodoPago = "transferencia",
      Voucher = null,
      NombreRecibe = null,
      TelefonoEntrega = null,
      DireccionEntrega = null,
      Estado = "pendiente",
      TipoCliente = "registrado",
      ClienteNombre = null,
      ClienteTelefono = null,
      ClienteCorreo = null,
      Origen = "admin",
      detalle = []
    } = pedidoData;

    // Validar Total
    const totalLimpio = parseFloat(Total);
    if (isNaN(totalLimpio) || totalLimpio <= 0) {
      return res.status(400).json({ error: "Total inválido o no numérico" });
    }

    if (!Array.isArray(detalle) || detalle.length === 0) {
      return res.status(400).json({ error: "El pedido debe contener al menos un producto" });
    }

    // Construir URL del voucher si existe
    let voucherUrl = null;
    if (req.file) {
      const protocol = req.protocol;
      const host = req.get('host');
      voucherUrl = `${protocol}://${host}/uploads/vouchers/${req.file.filename}`;
    }

    const fechaProcesada = FechaRegistro
      ? FechaRegistro.split("T")[0]
      : new Date().toISOString().split("T")[0];

    // NUEVA LÓGICA:
    // - Admin: estado = 'pendiente' (aparece en módulo de pedidos)
    // - Landing: estado = 'pendiente' pero va directamente a ventas
    const esLanding = Origen === 'cliente';
    const estadoInicial = "pendiente"; // AMBOS COMIENZAN COMO PENDIENTE

    // Crear pedido (siempre pendiente)
    nuevoPedido = await createPedidoClienteModel({
      ClienteId: ClienteId || null,
      FechaRegistro: fechaProcesada,
      Total: totalLimpio,
      MetodoPago,
      Voucher: voucherUrl || null,
      NombreRecibe: NombreRecibe || null,
      TelefonoEntrega: TelefonoEntrega || null,
      DireccionEntrega: DireccionEntrega || null,
      Estado: estadoInicial,
      TipoCliente,
      ClienteNombre: ClienteNombre || null,
      ClienteTelefono: ClienteTelefono || null,
      ClienteCorreo: ClienteCorreo || null,
      Origen
    });

    // Crear detalles del pedido
    for (let i = 0; i < detalle.length; i++) {
      const item = detalle[i];

      const ProductoId = item.ProductoId || null;
      const ServicioId = item.ServicioId || null;
      const Cantidad = item.Cantidad ? parseInt(item.Cantidad) : 1;
      const Precio = parseFloat(item.PrecioUnitario || item.Precio || 0);
      const ColorId = item.ColorId || null;
      const Tamaño = null;
      const Descripcion = item.Descripcion || null;
      const UrlImagen = item.UrlImagen ? item.UrlImagen.trim() : null;
      const UrlImagenPersonalizada = null;

      const Subtotal = parseFloat((Cantidad * Precio).toFixed(2));

      if (!ProductoId && !ServicioId) {
        throw new Error(`Detalle ${i + 1}: Se requiere ProductoId o ServicioId`);
      }
      if (Cantidad <= 0) {
        throw new Error(`Detalle ${i + 1}: Cantidad inválida (${Cantidad})`);
      }
      if (isNaN(Precio) || Precio <= 0) {
        throw new Error(`Detalle ${i + 1}: Precio inválido (${Precio})`);
      }

      await createDetallePedidoModel({
        DetallePedidoClienteId: uuidv4(),
        PedidoClienteId: nuevoPedido.PedidoClienteId,
        ProductoId,
        ServicioId,
        Cantidad,
        Precio,
        ColorId,
        Tamaño,
        Descripcion,
        UrlImagen,
        UrlImagenPersonalizada,
        Subtotal
      });
    }

    // Obtener pedido completo
    const pedidoCompleto = await getPedidoClienteByIdModel(nuevoPedido.PedidoClienteId);
    pedidoCompleto.detalle = await getDetallePedidoByPedidoIdModel(nuevoPedido.PedidoClienteId)

    // Enviar email de confirmación
    if (pedidoCompleto.ClienteId) {
      const cliente = await getClienteByIdModel(pedidoCompleto.ClienteId);
      if (cliente?.CorreoElectronico) {
        await sendPedidoEstadoEmail(
          cliente.CorreoElectronico,
          cliente.NombreCompleto || `${cliente.Nombre} ${cliente.Apellido}`,
          nuevoPedido.PedidoClienteId,
          pedidoCompleto.Estado,
          esLanding
            ? "Tu pedido ha sido recibido y está pendiente de confirmación"
            : "Tu pedido ha sido recibido y está pendiente de confirmación"
        );
      }
    }

    res.status(201).json(pedidoCompleto);

  } catch (error) {
    console.error("❌ Error al crear pedido:", error.message);

    if (nuevoPedido?.PedidoClienteId) {
      try {
        await deleteDetallesByPedidoIdModel(nuevoPedido.PedidoClienteId);
        await deletePedidoClienteModel(nuevoPedido.PedidoClienteId);
      } catch (cleanupError) {
        console.error("❌ Error limpiando pedido huérfano:", cleanupError);
      }
    }

    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error eliminando archivo:', err);
      });
    }

    res.status(500).json({
      error: "Error al crear el pedido",
      message: error.message
    });
  }
};

//✅ ACTUALIZAR PEDIDO (CON SOPORTE PARA VOUCHER)
export const updatePedidoCliente = async (req, res) => {
  const { id } = req.params;
  let updates = { ...req.body };

  try {

    // Obtener el pedido actual
    const pedidoActual = await getPedidoClienteByIdModel(id);
    if (!pedidoActual) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    // Si viene un archivo, construir la URL del voucher
    if (req.file) {
      const protocol = req.protocol;
      const host = req.get('host');
      const voucherUrl = `${protocol}://${host}/uploads/vouchers/${req.file.filename}`;
      updates.Voucher = voucherUrl;

    }

    // Si se está actualizando el estado
    if (updates.Estado) {
      const estadoAnterior = pedidoActual.Estado;
      const nuevoEstado = updates.Estado;

      // Validar estados según método de pago
      if (pedidoActual.MetodoPago === "transferencia" ||
        pedidoActual.MetodoPago === "efectivo" ||
        pedidoActual.MetodoPago === "QR") {
        const estadosPermitidos = ['pendiente', 'aprobado', 'finalizado', 'cancelado'];
        if (!estadosPermitidos.includes(nuevoEstado)) {
          return res.status(400).json({
            message: `Para ${pedidoActual.MetodoPago}, estado debe ser: ${estadosPermitidos.join(', ')}`
          });
        }
      }
      // CONTRA ENTREGA
      else if (pedidoActual.MetodoPago === "contra_entrega") {
        const estadosPermitidosContraEntrega = ['pendiente', 'en_proceso', 'en_camino', 'entregado', 'cancelado'];
        if (!estadosPermitidosContraEntrega.includes(nuevoEstado)) {
          return res.status(400).json({
            message: `Para contra entrega, estado debe ser: ${estadosPermitidosContraEntrega.join(', ')}`
          });
        }
      }
    }

    // Sanitizar Total si viene
    if (updates.Total !== undefined) {
      const totalLimpio = parseFloat(updates.Total);
      if (!isNaN(totalLimpio)) {
        updates.Total = totalLimpio;
      }
    }

    // Actualizar el pedido
    const result = await updatePedidoClienteModel(id, updates);

    // Obtener el pedido actualizado
    const updated = await getPedidoClienteByIdModel(id);
    updated.detalle = await getDetallePedidoByPedidoIdModel(id);

    // Si es transferencia/efectivo y se aprueba, crear venta
    if ((pedidoActual.MetodoPago === "transferencia" || pedidoActual.MetodoPago === "efectivo") &&
      updates.Estado === 'aprobado' && pedidoActual.Estado !== 'aprobado') {
      try {
        const [ventaExistente] = await dbPool.execute(
          "SELECT VentaId FROM ventas WHERE PedidoClienteId = ?",
          [id]
        );

        if (ventaExistente.length === 0) {
          const resultadoVenta = await crearVentaDesdePedidoId(id, null);
          updated.ventaCreada = {
            id: resultadoVenta.VentaId,
            estado: 'pagado'
          };
        } else {
          updated.ventaCreada = {
            id: ventaExistente[0].VentaId,
            yaExiste: true
          };
        }
      } catch (ventaError) {
        console.error('❌ Error al crear venta:', ventaError);
        updated.errorVenta = ventaError.message;
      }
    }

    // Si es contra entrega y llega a 'entregado', crear venta
    if (pedidoActual.MetodoPago === "contra_entrega" && updates.Estado === 'entregado' && pedidoActual.Estado !== 'entregado') {
      try {
        const [ventaExistente] = await dbPool.execute(
          "SELECT VentaId FROM ventas WHERE PedidoClienteId = ?",
          [id]
        );

        if (ventaExistente.length === 0) {
          const resultadoVenta = await crearVentaDesdePedidoId(id, null);
          updated.ventaCreada = {
            id: resultadoVenta.VentaId,
            estado: 'pagado',
            mensaje: 'Venta generada al entregar el pedido'
          };
        } else {
          updated.ventaCreada = {
            id: ventaExistente[0].VentaId,
            yaExiste: true
          };
        }
      } catch (ventaError) {
        console.error('❌ Error al crear venta para pedido entregado:', ventaError);
        updated.errorVenta = ventaError.message;
      }
    }

    // Enviar correo si cambió el estado
    if (updates.Estado && pedidoActual.Estado !== updates.Estado) {

      let destinatario = null;
      let nombreCliente = 'Cliente';

      if (updated.ClienteId) {
        const cliente = await getClienteByIdModel(updated.ClienteId);
        if (cliente) {
          destinatario = cliente.CorreoElectronico;
          nombreCliente = cliente.NombreCompleto;
        }
      } else if (updated.ClienteCorreo) {
        destinatario = updated.ClienteCorreo;
        nombreCliente = updated.ClienteNombre || 'Cliente';
      } 

      if (destinatario) {
        sendPedidoEstadoEmail(
          destinatario,
          nombreCliente,
          id,
          updates.Estado,
          updates.motivo || ''
        ).then(() => {
          console.log(`✅ Correo para estado '${updates.Estado}' enviado correctamente`);
        }).catch(err => {
          console.error(`❌ Error enviando correo para estado '${updates.Estado}':`, err);
        });
      } else {
        console.log('⚠️ No se pudo enviar correo: no hay destinatario');
      }
    }

    // Enviar email con voucher si se subió uno nuevo
    if (req.file && updated.ClienteId) {
      const cliente = await getClienteByIdModel(updated.ClienteId);
      if (cliente?.CorreoElectronico) {
        await sendVoucherEmail(
          cliente.CorreoElectronico,
          cliente.NombreCompleto || `${cliente.Nombre} ${cliente.Apellido}`,
          id,
          updates.Voucher
        ).catch(err => console.error('Error enviando email de voucher:', err));
      }
    }

    res.json(updated);

  } catch (error) {
    console.error('❌ [PEDIDOS] Error:', error);

    // Si hay error y se subió un archivo, eliminarlo
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error eliminando archivo:', err);
      });
    }

    res.status(500).json({
      message: 'Error al actualizar el pedido',
      error: error.message
    });
  }
};

// ========================================
// 🔍 OBTENER PEDIDO POR ID
// ========================================
export const getPedidoClienteById = async (req, res) => {
  try {
    const pedido = await getPedidoClienteByIdModel(req.params.id);
    if (!pedido) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    pedido.detalle = await getDetallePedidoByPedidoIdModel(req.params.id);
    res.status(200).json(pedido);
  } catch (error) {
    console.error("Error al obtener pedido:", error);
    res.status(500).json({ error: "Error al obtener pedido" });
  }
};

// ========================================
// 🗑️ ELIMINAR PEDIDO
// ========================================
export const deletePedidoCliente = async (req, res) => {
  try {
    const detalles = await getDetallePedidoByPedidoIdModel(req.params.id);
    for (let d of detalles) {
      await deleteDetallePedidoModel(d.DetallePedidoClienteId);
    }
    const result = await deletePedidoClienteModel(req.params.id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar pedido:", error);
    res.status(500).json({ error: "Error al eliminar pedido" });
  }
};

// ========================================
// 👤 OBTENER MIS PEDIDOS (AUTENTICADO)
// ========================================
export const getMisPedidos = async (req, res) => {
  try {
    const clienteId = req.user?.CedulaId;
    if (!clienteId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const pedidos = await getAllPedidosClientesModel(clienteId);

    // Agregar detalles a cada pedido
    for (let p of pedidos) {
      p.detalle = await getDetallePedidoByPedidoIdModel(p.PedidoClienteId);

      // Determinar qué estado mostrar
      if (p.EsVenta) {
        // Si tiene venta y NO es contra entrega, mostrar estado de la venta
        if (p.MetodoPago?.toLowerCase() !== 'contra_entrega') {
          p.EstadoParaMostrar = p.EstadoVenta; // 'pagado' o 'pendiente'
        } else {
          // Si es contra entrega pero ya tiene venta (porque se entregó), mostrar estado de la venta
          p.EstadoParaMostrar = p.EstadoVenta;
        }
      } else {
        // Si no tiene venta, mostrar estado del pedido
        p.EstadoParaMostrar = p.Estado;
      }
    }

    res.status(200).json(pedidos);
  } catch (error) {
    console.error("Error al obtener mis pedidos:", error);
    res.status(500).json({ error: "Error al obtener tus pedidos" });
  }
};

// ========================================
// 📎 SUBIR VOUCHER A PEDIDO
// ========================================
export const uploadVoucherToPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    const pedidoExistente = await getPedidoClienteByIdModel(id);
    if (!pedidoExistente) {
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error eliminando archivo huérfano:', err);
      });
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const protocol = req.protocol;
    const host = req.get('host');
    const voucherUrl = `${protocol}://${host}/uploads/vouchers/${file.filename}`;

    const result = await updatePedidoClienteModel(id, { Voucher: voucherUrl });

    if (result.affectedRows === 0) {
      throw new Error('No se pudo actualizar el pedido');
    }

    const pedidoActualizado = await getPedidoClienteByIdModel(id);
    pedidoActualizado.detalle = await getDetallePedidoByPedidoIdModel(id);

    if (pedidoActualizado.ClienteId) {
      try {
        const cliente = await getClienteByIdModel(pedidoActualizado.ClienteId);
        if (cliente?.CorreoElectronico) {
          await sendVoucherEmail(
            cliente.CorreoElectronico,
            cliente.NombreCompleto || `${cliente.Nombre} ${cliente.Apellido}`,
            id,
            voucherUrl
          );
        }
      } catch (emailError) {
        console.error('⚠️ Error enviando email de voucher:', emailError);
      }
    }

    res.json({
      success: true,
      message: 'Voucher subido correctamente',
      voucher: voucherUrl,
      pedido: pedidoActualizado
    });

  } catch (error) {
    console.error('❌ Error al subir voucher:', error);

    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error eliminando archivo tras error:', err);
      });
    }

    res.status(500).json({
      error: 'Error al procesar el voucher',
      message: error.message
    });
  }
};