import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from "crypto";
import { dbPool } from '../lib/db.js';
// Importamos las funciones de envío de correos
import { 
  sendResetPasswordEmail, 
  sendPasswordRecoveryEmail 
} from '../utils/email.js';

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
    const errors = {};

    // Verificar correo existente
    const [existente] = await dbPool.execute(
      'SELECT * FROM usuarios WHERE CorreoElectronico = ?',
      [CorreoElectronico]
    );
    if (existente.length > 0) errors.CorreoElectronico = 'Este correo ya está registrado';

    // Verificar cédula
    const [cedulaExistente] = await dbPool.execute(
      'SELECT * FROM usuarios WHERE CedulaId = ?',
      [CedulaId]
    );
    if (cedulaExistente.length > 0) errors.CedulaId = 'Esta cédula ya está registrada';

    // Verificar teléfono
    const [telefonoExistente] = await dbPool.execute(
      'SELECT * FROM usuarios WHERE Telefono = ?',
      [Telefono]
    );
    if (telefonoExistente.length > 0) errors.Telefono = 'Este teléfono ya está registrado';

    if (Object.keys(errors).length > 0) {
      return res.status(409).json({ errors });
    }

    // Obtener rol "cliente"
    const [roles] = await dbPool.execute(
      'SELECT * FROM roles WHERE Nombre = ?',
      ['cliente']
    );
    if (roles.length === 0) {
      return res.status(400).json({ message: "Rol 'cliente' no encontrado en BD" });
    }
    const rol = roles[0];

    // Hashear contraseña
    const hash = await bcrypt.hash(Contrasena, 10);

    // Insertar usuario
    await dbPool.execute(
      `INSERT INTO usuarios 
        (CedulaId, TipoDocumentoId, NombreCompleto, Telefono, CorreoElectronico, Direccion, Contrasena, RoleId) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [CedulaId, TipoDocumentoId, NombreCompleto, Telefono, CorreoElectronico, Direccion, hash, rol.RoleId]
    );

    // Generar token para establecer contraseña (si es necesario)
    // Aquí deberías crear un token de restablecimiento y enviarlo si la contraseña es temporal.
    // En tu flujo actual, el usuario ya ingresa una contraseña, por lo que quizá no necesites enviar correo de bienvenida.
    // Pero si quieres enviar un correo de bienvenida con enlace para establecer contraseña, deberías generar token y usar sendResetPasswordEmail.
    // Por ahora, enviaremos un correo de bienvenida simple:
    const resetToken = crypto.randomBytes(32).toString('hex');
    const [updateResult] = await dbPool.execute(
      `UPDATE usuarios 
       SET ResetToken = ?, ResetTokenExpire = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR)
       WHERE CorreoElectronico = ?`,
      [resetToken, CorreoElectronico]
    );

    if (updateResult.affectedRows > 0) {
      // Enviar correo de bienvenida con el enlace para establecer contraseña
      await sendResetPasswordEmail(CorreoElectronico, resetToken);
    }

    res.status(201).json({ message: 'Usuario creado exitosamente. Revisa tu correo para establecer tu contraseña.' });
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

    // Si no tiene contraseña (es NULL), significa que debe establecerla
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

    const [updateResult] = await dbPool.execute(
      `UPDATE usuarios 
       SET ResetToken = ?, ResetTokenExpire = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR)
       WHERE CorreoElectronico = ?`,
      [resetToken, correo]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(500).json({ message: 'No se pudo guardar el token' });
    }

    // Enviar correo de recuperación usando SendGrid
    const emailSent = await sendPasswordRecoveryEmail(correo, resetToken);

    if (!emailSent) {
      // Si falla el envío, puedes decidir si responder con error o igualmente informar que se intentó
      console.error('Error al enviar correo de recuperación a:', correo);
      return res.status(500).json({ message: 'Error al enviar el correo de recuperación' });
    }

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
    // Buscar usuario con token válido
    const [usuarios] = await dbPool.execute(
      `SELECT * FROM usuarios 
       WHERE ResetToken = ? 
       AND ResetTokenExpire > UTC_TIMESTAMP()`,
      [token]
    );

    if (usuarios.length === 0) {
      // Verificar si el token existe pero expiró
      const [expirado] = await dbPool.execute(
        'SELECT ResetTokenExpire FROM usuarios WHERE ResetToken = ?',
        [token]
      );
      
      if (expirado.length > 0) {
        // Limpiar token expirado
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

    // Actualizar contraseña y limpiar token
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