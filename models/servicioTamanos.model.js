import { dbPool } from '../lib/db.js';

export const createTamano = async ({
    ServicioTamanoId,
    ServicioId,
    NombreTamano,
    Precio
}) => {
    try {
        console.log("Insertando tamaño en DB:", {
            ServicioTamanoId,
            ServicioId,
            NombreTamano,
            Precio
        });

        const [result] = await dbPool.query(
            `INSERT INTO servicio_tamanos 
            (ServicioTamanoId, ServicioId, NombreTamano, Precio, Estado)
            VALUES (?, ?, ?, ?, 'Activo')`,
            [ServicioTamanoId, ServicioId, NombreTamano, Precio]
        );

        console.log("Resultado inserción:", result);
        return result;
    } catch (error) {
        console.error("Error en createTamano:", error);
        throw error;
    }
};

export const getTamanosByServicio = async (ServicioId) => {
    try {
        console.log("Buscando tamaños para servicio:", ServicioId);
        
        const [rows] = await dbPool.query(
            `SELECT ServicioTamanoId, ServicioId, NombreTamano, Precio, Estado 
             FROM servicio_tamanos 
             WHERE ServicioId = ? AND Estado = 'Activo'`,
            [ServicioId]
        );
        
        console.log("Tamaños encontrados:", rows);
        return rows;
    } catch (error) {
        console.error("Error en getTamanosByServicio:", error);
        throw error;
    }
};

export const updateTamano = async (ServicioTamanoId, { NombreTamano, Precio }) => {
    try {
        console.log("Actualizando tamaño:", ServicioTamanoId, { NombreTamano, Precio });
        
        const [result] = await dbPool.query(
            `UPDATE servicio_tamanos 
             SET NombreTamano = ?, Precio = ? 
             WHERE ServicioTamanoId = ?`,
            [NombreTamano, Precio, ServicioTamanoId]
        );
        
        console.log("Resultado actualización:", result);
        return result;
    } catch (error) {
        console.error("Error en updateTamano:", error);
        throw error;
    }
};

export const deleteTamano = async (ServicioTamanoId) => {
    try {
        console.log("Eliminando (soft delete) tamaño:", ServicioTamanoId);
        
        const [result] = await dbPool.query(
            `UPDATE servicio_tamanos SET Estado = 'Inactivo' WHERE ServicioTamanoId = ?`,
            [ServicioTamanoId]
        );
        
        console.log("Resultado eliminación:", result);
        return result;
    } catch (error) {
        console.error("Error en deleteTamano:", error);
        throw error;
    }
};

export const deleteTamanosByServicio = async (ServicioId) => {
    try {
        console.log("Eliminando todos los tamaños del servicio:", ServicioId);
        
        const [result] = await dbPool.query(
            `UPDATE servicio_tamanos SET Estado = 'Inactivo' WHERE ServicioId = ?`,
            [ServicioId]
        );
        
        console.log("Resultado eliminación masiva:", result);
        return result;
    } catch (error) {
        console.error("Error en deleteTamanosByServicio:", error);
        throw error;
    }
};