import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export const initializeAdminUser = async (connection, roles) => {
    // Verificar si ya existe un usuario administrador
    const [admins] = await connection.execute(
        'SELECT * FROM usuarios WHERE RoleId = ?',
        [roles['Administrador']]
    );

    if (admins.length === 0) {
        // Obtener un TipoDocumento para el admin (Cédula de Ciudadanía)
        const [tipoDoc] = await connection.execute(
            "SELECT TipoDocumentoId FROM tipodocumento WHERE Nombre = 'Cédula de Ciudadanía' LIMIT 1"
        );

        const tipoDocumentoId = tipoDoc.length > 0 ? tipoDoc[0].TipoDocumentoId : null;

        // Configuración del administrador
        const adminConfig = {
            cedula: "1000000000",
            nombre: 'Administrador',
            telefono: '0000000000',
            email: 'admin@gmail.com',
            direccion: 'N/A',
            password: 'admin123'
        };

        // Encriptar contraseña
        const hash = await bcrypt.hash(adminConfig.password, 10);

        // Crear usuario administrador
        await connection.execute(
            `INSERT INTO usuarios 
   (CedulaId, TipoDocumentoId, NombreCompleto, Telefono, CorreoElectronico, Direccion, Contrasena, RoleId, IsSystem)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [
                adminConfig.cedula,
                tipoDocumentoId,
                adminConfig.nombre,
                adminConfig.telefono,
                adminConfig.email,
                adminConfig.direccion,
                hash,
                roles['Administrador']
            ]
        );


        console.log('    Usuario administrador creado exitosamente.');
        console.log('   ============================================');
        console.log('    Credenciales de acceso:');
        console.log(`    Correo: ${adminConfig.email}`);
        console.log(`    Contraseña: ${adminConfig.password}`);
        console.log('   ============================================');
        console.log('    IMPORTANTE: Cambia la contraseña después del primer inicio de sesión.');

    } else {
        console.log('    Usuario administrador ya existe en el sistema.');
        console.log(`    Total de administradores: ${admins.length}`);
    }
};