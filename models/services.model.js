import { dbPool } from '../lib/db.js';

// Crear producto
export const createService = async ({
    ServicioId,
    Nombre,
    Descripcion,
    Imagen,
    TipoPrecio,
    Precio,
    Descuento,
    CategoriaId
}) => {
    await dbPool.query(
        `INSERT INTO Servicios 
        (ServicioId, Nombre, Descripcion, Imagen, TipoPrecio, Precio, Descuento, CategoriaId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            ServicioId,
            Nombre,
            Descripcion,
            Imagen,
            TipoPrecio,
            Precio,
            Descuento,
            CategoriaId
        ]
    );
};



// Obtener producto por ID
export const getDataServiceById = async (ServicioId) => {
    const [rows] = await dbPool.query(
        `SELECT * 
     FROM Servicios 
     WHERE ServicioId = ?`,
        [ServicioId]
    );
    return rows;
};

// Obtener todos los productos
export const getDataAllServcios = async () => {
    const [rows] = await dbPool.query(
        `SELECT * FROM Servicios`
    );
    return rows;
};

// Actualizar producto
export const updateDataServicio = async ({
    ServicioId,
    Nombre,
    Descripcion,
    Imagen,
    TipoPrecio,
    Precio,
    Descuento,
    CategoriaId,
    Estado
}) => {

    if (TipoPrecio === 'POR_TAMANO') {
        Precio = null;
    }

    const [rows] = await dbPool.query(
        `UPDATE Servicios
         SET Nombre = ?, 
             Descripcion = ?, 
             Imagen = ?, 
             TipoPrecio = ?,
             Precio = ?,
             Descuento = ?, 
             CategoriaId = ?, 
             Estado = ?
         WHERE ServicioId = ?`,
        [
            Nombre,
            Descripcion,
            Imagen,
            TipoPrecio,
            Precio,
            Descuento,
            CategoriaId,
            Estado,
            ServicioId
        ]
    );

    return rows.affectedRows;
};



export const findDuplicateName = async ({ ServicioId, Nombre }) => {
    const [rows] = await dbPool.query(
        'SELECT ServicioId FROM Servicios WHERE Nombre = ? AND ServicioId != ?',
        [Nombre, ServicioId]
    );
    return rows;
};

// Eliminar producto
export const deleteDataService = async (ServicioId) => {
    await dbPool.query(
        `DELETE FROM Servicios WHERE ServicioId = ?`,
        [ServicioId]
    );
};

// Verificar si nombre de producto ya existe
export const nombreServiceExiste = async (Nombre) => {
    const [rows] = await dbPool.query(
        `SELECT * FROM Servicios WHERE Nombre = ?`,
        [Nombre]
    );
    return rows;
};

export const buscarServicioDB = async ({ columna, operador, parametro }) => {
    const columnasSeguras = [
        'Nombre',
        'Descripcion',
        'Precio',
        'Descuento',
        'CategoriaId',
        'Estado'
    ];


    if (!columnasSeguras.includes(columna)) {
        throw new Error('Columna no permitida');
    }

    const [servicios] = await dbPool.query(
        `SELECT * FROM Servicios WHERE ${columna} ${operador} ?`,
        [parametro]
    );

    return servicios;
};