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
  // [1] Inicio y try
  try {
    // [2] Obtener parámetros de paginación y filtros
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filtroCampo = req.query.filtroCampo || null;
    const filtroValor = req.query.filtroValor || null;
    const tipoPago = req.query.tipoPago || null;

    const offset = (page - 1) * limit;
    let whereClause = '';
    let params = [];

    const whereConditions = [];

    // [3] Filtrar por origen distinto de cliente (Removido para que los pedidos de la landing se vean en el admin)
    // whereConditions.push(`p.Origen != 'cliente'`);

    // [4] Validar si hay filtro de tipo de pago
    if (tipoPago) {
      whereConditions.push('p.MetodoPago = ?');
      params.push(tipoPago);
    }

    // [5] Validar si hay filtros de campo y valor
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

    // [6] Aplicar condiciones de método de pago y estado
    whereConditions.push(`(
      p.MetodoPago = 'contra_entrega' 
      OR 
      (p.MetodoPago IN ('transferencia', 'efectivo', 'QR') AND p.Estado != 'aprobado')
    )`);

    // [7] Construir cláusula WHERE
    if (whereConditions.length > 0) {
      whereClause = 'WHERE ' + whereConditions.join(' AND ');
    }

    // [8] Definir query principal
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

    // [9] Ejecutar consulta a la base de datos
    const [rows] = await dbPool.query(query, params);

    // [10] Definir query para conteo total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM pedidosclientes p
      LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId
      ${whereClause}
    `;

    // [11] Ejecutar consulta de conteo
    const [countResult] = await dbPool.execute(countQuery, params);

    // [12] Iterar para obtener detalles de cada pedido
    for (let p of rows) {
      try {
        p.detalle = await getDetallePedidoByPedidoIdModel(p.PedidoClienteId);
      } catch (detalleError) {
        console.error(`⚠️ Error obteniendo detalles para pedido ${p.PedidoClienteId}:`, detalleError.message);
        p.detalle = [];
      }
    }

    // [13] Retornar respuesta exitosa con paginación
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
    // [14] Catch de error general
    console.error('❌ [CONTROLLER] Error al obtener pedidos:', error);
    // [15] Retornar error de servidor
    res.status(500).json({
      error: "Error al obtener pedidos",
      details: error.message
    });
  }
};

export const buscarPedidos = async (req, res) => {
  // [1] Inicio y obtención de parámetros de búsqueda
  const { campo, valor, page = 1, limit = 10, tipoPago } = req.query;

  // [2] Definir columnas permitidas
  const columnasPermitidas = {
    id: 'p.PedidoClienteId',
    cliente: 'COALESCE(u.NombreCompleto, p.ClienteNombre)',
    fecha: 'p.FechaRegistro',
    metodo: 'p.MetodoPago',
    estado: 'p.Estado'
  };

  const columna = columnasPermitidas[campo];

  // [3] Validar columna de búsqueda
  if (!columna) {
    // [15] Retornar error si el campo es inválido
    return res.status(400).json({ message: 'Campo de búsqueda inválido' });
  }

  // [4] Try catch para proceso de búsqueda
  try {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '';
    let params = [];

    const whereConditions = [];

    // [5] Filtrar origen (Removido para que pedidos de landing aparezcan)
    // whereConditions.push(`p.Origen != 'cliente'`);

    // [6] Agregar filtro de búsqueda si existe
    if (campo && valor) {
      whereConditions.push(`${columna} LIKE ?`);
      params.push(`%${valor}%`);
    }

    // [7] Agregar filtro de tipo de pago si existe
    if (tipoPago) {
      whereConditions.push('p.MetodoPago = ?');
      params.push(tipoPago);
    }

    // [8] Condiciones de exclusión de estados aprobados
    whereConditions.push(`(
      p.MetodoPago = 'contra_entrega' 
      OR 
      (p.MetodoPago IN ('transferencia', 'efectivo', 'QR') AND p.Estado != 'aprobado')
    )`);

    // [9] Construir cláusula WHERE
    if (whereConditions.length > 0) {
      whereClause = 'WHERE ' + whereConditions.join(' AND ');
    }

    // [10] Query de búsqueda paginada
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

    // [11] Ejecutar consulta de búsqueda
    const [rows] = await dbPool.query(query, params);

    // [12] Query de conteo total para búsqueda
    const countQuery = `
      SELECT COUNT(*) as total
      FROM pedidosclientes p
      LEFT JOIN usuarios u ON p.ClienteId = u.CedulaId
      ${whereClause}
    `;

    // [13] Ejecutar conteo y obtener detalles
    const [countResult] = await dbPool.execute(countQuery, params);
    for (let p of rows) {
      try {
        p.detalle = await getDetallePedidoByPedidoIdModel(p.PedidoClienteId);
      } catch (detalleError) {
        console.error(`⚠️ Error obteniendo detalles para pedido ${p.PedidoClienteId}:`, detalleError.message);
        p.detalle = [];
      }
    }

    // [14] Retornar resultados de búsqueda
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
    // [16] Manejar error de servidor
    console.error(' [BUSCAR] Error al buscar pedidos:', error);
    // [17] Retornar error 500
    res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};


export const createPedidoCliente = async (req, res) => {
  // [1] Inicio del proceso POST para crear pedido
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
        // [25] Retornar error si los datos son inválidos
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
      // [26] Retornar Error Total Inválido
      return res.status(400).json({ error: "Total inválido o no numérico" });
    }

    // [5] Validar que existan detalles en el pedido
    if (!Array.isArray(detalle) || detalle.length === 0) {
      // [27] Retornar Error Sin Detalles
      return res.status(400).json({ error: "El pedido debe contener al menos un producto" });
    }

    // [6] Procesar archivo de voucher si existe (Cloudinary)
    let voucherUrl = null;
    if (req.file) {
      voucherUrl = req.file.path;
    }

    // [7] Procesar fecha de registro
    const fechaProcesada = FechaRegistro
      ? FechaRegistro.split("T")[0]
      : new Date().toISOString().split("T")[0];

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
        // Solo logueamos el error, NO lanzamos throw para no borrar el pedido
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

    // [19] Nota: Con Cloudinary no es necesario eliminar el archivo físico localmente

    // [20] Retornar error de servidor
    res.status(500).json({
      error: "Error al crear el pedido",
      message: error.message
    });
  }
};

export const updatePedidoCliente = async (req, res) => {
  // [1] Inicio del proceso de actualización de pedido
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
      // [25] Retornar error si el pedido no existe
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
      const estadoAnterior = pedidoActual.Estado;
      const nuevoEstado = updates.Estado;

      if (pedidoActual.MetodoPago === "transferencia" ||
        pedidoActual.MetodoPago === "efectivo" ||
        pedidoActual.MetodoPago === "QR") {
        const estadosPermitidos = ['pendiente', 'aprobado', 'finalizado', 'cancelado'];
        if (!estadosPermitidos.includes(nuevoEstado)) {
          // [26] Error estado no permitido para transferencia/efectivo/QR
          return res.status(400).json({
            message: `Para ${pedidoActual.MetodoPago}, estado debe ser: ${estadosPermitidos.join(', ')}`
          });
        }
      }
      else if (pedidoActual.MetodoPago === "contra_entrega") {
        const estadosPermitidosContraEntrega = ['pendiente', 'en_proceso', 'en_camino', 'entregado', 'cancelado'];
        if (!estadosPermitidosContraEntrega.includes(nuevoEstado)) {
          // [27] Error estado no permitido para contra entrega
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

    // [13] Lógica de creación de venta automática (Transferencia/Efectivo)
    if ((pedidoActual.MetodoPago === "transferencia" || pedidoActual.MetodoPago === "efectivo") &&
      updates.Estado === 'aprobado' && pedidoActual.Estado !== 'aprobado') {
      try {
        const [ventaExistente] = await dbPool.execute(
          "SELECT VentaId FROM ventas WHERE PedidoClienteId = ?",
          [id]
        );

        if (ventaExistente.length === 0) {
          // [14] Generar nueva venta
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
        console.error(' Error al crear venta:', ventaError);
        updated.errorVenta = ventaError.message;
      }
    }

    // [15] Lógica de creación de venta automática (Contra Entrega)
    if (pedidoActual.MetodoPago === "contra_entrega" && updates.Estado === 'entregado' && pedidoActual.Estado !== 'entregado') {
      try {
        const [ventaExistente] = await dbPool.execute(
          "SELECT VentaId FROM ventas WHERE PedidoClienteId = ?",
          [id]
        );

        if (ventaExistente.length === 0) {
          // [16] Generar nueva venta por entrega
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
        console.error(' Error al crear venta para pedido entregado:', ventaError);
        updated.errorVenta = ventaError.message;
      }
    }

    // [17] Notificar cambio de estado por correo electrónico
    if (updates.Estado && pedidoActual.Estado !== updates.Estado) {

      let destinatario = null;
      let nombreCliente = 'Cliente';

      // [18] Identificar destinatario del correo
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

      // [19] Enviar correo si se encontró destinatario
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
        // [21] Enviar email de voucher
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
    // [23] Manejar error de proceso de actualización
    console.error(' [PEDIDOS] Error:', error);

    // [24] Nota: Con Cloudinary no es necesario eliminar el archivo físico localmente

    // [25] Retornar error de servidor
    res.status(500).json({
      message: 'Error al actualizar el pedido',
      error: error.message
    });
  }
};


export const getPedidoClienteById = async (req, res) => {
  // [1] Inicio y try
  try {
    // [2] Buscar pedido por ID en el modelo
    const pedido = await getPedidoClienteByIdModel(req.params.id);
    if (!pedido) {
      // [7] Retornar 404 si no existe
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    // [3] Obtener detalles del pedido
    pedido.detalle = await getDetallePedidoByPedidoIdModel(req.params.id);
    // [4] Retornar pedido con detalles (200)
    res.status(200).json(pedido);
  } catch (error) {
    // [5] Catch error
    console.error("Error al obtener pedido:", error);
    // [6] Retornar error de servidor
    res.status(500).json({ error: "Error al obtener pedido" });
  }
};


export const deletePedidoCliente = async (req, res) => {
  // [1] Inicio y try
  try {
    // [2] Obtener detalles para eliminación en cascada manual
    const detalles = await getDetallePedidoByPedidoIdModel(req.params.id);
    for (let d of detalles) {
      // [3] Eliminar cada detalle
      await deleteDetallePedidoModel(d.DetallePedidoClienteId);
    }
    // [4] Eliminar el encabezado del pedido
    const result = await deletePedidoClienteModel(req.params.id);
    if (result.affectedRows === 0) {
      // [8] Retornar 404 si no se encontró el pedido
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    // [5] Retornar éxito sin contenido (204)
    res.status(204).send();
  } catch (error) {
    // [6] Catch error
    console.error("Error al eliminar pedido:", error);
    // [7] Retornar 500
    res.status(500).json({ error: "Error al eliminar pedido" });
  }
};


export const getMisPedidos = async (req, res) => {
  // [1] Inicio y try de obtención de pedidos propios
  try {
    // [2] Identificar ID de cliente desde el token/usuario
    const clienteId = req.user?.CedulaId;
    if (!clienteId) {
      // [10] Error si no está autenticado
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // [3] Obtener todos los pedidos del cliente
    const pedidos = await getAllPedidosClientesModel(clienteId);

    // [4] Iterar para complementar datos
    for (let p of pedidos) {
      // [5] Cargar detalles
      p.detalle = await getDetallePedidoByPedidoIdModel(p.PedidoClienteId);

      // [6] Determinar estado para mostrar al cliente
      if (p.EsVenta) {
        if (p.MetodoPago?.toLowerCase() !== 'contra_entrega') {
          p.EstadoParaMostrar = p.EstadoVenta; 
        } else {
          p.EstadoParaMostrar = p.EstadoVenta;
        }
      } else {
        p.EstadoParaMostrar = p.Estado;
      }
    }

    // [7] Retornar lista de pedidos (200)
    res.status(200).json(pedidos);
  } catch (error) {
    // [8] Catch error
    console.error("Error al obtener mis pedidos:", error);
    // [9] Retornar 500
    res.status(500).json({ error: "Error al obtener tus pedidos" });
  }
};


export const uploadVoucherToPedido = async (req, res) => {
  // [1] Inicio y try de subida de voucher
  try {
    const { id } = req.params;
    const file = req.file;

    // [2] Validar si se recibió el archivo
    if (!file) {
      // [15] Error si no hay archivo
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    // [3] Verificar existencia del pedido
    const pedidoExistente = await getPedidoClienteByIdModel(id);
    if (!pedidoExistente) {
      // [4] Nota: Con Cloudinary no es necesario eliminar el archivo local
      // [16] Retornar 404
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // [5] Construir URL del voucher (Cloudinary)
    const voucherUrl = file.path;

    // [6] Actualizar voucher en el modelo
    const result = await updatePedidoClienteModel(id, { Voucher: voucherUrl });

    if (result.affectedRows === 0) {
      // [17] Error interno si no hubo afectación
      throw new Error('No se pudo actualizar el pedido');
    }

    // [7] Obtener pedido actualizado para respuesta
    const pedidoActualizado = await getPedidoClienteByIdModel(id);
    pedidoActualizado.detalle = await getDetallePedidoByPedidoIdModel(id);

    // [8] Validar si requiere envío de correo avisando el voucher
    if (pedidoActualizado.ClienteId) {
      try {
        const cliente = await getClienteByIdModel(pedidoActualizado.ClienteId);
        if (cliente?.CorreoElectronico) {
          // [9] Enviar notificación de voucher
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

    // [10] Retornar éxito con datos actualizados
    res.json({
      success: true,
      data: pedidoActualizado
    });
  } catch (error) {
    // [11] Catch de error general
    console.error('Error subiendo voucher:', error);
    // [12] Retornar 500
    res.status(500).json({ error: 'Error al subir voucher' });
  }
};
