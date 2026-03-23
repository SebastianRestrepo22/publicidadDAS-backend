import {
  getAllProveedores as getAllProveedoresModel,
  getProveedorById as getProveedorByIdModel,
  createProveedor as createProveedorModel,
  deleteProveedor as deleteProveedorModel,
  updateProveedor as updateProveedorModel,
  getProveedoresPaginated as getProveedoresPaginatedModel,
  buscarProveedoresPaginated,
  verificarCampoUnico,
} from '../models/proveedores.models.js';
import { v4 as uuidv4 } from 'uuid';

// ========== FUNCIÓN EXISTENTE ==========
export const getAllProveedores = async (req, res) => {
  try {
    const proveedores = await getAllProveedoresModel();
    res.json(proveedores);
  } catch (err) {
    console.error("❌ Error al obtener proveedores:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ========== NUEVA FUNCIÓN: Validar campo único en tiempo real ==========
export const validarCampoUnico = async (req, res) => {
  try {
    const { campo, valor, excludeId } = req.query;

    if (!campo || !valor) {
      return res.status(400).json({
        error: 'Los campos "campo" y "valor" son obligatorios'
      });
    }

    // Validar que el campo sea permitido
    const camposPermitidos = ['nombreProveedor', 'correo', 'nit'];
    if (!camposPermitidos.includes(campo)) {
      return res.status(400).json({
        error: `Campo no válido. Use: ${camposPermitidos.join(', ')}`
      });
    }

    // Verificar si el campo ya existe
    const existe = await verificarCampoUnico(campo, valor.trim(), excludeId);

    res.json({
      existe,
      mensaje: existe ? `El ${campo} ya está registrado` : 'Disponible'
    });

  } catch (err) {
    console.error("❌ Error al validar campo único:", err.message);
    res.status(500).json({ error: err.message });
  }
};


// ========== FUNCIÓN: Obtener proveedores con paginación ==========
export const getProveedoresPaginated = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const filtroCampo = req.query.filtroCampo || null;
    const filtroValor = req.query.filtroValor || null;

    const result = await getProveedoresPaginatedModel({
      page,
      limit,
      filtroCampo,
      filtroValor
    });

    // Si no hay datos en la página actual y es página > 1, mostrar página 1
    if (result.data.length === 0 && page > 1) {
      const fallback = await getProveedoresPaginatedModel({
        page: 1,
        limit,
        filtroCampo,
        filtroValor
      });
      return res.status(200).json({
        data: fallback.data,
        pagination: {
          totalItems: fallback.totalItems,
          totalPages: Math.ceil(fallback.totalItems / limit),
          currentPage: 1,
          itemsPerPage: limit,
          hasNextPage: fallback.totalItems > limit,
          hasPrevPage: false
        }
      });
    }

    const totalPages = Math.ceil(result.totalItems / limit);

    res.status(200).json({
      data: result.data,
      pagination: {
        totalItems: result.totalItems,
        totalPages: totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
        hasNextPage: result.currentPage < totalPages,
        hasPrevPage: result.currentPage > 1
      }
    });
  } catch (err) {
    console.error("❌ Error al obtener proveedores con paginación:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ========== FUNCIÓN: Buscar proveedores con paginación ==========
export const buscarProveedores = async (req, res) => {
  const { campo, valor, page = 1, limit = 10 } = req.query;

  const columnasPermitidas = {
    id: 'ProveedorId',
    nombre: 'NombreProveedor',
    nit: 'Nit',
    telefono: 'Telefono',
    correo: 'Correo',
    direccion: 'Direccion',
    estado: 'Estado'
  };

  const columna = columnasPermitidas[campo];
  if (!columna) {
    return res.status(400).json({
      message: 'Campo de búsqueda inválido. Use: id, nombre, nit, telefono, correo, direccion o estado'
    });
  }

  if (!valor || valor.trim() === '') {
    return res.status(400).json({
      message: 'El valor de búsqueda no puede estar vacío'
    });
  }

  try {
    const result = await buscarProveedoresPaginated({
      page: parseInt(page),
      limit: parseInt(limit),
      columna,
      valor: valor.trim()
    });

    const totalPages = Math.ceil(result.totalItems / parseInt(limit));

    res.status(200).json({
      data: result.data,
      pagination: {
        totalItems: result.totalItems,
        totalPages: totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
        hasNextPage: result.currentPage < totalPages,
        hasPrevPage: result.currentPage > 1
      }
    });
  } catch (err) {
    console.error('❌ Error al buscar proveedores con paginación:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ========== FUNCIONES CRUD ==========
export const getProveedorById = async (req, res) => {
  const id = req.params.id;
  try {
    const proveedor = await getProveedorByIdModel(id);
    if (!proveedor) return res.status(404).json({ message: "Proveedor no encontrado" });
    res.json(proveedor);
  } catch (err) {
    console.error("❌ Error al obtener proveedor por ID:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const createProveedor = async (req, res) => {
  const { nombreProveedor, nit, telefono, correo, direccion, estado } = req.body;

  if (!nombreProveedor || !telefono || !correo || !direccion || !estado) {
    return res.status(400).json({ error: "Todos los campos son obligatorios (NIT es opcional)" });
  }

  try {
    // Verificar si el nombre o correo ya existen
    const [existeNombre, existeCorreo] = await Promise.all([
      verificarCampoUnico('nombreProveedor', nombreProveedor),
      verificarCampoUnico('correo', correo)
    ]);

    if (existeNombre) {
      return res.status(409).json({
        error: 'El nombre del proveedor ya está registrado',
        campo: 'nombreProveedor'
      });
    }

    if (existeCorreo) {
      return res.status(409).json({
        error: 'El correo electrónico ya está registrado',
        campo: 'correo'
      });
    }

    const ProveedorId = uuidv4();
    const result = await createProveedorModel({
      ProveedorId,
      nombreProveedor,
      nit: nit || null,
      telefono,
      correo,
      direccion,
      estado
    });

    res.status(201).json({
      message: "Proveedor creado correctamente",
      proveedor: { ProveedorId, nombreProveedor, nit, telefono, correo, direccion, estado }
    });
  } catch (err) {
    console.error("❌ Error al crear proveedor:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const deleteProveedor = async (req, res) => {
  const id = req.params.id;
  try {
    const result = await deleteProveedorModel(id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }
    res.json({ message: "Proveedor eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error al eliminar proveedor:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const updateProveedor = async (req, res) => {
  const id = req.params.id;
  
  if (!id || id.length !== 36) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const { nombreProveedor, nit, telefono, correo, direccion, estado } = req.body;

  try {
    // Verificar si el nombre o correo ya existen (excluyendo el registro actual)
    const [existeNombre, existeCorreo] = await Promise.all([
      verificarCampoUnico('nombreProveedor', nombreProveedor, id),
      verificarCampoUnico('correo', correo, id)
    ]);

    if (existeNombre) {
      return res.status(409).json({
        error: 'El nombre del proveedor ya está registrado',
        campo: 'nombreProveedor'
      });
    }

    if (existeCorreo) {
      return res.status(409).json({
        error: 'El correo electrónico ya está registrado',
        campo: 'correo'
      });
    }

    const result = await updateProveedorModel(id, {
      nombreProveedor,
      nit: nit || null,
      telefono,
      correo,
      direccion,
      estado
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    res.json({ message: "Proveedor actualizado correctamente" });
  } catch (err) {
    console.error("❌ Error al actualizar proveedor:", err);
    res.status(500).json({ error: err.message });
  }
};