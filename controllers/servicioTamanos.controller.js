import { v4 as uuidv4 } from 'uuid';
import { 
    createTamano, 
    getTamanosByServicio, 
    updateTamano, 
    deleteTamano,
    deleteTamanosByServicio 
} from '../models/servicioTamanos.model.js';
import { getDataServiceById } from '../models/services.model.js';

// Crear tamaño
export const postTamano = async (req, res) => {
    const { ServicioId } = req.params;
    const { NombreTamano, Precio } = req.body;

    try {
        console.log("Creando tamaño para servicio:", ServicioId);
        console.log("Datos recibidos:", { NombreTamano, Precio });

        if (!NombreTamano || !Precio) {
            return res.status(400).json({ 
                message: 'Nombre y Precio son obligatorios' 
            });
        }

        const servicio = await getDataServiceById(ServicioId);

        if (servicio.length === 0) {
            return res.status(404).json({ 
                message: 'Servicio no existe' 
            });
        }

        if (servicio[0].TipoPrecio !== 'POR_TAMANO') {
            return res.status(400).json({ 
                message: 'Este servicio no usa tamaños' 
            });
        }

        const ServicioTamanoId = uuidv4();

        await createTamano({
            ServicioTamanoId,
            ServicioId,
            NombreTamano,
            Precio
        });

        res.status(201).json({ 
            message: 'Tamaño creado correctamente',
            ServicioTamanoId 
        });

    } catch (error) {
        console.error('Error en postTamano:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
};

// Obtener tamaños de un servicio
export const getTamanosServicio = async (req, res) => {
    const { ServicioId } = req.params;

    try {
        console.log("Obteniendo tamaños para servicio:", ServicioId);
        const tamanos = await getTamanosByServicio(ServicioId);
        console.log("Tamaños encontrados:", tamanos);
        res.status(200).json(tamanos);
    } catch (error) {
        console.error('Error en getTamanosServicio:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
};

// Actualizar tamaño
export const putTamano = async (req, res) => {
    const { ServicioTamanoId } = req.params;
    const { NombreTamano, Precio } = req.body;

    try {
        console.log("Actualizando tamaño:", ServicioTamanoId, { NombreTamano, Precio });

        if (!NombreTamano || !Precio) {
            return res.status(400).json({ 
                message: 'Nombre y Precio son obligatorios' 
            });
        }

        const result = await updateTamano(ServicioTamanoId, { NombreTamano, Precio });

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                message: 'Tamaño no encontrado' 
            });
        }

        res.status(200).json({ 
            message: 'Tamaño actualizado correctamente' 
        });

    } catch (error) {
        console.error('Error en putTamano:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
};

// Eliminar tamaño (soft delete)
export const deleteTamanoController = async (req, res) => {
    const { ServicioTamanoId } = req.params;

    try {
        console.log("Eliminando tamaño:", ServicioTamanoId);

        const result = await deleteTamano(ServicioTamanoId);

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                message: 'Tamaño no encontrado' 
            });
        }

        res.status(200).json({ 
            message: 'Tamaño eliminado correctamente' 
        });

    } catch (error) {
        console.error('Error en deleteTamanoController:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
};

// Actualizar todos los tamaños de un servicio (reemplazar)
export const putTamanosServicio = async (req, res) => {
    const { ServicioId } = req.params;
    const { tamanos } = req.body;

    try {
        console.log("Actualizando todos los tamaños del servicio:", ServicioId);
        console.log("Tamaños recibidos:", tamanos);

        // Verificar que el servicio existe
        const servicio = await getDataServiceById(ServicioId);
        if (servicio.length === 0) {
            return res.status(404).json({ 
                message: 'Servicio no existe' 
            });
        }

        if (servicio[0].TipoPrecio !== 'POR_TAMANO') {
            return res.status(400).json({ 
                message: 'Este servicio no usa tamaños' 
            });
        }

        // Desactivar todos los tamaños existentes
        await deleteTamanosByServicio(ServicioId);

        // Crear los nuevos tamaños
        const resultados = [];
        for (const tamano of tamanos) {
            const ServicioTamanoId = uuidv4();
            await createTamano({
                ServicioTamanoId,
                ServicioId,
                NombreTamano: tamano.NombreTamano,
                Precio: tamano.Precio
            });
            resultados.push(ServicioTamanoId);
        }

        res.status(200).json({ 
            message: 'Tamaños actualizados correctamente',
            count: resultados.length
        });

    } catch (error) {
        console.error('Error en putTamanosServicio:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
};