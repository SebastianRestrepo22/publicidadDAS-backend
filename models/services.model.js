import { dbPool } from '../lib/db.js';

// Crear servicio
export const createService = async ({
    ServicioId,
    Nombre,
    Descripcion,
    Imagen,
    CategoriaId
}) => {
    await dbPool.query(
        `INSERT INTO servicios 
        (ServicioId, Nombre, Descripcion, Imagen, CategoriaId)
        VALUES (?, ?, ?, ?, ?)`,
        [
            ServicioId,
            Nombre,
            Descripcion,
            Imagen,
            CategoriaId
        ]
    );
};

// Obtener servicio por ID
export const getDataServiceById = async (ServicioId) => {
    const [rows] = await dbPool.query(
        `SELECT 
            ServicioId,
            Nombre,
            Descripcion,
            Imagen,
            CategoriaId,
            Estado
        FROM servicios 
        WHERE ServicioId = ?`,
        [ServicioId]
    );
    return rows;
};

// Obtener todos los servicios
export const getDataAllServcios = async () => {
    const [rows] = await dbPool.query(
        `SELECT 
            ServicioId,
            Nombre,
            Descripcion,
            Imagen,
            CategoriaId,
            Estado
        FROM servicios`
    );
    return rows;
};

// Actualizar servicio
export const updateDataServicio = async ({
    ServicioId,
    Nombre,
    Descripcion,
    Imagen,
    CategoriaId,
    Estado
}) => {
    const [rows] = await dbPool.query(
        `UPDATE servicios
         SET Nombre = ?, 
             Descripcion = ?, 
             Imagen = ?, 
             CategoriaId = ?, 
             Estado = ?
         WHERE ServicioId = ?`,
        [
            Nombre,
            Descripcion,
            Imagen,
            CategoriaId,
            Estado,
            ServicioId
        ]
    );
    return rows.affectedRows;
};

// Verificar si un nombre de servicio ya existe
export const findDuplicateName = async ({ ServicioId, Nombre }) => {
    const [rows] = await dbPool.query(
        'SELECT ServicioId FROM servicios WHERE Nombre = ? AND ServicioId != ?',
        [Nombre, ServicioId]
    );
    return rows;
};

// Eliminar servicio
export const deleteDataService = async (ServicioId) => {
    await dbPool.query(
        `DELETE FROM servicios WHERE ServicioId = ?`,
        [ServicioId]
    );
};

// Verificar si un nombre de servicio ya existe (para validación)
export const nombreServiceExiste = async (Nombre) => {
    const [rows] = await dbPool.query(
        `SELECT * FROM servicios WHERE Nombre = ?`,
        [Nombre]
    );
    return rows;
};

// Buscar servicio por columna y operador
export const buscarServicioDB = async ({ columna, operador, parametro }) => {
    const columnasSeguras = [
        'Nombre',
        'Descripcion',
        'CategoriaId',
        'Estado'
    ];

    if (!columnasSeguras.includes(columna)) {
        throw new Error('Columna no permitida');
    }

    const [servicios] = await dbPool.query(
        `SELECT * FROM servicios WHERE ${columna} ${operador} ?`,
        [parametro]
    );

    return servicios;
};

// Verificar si un servicio tiene registros asociados en otras tablas
export const verificarAsociacionesServicio = async (ServicioId) => {
    const [detallePedidos] = await dbPool.query(
        'SELECT COUNT(*) as total FROM detallepedidosclientes WHERE ServicioId = ?',
        [ServicioId]
    );
    
    const [detalleVentas] = await dbPool.query(
        'SELECT COUNT(*) as total FROM detalleventas WHERE ServicioId = ?',
        [ServicioId]
    );
    
    return {
        tieneAsociaciones: detallePedidos[0].total > 0 || detalleVentas[0].total > 0,
        detallePedidos: detallePedidos[0].total,
        detalleVentas: detalleVentas[0].total
    };
};

// Obtener servicios con paginación y filtros
export const getServiciosPaginated = async ({ 
    page = 1, 
    limit = 10, 
    filtroCampo = null, 
    filtroValor = null,
    estado = null
}) => {
    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Filtro por estado
    if (estado && ['Activo', 'Inactivo'].includes(estado)) {
        whereConditions.push('Estado = ?');
        params.push(estado);
    }

    // Filtro dinámico por campo
    if (filtroCampo && filtroValor) {
        const camposPermitidos = ['Nombre', 'Descripcion', 'CategoriaId'];
        if (camposPermitidos.includes(filtroCampo)) {
            whereConditions.push(`${filtroCampo} LIKE ?`);
            params.push(`%${filtroValor}%`);
        }
    }

    const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

    // Consulta principal con paginación
    const [servicios] = await dbPool.query(`
        SELECT 
            ServicioId,
            Nombre,
            Descripcion,
            Imagen,
            CategoriaId,
            Estado
        FROM servicios
        ${whereClause}
        ORDER BY Nombre
        LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Contar total de registros para paginación
    const [countResult] = await dbPool.query(`
        SELECT COUNT(*) as total 
        FROM servicios
        ${whereClause}
    `, params);

    const totalItems = countResult[0]?.total || 0;

    return {
        data: servicios,
        totalItems: totalItems,
        currentPage: Number(page),
        itemsPerPage: Number(limit),
        totalPages: Math.ceil(totalItems / limit)
    };
};