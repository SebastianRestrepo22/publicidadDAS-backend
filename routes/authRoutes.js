import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from "crypto";
import nodemailer from "nodemailer";
import { dbPool } from '../lib/db.js';
const router = express.Router();

// Registro
router.post('/register', async (req, res) => {
    const {
        CedulaId,
        TipoDocumentoId,
        NombreCompleto,
        Telefono,
        CorreoElectronico,
        Direccion,
        Contrasena
    } = req.body;

    try {


        // Objeto para acumular errores
        const errors = {};

        // Verifica si el correo ya existe
        const [existente] = await dbPool.execute(
            'SELECT * FROM usuarios WHERE CorreoElectronico = ?',
            [CorreoElectronico]
        );
        if (existente.length > 0) {
            errors.CorreoElectronico = 'Este correo ya está registrado';
        }

        // Verifica si la cédula ya existe
        const [cedulaExistente] = await dbPool.execute(
            'SELECT * FROM usuarios WHERE CedulaId = ?',
            [CedulaId]
        );
        if (cedulaExistente.length > 0) {
            errors.CedulaId = 'Esta cédula ya está registrada';
        }

        // Verifica si el teléfono ya existe
        const [telefonoExistente] = await dbPool.execute(
            'SELECT * FROM usuarios WHERE Telefono = ?',
            [Telefono]
        );
        if (telefonoExistente.length > 0) {
            errors.Telefono = 'Este teléfono ya está registrado';
        }

        // Si hay errores, devolverlos
        if (Object.keys(errors).length > 0) {
            return res.status(409).json({ errors });
        }

        // Busca el rol cliente
        const [roles] = await dbPool.execute(
            'SELECT * FROM roles WHERE Nombre = ?',
            ['cliente']
        );
        if (roles.length === 0) {
            return res.status(400).json({ message: "Rol 'cliente' no encontrado en BD" });

        }

        const rol = roles[0];

        // Hashea contraseña
        const hash = await bcrypt.hash(Contrasena, 10);

        // Crea el usuario
        await dbPool.execute(
            `INSERT INTO usuarios 
        (CedulaId, TipoDocumentoId, NombreCompleto, Telefono, CorreoElectronico, Direccion, Contrasena, RoleId) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [CedulaId, TipoDocumentoId, NombreCompleto, Telefono, CorreoElectronico, Direccion, hash, rol.RoleId]
        );

        res.status(201).json({ message: 'Usuario creado exitosamente' });
    } catch (error) {
        console.error('Error en /register:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { CorreoElectronico, Contrasena } = req.body;

    try {


        const [users] = await dbPool.execute(
            `SELECT u.*, r.Nombre AS RoleNombre, td.Nombre AS TipoDocumentoNombre
             FROM usuarios u
             JOIN roles r ON u.RoleId = r.RoleId
             JOIN tipodocumento td ON u.TipoDocumentoId = td.TipoDocumentoId
             WHERE u.CorreoElectronico = ?`,
            [CorreoElectronico]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario no existe' });
        }

        const user = users[0];

        // 🔥 NUEVO: Verificar si el usuario tiene contraseña (si es NULL, significa que no ha sido establecida)
        if (!user.Contrasena) {
            return res.status(403).json({
                message: 'Debes establecer tu contraseña primero. Revisa tu correo electrónico para el enlace de activación.',
                codigo: 'PASSWORD_NOT_SET'
            });
        }

        const isMatch = await bcrypt.compare(Contrasena, user.Contrasena);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Obtener permisos del usuario
        const [permisos] = await dbPool.execute(
            `SELECT p.Nombre FROM permisos p
             JOIN rol_permisos rp ON p.PermisoId = rp.PermisoId
             WHERE rp.RoleId = ?`,
            [user.RoleId]
        );

        const permisosArray = permisos.map(p => p.Nombre);

        const token = jwt.sign(
            {
                CedulaId: user.CedulaId,
                RoleId: user.RoleId,
                Role: user.RoleNombre,
                Permisos: permisosArray
            },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        );

        res.status(200).json({ token });
    } catch (error) {
        console.error('Error en /login:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Middleware para verificar token
const verifyToken = (req, res, next) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) return res.status(403).json({ message: 'No hay token' });

        const decoded = jwt.verify(token, process.env.JWT_KEY);
        req.userId = decoded.CedulaId;
        req.userRole = decoded.RoleId;
        req.userRoleName = decoded.Role;
        next();
    } catch (err) {
        console.error('Error al verificar token:', err);
        res.status(401).json({ message: 'Token inválido o expirado' });
    }
};

// Dashboard
router.get('/dashboard', verifyToken, async (req, res) => {
    try {


        const [users] = await dbPool.execute(
            `SELECT u.*, r.Nombre AS RoleNombre, td.Nombre AS TipoDocumentoNombre
   FROM usuarios u
   JOIN roles r ON u.RoleId = r.RoleId
   JOIN tipodocumento td ON u.TipoDocumentoId = td.TipoDocumentoId
   WHERE u.CedulaId = ?`,
            [req.userId]
        );


        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario no existe' });
        }

        res.status(200).json({ user: users[0] });
    } catch (error) {
        console.error('Error en /dashboard:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Validar si el correo ya existe
router.get('/validar-correo', async (req, res) => {
    const { correo } = req.query;

    try {

        const [usuarios] = await dbPool.execute(
            'SELECT * FROM usuarios WHERE CorreoElectronico = ?',
            [correo]
        );

        res.status(200).json({ exists: usuarios.length > 0 });
    } catch (error) {
        console.error('Error en /validar-correo:', error);
        res.status(500).json({ message: 'Error al validar correo' });
    }
});

// Validar si la cedula ya existe
router.get('/validar-cedula', async (req, res) => {
    const { cedula } = req.query;

    try {

        const [usuarios] = await dbPool.execute(
            'SELECT * FROM usuarios WHERE CedulaId = ?',
            [cedula]
        );

        res.status(200).json({ exists: usuarios.length > 0 });
    } catch (error) {
        console.error('Error en /validar-cedula:', error);
        res.status(500).json({ message: 'Error al validar la cedula' });
    }
});

// Validar si el telefono ya existe
router.get('/validar-telefono', async (req, res) => {
    const { telefono } = req.query;

    try {

        const [usuarios] = await dbPool.execute(
            'SELECT * FROM usuarios WHERE Telefono = ?',
            [telefono]
        );

        res.status(200).json({ exists: usuarios.length > 0 });
    } catch (error) {
        console.error('Error en /validar-telefono:', error);
        res.status(500).json({ message: 'Error al validar el telefono' });
    }
});

// Solicitar recuperación de contraseña
router.post('/forgot-password', async (req, res) => {
const { correo } = req.body;

    try {
        const [usuarios] = await dbPool.execute(
            'SELECT CedulaId, CorreoElectronico FROM usuarios WHERE CorreoElectronico = ?',
            [correo]
        );
        
        if (usuarios.length === 0) {
            return res.status(404).json({ message: 'Correo no registrado' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');

        // CLAVE: Usar DATE_ADD(UTC_TIMESTAMP()) en lugar de calcular en JS
        const [updateResult] = await dbPool.execute(
            `UPDATE usuarios 
             SET ResetToken = ?, ResetTokenExpire = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR)
             WHERE CorreoElectronico = ?`,
            [resetToken, correo]
        );
        
        if (updateResult.affectedRows === 0) {
            return res.status(500).json({ message: 'No se pudo guardar el token' });
        }

        // Enviar email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

        await transporter.sendMail({
            from: `"Soporte Sistema" <${process.env.EMAIL_USER}>`,
            to: correo,
            subject: '🔐 Solicitud de recuperación de contraseña',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Recuperar Contraseña</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            margin: 0;
                            padding: 0;
                            background-color: #f7fafc;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            background: white;
                            border-radius: 10px;
                            overflow: hidden;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                            border: 1px solid #e2e8f0;
                        }
                        .header {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            padding: 30px 20px;
                            text-align: center;
                            color: white;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 24px;
                            font-weight: 600;
                        }
                        .content {
                            padding: 40px 30px;
                        }
                        .message {
                            font-size: 16px;
                            color: #4a5568;
                            margin-bottom: 25px;
                        }
                        .reset-box {
                            background: #f8fafc;
                            border: 2px dashed #cbd5e0;
                            border-radius: 8px;
                            padding: 25px;
                            text-align: center;
                            margin: 30px 0;
                        }
                        .reset-button {
                            display: inline-block;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            text-decoration: none;
                            padding: 14px 28px;
                            border-radius: 8px;
                            font-weight: 600;
                            font-size: 16px;
                            transition: all 0.3s ease;
                        }
                        .reset-button:hover {
                            transform: translateY(-2px);
                            box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
                        }
                        .token-info {
                            background: #fff5f5;
                            border: 1px solid #fed7d7;
                            border-radius: 6px;
                            padding: 15px;
                            margin-top: 20px;
                            font-size: 14px;
                            color: #c53030;
                            text-align: center;
                        }
                        .help-text {
                            font-size: 14px;
                            color: #718096;
                            margin-top: 20px;
                            text-align: center;
                        }
                        .footer {
                            background: #edf2f7;
                            padding: 20px;
                            text-align: center;
                            color: #718096;
                            font-size: 12px;
                            border-top: 1px solid #e2e8f0;
                        }
                        .warning {
                            background: #fffaf0;
                            border: 1px solid #feebc8;
                            border-radius: 6px;
                            padding: 15px;
                            margin: 20px 0;
                            color: #c05621;
                            font-size: 14px;
                        }
                        .link-alt {
                            word-break: break-all;
                            font-size: 12px;
                            color: #4a5568;
                            margin-top: 10px;
                            padding: 10px;
                            background: #f1f5f9;
                            border-radius: 4px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 Recuperación de Contraseña</h1>
                        </div>
                        
                        <div class="content">
                            <p class="message">Hola,</p>
                            
                            <p class="message">
                                Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. 
                                Si no realizaste esta solicitud, puedes ignorar este correo.
                            </p>
                            
                            <div class="reset-box">
                                <p style="margin-bottom: 20px; color: #2d3748; font-weight: 500;">
                                    Para continuar con el proceso de recuperación, haz clic en el siguiente botón:
                                </p>
                                
                                <a href="${resetUrl}" class="reset-button">
                                    🚀 Restablecer mi contraseña
                                </a>
                                
                                <div class="link-alt">
                                    Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                                    <a href="${resetUrl}" style="color: #4299e1;">${resetUrl}</a>
                                </div>
                            </div>
                            
                            <div class="warning">
                                ⚠️ <strong>Importante:</strong> Este enlace tiene una validez de <strong>15 minutos</strong>. 
                                Por seguridad, no lo compartas con nadie.
                            </div>
                            
                            <p class="help-text">
                                Si tienes problemas para acceder al enlace o necesitas ayuda adicional, 
                                por favor contacta a nuestro equipo de soporte.
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
                            <p>© ${new Date().getFullYear()} PublicidadDAS. Todos los derechos reservados.</p>
                            <p style="margin-top: 10px; font-size: 11px; color: #a0aec0;">
                                🔒 Por tu seguridad, nunca te pediremos tu contraseña por correo electrónico.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            // Versión en texto plano
            text: `
RECUPERACIÓN DE CONTRASEÑA

Hola,

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. 
Si no realizaste esta solicitud, puedes ignorar este correo.

Para continuar con el proceso de recuperación, accede al siguiente enlace:
${resetUrl}

⚠️ IMPORTANTE:
- Este enlace tiene una validez de 15 minutos
- Por seguridad, no lo compartas con nadie
- Si tienes problemas, contacta a nuestro equipo de soporte

Si el botón no funciona, copia y pega este enlace en tu navegador:
${resetUrl}

---
Este es un correo automático, por favor no respondas a este mensaje.
© ${new Date().getFullYear()} Sistema de Gestión. Todos los derechos reservados.

🔒 Por tu seguridad, nunca te pediremos tu contraseña por correo electrónico.
            `
        });

        res.status(200).json({ message: '📧 Correo de recuperación enviado exitosamente' });
    } catch (error) {
        console.error('Error en forgot-password:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Restablecer contraseña
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { nuevaContrasena } = req.body;

    try {
        // Buscar usuario con token válido (usando UTC_TIMESTAMP para consistencia)
        const [usuarios] = await dbPool.execute(
            `SELECT * FROM usuarios 
             WHERE ResetToken = ? 
             AND ResetTokenExpire > UTC_TIMESTAMP()`,  // ← UTC_TIMESTAMP en lugar de NOW()
            [token]
        );

        if (usuarios.length === 0) {
            // Verificar si el token existe pero expiró
            const [expirado] = await dbPool.execute(
                'SELECT ResetTokenExpire FROM usuarios WHERE ResetToken = ?',
                [token]
            );
            
            if (expirado.length > 0) {
                // Limpiar token expirado para seguridad
                await dbPool.execute(
                    'UPDATE usuarios SET ResetToken = NULL, ResetTokenExpire = NULL WHERE ResetToken = ?',
                    [token]
                );
                
                return res.status(400).json({ 
                    message: 'El enlace ha expirado. Por favor, solicita uno nuevo.',
                    codigo: 'TOKEN_EXPIRED'
                });
            }
            
            return res.status(400).json({ message: 'Token inválido o no encontrado', codigo: 'TOKEN_INVALID' });
        }

        const user = usuarios[0];

        // Validar contraseña
        if (!nuevaContrasena || nuevaContrasena.length < 8) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
        }

        // Hashear nueva contraseña
        const hash = await bcrypt.hash(nuevaContrasena, 10);

        // Actualizar contraseña y limpiar token (con nombres correctos)
        await dbPool.execute(
            'UPDATE usuarios SET Contrasena = ?, ResetToken = NULL, ResetTokenExpire = NULL WHERE CedulaId = ?',
            [hash, user.CedulaId]
        );

        res.status(200).json({ message: 'Contraseña actualizada exitosamente' });

    } catch (error) {
        console.error('❌ Error en reset-password:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

export default router;
