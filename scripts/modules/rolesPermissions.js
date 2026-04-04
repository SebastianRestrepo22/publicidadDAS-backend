import { v4 as uuidv4 } from 'uuid';

// Configuración de permisos del sistema - AJUSTADO PARA COINCIDIR EXACTAMENTE CON LOS PERMISOS REQUERIDOS EN EL SIDEBAR ACTIVO
const SYSTEM_PERMISSIONS = [
    // Dashboard / Gráficos
    { Nombre: 'ver_dashboard', Descripcion: 'Ver gráficos estadísticos del sistema', Modulo: 'Dashboard' },

    // Roles
    { Nombre: 'ver_roles', Descripcion: 'Ver lista de roles', Modulo: 'Roles' },
    { Nombre: 'gestionar_roles', Descripcion: 'Crear, editar o eliminar roles', Modulo: 'Roles' },

    // Usuarios
    { Nombre: 'ver_usuarios', Descripcion: 'Ver lista de usuarios', Modulo: 'Usuarios' },
    { Nombre: 'gestionar_usuarios', Descripcion: 'Crear, editar o eliminar usuarios', Modulo: 'Usuarios' },

    // Categorías
    { Nombre: 'ver_categorias', Descripcion: 'Ver lista de categorías', Modulo: 'Categorias' },
    { Nombre: 'gestionar_categorias', Descripcion: 'Crear, editar o eliminar categorías', Modulo: 'Categorias' },

    // Productos
    { Nombre: 'ver_productos', Descripcion: 'Ver lista de productos', Modulo: 'Productos' },
    { Nombre: 'gestionar_productos', Descripcion: 'Crear, editar o eliminar productos', Modulo: 'Productos' },

    // Proveedores (Insumos)
    { Nombre: 'ver_proveedores', Descripcion: 'Ver lista de proveedores', Modulo: 'Insumos' },
    { Nombre: 'gestionar_proveedores', Descripcion: 'Crear, editar o eliminar proveedores', Modulo: 'Insumos' },

    // Compras
    { Nombre: 'ver_compras', Descripcion: 'Ver lista de compras', Modulo: 'Insumos' },
    { Nombre: 'gestionar_compras', Descripcion: 'Registrar o modificar compras', Modulo: 'Insumos' },

    // Servicios
    { Nombre: 'ver_servicios', Descripcion: 'Ver lista de servicios', Modulo: 'Servicios' },
    { Nombre: 'gestionar_servicios', Descripcion: 'Crear, editar o eliminar servicios', Modulo: 'Servicios' },

    // Clientes - PERMISO AGREGADO SEGÚN SIDEBAR ACTIVO
    { Nombre: 'ver_clientes', Descripcion: 'Ver lista de clientes', Modulo: 'Clientes' },
    { Nombre: 'gestionar_clientes', Descripcion: 'Crear, editar o eliminar clientes', Modulo: 'Clientes' },

    // Pedidos
    { Nombre: 'ver_pedidos', Descripcion: 'Ver lista de pedidos de clientes', Modulo: 'Ventas' },
    { Nombre: 'gestionar_pedidos', Descripcion: 'Actualizar estado de pedidos', Modulo: 'Ventas' },

    // Ventas
    { Nombre: 'ver_ventas', Descripcion: 'Ver lista de ventas', Modulo: 'Ventas' },
    { Nombre: 'gestionar_ventas', Descripcion: 'Actualizar ventas o generar facturas', Modulo: 'Ventas' }
];

// Configuración de roles del sistema
const SYSTEM_ROLES = [
    { Nombre: 'Cliente', Estado: 'Activo' },
    { Nombre: 'Administrador', Estado: 'Activo' }
];

export const initializeRolesAndPermissions = async (connection) => {
    const createdRoles = {};

    // 1. Crear roles si no existen
    console.log('Creando roles del sistema...');
    for (const role of SYSTEM_ROLES) {
        const [existingRole] = await connection.execute(
            'SELECT * FROM roles WHERE Nombre = ?',
            [role.Nombre]
        );

        if (existingRole.length === 0) {
            const roleId = uuidv4();
            await connection.execute(
                'INSERT INTO roles (RoleId, Nombre, Estado, IsSystem) VALUES (?, ?, ?, ?)',
                [roleId, role.Nombre, role.Estado, true]
            );

            console.log(`     ✓ Rol '${role.Nombre}' creado.`);
            createdRoles[role.Nombre] = roleId;
        } else {
            createdRoles[role.Nombre] = existingRole[0].RoleId;
            console.log(`     ✓ Rol '${role.Nombre}' ya existe.`);
        }
    }

    // 2. Crear permisos si no existen
    console.log('Creando permisos del sistema...');
    for (const permiso of SYSTEM_PERMISSIONS) {
        const [existingPermiso] = await connection.execute(
            'SELECT * FROM permisos WHERE Nombre = ?',
            [permiso.Nombre]
        );

        if (existingPermiso.length === 0) {
            const permisoId = uuidv4();
            await connection.execute(
                'INSERT INTO permisos (PermisoId, Nombre, Descripcion, Modulo) VALUES (?, ?, ?, ?)',
                [permisoId, permiso.Nombre, permiso.Descripcion, permiso.Modulo]
            );
            console.log(`     ✓ Permiso '${permiso.Nombre}' creado.`);
        } else {
            console.log(`     ✓ Permiso '${permiso.Nombre}' ya existe.`);
        }
    }

    // 3. Asignar TODOS los permisos al Administrador
    console.log('Asignando permisos al Administrador...');
    const [allPermisos] = await connection.execute('SELECT PermisoId FROM permisos');

    for (const permiso of allPermisos) {
        const [existingAssignment] = await connection.execute(
            'SELECT * FROM rol_permisos WHERE RoleId = ? AND PermisoId = ?',
            [createdRoles['Administrador'], permiso.PermisoId]
        );

        if (existingAssignment.length === 0) {
            await connection.execute(
                'INSERT INTO rol_permisos (RoleId, PermisoId) VALUES (?, ?)',
                [createdRoles['Administrador'], permiso.PermisoId]
            );
        }
    }
    console.log(`     ✓ ${allPermisos.length} permisos asignados al Administrador.`);

    // 4. Asignar permisos básicos al Cliente (solo permisos del módulo Cliente si existen)
    console.log('Configurando permisos del Cliente...');
    const [clientePermisos] = await connection.execute(
        'SELECT PermisoId FROM permisos WHERE Modulo = "Cliente"'
    );

    if (clientePermisos.length > 0) {
        for (const permiso of clientePermisos) {
            const [existingAssignment] = await connection.execute(
                'SELECT * FROM rol_permisos WHERE RoleId = ? AND PermisoId = ?',
                [createdRoles['Cliente'], permiso.PermisoId]
            );

            if (existingAssignment.length === 0) {
                await connection.execute(
                    'INSERT INTO rol_permisos (RoleId, PermisoId) VALUES (?, ?)',
                    [createdRoles['Cliente'], permiso.PermisoId]
                );
            }
        }
        console.log(`     ✓ ${clientePermisos.length} permisos asignados al Cliente.`);
    } else {
        console.log('     No se encontraron permisos específicos para Cliente.');
    }

    return createdRoles;
};