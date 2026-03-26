import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,           
  secure: false,       
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 15000,   
  greetingTimeout: 15000, 
  socketTimeout: 30000,
});

//  Verificar conexión al iniciar la app (opcional pero recomendado)
transporter.verify(function (error, success) {
  if (error) {
    console.error("⚠️ Error de conexión SMTP:", error);
  } else {
    console.log(" Servidor SMTP listo para enviar correos");
  }
});

export const sendResetPasswordEmail = async (correo, token) => {
  try {
    const frontendBaseUrl = process.env.FRONTEND_URL;
    const resetUrl = `${frontendBaseUrl}/reset-password/${token}`;

    const info = await transporter.sendMail({
      from: `"Gestión de Usuarios" <${process.env.EMAIL_USER}>`,
      to: correo,
      subject: "🚀 ¡Bienvenido! Establece tu contraseña",
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Establecer Contraseña</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f7fa; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; color: white; }
            .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .content { padding: 40px 30px; }
            .welcome-text { font-size: 18px; margin-bottom: 20px; color: #2d3748; }
            .highlight { background-color: #f7fafc; border-left: 4px solid #4299e1; padding: 15px; margin: 25px 0; border-radius: 4px; }
            .button-container { text-align: center; margin: 35px 0; }
            .reset-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4); }
            .reset-button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(102, 126, 234, 0.5); }
            .link-alternative { font-size: 14px; color: #718096; margin-top: 15px; word-break: break-all; }
            .expiry-note { background-color: #fffaf0; border: 1px solid #fed7d7; border-radius: 8px; padding: 15px; margin-top: 30px; text-align: center; color: #c53030; }
            .steps { margin: 30px 0; padding-left: 20px; }
            .steps li { margin-bottom: 12px; color: #4a5568; }
            .footer { background-color: #f7fafc; padding: 20px; text-align: center; color: #718096; font-size: 14px; border-top: 1px solid #e2e8f0; }
            .security-note { font-size: 12px; color: #a0aec0; margin-top: 15px; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🔐 Gestión de Usuarios</div>
              <h1 style="margin: 10px 0 0 0; font-weight: 300;">¡Tu cuenta ha sido creada!</h1>
            </div>
            
            <div class="content">
              <p class="welcome-text">Hola,</p>
              
              <p>Nos complace informarte que tu cuenta en nuestro sistema ha sido creada exitosamente. 
              Para completar tu registro y acceder a todas las funcionalidades, debes establecer tu contraseña.</p>
              
              <div class="highlight">
                <strong>📋 Información importante:</strong>
                <p>Este enlace es personal e intransferible. Por seguridad, no lo compartas con nadie.</p>
              </div>
              
              <div class="button-container">
                <a href="${resetUrl}" class="reset-button">
                  🚀 Establecer mi contraseña
                </a>
                <p class="link-alternative">
                  Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                  <a href="${resetUrl}" style="color: #4299e1;">${resetUrl}</a>
                </p>
              </div>
              
              <div class="expiry-note">
                ⏰ <strong>IMPORTANTE:</strong> Este enlace expirará en 1 hora por motivos de seguridad.
              </div>
              
              <h3 style="color: #2d3748; margin-top: 30px;">¿Qué hacer a continuación?</h3>
              <ol class="steps">
                <li>Haz clic en el botón "Establecer mi contraseña"</li>
                <li>Crea una contraseña segura (mínimo 8 caracteres)</li>
                <li>Confirma tu nueva contraseña</li>
                <li>¡Listo! Podrás acceder a tu cuenta inmediatamente</li>
              </ol>
              
              <p style="color: #4a5568; margin-top: 25px;">
                <strong>💡 Consejo de seguridad:</strong><br>
                Usa una contraseña que combine letras mayúsculas, minúsculas, números y símbolos.
              </p>
            </div>
            
            <div class="footer">
              <p>Este correo fue enviado automáticamente como parte del proceso de creación de cuenta.</p>
              <p>Si no solicitaste crear una cuenta, puedes ignorar este mensaje con seguridad.</p>
              <p class="security-note">
                🔒 Por tu seguridad, nunca te pediremos tu contraseña por correo electrónico.
              </p>
              <p style="margin-top: 15px; font-size: 12px; color: #cbd5e0;">
                © ${new Date().getFullYear()} Gestión de Usuarios. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
¡BIENVENIDO/A A GESTIÓN DE USUARIOS!

Nos complace informarte que tu cuenta ha sido creada exitosamente. 
Para completar tu registro y acceder a todas las funcionalidades, debes establecer tu contraseña.

ENLACE PARA ESTABLECER CONTRASEÑA:
${resetUrl}

📋 INFORMACIÓN IMPORTANTE:
- Este enlace es personal e intransferible
- Por seguridad, no lo compartas con nadie
- ⏰ El enlace expira en 1 hora

PASOS A SEGUIR:
1. Haz clic en el enlace de arriba
2. Crea una contraseña segura (mínimo 8 caracteres)
3. Confirma tu nueva contraseña
4. ¡Listo! Podrás acceder a tu cuenta inmediatamente

💡 CONSEJO DE SEGURIDAD:
Usa una contraseña que combine letras mayúsculas, minúsculas, números y símbolos.

---
🔒 Por tu seguridad, nunca te pediremos tu contraseña por correo electrónico.

Este correo fue enviado automáticamente como parte del proceso de creación de cuenta.
Si no solicitaste crear una cuenta, puedes ignorar este mensaje con seguridad.

© ${new Date().getFullYear()} Gestión de Usuarios. Todos los derechos reservados.
      `,
    });

    return true;
  } catch (error) {
    console.error("❌ Error enviando correo de bienvenida:", error.message);
    // No lances error para no bloquear el flujo principal
    return false;
  }
};

//  NOTIFICAR CAMBIO DE ESTADO DE PEDIDO (ACTUALIZADO CON ESTADOS DE CONTRA ENTREGA)
export const sendPedidoEstadoEmail = async (to, nombreCliente, pedidoId, nuevoEstado, motivo = "") => {

  if (nuevoEstado) {
    console.log("🚨 Caracteres uno por uno:");
    for (let i = 0; i < nuevoEstado.length; i++) {
      console.log(`  [${i}]: '${nuevoEstado[i]}' (código: ${nuevoEstado.charCodeAt(i)})`);
    }
  }

  let subject = "";
  let html = "";
  let icono = "";
  let color = "";

  switch (nuevoEstado) {
    case "pendiente":
      subject = `📄 Pedido #${pedidoId} recibido`;
      icono = "📄";
      color = "#f59e0b";
      html = `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 48px;">📦</div>
        </div>
        <p>Hola ${nombreCliente} 👋,</p>
        <p>Hemos recibido tu pedido <strong>#${pedidoId}</strong> y está en revisión.</p>
        <p>Te notificaremos cuando sea aprobado o cuando comience el proceso de envío.</p>
        <div style="background-color: #fef3c7; padding: 12px; border-radius: 8px; margin-top: 15px;">
          <p style="margin: 0; font-size: 13px; color: #92400e;">⏳ Estado actual: <strong>Pendiente de revisión</strong></p>
        </div>
      `;
      break;

    case "aprobado":
      subject = ` Pedido #${pedidoId} aprobado`;
      icono = "";
      color = "#10b981";
      html = `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 48px;"></div>
        </div>
        <p>¡Hola ${nombreCliente}!</p>
        <p>Tu pedido <strong>#${pedidoId}</strong> ha sido <strong style="color: #10b981;">aprobado</strong>.</p>
        <p>Ahora pasará a producción o preparación para envío.</p>
        <div style="background-color: #d1fae5; padding: 12px; border-radius: 8px; margin-top: 15px;">
          <p style="margin: 0; font-size: 13px; color: #065f46;">🚀 Próximo paso: Preparación del pedido</p>
        </div>
      `;
      break;

    //  NUEVO ESTADO: EN PROCESO (Contra Entrega)
    case "en_proceso":
      subject = `🏭 Pedido #${pedidoId} en proceso de producción`;
      icono = "🏭";
      color = "#8b5cf6";
      html = `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 48px;">🏭</div>
        </div>
        <p>¡Hola ${nombreCliente}!</p>
        <p>Tu pedido <strong>#${pedidoId}</strong> está siendo <strong style="color: #8b5cf6;">procesado</strong>.</p>
        <p>Nuestro equipo está trabajando en la producción o preparación de tus productos.</p>
        <div style="background-color: #ede9fe; padding: 12px; border-radius: 8px; margin-top: 15px;">
          <p style="margin: 0; font-size: 13px; color: #5b21b6;">⚙️ Estado: En producción/preparación</p>
        </div>
        <p style="margin-top: 15px; font-size: 13px; color: #6b7280;">Te avisaremos cuando tu pedido esté listo para enviar.</p>
      `;
      break;

    //  NUEVO ESTADO: EN CAMINO (Contra Entrega)
    case "en_camino":
      subject = `🚚 Pedido #${pedidoId} en camino`;
      icono = "🚚";
      color = "#f97316";
      html = `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 48px;">🚚</div>
        </div>
        <p>¡Excelentes noticias, ${nombreCliente}!</p>
        <p>Tu pedido <strong>#${pedidoId}</strong> está <strong style="color: #f97316;">en camino</strong> hacia tu dirección.</p>
        <p>El tiempo estimado de entrega es de 2-5 días hábiles.</p>
        ${motivo ? `<p><strong>Información adicional:</strong> ${motivo}</p>` : ""}
        <div style="background-color: #ffedd5; padding: 12px; border-radius: 8px; margin-top: 15px;">
          <p style="margin: 0; font-size: 13px; color: #9a3412;">📍 Tu pedido está siendo transportado</p>
        </div>
      `;
      break;

    case "entregado":
      subject = `📦 Pedido #${pedidoId} entregado`;
      icono = "📦";
      color = "#10b981";
      html = `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 48px;">🎉</div>
        </div>
        <p>¡Gracias por tu confianza, ${nombreCliente}!</p>
        <p>Tu pedido <strong>#${pedidoId}</strong> ha sido <strong style="color: #10b981;">entregado satisfactoriamente</strong>.</p>
        <p>Esperamos que disfrutes tus productos. ¡Te esperamos pronto nuevamente!</p>
        <div style="background-color: #d1fae5; padding: 12px; border-radius: 8px; margin-top: 15px;">
          <p style="margin: 0; font-size: 13px; color: #065f46;">⭐ ¡Gracias por comprar con nosotros!</p>
        </div>
      `;
      break;

    case "cancelado":
      subject = `❌ Pedido #${pedidoId} cancelado`;
      icono = "❌";
      color = "#ef4444";
      html = `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 48px;">⚠️</div>
        </div>
        <p>Hola ${nombreCliente},</p>
        <p>Informamos que tu pedido <strong>#${pedidoId}</strong> ha sido <strong style="color: #ef4444;">cancelado</strong>.</p>
        ${motivo ? `<p><strong>Motivo:</strong> ${motivo}</p>` : ""}
        <div style="background-color: #fee2e2; padding: 12px; border-radius: 8px; margin-top: 15px;">
          <p style="margin: 0; font-size: 13px; color: #991b1b;">Si tienes dudas o crees que esto es un error, por favor contáctanos.</p>
        </div>
      `;
      break;

    case "finalizado":
      subject = `✨ Pedido #${pedidoId} finalizado`;
      icono = "✨";
      color = "#6b7280";
      html = `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 48px;">✨</div>
        </div>
        <p>Hola ${nombreCliente},</p>
        <p>Tu pedido <strong>#${pedidoId}</strong> ha sido <strong style="color: #6b7280;">finalizado</strong>.</p>
        <p>Gracias por confiar en nosotros. Esperamos verte pronto.</p>
      `;
      break;

    default:
      return; // No enviar para estados no manejados
  }


  if (!subject) {
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"PublicidadDAS" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f5f7fa;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
              padding: 30px 20px;
              text-align: center;
              color: white;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .content {
              padding: 30px;
            }
            .status-badge {
              display: inline-block;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 20px;
            }
            .footer {
              background-color: #f8fafc;
              padding: 20px;
              text-align: center;
              color: #7b899c;
              font-size: 12px;
              border-top: 1px solid #edf1f5;
            }
            .button {
              display: inline-block;
              background-color: #3b82f6;
              color: white;
              text-decoration: none;
              padding: 12px 24px;
              border-radius: 8px;
              margin-top: 20px;
              font-weight: 500;
            }
            hr {
              border: none;
              border-top: 1px solid #e2e8f0;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">PublicidadDAS</div>
              <p style="margin: 5px 0 0; opacity: 0.9;">Tu pedido ha sido actualizado</p>
            </div>
            
            <div class="content">
              <div style="text-align: center;">
                <span class="status-badge" style="background-color: ${color}20; color: ${color}; border: 1px solid ${color}40;">
                  ${icono} ${nuevoEstado === 'pendiente' ? 'Pendiente' :
          nuevoEstado === 'aprobado' ? 'Aprobado' :
            nuevoEstado === 'en_proceso' ? 'En Proceso' :
              nuevoEstado === 'en_camino' ? 'En Camino' :
                nuevoEstado === 'entregado' ? 'Entregado' :
                  nuevoEstado === 'finalizado' ? 'Finalizado' :
                    nuevoEstado === 'cancelado' ? 'Cancelado' : nuevoEstado}
                </span>
              </div>
              
              ${html}
              
              <hr />
              
              <div style="text-align: center; margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/mis-pedidos" class="button">
                  Ver mis pedidos
                </a>
              </div>
              
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
                ¿Tienes preguntas? Contáctanos a través de nuestra página web.
              </p>
            </div>
            
            <div class="footer">
              <p>Este es un mensaje automático. No respondas a este correo.</p>
              <p>© ${new Date().getFullYear()} PublicidadDAS. Todos los derechos reservados.</p>
              <p style="font-size: 10px; margin-top: 10px;">
                PublicidadDAS - Soluciones en Publicidad y Marketing
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    console.error(`❌ Error al enviar correo de estado '${nuevoEstado}':`, error.message);
    console.error(`❌ Error completo:`, error);
    // No detener la app si falla el correo
  }
};


// Envía el voucher de pago al cliente
export const sendVoucherEmail = async (to, nombreCliente, pedidoId, voucherUrl) => {
  const subject = `📄 Voucher de pago - Pedido #${pedidoId}`;
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Voucher de Pago - PublicidadDAS</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f7fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px 20px; text-align: center; color: white; }
        .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .content { padding: 30px; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
        .voucher-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
        .button { display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">PublicidadDAS</div>
          <p style="margin: 5px 0 0; opacity: 0.9;">Comprobante de pago</p>
        </div>
        
        <div class="content">
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #1e293b;">¡Gracias por tu pedido!</h2>
            <p style="color: #475569;">Aquí tienes tu comprobante de pago</p>
          </div>

          <div class="voucher-card">
            <p><strong>Pedido #${pedidoId}</strong></p>
            <p><strong>Cliente:</strong> ${nombreCliente}</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleDateString("es-CO")}</p>
            <hr style="margin: 15px 0;" />
            <a href="${voucherUrl}" target="_blank" class="button">
              📎 Ver comprobante
            </a>
          </div>

          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <h3 style="margin-top: 0; color: #0d47a1;">📋 Próximos pasos</h3>
            <ol style="padding-left: 20px; margin: 0;">
              <li>Revisaremos tu comprobante de pago</li>
              <li>Una vez verificado, tu pedido pasará a producción</li>
              <li>Recibirás notificaciones por correo sobre el estado de tu pedido</li>
            </ol>
          </div>
        </div>

        <div class="footer">
          <p>Este es un mensaje automático. No respondas a este correo.</p>
          <p>© ${new Date().getFullYear()} PublicidadDAS. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"PublicidadDAS" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("❌ Error al enviar voucher por correo:", error.message);
  }
};

// ENVÍA FACTURA DE VENTA
export const sendVentaFacturaEmail = async (to, nombreCliente, ventaId, total, detalles) => {
  // Formateo de moneda colombiana
  const formatterCOP = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  const totalFormateado = formatterCOP.format(total);

  // Calcular subtotal e IVA (19%)
  const subtotal = total / 1.19;
  const iva = total - subtotal;

  // Número de factura formateado (últimos 8 dígitos del UUID)
  const facturaNumero = ventaId.toString().replace(/-/g, '').slice(-8).toUpperCase();

  // Fecha actual formateada
  const fechaActual = new Date().toLocaleDateString("es-CO", {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Generar HTML de los detalles
  const detallesHtml = detalles.map((det, index) => {
    // Determinar variante
    let varianteTexto = '';

    if (det.TipoItem === 'producto' && det.ColorId) {
      const colorNombre = det.ColorNombre || 'Color no especificado';
      varianteTexto = `
       <tr>
        <td colspan="4" style="padding: 0 8px 8px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
             <tr>
              <td width="20" style="padding: 0;">
                <div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${det.ColorHex || '#000'}; border: 1px solid #333;"></div>
               </td>
              <td style="padding: 0 0 0 5px; font-size: 11px; color: #555;">Color: ${colorNombre}</td>
             </tr>
           </table>
         </td>
       </tr>`;
    } else if (det.TipoItem === 'servicio' && det.NombreTamano) {
      const tamanoNombre = det.NombreTamano || 'Tamaño no especificado';
      varianteTexto = `
       <tr>
        <td colspan="4" style="padding: 0 8px 8px 8px;">
          <span style="background-color: #f0f0f0; color: #333; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 500; border: 1px solid #ccc; display: inline-block;">Tamaño: ${tamanoNombre}</span>
         </td>
       </tr>`;
    }
    return `
    <tr style="${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}">
      <td colspan="4" style="padding: 12px 8px 4px 8px; font-weight: 600; color: #222; border-top: 1px solid #e0e0e0;">${det.NombreSnapshot || det.Nombre}</td>
    </tr>
    ${varianteTexto}
    <tr style="${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}">
      <td width="60%" style="padding: 4px 8px 12px 8px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
           <tr>
            <td style="font-size: 11px; color: #555;">Cantidad:</td>
            <td style="font-size: 12px; font-weight: 500; color: #222; padding-left: 5px;">${det.Cantidad}</td>
           </tr>
         </table>
       </td>
      <td width="20%" style="padding: 4px 8px 12px 8px; text-align: right;">
        <div style="font-size: 11px; color: #555;">P.Unit:</div>
        <div style="font-size: 11px; font-weight: 500; color: #222; white-space: nowrap;">${formatterCOP.format(det.PrecioUnitario)}</div>
       </td>
      <td width="20%" style="padding: 4px 8px 12px 8px; text-align: right;">
        <div style="font-size: 11px; color: #555;">Total:</div>
        <div style="font-size: 12px; font-weight: 600; color: #000; white-space: nowrap;">${formatterCOP.format(det.Subtotal)}</div>
       </td>
    </tr>
  `;
  }).join('');

  const subject = `Factura de Venta No. ${facturaNumero} - PublicidadDAS`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Factura de Venta - PublicidadDAS</title>
      <style>
        /* Reset y estilos base */
        body, table, td, p {
          margin: 0;
          padding: 0;
          font-family: 'Helvetica', 'Arial', sans-serif;
          line-height: 1.4;
        }
        
        /* Estilos de impresión */
        @media print {
          body { background: white; }
          .no-print { display: none; }
          table { page-break-inside: avoid; }
        }
        
        /* Responsive */
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; }
          .stack { display: block !important; width: 100% !important; }
          .text-right-mobile { text-align: left !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
      
      <!-- CONTENEDOR PRINCIPAL -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
         <tr>
          <td align="center" style="padding: 10px;">
            
            <!-- CARD PRINCIPAL - ESTILO B/N -->
            <table class="container" width="100%" max-width="700" cellpadding="0" cellspacing="0" border="0" style="max-width: 700px; width: 100%; background-color: #ffffff; border: 1px solid #cccccc; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
              
              <!-- ENCABEZADO - SIN COLORES -->
              <tr>
                <td style="border-bottom: 2px solid #333; padding: 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td class="stack" style="vertical-align: top;" width="60%">
                        <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #000; letter-spacing: -0.5px;">PublicidadDAS</h1>
                        <p style="margin: 5px 0 0; color: #555; font-size: 12px;">Soluciones en Publicidad y Marketing</p>
                       </td>
                      <td class="stack text-right-mobile" style="vertical-align: top; text-align: right;" width="40%">
                        <p style="margin: 0 0 3px; color: #333; font-size: 12px;"><strong>NIT:</strong> 901.234.567-8</p>
                        <p style="margin: 0; color: #333; font-size: 12px;">Régimen Común</p>
                       </td>
                     </tr>
                   </table>
                 </td>
               </tr>

              <!-- TÍTULO Y NÚMERO -->
              <tr>
                <td style="padding: 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td class="stack" style="vertical-align: bottom;" width="60%">
                        <h2 style="margin: 0; color: #000; font-size: 22px; font-weight: 600;">FACTURA DE VENTA</h2>
                        <p style="margin: 3px 0 0; color: #666; font-size: 11px;">Documento equivalente a factura electrónica</p>
                       </td>
                      <td class="stack text-right-mobile" style="vertical-align: bottom; text-align: right;" width="40%">
                        <table cellpadding="0" cellspacing="0" border="1" style="border-collapse: collapse; border-color: #ccc; width: 100%;">
                          <tr>
                            <td style="padding: 8px; text-align: center; background-color: #f0f0f0;">
                              <div style="font-size: 10px; color: #555;">No. FACTURA</div>
                              <div style="font-size: 18px; font-weight: bold; color: #000; letter-spacing: 1px;">${facturaNumero}</div>
                             </td>
                           </tr>
                        </table>
                       </td>
                     </tr>
                   </table>
                 </td>
               </tr>

              <!-- INFORMACIÓN DEL CLIENTE -->
              <tr>
                <td style="padding: 0 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="1" style="border-collapse: collapse; border-color: #ccc; border-style: solid;">
                    <tr>
                      <td style="padding: 15px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td class="stack" style="vertical-align: top; padding-right: 15px;" width="50%">
                              <h3 style="margin: 0 0 10px; color: #000; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">DATOS DEL CLIENTE</h3>
                              <p style="margin: 0 0 3px; color: #333; font-size: 12px;"><strong>Nombre:</strong> ${nombreCliente}</p>
                              <p style="margin: 0 0 3px; color: #333; font-size: 12px; word-break: break-all;"><strong>Email:</strong> ${to}</p>
                             </td>
                            <td class="stack" style="vertical-align: top; padding-left: 15px;" width="50%">
                              <h3 style="margin: 0 0 10px; color: #000; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">DETALLES</h3>
                              <p style="margin: 0 0 3px; color: #333; font-size: 12px;"><strong>Fecha:</strong> ${fechaActual}</p>
                              <p style="margin: 0; color: #333; font-size: 12px;">
                                <strong>Estado:</strong> 
                                <span style="border: 1px solid #000; padding: 2px 8px; font-size: 10px; font-weight: bold; margin-left: 5px;">PAGADA</span>
                              </p>
                             </td>
                           </tr>
                        </table>
                       </td>
                     </tr>
                   </table>
                 </td>
               </tr>

              <!-- DETALLE DE PRODUCTOS -->
              <tr>
                <td style="padding: 20px;">
                  <h3 style="margin: 0 0 15px; color: #000; font-size: 16px; border-bottom: 2px solid #333; padding-bottom: 5px;">DETALLE DE PRODUCTOS Y SERVICIOS</h3>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                    <!-- Encabezado B/N -->
                    <tr>
                      <td colspan="4" style="background-color: #333;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="60%" style="padding: 10px 8px; color: white; font-size: 12px; font-weight: 600;">DESCRIPCIÓN</td>
                            <td width="15%" style="padding: 10px 8px; color: white; font-size: 12px; font-weight: 600; text-align: center;">CANT.</td>
                            <td width="15%" style="padding: 10px 8px; color: white; font-size: 12px; font-weight: 600; text-align: right;">P.UNIT</td>
                            <td width="10%" style="padding: 10px 8px; color: white; font-size: 12px; font-weight: 600; text-align: right;">TOTAL</td>
                           </tr>
                        </table>
                       </td>
                     </tr>

                    <!-- Detalles -->
                    ${detallesHtml}
                   </table>
                 </td>
               </tr>

              <!-- RESUMEN DE VALORES -->
              <tr>
                <td style="padding: 0 20px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="text-align: right;">
                        <table cellpadding="0" cellspacing="0" border="1" style="border-collapse: collapse; border-color: #ccc; width: 100%; max-width: 350px; margin-left: auto;">
                          <tr>
                            <td style="padding: 15px;">
                              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td style="padding-bottom: 8px; border-bottom: 1px solid #ccc;">
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                      <tr>
                                        <td style="color: #555; font-size: 12px;">Subtotal:</td>
                                        <td style="font-weight: 500; text-align: right; font-size: 12px;">${formatterCOP.format(subtotal)}</td>
                                       </tr>
                                    </table>
                                   </td>
                                 </tr>
                                 <tr>
                                  <td style="padding: 8px 0; border-bottom: 1px solid #ccc;">
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                      <tr>
                                        <td style="color: #555; font-size: 12px;">IVA (19%):</td>
                                        <td style="font-weight: 500; text-align: right; font-size: 12px;">${formatterCOP.format(iva)}</td>
                                       </tr>
                                    </table>
                                   </td>
                                 </tr>
                                 <tr>
                                  <td style="padding-top: 10px;">
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                      <tr>
                                        <td style="font-size: 16px; font-weight: bold; color: #000;">TOTAL:</td>
                                        <td style="font-size: 18px; font-weight: bold; color: #000; text-align: right;">${totalFormateado}</td>
                                       </tr>
                                    </table>
                                   </td>
                                 </tr>
                              </table>
                             </td>
                           </tr>
                        </table>
                       </td>
                     </tr>
                   </table>
                 </td>
               </tr>

              <!-- PIE DE PÁGINA -->
              <tr>
                <td style="background-color: #f5f5f5; padding: 20px; border-top: 2px solid #333;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding-bottom: 10px;">
                        <h4 style="margin: 0 0 8px; color: #000; font-size: 13px;">INFORMACIÓN IMPORTANTE</h4>
                        <p style="margin: 0 0 2px; color: #555; font-size: 10px;">• Esta factura es válida como comprobante de pago.</p>
                        <p style="margin: 0 0 2px; color: #555; font-size: 10px;">• Los productos/servicios cumplen con las especificaciones acordadas.</p>
                       </td>
                     </tr>
                     <tr>
                      <td style="text-align: center; padding-top: 15px; border-top: 1px solid #ccc;">
                        <p style="margin: 0; color: #777; font-size: 9px;">
                          PublicidadDAS - Medellín
                        </p>
                        <p style="margin: 3px 0 0; color: #777; font-size: 9px;">
                          © ${new Date().getFullYear()} PublicidadDAS - Documento generado electrónicamente
                        </p>
                       </td>
                     </tr>
                   </table>
                 </td>
               </tr>
            </table>
           </td>
         </tr>
       </table>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"PublicidadDAS - Facturación" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Error al enviar factura por correo:", error.message);
    return false;
  }
};

// ENVÍA NOTIFICACIÓN DE ANULACIÓN
export const sendVentaAnuladaEmail = async (to, nombreCliente, ventaId, total) => {
  const totalFormateado = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0
  }).format(total);

  const subject = `⚠️ Venta anulada #${ventaId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #e74c3c;">
        <h1 style="color: #2d3748; margin: 0;">PublicidadDAS</h1>
        <p style="color: #666; margin-top: 5px;">Notificación de anulación</p>
      </div>
      
      <div style="padding: 30px; background: white; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="color: #c0392b;">Venta anulada</h2>
          <p style="color: #666;">Hola, ${nombreCliente}</p>
        </div>

        <div style="background-color: #fdeded; padding: 20px; border-radius: 10px; margin-bottom: 25px; border-left: 4px solid #e74c3c;">
          <h3 style="margin-top: 0; color: #c0392b;">Información importante</h3>
          <p><strong>Factura No.:</strong> ${ventaId}</p>
          <p><strong>Monto:</strong> ${totalFormateado}</p>
          <p><strong>Fecha de anulación:</strong> ${new Date().toLocaleDateString("es-CO")}</p>
        </div>

        <div style="background-color: #fef9e7; padding: 15px; border-radius: 8px;">
          <p style="margin: 0; color: #7d6608;">
            <strong>⚠️ La factura anterior No. ${ventaId} ha sido anulada y no es válida para ningún efecto legal o contable.</strong>
          </p>
          <p style="margin-top: 10px; color: #666;">
            Si realizaste algún pago, será reembolsado en los próximos días hábiles.
          </p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px; color: #718096; font-size: 14px;">
        <p>Este es un mensaje automático.</p>
        <p>© ${new Date().getFullYear()} PublicidadDAS.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"PublicidadDAS" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Error al enviar anulación:", error.message);
    return false;
  }
};

// ENVÍA NOTIFICACIÓN DE RECHAZO DE VENTA (VOUCHER INVÁLIDO / FALTA DE PAGO)
export const sendVentaRechazadaEmail = async (to, nombreCliente, ventaId, total, motivo) => {
  const totalFormateado = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0
  }).format(total);

  const subject = `❌ Venta rechazada #${ventaId} - Problema con el pago`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #e67e22;">
        <h1 style="color: #2d3748; margin: 0;">PublicidadDAS</h1>
        <p style="color: #666; margin-top: 5px;">Notificación de rechazo de venta</p>
      </div>
      
      <div style="padding: 30px; background: white; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="color: #d35400;">Venta rechazada</h2>
          <p style="color: #666;">Hola, ${nombreCliente}</p>
        </div>

        <div style="background-color: #fef5e7; padding: 20px; border-radius: 10px; margin-bottom: 25px; border-left: 4px solid #e67e22;">
          <h3 style="margin-top: 0; color: #b85e00;">Información importante</h3>
          <p><strong>Factura No.:</strong> ${ventaId}</p>
          <p><strong>Monto:</strong> ${totalFormateado}</p>
          <p><strong>Fecha de rechazo:</strong> ${new Date().toLocaleDateString("es-CO")}</p>
          ${motivo ? `<p><strong>Motivo del rechazo:</strong> ${motivo}</p>` : ''}
        </div>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px;">
          <p style="margin: 0; color: #333;">
            <strong>⚠️ La venta No. ${ventaId} ha sido rechazada debido a problemas con el comprobante de pago.</strong>
          </p>
          <p style="margin-top: 10px; color: #666;">
            El voucher proporcionado no pudo ser validado o no se recibió el pago correspondiente.
            Si crees que esto es un error, por favor contáctanos para resolver la situación y darte pronta solucion.
          </p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px; color: #718096; font-size: 14px;">
        <p>Este es un mensaje automático.</p>
        <p>© ${new Date().getFullYear()} PublicidadDAS.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"PublicidadDAS" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Error al enviar notificación de rechazo:", error.message);
    return false;
  }
};