import { dbPool } from '../lib/db.js';
import { initializeRolesAndPermissions } from './modules/rolesPermissions.js';
import { initializeDefaultData } from './modules/defaultData.js';
import { initializeAdminUser } from './modules/adminUser.js';

export const initDatabase = async () => {
    let connection;
    try {
        console.log('Iniciando configuración de la base de datos...\n');

        // Obtener una conexión del pool
        connection = await dbPool.getConnection();

        // 1. Inicializar roles y permisos
        console.log('Paso 1: Configurando roles y permisos del sistema...');
        const roles = await initializeRolesAndPermissions(connection);

        // 2. Inicializar datos por defecto (tipos documento, colores, etc.)
        console.log('Paso 2: Configurando datos por defecto del sistema...');
        await initializeDefaultData(connection);

        // 3. Crear usuario administrador
        console.log('Paso 3: Configurando usuario administrador...');
        await initializeAdminUser(connection, roles);

        console.log('\nConfiguración completada exitosamente!');
        console.log('============================================');
        console.log('Sistema listo para usar.');
    } catch (error) {
        console.error('Error durante la inicialización:', error);
        process.exit(1);
    } finally {
        if (connection) connection.release(); // liberar conexión al pool
    }
};