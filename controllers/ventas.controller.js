import { v4 as uuidv4 } from "uuid";
import { dbPool } from "../lib/db.js";
import {
  getAllVentasModel,
  getVentaByIdModel,
  createVentaFromPedidoModel,
  createVentaManualModel,
  existeVentaParaPedidoModel,
} from "../models/venta.models.js";
import {
  getDetalleVentaByVentaIdModel,
  createDetallesVentaFromPedidoModel,
  createDetalleVentaManualModel
} from "../models/detalleVentas.models.js";
import { sendVentaFacturaEmail, sendVentaAnuladaEmail } from "../utils/email.js";

export const getVentas = async (req, res) => {
  try {
    const ventas = await getAllVentasModel();
    for (const venta of ventas) {
      venta.detalle = await getDetalleVentaByVentaIdModel(venta.VentaId);
    }
    res.status(200).json(ventas);
  } catch (error) {
    console.error("Error al obtener ventas:", error);
    res.status(500).json({ error: "Error al obtener ventas" });
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

    const [pedidoRows] = await connection.query(
      `SELECT * FROM pedidosclientes WHERE PedidoClienteId = ?`,
      [PedidoClienteId]
    );
    if (pedidoRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    const pedido = pedidoRows[0];

    const [detallesRows] = await connection.query(
      `SELECT * FROM detallepedidosclientes WHERE PedidoClienteId = ?`,
      [PedidoClienteId]
    );
    if (detallesRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: "El pedido no tiene detalles" });
    }

    // Usar el modelo para crear la venta (UsuarioVendedorId puede ser null)
    const result = await createVentaFromPedidoModel(pedido, UsuarioVendedorId || null);

    if (!result.success) {
      await connection.rollback();
      return res.status(400).json({ error: "Error al crear la venta" });
    }

    const VentaId = result.VentaId;

    // Crear los detalles usando el modelo
    await createDetallesVentaFromPedidoModel(connection, VentaId, detallesRows);

    await connection.commit();

    const ventaCreada = await getVentaByIdModel(VentaId);
    const detallesCompletos = await getDetalleVentaByVentaIdModel(VentaId);
    ventaCreada.detalle = detallesCompletos;

    // ENVIAR CORREO DE FACTURA
    if (ventaCreada.ClienteCorreo) {
      try {
        console.log("📧 Enviando factura a:", ventaCreada.ClienteCorreo);
        console.log("📦 Detalles a enviar:", detallesCompletos.length);
        
        await sendVentaFacturaEmail(
          ventaCreada.ClienteCorreo,
          ventaCreada.ClienteNombre || 'Cliente',
          ventaCreada.VentaId,
          ventaCreada.Total,
          detallesCompletos  // Usar detallesCompletos, no ventaCreada.detalle
        );
      } catch (emailError) {
        console.error("❌ Error enviando correo de factura:", emailError);
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
    let ventaData;
    
    // Procesar datos según el tipo de contenido
    if (req.is('multipart/form-data')) {
      if (!req.body.ventaData) {
        return res.status(400).json({ 
          success: false,
          error: "No se recibieron datos de la venta" 
        });
      }
      
      try {
        ventaData = JSON.parse(req.body.ventaData);
        console.log("📦 Datos desde FormData (parseados):", ventaData);
        console.log("📸 Archivos recibidos:", req.files?.length || 0);
      } catch (parseError) {
        console.error("❌ Error parseando ventaData:", parseError);
        return res.status(400).json({ 
          success: false,
          error: "Error al parsear los datos de la venta" 
        });
      }
    } else {
      ventaData = req.body;
      console.log("📦 Datos desde JSON:", ventaData);
    }

    // Validar datos básicos
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

    // INICIAR TRANSACCIÓN
    await connection.beginTransaction();

    // PASO 1: Crear la venta PRIMERO
    const VentaId = await createVentaManualModel(ventaData, connection);

    // PASO 2: Mapear archivos a sus posiciones
    // IMPORTANTE: Los archivos llegan en el MISMO ORDEN que los detalles que los requieren
    let fileIndex = 0;
    const archivosPorDetalle = [];

    // Primero, identificar qué detalles TIENEN archivo (ImagenFile existe en el detalle original)
    for (let i = 0; i < detalles.length; i++) {
      const detalle = detalles[i];
      
      // Si este detalle debería tener un archivo (marcado como 'pendiente')
      if (detalle.UrlImagenPersonalizada === 'pendiente') {
        // Asignar el siguiente archivo disponible
        if (req.files && fileIndex < req.files.length) {
          const archivo = req.files[fileIndex];
          // Construir URL pública del archivo
          const urlArchivo = `${req.protocol}://${req.get('host')}/uploads/${archivo.filename}`;
          archivosPorDetalle[i] = urlArchivo;
          fileIndex++;
          console.log(`✅ Detalle ${i} recibirá archivo: ${urlArchivo}`);
        } else {
          console.warn(`⚠️ Detalle ${i} requiere imagen pero no hay suficientes archivos`);
          archivosPorDetalle[i] = null;
        }
      } else {
        archivosPorDetalle[i] = null;
      }
    }

    // PASO 3: Crear los detalles con las URLs de los archivos
    for (let i = 0; i < detalles.length; i++) {
      const detalle = detalles[i];
      
      // Determinar la URL final de la imagen
      let urlImagen = detalle.UrlImagenPersonalizada;
      
      // Si tiene archivo asignado, usar esa URL
      if (archivosPorDetalle[i]) {
        urlImagen = archivosPorDetalle[i];
      }
      // Si no, mantener la URL original (podría ser una URL externa)
      
      await createDetalleVentaManualModel(connection, {
        VentaId,
        TipoItem: detalle.TipoItem,
        ProductoId: detalle.ProductoId,
        ServicioId: detalle.ServicioId,
        ServicioTamanoId: detalle.ServicioTamanoId,
        NombreSnapshot: detalle.NombreSnapshot,
        Cantidad: parseInt(detalle.Cantidad) || 1,
        PrecioUnitario: parseFloat(detalle.PrecioUnitario) || 0,
        Descuento: detalle.Descuento || 0,
        Subtotal: parseFloat(detalle.Subtotal) || 0,
        ColorId: detalle.ColorId,
        DescripcionPersonalizada: detalle.DescripcionPersonalizada,
        UrlImagenPersonalizada: urlImagen
      });
    }

    // PASO 4: Confirmar TODO
    await connection.commit();

    // ENVIAR CORREO DE FACTURA
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
        console.error("❌ Error enviando correo de factura:", emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: "Venta creada exitosamente",
      VentaId,
      archivosProcesados: fileIndex
    });

  } catch (error) {
    await connection.rollback();
    console.error("❌ Error en createVentaManual:", error);
    
    // Mensaje de error más amigable
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
  const connection = await dbPool.getConnection();
  
  try {
    // Verificar que la venta existe
    const venta = await getVentaByIdModel(id);
    if (!venta) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }
    
    if (venta.Estado === 'anulado') {
      return res.status(400).json({ error: "La venta ya está anulada" });
    }

    // SOLO VALIDAR TIEMPO PARA VENTAS MANUALES
    // Las ventas desde pedido NO tienen límite de tiempo
    if (venta.Origen === 'manual') {
      // VALIDAR TIEMPO DESDE CREACIÓN (1 HORA)
      const fechaVenta = new Date(venta.FechaVenta);
      const ahora = new Date();
      const diferenciaMs = ahora - fechaVenta;
      const diferenciaHoras = diferenciaMs / (1000 * 60 * 60);
      
      const TIEMPO_LIMITE_HORAS = 1; // 1 hora para anular ventas manuales
      
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
    } else {
      console.log(`🕒 Venta desde pedido ${id} - Sin límite de tiempo para anular`);
    }

    // INICIAR TRANSACCIÓN
    await connection.beginTransaction();

    // PASO 2: Actualizar estado
    const [result] = await connection.query(
      "UPDATE ventas SET Estado = 'anulado' WHERE VentaId = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      throw new Error("No se pudo actualizar el estado de la venta");
    }

    await connection.commit();

    const ventaAnulada = await getVentaByIdModel(id);
    ventaAnulada.detalle = await getDetalleVentaByVentaIdModel(id);

    // ENVIAR CORREO DE ANULACIÓN
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
        // No interrumpir el flujo si falla el correo
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
    const detalles = await getDetalleVentaByVentaIdModel(req.params.id);
    res.status(200).json(detalles);
  } catch (error) {
    console.error("Error al obtener detalles:", error);
    res.status(500).json({ error: "Error al obtener detalles" });
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
      `SELECT * FROM pedidosclientes WHERE PedidoClienteId = ?`,
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

    // Usar el modelo para crear la venta (UsuarioVendedorId puede ser null)
    const result = await createVentaFromPedidoModel(pedido, UsuarioVendedorId);

    if (!result.success) {
      await connection.rollback();
      return result;
    }

    const VentaId = result.VentaId;

    // Crear los detalles usando el modelo
    await createDetallesVentaFromPedidoModel(connection, VentaId, detallesRows);

    await connection.commit();

    const ventaCreada = await getVentaByIdModel(VentaId);
    const detallesCompletos = await getDetalleVentaByVentaIdModel(VentaId);
    ventaCreada.detalle = detallesCompletos;

    // ENVIAR CORREO DE FACTURA AQUÍ (esto es lo que faltaba)
    const correoCliente = pedido.ClienteCorreo || ventaCreada.ClienteCorreo;
    const nombreCliente = pedido.ClienteNombre || ventaCreada.ClienteNombre || 'Cliente';

    if (correoCliente) {
      try {
        console.log("📧 [crearVentaDesdePedidoId] Enviando factura a:", correoCliente);
        await sendVentaFacturaEmail(
          correoCliente,
          nombreCliente,
          VentaId,
          ventaCreada.Total,
          detallesCompletos
        );
        console.log("Correo enviado exitosamente");
      } catch (emailError) {
        console.error("Error enviando correo de factura:", emailError);
      }
    }

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