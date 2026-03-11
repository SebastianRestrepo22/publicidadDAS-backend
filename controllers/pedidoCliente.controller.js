import { sendPedidoEstadoEmail, sendVoucherEmail } from "../utils/email.js";
import {
  getAllPedidosClientesModel,
  getPedidoClienteByIdModel,
  createPedidoClienteModel,
  updatePedidoClienteModel,
  deletePedidoClienteModel,
  getClienteByIdModel,
} from "../models/pedidoCliente.model.js";
import {
  createDetallePedidoModel,
  getDetallePedidoByPedidoIdModel,
  deleteDetallePedidoModel,
  deleteDetallesByPedidoIdModel
} from "../models/detallePedidoCliente.model.js";
import { crearVentaDesdePedidoId } from "./ventas.controller.js";
import QRCode from "qrcode";
import { getAllColoresDB } from "../models/color.model.js";
import { v4 as uuidv4 } from "uuid";
import fs from 'fs';
import { dbPool } from "../lib/db.js";

// ========================================
// 📎 SUBIR VOUCHER A PEDIDO
// ========================================
export const uploadVoucherToPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    console.log('📥 [CONTROLLER] Recibida petición para subir voucher a pedido:', id);
    console.log('📎 Archivo recibido:', file ? file.originalname : 'No hay archivo');

    if (!file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    // Verificar que el pedido existe
    const pedidoExistente = await getPedidoClienteByIdModel(id);
    if (!pedidoExistente) {
      console.log('❌ Pedido no encontrado:', id);
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error eliminando archivo huérfano:', err);
      });
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Construir URL del voucher
    const protocol = req.protocol;
    const host = req.get('host');
    const voucherUrl = `${protocol}://${host}/uploads/vouchers/${file.filename}`;

    console.log('📝 Actualizando pedido con voucher:', voucherUrl);

    // Actualizar el pedido con el voucher
    const result = await updatePedidoClienteModel(id, { Voucher: voucherUrl });

    if (result.affectedRows === 0) {
      throw new Error('No se pudo actualizar el pedido');
    }

    // Obtener el pedido actualizado con detalles
    const pedidoActualizado = await getPedidoClienteByIdModel(id);
    pedidoActualizado.detalle = await getDetallePedidoByPedidoIdModel(id);

    // Enviar email de confirmación al cliente
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
          console.log('📧 Email de voucher enviado');
        }
      } catch (emailError) {
        console.error('⚠️ Error enviando email de voucher:', emailError);
      }
    }

    console.log('✅ Pedido actualizado con voucher exitosamente');

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

// ========================================
// ✅ CREAR PEDIDO - MANEJA FORMDATA Y JSON PURO
// ========================================
export const createPedidoCliente = async (req, res) => {
  let nuevoPedido = null;

  try {
    console.log('🔍 [CONTROLLER] Creando pedido...');
    console.log('📁 Archivo recibido:', req.file);
    console.log('📦 Body recibido:', req.body);

    // 🔄 Detectar si viene como FormData (con archivo) o JSON puro
    let pedidoData;
    if (typeof req.body.pedido === 'string') {
      try {
        pedidoData = JSON.parse(req.body.pedido);
      } catch (error) {
        console.error('❌ Error parseando JSON del pedido (FormData):', error);
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
      detalle = []
    } = pedidoData;

    // 🔥 CORRECCIÓN: Validar y sanitizar el Total
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
      console.log('✅ URL del voucher:', voucherUrl);
    }

    // Procesar fecha
    const fechaProcesada = FechaRegistro
      ? FechaRegistro.split("T")[0]
      : new Date().toISOString().split("T")[0];

    // 🔥 CORRECCIÓN: Usar totalLimpio ya validado
    nuevoPedido = await createPedidoClienteModel({
      ClienteId: ClienteId || null,
      FechaRegistro: fechaProcesada,
      Total: totalLimpio,  // ✅ Valor ya parseado y validado
      MetodoPago,
      Voucher: voucherUrl || null,
      NombreRecibe: NombreRecibe || null,
      TelefonoEntrega: TelefonoEntrega || null,
      DireccionEntrega: DireccionEntrega || null,
      Estado,
      TipoCliente,
      ClienteNombre: ClienteNombre || null,
      ClienteTelefono: ClienteTelefono || null,
      ClienteCorreo: ClienteCorreo || null
    });

    console.log("✅ Pedido creado:", nuevoPedido.PedidoClienteId);

    // Crear detalles del pedido
    for (let i = 0; i < detalle.length; i++) {
      const item = detalle[i];

      console.log(`📝 [BACKEND] Procesando detalle ${i + 1}:`, {
        ProductoId: item.ProductoId,
        ServicioId: item.ServicioId,
        UrlImagen: item.UrlImagen,
        UrlImagenPersonalizada: item.UrlImagenPersonalizada,
        tipoUrlImagen: typeof item.UrlImagenPersonalizada,
        tieneImagenPersonalizada: !!item.UrlImagenPersonalizada
      });


      const ProductoId = item.ProductoId || null;
      const ServicioId = item.ServicioId || null;
      const Cantidad = item.Cantidad ? parseInt(item.Cantidad) : 1;

      // 🔥 CORRECCIÓN: Sanitizar precio del detalle
      const Precio = parseFloat(item.PrecioUnitario || item.Precio || 0);

      const ColorId = item.ColorId || null;
      const Tamaño = ServicioId
        ? (item.Tamaño ?? item.DimensionesId ?? "Mediana")
        : null;
      const Descripcion = item.Descripcion || null;

      // 🔴 IMPORTANTE: Separar imagen por defecto de imagen personalizada
      const UrlImagen = item.UrlImagen ? item.UrlImagen.trim() : null;
      const UrlImagenPersonalizada = item.UrlImagenPersonalizada || null;

      const Subtotal = parseFloat((Cantidad * Precio).toFixed(2));

      // Validar campos requeridos
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
        Precio,  // ✅ Ya es número válido
        ColorId,
        Tamaño,
        Descripcion,
        UrlImagen,
        UrlImagenPersonalizada, // 🔴 IMAGEN DEL CLIENTE
        Subtotal
      });

      console.log(`✅ Detalle ${i + 1} creado - Subtotal: $${Subtotal}`);
    }

    // Obtener pedido completo con detalles
    const pedidoCompleto = await getPedidoClienteByIdModel(nuevoPedido.PedidoClienteId);
    pedidoCompleto.detalle = await getDetallePedidoByPedidoIdModel(nuevoPedido.PedidoClienteId);

    // Enviar email de confirmación
    if (pedidoCompleto.ClienteId) {
      const cliente = await getClienteByIdModel(pedidoCompleto.ClienteId);
      if (cliente?.CorreoElectronico) {
        await sendPedidoEstadoEmail(
          cliente.CorreoElectronico,
          cliente.NombreCompleto || `${cliente.Nombre} ${cliente.Apellido}`,
          nuevoPedido.PedidoClienteId,
          "pendiente",
          "Tu pedido ha sido recibido y está en proceso"
        );
      }
    }

    console.log("🎉 Pedido completado exitosamente");
    res.status(201).json(pedidoCompleto);

  } catch (error) {
    console.error("❌ Error al crear pedido:", error.message);

    // Limpiar pedido huérfano
    if (nuevoPedido?.PedidoClienteId) {
      try {
        console.log(`🗑️ Eliminando detalles del pedido huérfano: ${nuevoPedido.PedidoClienteId}`);
        await deleteDetallesByPedidoIdModel(nuevoPedido.PedidoClienteId);

        console.log(`🗑️ Eliminando pedido huérfano: ${nuevoPedido.PedidoClienteId}`);
        await deletePedidoClienteModel(nuevoPedido.PedidoClienteId);
        console.log(`✅ Pedido huérfano eliminado`);
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

// ✅ ACTUALIZAR PEDIDO - CON ENVÍO DE CORREO AUTOMÁTICO
// ========================================
export const updatePedidoCliente = async (req, res) => {
  const { id } = req.params;
  let updates = { ...req.body };

  // Declarar variables al inicio del ámbito de la función
  let destinatario = null;
  let nombreCliente = 'Cliente';

  try {
    console.log('🔍 [PEDIDOS] ===== INICIANDO ACTUALIZACIÓN =====');
    console.log('📦 ID del pedido (PedidoClienteId):', id);
    console.log('📦 Updates recibidos:', updates);
    console.log('📦 Nuevo estado:', updates.Estado);

    // Validar que el estado sea uno de los permitidos
    if (updates.Estado) {
      const estadosPermitidos = ['pendiente', 'aprobado', 'cancelado', 'entregado'];
      if (!estadosPermitidos.includes(updates.Estado)) {
        return res.status(400).json({
          message: `Estado no válido. Debe ser: ${estadosPermitidos.join(', ')}`
        });
      }
    }

    // Obtener el pedido actual ANTES de actualizar
    const pedidoActual = await getPedidoClienteByIdModel(id);
    if (!pedidoActual) {
      console.log('❌ [PEDIDOS] Pedido no encontrado');
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    console.log('📦 Pedido actual:', {
      id: pedidoActual.PedidoClienteId,
      estado: pedidoActual.Estado,
      total: pedidoActual.Total,
      tipoCliente: pedidoActual.TipoCliente
    });

    // Guardar el estado anterior para comparar
    const estadoAnterior = pedidoActual.Estado;
    const nuevoEstado = updates.Estado;

    // 🔥 CORRECCIÓN: Si se está actualizando el Total, sanitizarlo
    if (updates.Total !== undefined) {
      const totalLimpio = parseFloat(updates.Total);
      if (!isNaN(totalLimpio)) {
        updates.Total = totalLimpio;
        console.log('🔧 Total sanitizado:', updates.Total);
      }
    }

    // Actualizar el pedido
    const result = await updatePedidoClienteModel(id, updates);
    console.log('✅ Resultado de actualización:', result);

    // Obtener el pedido actualizado
    const updated = await getPedidoClienteByIdModel(id);
    updated.detalle = await getDetallePedidoByPedidoIdModel(id);

    console.log('📦 Pedido actualizado:', {
      id: updated.PedidoClienteId,
      nuevoEstado: updated.Estado,
      total: updated.Total
    });

    // ===== ENVIAR CORREO AL CLIENTE SI EL ESTADO CAMBIÓ =====
    if (nuevoEstado && estadoAnterior !== nuevoEstado) {
      console.log(`📧 [EMAIL] Estado cambió de "${estadoAnterior}" a "${nuevoEstado}". Enviando correo...`);

      try {
        // Determinar el destinatario del correo
        destinatario = null;
        nombreCliente = 'Cliente';

        // Caso 1: Cliente registrado
        if (updated.ClienteId) {
          const cliente = await getClienteByIdModel(updated.ClienteId);
          if (cliente) {
            destinatario = cliente.CorreoElectronico;
            nombreCliente = cliente.NombreCompleto || `${cliente.Nombre} ${cliente.Apellido}`;
          }
        }
        // Caso 2: Cliente walk-in con correo
        else if (updated.ClienteCorreo) {
          destinatario = updated.ClienteCorreo;
          nombreCliente = updated.ClienteNombre || 'Cliente';
        }
        // Caso 3: Correo en datos de entrega (si existe)
        else if (updated.CorreoEntrega) {
          destinatario = updated.CorreoEntrega;
          nombreCliente = updated.NombreRecibe || 'Cliente';
        }

        console.log('📧 Destinatario:', destinatario);
        console.log('📧 Nombre cliente:', nombreCliente);

        // Enviar correo si tenemos destinatario
        if (destinatario) {
          // Enviar de forma asíncrona (no esperar)
          sendPedidoEstadoEmail(
            destinatario,
            nombreCliente,
            id,
            nuevoEstado,
            updates.motivo || '' // Para cancelación u otros estados que requieran motivo
          ).catch(err => console.error('Error en envío de correo:', err));

          console.log(`📧 Correo encolado para ${destinatario}`);
        } else {
          console.log('⚠️ No se pudo determinar destinatario para el correo');
        }
      } catch (emailError) {
        console.error('⚠️ Error preparando envío de correo:', emailError);
        // No interrumpimos el flujo principal si falla el correo
      }
    }

    // ===== SI EL ESTADO ES "aprobado", CREAR VENTA =====
    if (updated.Estado === 'aprobado') {
      console.log('🎯 [PEDIDOS] Estado "aprobado" detectado. Intentando crear venta...');

      try {
        // ✅ Usar null para UsuarioVendedorId (se asignará después)
        const usuarioVendedorId = null;
        console.log('👤 UsuarioVendedorId será null (se asignará después en el módulo de ventas)');

        // 🔥 DEBUG: Log del total antes de crear la venta
        console.log('💰 [DEBUG] Total que se pasará a crear venta:', {
          pedidoId: updated.PedidoClienteId,
          totalPedido: updated.Total,
          tipoTotal: typeof updated.Total,
          detallesCount: updated.detalle?.length || 0,
          sumaDetalles: updated.detalle?.reduce((acc, d) => acc + (Number(d.Cantidad) * Number(d.Precio)), 0)
        });

        // Verificar si ya existe una venta para este pedido
        const [ventaExistente] = await dbPool.execute(
          "SELECT VentaId FROM ventas WHERE PedidoClienteId = ?",
          [id]
        );

        if (ventaExistente.length > 0) {
          console.log('⚠️ Ya existe una venta para este pedido:', ventaExistente[0].VentaId);
          updated.ventaCreada = {
            id: ventaExistente[0].VentaId,
            yaExiste: true,
            mensaje: 'La venta ya había sido creada anteriormente'
          };
        } else {
          // Llamar a la función para crear venta (con usuarioVendedorId = null)
          console.log('🚀 Llamando a crearVentaDesdePedidoId con PedidoClienteId:', id);
          console.log('🚀 UsuarioVendedorId:', usuarioVendedorId);

          const resultadoVenta = await crearVentaDesdePedidoId(id, usuarioVendedorId);

          console.log('✅ RESULTADO DE CREACIÓN DE VENTA:', JSON.stringify(resultadoVenta, null, 2));

          updated.ventaCreada = {
            id: resultadoVenta.VentaId,
            estado: 'pagado',
            mensaje: 'Venta generada automáticamente'
          };

          // También enviar factura por correo si se creó la venta
          if (destinatario) {
            try {
              const { sendVentaFacturaEmail } = await import('../utils/email.js');
              sendVentaFacturaEmail(
                destinatario,
                nombreCliente,
                resultadoVenta.VentaId,
                updated.Total,
                updated.detalle.map(d => ({
                  ...d,
                  NombreSnapshot: d.ProductoId ?
                    (productos?.find(p => p.ProductoId === d.ProductoId)?.Nombre || 'Producto') :
                    (servicios?.find(s => s.ServicioId === d.ServicioId)?.Nombre || 'Servicio')
                }))
              ).catch(err => console.error('Error enviando factura:', err));
            } catch (facturaError) {
              console.error('Error enviando factura:', facturaError);
            }
          }
        }

      } catch (ventaError) {
        console.error('❌ [PEDIDOS] ERROR AL CREAR VENTA:');
        console.error('❌ Mensaje:', ventaError.message);
        console.error('❌ Stack:', ventaError.stack);

        updated.errorVenta = {
          mensaje: ventaError.message,
          stack: ventaError.stack
        };
      }
    } else {
      console.log('⏭️ [PEDIDOS] Estado no es "aprobado", no se crea venta');
    }

    console.log('✅ [PEDIDOS] ===== ACTUALIZACIÓN COMPLETADA =====');
    res.json({
      ...updated,
      correoEnviado: destinatario ? true : false,
      mensajeCorreo: destinatario ?
        `Notificación enviada a ${destinatario}` :
        'No se pudo enviar notificación (cliente sin correo)'
    });

  } catch (error) {
    console.error('❌ [PEDIDOS] ERROR GENERAL:');
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({
      message: 'Error al actualizar el pedido.',
      error: error.message
    });
  }
};

// ========================================
// 📋 OBTENER TODOS LOS PEDIDOS
// ========================================
export const getPedidosClientes = async (req, res) => {
  try {
    console.log('🔍 [CONTROLLER] Obteniendo todos los pedidos...');

    const pedidos = await getAllPedidosClientesModel();

    console.log(`✅ [CONTROLLER] Pedidos obtenidos: ${pedidos.length}`);

    // Manejar errores al obtener detalles individualmente
    for (let p of pedidos) {
      try {
        p.detalle = await getDetallePedidoByPedidoIdModel(p.PedidoClienteId);
        console.log(`   📋 Pedido ${p.PedidoClienteId}: ${p.detalle.length} detalles`);
      } catch (detalleError) {
        console.error(`   ⚠️ Error obteniendo detalles para pedido ${p.PedidoClienteId}:`, detalleError.message);
        p.detalle = [];
      }
    }

    res.status(200).json(pedidos);
  } catch (error) {
    console.error("❌ [CONTROLLER] Error al obtener pedidos:", error);
    res.status(500).json({
      error: "Error al obtener pedidos",
      details: error.message,
      sqlError: error.code
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
    const pedidos = await getAllPedidosClientesModel();
    const pedidosDelCliente = pedidos.filter(p => p.ClienteId === clienteId);
    for (let p of pedidosDelCliente) {
      p.detalle = await getDetallePedidoByPedidoIdModel(p.PedidoClienteId);
    }
    res.status(200).json(pedidosDelCliente);
  } catch (error) {
    console.error("Error al obtener mis pedidos:", error);
    res.status(500).json({ error: "Error al obtener tus pedidos" });
  }
};

