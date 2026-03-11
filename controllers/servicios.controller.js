// controllers/servicios.controller.js
import { v4 as uuidv4 } from 'uuid';
import { buscarServicioDB, createService, deleteDataService, findDuplicateName, getDataAllServcios, getDataServiceById, nombreServiceExiste, updateDataServicio } from '../models/services.model.js';
import { dbPool } from '../lib/db.js';

// Crear producto
export const postService = async (req, res) => {
    const {
        Nombre,
        Descripcion,
        Imagen,
        TipoPrecio,
        Precio,
        Descuento = 0,
        CategoriaId,
    } = req.body;

    try {
        if (!Nombre || !Imagen || !CategoriaId || !TipoPrecio) {
            return res.status(400).json({
                message: 'Campos obligatorios faltantes'
            });
        }

        if (!['UNICO', 'POR_TAMANO'].includes(TipoPrecio)) {
            return res.status(400).json({
                message: 'TipoPrecio inválido'
            });
        }

        // Validaciones según tipo
        if (TipoPrecio === 'UNICO' && !Precio) {
            return res.status(400).json({
                message: 'El precio es obligatorio cuando el servicio es de precio único'
            });
        }

        if (TipoPrecio === 'POR_TAMANO' && Precio) {
            return res.status(400).json({
                message: 'No debe enviarse Precio cuando el servicio es por tamaño'
            });
        }

        const existente = await nombreServiceExiste(Nombre);

        if (existente.length > 0) {
            return res.status(409).json({ message: 'Servicio ya existe' });
        }

        const ServicioId = uuidv4();

        await createService({
            ServicioId,
            Nombre,
            Descripcion,
            Imagen,
            TipoPrecio,
            Precio: TipoPrecio === 'UNICO' ? Precio : null,
            Descuento,
            CategoriaId
        });

        res.status(201).json({ message: 'Servicio creado exitosamente', ServicioId });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener todos los productos
export const getAllService = async (req, res) => {
    try {
        const rows = await getDataAllServcios();
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener los servicios:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener producto por ID
export const getServiceById = async (req, res) => {
    const { id } = req.params;
    try {
        const productos = await getDataServiceById(id);

        if (productos.length === 0) {
            return res.status(404).json({ message: 'Serivicio no encontrado' });
        }

        res.status(200).json(productos[0]);
    } catch (error) {
        console.error('Error al obtener el servicio:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Actualizar producto - VERSIÓN CORREGIDA
export const updateService = async (req, res) => {
    const { ServicioId } = req.params;
    const {
        Nombre,
        Descripcion,
        Imagen,
        TipoPrecio,  // ¡IMPORTANTE! Recibir del body
        Precio,
        Descuento,
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
        };

        // Buscar servicio actual
        const servicioActual = await getDataServiceById(ServicioId);

        if (servicioActual.length === 0) {
            return res.status(404).json({
                message: 'Servicio no encontrado'
            });
        }

        // Validar que no se cambie el tipo de precio
        if (servicioActual[0].TipoPrecio !== TipoPrecio) {
            return res.status(400).json({
                message: 'No se puede cambiar el tipo de precio de un servicio existente'
            });
        }

        const result = await updateDataServicio({
            ServicioId,
            Nombre,
            Descripcion,
            Imagen,
            TipoPrecio,
            Precio: TipoPrecio === 'UNICO' ? Precio : null,
            Descuento,
            CategoriaId,
            Estado
        });

        if (result === 0) {
            return res.status(409).json({ message: 'Servicio no encontrado o sin cambios' });
        }

        res.status(200).json({
            message: 'Servicio actualizado correctamente',
            producto: { ServicioId, Nombre, Estado }
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

export const buscarService = async (req, res) => {
    const { campo, valor } = req.query;

    const columnasPermitidas = {
        nombre: 'Nombre',
        descripcion: 'Descripcion',
        precio: 'Precio',
        descuento: 'Descuento',
        categoria: 'CategoriaId',
        estado: 'Estado'
    };

    const columna = columnasPermitidas[campo?.toLowerCase()];
    if (!columna) {
        return res.status(400).json({ message: 'Campo de búsqueda inválido' });
    }

    if (valor === undefined || valor === '') {
        return res.status(400).json({ message: 'Valor de búsqueda requerido' });
    }

    try {
        const camposExactos = ['Precio', 'Descuento', 'CategoriaId', 'Estado'];
        const operador = camposExactos.includes(columna) ? '=' : 'LIKE';

        let valorFinal = valor;

        if (['Precio', 'Descuento'].includes(columna)) {
            valorFinal = Number(valor);
            if (Number.isNaN(valorFinal)) {
                return res.status(400).json({ message: `${columna} debe ser numérico` });
            }
        }

        if (columna === 'Estado') {
            const estadosValidos = ['Activo', 'Inactivo'];
            if (!estadosValidos.includes(valor)) {
                return res.status(400).json({ message: 'Estado inválido' });
            }
        }

        const parametro = operador === '=' ? valorFinal : `%${valor}%`;

        const servicios = await buscarServicioDB({ columna, operador, parametro });

        res.status(200).json({ results: servicios });
    } catch (error) {
        console.error('Error al buscar servicios:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Cambiar estado del servicio (toggle)
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
            'UPDATE Servicios SET Estado = ? WHERE ServicioId = ?',
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