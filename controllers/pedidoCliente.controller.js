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
    const whereConditions = [];

    // ✅ CORREGIDO: Muestra pedidos de admin, contra_entrega, y pedidos cliente con qr/transferencia pendientes
    whereConditions.push(`(
      p.Origen = 'admin'
      OR p.MetodoPago = 'contra_entrega'
      OR (p.Origen = 'cliente' AND LOWER(p.MetodoPago) IN ('transferencia', 'qr', 'efectivo') AND p.Estado != 'aprobado')
    )`);

    if (tipoPago) {
      whereConditions.push('LOWER(p.MetodoPago) = LOWER(?)');
      params.push(tipoPago);
    }

    if (filtroCampo && filtroValor) {
      let campoDB;
      switch (filtroCampo) {
        case 'PedidoClienteId': campoDB = 'p.PedidoClienteId'; break;
        case 'NombreCliente': campoDB = 'COALESCE(u.NombreCompleto, p.ClienteNombre)'; break;
        case 'FechaRegistro': campoDB = 'p.FechaRegistro'; break;
        case 'MetodoPago': campoDB = 'p.MetodoPago'; break;
        case 'Estado': campoDB = 'p.Estado'; break;
        default: campoDB = filtroCampo;
      }
      whereConditions.push(`${campoDB} LIKE ?`);
      params.push(`%${filtroValor}%`);
    }

    if (whereConditions.length > 0) {
      whereClause = 'WHERE ' + whereConditions.join(' AND ');
    }

    const query = `
      SELECT
        p.PedidoClienteId, p.ClienteId,
        COALESCE(u.NombreCompleto, p.ClienteNombre) AS NombreCliente,
        p.FechaRegistro, p.Total, p.Estado, p.MetodoPago, p.Voucher,
        p.NombreRecibe, p.TelefonoEntrega, p.DireccionEntrega,
        p.TipoCliente, p.ClienteNombre, p.ClienteTelefono,
        p.ClienteCorreo, p.Origen
      FROM pedidosclientes p
      LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId
      ${whereClause}
      ORDER BY p.FechaRegistro DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await dbPool.query(query, params);
    const countQuery = `SELECT COUNT(*) as total FROM pedidosclientes p LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId ${whereClause}`;
    const [countResult] = await dbPool.execute(countQuery, params);

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
    res.status(500).json({ error: "Error al obtener pedidos", details: error.message });
  }
};

export const buscarPedidos = async (req, res) => {
  const { campo, valor, page = 1, limit = 10, tipoPago } = req.query;
  const columnasPermitidas = {
    id: 'p.PedidoClienteId', cliente: 'COALESCE(u.NombreCompleto, p.ClienteNombre)',
    fecha: 'p.FechaRegistro', metodo: 'p.MetodoPago', estado: 'p.Estado'
  };
  const columna = columnasPermitidas[campo];
  if (!columna) return res.status(400).json({ message: 'Campo de búsqueda inválido' });

  try {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    let whereClause = '';
    let params = [];
    const whereConditions = [];

    // ✅ CORREGIDO: Muestra pedidos de admin, contra_entrega, y pedidos cliente con qr/transferencia pendientes
    whereConditions.push(`(
      p.Origen = 'admin'
      OR p.MetodoPago = 'contra_entrega'
      OR (p.Origen = 'cliente' AND LOWER(p.MetodoPago) IN ('transferencia', 'qr', 'efectivo') AND p.Estado != 'aprobado')
    )`);

    if (campo && valor) {
      whereConditions.push(`${columna} LIKE ?`);
      params.push(`%${valor}%`);
    }
    if (tipoPago) {
      whereConditions.push('LOWER(p.MetodoPago) = LOWER(?)');
      params.push(tipoPago);
    }

    if (whereConditions.length > 0) whereClause = 'WHERE ' + whereConditions.join(' AND ');

    const query = `
      SELECT p.PedidoClienteId, p.ClienteId, COALESCE(u.NombreCompleto, p.ClienteNombre) AS NombreCliente,
        p.FechaRegistro, p.Total, p.Estado, p.MetodoPago, p.Voucher, p.NombreRecibe,
        p.TelefonoEntrega, p.DireccionEntrega, p.TipoCliente, p.ClienteNombre, p.ClienteTelefono,
        p.ClienteCorreo, p.Origen
      FROM pedidosclientes p LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId ${whereClause}
      ORDER BY p.FechaRegistro DESC LIMIT ${limitNum} OFFSET ${offset}
    `;
    const [rows] = await dbPool.query(query, params);

    const countQuery = `SELECT COUNT(*) as total FROM pedidosclientes p LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId ${whereClause}`;
    const [countResult] = await dbPool.execute(countQuery, params);

    for (let p of rows) {
      try { p.detalle = await getDetallePedidoByPedidoIdModel(p.PedidoClienteId); }
      catch (detalleError) { console.error(`⚠️ Error detalles ${p.PedidoClienteId}:`, detalleError.message); p.detalle = []; }
    }

    res.status(200).json({
       data: rows,
      pagination: { totalItems: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limitNum), currentPage: pageNum, itemsPerPage: limitNum }
    });
  } catch (error) {
    console.error(' [BUSCAR] Error al buscar pedidos:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};


export const createPedidoCliente = async (req, res) => {
  let nuevoPedido = null;

  try {
    // [2] Procesar datos del pedido (JSON string o Body)
    let pedidoData;
    console.log("📦 [PEDIDO] Body recibido:", req.body);
    console.log("📄 [PEDIDO] Archivo recibido:", req.file ? req.file.filename : "Ninguno");

    if (typeof req.body.pedido === 'string') {
      try {
        pedidoData = JSON.parse(req.body.pedido);
        console.log("📋 [PEDIDO] Datos parseados (JSON):", pedidoData);
      } catch (error) {
        console.error("❌ [PEDIDO] Error parseando JSON:", error.message);
        return res.status(400).json({
          error: 'Datos del pedido inválidos',
          details: error.message
        });
      }
    } else {
      pedidoData = req.body;
      console.log("📋 [PEDIDO] Datos obtenidos (Body directo):", pedidoData);
    }

    // [3] Extraer campos del objeto pedidoData
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

    // [4] Validar Total numérico y mayor a cero
    const totalLimpio = parseFloat(Total);
    if (isNaN(totalLimpio) || totalLimpio <= 0) {
      return res.status(400).json({ error: "Total inválido o no numérico" });
    }

    // [5] Validar que existan detalles en el pedido
    if (!Array.isArray(detalle) || detalle.length === 0) {
      return res.status(400).json({ error: "El pedido debe contener al menos un producto" });
    }

    // [6] Procesar archivo de voucher si existe (Cloudinary)
    let voucherUrl = null;
    if (req.file) {
      voucherUrl = req.file.path;
    }

    // [7] Procesar fecha de registro - ✅ CORREGIDO: fecha local para evitar día +1
    const fechaProcesada = FechaRegistro
      ? FechaRegistro.split("T")[0]
      : new Date().toLocaleDateString('es-CO', {
          timeZone: 'America/Bogota',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).split('/').reverse().join('-');

    // [8] Determinar si es landing o admin
    const esLanding = Origen === 'cliente';
    const estadoInicial = "pendiente";

    // [9] Crear encabezado del pedido en el modelo
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

    // [10] Iterar e insertar detalles del pedido
    console.log(`🛒 [PEDIDO] Procesando ${detalle.length} detalles...`);
    for (let i = 0; i < detalle.length; i++) {
      const item = detalle[i];

      const ProductoId = item.ProductoId || null;
      const ServicioId = item.ServicioId || null;
      const Cantidad = item.Cantidad ? parseInt(item.Cantidad) : 1;
      const Precio = parseFloat(item.PrecioUnitario || item.Precio || 0);
      const ColorId = item.ColorId || null;
      const Descripcion = item.Descripcion || null;
      const UrlImagen = item.UrlImagen ? item.UrlImagen.trim() : null;

      // [11] Validar integridad de cada detalle
      if (!ProductoId && !ServicioId) {
        throw new Error(`Detalle ${i + 1}: Se requiere ProductoId o ServicioId`);
      }
      if (Cantidad <= 0) {
        throw new Error(`Detalle ${i + 1}: Cantidad inválida (${Cantidad})`);
      }
      if (isNaN(Precio) || Precio <= 0) {
        throw new Error(`Detalle ${i + 1}: Precio inválido (${Precio})`);
      }

      // [12] Intentar crear detalle en BD
      await createDetallePedidoModel({
        PedidoClienteId: nuevoPedido.PedidoClienteId,
        ProductoId,
        ServicioId,
        Cantidad,
        Precio,
        ColorId,
        Descripcion,
        UrlImagen
      });
    }
    console.log("✅ [PEDIDO] Detalles insertados correctamente.");

    // ✅✅✅ CORRECCIÓN PRINCIPAL: Crear venta inmediata para pedidos de cliente con transferencia/QR
    if (Origen === 'cliente' && ['transferencia', 'qr'].includes(MetodoPago?.toLowerCase())) {
      try {
        console.log(`💰 [VENTA] Creando venta pendiente directamente para pedido: ${nuevoPedido.PedidoClienteId}`);

        // Verificar que no exista ya una venta para este pedido
        const [ventaExistenteCheck] = await dbPool.execute(
          "SELECT VentaId FROM ventas WHERE PedidoClienteId = ?",
          [nuevoPedido.PedidoClienteId]
        );

        if (ventaExistenteCheck.length === 0) {
          const { v4: uuidv4Venta } = await import('uuid');
          const nuevoVentaId = uuidv4Venta();

          // Obtener datos del cliente si está registrado
          let clienteNombreVenta = null;
          let clienteTelefonoVenta = null;
          let clienteCorreoVenta = null;

          if (ClienteId) {
            try {
              const cliente = await getClienteByIdModel(ClienteId);
              if (cliente) {
                clienteNombreVenta = cliente.NombreCompleto || `${cliente.Nombre || ''} ${cliente.Apellido || ''}`.trim();
                clienteTelefonoVenta = cliente.Telefono || null;
                clienteCorreoVenta = cliente.CorreoElectronico || null;
              }
            } catch (clienteErr) {
              console.warn(`⚠️ [VENTA] No se pudo obtener datos del cliente:`, clienteErr.message);
            }
          }

          // Insertar la venta con estado 'pendiente'
          await dbPool.execute(
            `INSERT INTO ventas (
              VentaId, Origen, PedidoClienteId, ClienteId, ClienteNombre,
              ClienteTelefono, ClienteCorreo, UsuarioVendedorId, FechaVenta,
              Subtotal, IVA, Total, Estado, Voucher
            ) VALUES (?, 'pedido', ?, ?, ?, ?, ?, NULL, NOW(), ?, 0, ?, 'pendiente', NULL)`,
            [
              nuevoVentaId,
              nuevoPedido.PedidoClienteId,
              ClienteId || null,
              clienteNombreVenta,
              clienteTelefonoVenta,
              clienteCorreoVenta,
              totalLimpio,
              totalLimpio
            ]
          );

          // Insertar los detalles de la venta
          for (const item of detalle) {
            const detalleVentaId = uuidv4Venta();
            const tipoItem = item.ProductoId ? 'producto' : 'servicio';
            const cantidadDet = parseInt(item.Cantidad) || 1;
            const precioDet = parseFloat(item.PrecioUnitario || item.Precio || 0);
            const subtotalDet = parseFloat((cantidadDet * precioDet).toFixed(2));

            // Obtener nombre del producto/servicio
            let nombreSnapshot = '';
            if (item.ProductoId) {
              try {
                const [prod] = await dbPool.execute("SELECT Nombre FROM productos WHERE ProductoId = ?", [item.ProductoId]);
                nombreSnapshot = prod[0]?.Nombre || 'Producto';
              } catch { nombreSnapshot = 'Producto'; }
            } else if (item.ServicioId) {
              try {
                const [serv] = await dbPool.execute("SELECT Nombre FROM servicios WHERE ServicioId = ?", [item.ServicioId]);
                nombreSnapshot = serv[0]?.Nombre || 'Servicio';
              } catch { nombreSnapshot = 'Servicio'; }
            }

            await dbPool.execute(
              `INSERT INTO detalleventas (
                DetalleVentaId, VentaId, TipoItem, ProductoId, ServicioId,
                NombreSnapshot, Cantidad, PrecioUnitario, Descuento, Subtotal, ColorId, DescripcionPersonalizada
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
              [
                detalleVentaId,
                nuevoVentaId,
                tipoItem,
                item.ProductoId || null,
                item.ServicioId || null,
                nombreSnapshot,
                cantidadDet,
                precioDet,
                subtotalDet,
                item.ColorId || null,
                item.Descripcion || null
              ]
            );
          }

          console.log(`✅ [VENTA] Venta creada con estado 'pendiente': ${nuevoVentaId}`);
        } else {
          console.log(`ℹ️ [VENTA] Ya existe venta para pedido ${nuevoPedido.PedidoClienteId}: ${ventaExistenteCheck[0].VentaId}`);
        }
      } catch (ventaError) {
        console.error(`❌ [PEDIDO] Error al crear venta inicial (pedido NO afectado):`, ventaError);
        // No lanzamos error para no romper el flujo del pedido
      }
    }
    // 🔥 IMPORTANTE: Si es admin o es contra_entrega/efectivo, NO creamos venta aquí.
    // La venta se creará en updatePedidoCliente cuando el admin cambie el estado.

    // [13] Obtener pedido completo con detalles para respuesta
    const pedidoCompleto = await getPedidoClienteByIdModel(nuevoPedido.PedidoClienteId);
    pedidoCompleto.detalle = await getDetallePedidoByPedidoIdModel(nuevoPedido.PedidoClienteId);

    // [14] Validar si requiere envío de correo al cliente (PROTEGIDO)
    if (pedidoCompleto.ClienteId) {
      try {
        const cliente = await getClienteByIdModel(pedidoCompleto.ClienteId);
        if (cliente?.CorreoElectronico) {
          // [15] Enviar correo informativo
          await sendPedidoEstadoEmail(
            cliente.CorreoElectronico,
            cliente.NombreCompleto || `${cliente.Nombre} ${cliente.Apellido}`,
            nuevoPedido.PedidoClienteId,
            pedidoCompleto.Estado,
            "Tu pedido ha sido recibido y está pendiente de confirmación"
          );
          console.log(`✉️ [PEDIDO] Correo enviado a ${cliente.CorreoElectronico}`);
        }
      } catch (emailError) {
        console.error("⚠️ [PEDIDO] Error enviando correo informativo:", emailError.message);
      }
    }

    // [16] Retornar respuesta exitosa 201
    res.status(201).json(pedidoCompleto);

  } catch (error) {
    // [17] Manejo de errores durante la creación
    console.error(" Error al crear pedido:", error.message);

    // [18] Rollback manual: eliminar pedido si se crearon partes
    if (nuevoPedido?.PedidoClienteId) {
      try {
        await deleteDetallesByPedidoIdModel(nuevoPedido.PedidoClienteId);
        await deletePedidoClienteModel(nuevoPedido.PedidoClienteId);
      } catch (cleanupError) {
        console.error(" Error limpiando pedido huérfano:", cleanupError);
      }
    }

    // [20] Retornar error de servidor
    res.status(500).json({
      error: "Error al crear el pedido",
      message: error.message
    });
  }
};

export const updatePedidoCliente = async (req, res) => {
  const { id } = req.params;
  let updates = { ...req.body };

  try {
    // [2] Log de inicio y procesamiento de updates (JSON string o Body)
    console.log(' [PEDIDOS] ===== INICIANDO ACTUALIZACIÓN =====');
    console.log(' ID del pedido:', id);
    if (typeof updates.pedido === 'string') {
      updates = JSON.parse(updates.pedido);
    }
    console.log(' Updates recibidos:', updates);
    console.log(' Archivo recibido:', req.file);

    // [3] Obtener estado actual del pedido
    const pedidoActual = await getPedidoClienteByIdModel(id);
    if (!pedidoActual) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    // [4] Separar detalles del objeto de actualización
    let detallesRequest = null;
    if (updates.detalle) {
      detallesRequest = updates.detalle;
      delete updates.detalle;
    }

    // [5] Procesar nuevo voucher si se adjuntó archivo (Cloudinary)
    if (req.file) {
      updates.Voucher = req.file.path;
    }

    // [6] Validar cambio de estado según método de pago
    if (updates.Estado) {
      const nuevoEstado = updates.Estado;

      if (pedidoActual.MetodoPago === "transferencia" ||
        pedidoActual.MetodoPago === "efectivo" ||
        pedidoActual.MetodoPago === "QR" ||
        pedidoActual.MetodoPago === "qr") {
        const estadosPermitidos = ['pendiente', 'aprobado', 'finalizado', 'cancelado'];
        if (!estadosPermitidos.includes(nuevoEstado)) {
          return res.status(400).json({
            message: `Para ${pedidoActual.MetodoPago}, estado debe ser: ${estadosPermitidos.join(', ')}`
          });
        }
      }
      else if (pedidoActual.MetodoPago === "contra_entrega") {
        const estadosPermitidosContraEntrega = ['pendiente', 'en_proceso', 'en_camino', 'entregado', 'cancelado'];
        if (!estadosPermitidosContraEntrega.includes(nuevoEstado)) {
          return res.status(400).json({
            message: `Para contra entrega, estado debe ser: ${estadosPermitidosContraEntrega.join(', ')}`
          });
        }
      }
    }

    // [7] Validar y limpiar campo Total si existe
    if (updates.Total !== undefined) {
      const totalLimpio = parseFloat(updates.Total);
      if (!isNaN(totalLimpio)) {
        updates.Total = totalLimpio;
      }
    }

    // [8] Ejecutar actualización de encabezado en el modelo
    const result = await updatePedidoClienteModel(id, updates);

    // [9] Actualizar detalles si se proporcionaron nuevos
    if (detallesRequest && Array.isArray(detallesRequest)) {
      console.log(` Actualizando ${detallesRequest.length} detalles del pedido...`);
      // [10] Eliminar detalles anteriores
      await deleteDetallesByPedidoIdModel(id);
      
      // [11] Insertar nuevos detalles
      for (let i = 0; i < detallesRequest.length; i++) {
        const item = detallesRequest[i];
        
        const ProductoId = item.ProductoId?.trim() ? item.ProductoId : null;
        const ServicioId = item.ServicioId?.trim() ? item.ServicioId : null;
        
        await createDetallePedidoModel({
          DetallePedidoClienteId: item.DetallePedidoClienteId || uuidv4(),
          PedidoClienteId: id,
          ProductoId: ProductoId,
          ServicioId: ServicioId,
          Cantidad: item.Cantidad ? parseInt(item.Cantidad) : 1,
          Precio: parseFloat(item.Precio) || 0,
          ColorId: item.ColorId || null,
          Tamaño: null,
          Descripcion: item.Descripcion || null,
          UrlImagen: item.UrlImagen || null,
          UrlImagenPersonalizada: null,
          Subtotal: parseFloat(((item.Cantidad || 1) * (item.Precio || 0)).toFixed(2))
        });
      }
    }

    // [12] Obtener pedido actualizado con detalles
    const updated = await getPedidoClienteByIdModel(id);
    updated.detalle = await getDetallePedidoByPedidoIdModel(id);

    // ✅✅✅ CORRECCIÓN PRINCIPAL: Actualizar/crear venta cuando el admin cambia el estado
    if (updates.Estado && pedidoActual.Estado !== updates.Estado) {
      try {
        const [ventaExistente] = await dbPool.execute(
          "SELECT VentaId FROM ventas WHERE PedidoClienteId = ?",
          [id]
        );

        if (ventaExistente.length > 0) {
          // ✅ La venta ya existe: solo actualizamos su estado
          let nuevoEstadoVenta = 'pendiente';
          
          if (pedidoActual.MetodoPago === 'contra_entrega') {
            nuevoEstadoVenta = updates.Estado === 'entregado' ? 'pagado' : updates.Estado;
          } else {
            nuevoEstadoVenta = updates.Estado === 'aprobado' ? 'pagado' : updates.Estado;
          }
          
          await dbPool.execute(
            "UPDATE ventas SET Estado = ? WHERE PedidoClienteId = ?",
            [nuevoEstadoVenta, id]
          );
          updated.ventaActualizada = { id: ventaExistente[0].VentaId, nuevoEstado: nuevoEstadoVenta };
          console.log(`✅ [VENTA] Estado actualizado a '${nuevoEstadoVenta}' para venta ${ventaExistente[0].VentaId}`);
          
        } else {
          // 🛡️ Fallback: si no existe la venta, la creamos
          if ((pedidoActual.MetodoPago === 'contra_entrega' && updates.Estado === 'entregado') ||
              (['transferencia', 'efectivo', 'QR', 'qr'].includes(pedidoActual.MetodoPago?.toLowerCase()) && updates.Estado === 'aprobado')) {
            
            console.warn(`⚠️ [VENTA] Venta no encontrada para pedido ${id}, creando fallback...`);
            const resultadoVenta = await crearVentaDesdePedidoId(id, null);
            updated.ventaCreada = { 
              id: resultadoVenta.VentaId, 
              estado: (pedidoActual.MetodoPago === 'contra_entrega' && updates.Estado === 'entregado') ? 'pagado' : 'pendiente' 
            };
          }
        }
      } catch (ventaError) {
        console.error(' Error al gestionar venta:', ventaError);
        updated.errorVenta = ventaError.message;
      }
    }

    // [17] Notificar cambio de estado por correo electrónico
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
          console.log(` Correo para estado '${updates.Estado}' enviado correctamente`);
        }).catch(err => {
          console.error(` Error enviando correo para estado '${updates.Estado}':`, err);
        });
      } else {
        console.log(' No se pudo enviar correo: no hay destinatario');
      }
    }

    // [20] Notificar recepción de voucher por correo si aplica
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

    // [22] Retornar objeto de pedido actualizado
    res.json(updated);

  } catch (error) {
    console.error(' [PEDIDOS] Error:', error);
    res.status(500).json({
      message: 'Error al actualizar el pedido',
      error: error.message
    });
  }
};


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


export const getMisPedidos = async (req, res) => {
  try {
    const clienteId = req.query.clienteId || req.user?.CedulaId;
    if (!clienteId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const pedidos = await getAllPedidosClientesModel(clienteId);

    for (let p of pedidos) {
      p.detalle = await getDetallePedidoByPedidoIdModel(p.PedidoClienteId);

      if (p.EsVenta) {
        p.EstadoParaMostrar = p.EstadoVenta; 
      } else {
        p.EstadoParaMostrar = p.Estado;
      }
    }

    res.status(200).json(pedidos);
  } catch (error) {
    console.error("Error al obtener mis pedidos:", error);
    res.status(500).json({ error: "Error al obtener tus pedidos" });
  }
};


export const uploadVoucherToPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    const pedidoExistente = await getPedidoClienteByIdModel(id);
    if (!pedidoExistente) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const voucherUrl = file.path;

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
        console.error(' Error enviando email de voucher:', emailError);
      }
    }

    res.json({
      success: true,
      voucher: voucherUrl,
      data: pedidoActualizado
    });
  } catch (error) {
    console.error('Error subiendo voucher:', error);
    res.status(500).json({ error: 'Error al subir voucher' });
  }
};