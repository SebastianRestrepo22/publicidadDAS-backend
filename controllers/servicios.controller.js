import { v4 as uuidv4 } from 'uuid';
import {
    createService,
    deleteDataService,
    findDuplicateName,
    getServiciosPaginated,
    getDataServiceById,
    nombreServiceExiste,
    verificarAsociacionesServicio,
    updateDataServicio
} from '../models/services.model.js';
import { dbPool } from '../lib/db.js';

// Crear servicio
export const postService = async (req, res) => {
    const {
        Nombre,
        Descripcion,
        Imagen,
        CategoriaId,
    } = req.body;

    try {
        // Validar campos obligatorios
        if (!Nombre || !Imagen || !CategoriaId) {
            return res.status(400).json({
                message: 'Campos obligatorios faltantes: Nombre, Imagen, CategoriaId'
            });
        }

        // Verificar si el nombre ya existe
        const existente = await nombreServiceExiste(Nombre);
        if (existente.length > 0) {
            return res.status(409).json({ message: 'Servicio ya existe' });
        }

        const ServicioId = uuidv4();

        // Crear servicio sin precios (se cotizan por WhatsApp)
        await createService({
            ServicioId,
            Nombre,
            Descripcion,
            Imagen,
            CategoriaId
        });

        res.status(201).json({ 
            message: 'Servicio creado exitosamente', 
            ServicioId 
        });

    } catch (error) {
        console.error('Error en postService:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener todos los servicios con paginación y filtros
export const getAllService = async (req, res) => {
    try {
        const { estado, page = 1, limit = 10, filtroCampo, filtroValor } = req.query;

        const currentPage = Math.max(1, parseInt(page) || 1);
        const itemsPerPage = Math.max(1, parseInt(limit) || 10);

        const result = await getServiciosPaginated({
            page: currentPage,
            limit: itemsPerPage,
            filtroCampo: filtroCampo || null,
            filtroValor: filtroValor || null,
            estado: estado || null
        });

        const data = result?.data && Array.isArray(result.data) ? result.data : [];
        const totalItems = result?.totalItems || 0;
        const totalPages = result?.totalPages || Math.ceil(totalItems / itemsPerPage) || 1;

        // Si no hay datos y la página > 1, regresar a página 1
        if (data.length === 0 && currentPage > 1 && totalItems > 0) {
            const fallback = await getServiciosPaginated({
                page: 1,
                limit: itemsPerPage,
                filtroCampo: filtroCampo || null,
                filtroValor: filtroValor || null,
                estado: estado || null
            });
            
            const fallbackData = fallback?.data && Array.isArray(fallback.data) ? fallback.data : [];
            const fallbackTotal = fallback?.totalItems || 0;
            const fallbackPages = fallback?.totalPages || Math.ceil(fallbackTotal / itemsPerPage) || 1;
            
            return res.status(200).json({
                data: fallbackData,
                pagination: {
                    totalItems: fallbackTotal,
                    totalPages: fallbackPages,
                    currentPage: 1,
                    itemsPerPage: itemsPerPage
                }
            });
        }

        res.status(200).json({
            data: data,
            pagination: {
                totalItems: totalItems,
                totalPages: totalPages,
                currentPage: currentPage,
                itemsPerPage: itemsPerPage
            }
        });

    } catch (error) {
        console.error('Error en getAllService:', error);
        res.status(200).json({
            data: [],
            pagination: {
                totalItems: 0,
                totalPages: 1,
                currentPage: 1,
                itemsPerPage: parseInt(req.query.limit) || 10
            }
        });
    }
};

// Obtener servicio por ID
export const getServiceById = async (req, res) => {
    const { id } = req.params;
    try {
        const servicios = await getDataServiceById(id);

        if (servicios.length === 0) {
            return res.status(404).json({ message: 'Servicio no encontrado' });
        }

        res.status(200).json(servicios[0]);
    } catch (error) {
        console.error('Error al obtener el servicio:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Actualizar servicio
export const updateService = async (req, res) => {
    const { ServicioId } = req.params;
    const {
        Nombre,
        Descripcion,
        Imagen,
        CategoriaId,
        Estado
    } = req.body;

    try {
        if (!Nombre) {
            return res.status(400).json({
                message: 'El nombre es obligatorio'
            });
        }

        // Verificar nombre duplicado
        const duplicates = await findDuplicateName({ ServicioId, Nombre });
        if (duplicates.length > 0) {
            return res.status(409).json({
                message: 'El nombre ya existe.'
            });
        }

        // Verificar que el servicio existe
        const servicioActual = await getDataServiceById(ServicioId);
        if (servicioActual.length === 0) {
            return res.status(404).json({
                message: 'Servicio no encontrado'
            });
        }

        // Actualizar servicio (sin campos de precio)
        const result = await updateDataServicio({
            ServicioId,
            Nombre,
            Descripcion,
            Imagen,
            CategoriaId,
            Estado
        });

        if (result === 0) {
            return res.status(409).json({ 
                message: 'Servicio no encontrado o sin cambios' 
            });
        }

        res.status(200).json({
            message: 'Servicio actualizado correctamente',
            servicio: { ServicioId, Nombre, Estado }
        });
    } catch (error) {
        console.error('Error al actualizar el servicio:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Eliminar servicio
export const deleteService = async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Verificar si tiene asociaciones antes de intentar eliminar
        const asociaciones = await verificarAsociacionesServicio(id);
        
        if (asociaciones.tieneAsociaciones) {
            return res.status(409).json({ 
                message: 'No se puede eliminar: este servicio está asociado a pedidos o ventas.',
                detalles: {
                    pedidos: asociaciones.detallePedidos,
                    ventas: asociaciones.detalleVentas
                }
            });
        }
        
        // 2. Si no tiene asociaciones, proceder con la eliminación
        await deleteDataService(id);
        res.status(200).json({ message: 'Servicio eliminado correctamente' });
        
    } catch (error) {
        console.error('Error al eliminar el servicio:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Validar si el nombre ya existe
export const validarNombre = async (req, res) => {
    const { Nombre } = req.query;
    try {
        const servicios = await nombreServiceExiste(Nombre);
        res.status(200).json({ exists: servicios.length > 0 });
    } catch (error) {
        console.error('Error al validar nombre:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Buscar servicios con filtros
export const buscarService = async (req, res) => {
    const { campo, valor, page = 1, limit = 10, estado } = req.query;

    const columnasPermitidas = {
        nombre: 'Nombre',
        descripcion: 'Descripcion',
        categoria: 'CategoriaId',
        estado: 'Estado'
    };

    const filtroCampo = columnasPermitidas[campo?.toLowerCase()];
    
    if (campo && !filtroCampo) {
        return res.status(400).json({ message: 'Campo de búsqueda inválido' });
    }

    try {
        const currentPage = Math.max(1, parseInt(page) || 1);
        const itemsPerPage = Math.max(1, parseInt(limit) || 10);

        const result = await getServiciosPaginated({
            page: currentPage,
            limit: itemsPerPage,
            filtroCampo: filtroCampo || null,
            filtroValor: valor || null,
            estado: estado || null
        });

        const data = result?.data && Array.isArray(result.data) ? result.data : [];
        const totalItems = result?.totalItems || 0;
        const totalPages = result?.totalPages || Math.ceil(totalItems / itemsPerPage) || 1;

        res.status(200).json({
            data: data,
            pagination: {
                totalItems: totalItems,
                totalPages: totalPages,
                currentPage: currentPage,
                itemsPerPage: itemsPerPage
            }
        });

    } catch (error) {
        console.error('Error en buscarService:', error);
        res.status(200).json({
            data: [],
            pagination: {
                totalItems: 0,
                totalPages: 1,
                currentPage: 1,
                itemsPerPage: parseInt(limit) || 10
            }
        });
    }
};

// Cambiar estado del servicio
export const cambiarEstadoService = async (req, res) => {
    const { id } = req.params;
    const { Estado } = req.body;

    try {
        if (!Estado || !['Activo', 'Inactivo'].includes(Estado)) {
            return res.status(400).json({ message: 'Estado inválido' });
        }

        const servicio = await getDataServiceById(id);
        if (servicio.length === 0) {
            return res.status(404).json({ message: 'Servicio no encontrado' });
        }

        await dbPool.query(
            'UPDATE servicios SET Estado = ? WHERE ServicioId = ?',
            [Estado, id]
        );

        res.status(200).json({
            message: `Servicio ${Estado === 'Activo' ? 'activado' : 'desactivado'} correctamente`,
            ServicioId: id,
            Estado
        });
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};