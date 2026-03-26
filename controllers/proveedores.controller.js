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
import { dbPool } from '../lib/db.js';

// ========== FUNCIÓN EXISTENTE ==========
export const getAllProveedores = async (req, res) => {
  // [1] Inicio y try
  try {
    // [2] Ejecutar getAllProveedoresModel
    const proveedores = await getAllProveedoresModel();
    // [3] Retornar éxito
    res.json(proveedores);
  } catch (err) {
    // [4] Catch error
    console.error("❌ Error al obtener proveedores:", err.message);
    // [5] Retornar 500
    res.status(500).json({ error: err.message });
  }
};

// ========== Validar campo único en tiempo real ==========
export const validarCampoUnico = async (req, res) => {
  // [1] Inicio y try
  try {
    const { campo, valor, excludeId } = req.query;

    // [2] Validar campo y valor
    if (!campo || !valor) {
      // [3] Si falta campo/valor, retornar 400
      return res.status(400).json({
        error: 'Los campos "campo" y "valor" son obligatorios'
      });
    }

    // [4] Validar camposPermitidos
    const camposPermitidos = ['nombreProveedor', 'correo', 'nit'];
    if (!camposPermitidos.includes(campo)) {
      // [5] Si no es permitido, retornar 400
      return res.status(400).json({
        error: `Campo no válido. Use: ${camposPermitidos.join(', ')}`
      });
    }

    // [6] Verificar verificarCampoUnico
    const existe = await verificarCampoUnico(campo, valor.trim(), excludeId);

    // [7] Retornar json existe/disponible
    res.json({
      existe,
      mensaje: existe ? `El ${campo} ya está registrado` : 'Disponible'
    });

  } catch (err) {
    // [8] Catch error
    console.error("❌ Error al validar campo único:", err.message);
    // [9] Retornar 500
    res.status(500).json({ error: err.message });
  }
};


// ========== FUNCIÓN: Obtener proveedores con paginación ==========
export const getProveedoresPaginated = async (req, res) => {
  // [1] Inicio y try
  try {
    // [2] Asignar variables page, limit, filtros
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const filtroCampo = req.query.filtroCampo || null;
    const filtroValor = req.query.filtroValor || null;

    // [3] Ejecutar getProveedoresPaginatedModel
    const result = await getProveedoresPaginatedModel({
      page,
      limit,
      filtroCampo,
      filtroValor
    });

    // [4] Si data es vacía y page > 1 (Fallback)
    if (result.data.length === 0 && page > 1) {
      // [5] Ejecutar Fallback page 1
      const fallback = await getProveedoresPaginatedModel({
        page: 1,
        limit,
        filtroCampo,
        filtroValor
      });
      // [6] Retornar json fallback
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

    // [7] Calcular totalPages normal
    const totalPages = Math.ceil(result.totalItems / limit);

    // [8] Retornar json normal
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
    // [9] Catch error
    console.error("❌ Error al obtener proveedores con paginación:", err.message);
    // [10] Retornar 500
    res.status(500).json({ error: err.message });
  }
};

// ========== FUNCIÓN: Buscar proveedores con paginación ==========
export const buscarProveedores = async (req, res) => {
  // [1] Inicio y req.query
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

  // [2] Validar columna
  const columna = columnasPermitidas[campo];
  if (!columna) {
    // [3] Si es inválida, retornar 400
    return res.status(400).json({
      message: 'Campo de búsqueda inválido. Use: id, nombre, nit, telefono, correo, direccion o estado'
    });
  }

  // [4] Validar valor
  if (!valor || valor.trim() === '') {
    // [5] Si es vacío, retornar 400
    return res.status(400).json({
      message: 'El valor de búsqueda no puede estar vacío'
    });
  }

  // [6] Try catch para buscar
  try {
    // [7] Ejecutar búsqueda
    const result = await buscarProveedoresPaginated({
      page: parseInt(page),
      limit: parseInt(limit),
      columna,
      valor: valor.trim()
    });

    // [8] Calcular totalPages y retornar 200
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
    // [9] Catch error
    console.error('❌ Error al buscar proveedores con paginación:', err);
    // [10] Retornar 500
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ========== FUNCIONES CRUD ==========
export const getProveedorById = async (req, res) => {
  const id = req.params.id;
  // [1] Inicio y try
  try {
    // [2] Ejecutar getProveedorByIdModel
    const proveedor = await getProveedorByIdModel(id);
    if (!proveedor) {
      // [3] Si no existe proveedor, retornar 404
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }
    // [4] Retornar json 200 proveedor
    res.json(proveedor);
  } catch (err) {
    // [5] Catch error
    console.error("❌ Error al obtener proveedor por ID:", err.message);
    // [6] Retornar 500
    res.status(500).json({ error: err.message });
  }
};

export const createProveedor = async (req, res) => {
  const { nombreProveedor, nit, telefono, correo, direccion, estado } = req.body || {};

  // [1] Inicio y validación campos obligatorios
  if (!nombreProveedor || !telefono || !correo || !direccion || !estado) {
    // [2] Si faltan campos, retornar 400
    return res.status(400).json({ error: "Todos los campos son obligatorios (NIT es opcional)" });
  }

  // [3] Try catch para validación campos únicos
  try {
    // [4] Verificar nombre y correo con Promise.all
    const [existeNombre, existeCorreo] = await Promise.all([
      verificarCampoUnico('nombreProveedor', nombreProveedor),
      verificarCampoUnico('correo', correo)
    ]);

    if (existeNombre) {
      // [5] Si existeNombre, retornar 409
      return res.status(409).json({
        error: 'El nombre del proveedor ya está registrado',
        campo: 'nombreProveedor'
      });
    }

    if (existeCorreo) {
      // [6] Si existeCorreo, retornar 409
      return res.status(409).json({
        error: 'El correo electrónico ya está registrado',
        campo: 'correo'
      });
    }

    // [7] Crear UUID y ejecutar createProveedorModel
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

    // [8] Retornar 201 json éxito
    res.status(201).json({
      message: "Proveedor creado correctamente",
      proveedor: { ProveedorId, nombreProveedor, nit, telefono, correo, direccion, estado }
    });
  } catch (err) {
    // [9] Catch error
    console.error("❌ Error al crear proveedor:", err.message);
    // [10] Retornar 500
    res.status(500).json({ error: err.message });
  }
};

export const deleteProveedor = async (req, res) => {
  const id = req.params.id;
  // [1] Inicio y try
  try {
    // [2] Verificar si tiene compras asociadas
    const [compras] = await dbPool.execute(
      "SELECT COUNT(*) as total FROM compras WHERE ProveedorId = ?",
      [id]
    );

    if (compras[0].total > 0) {
      // [3] Si compras > 0, retornar 400
      return res.status(400).json({ 
        error: "No se puede eliminar el proveedor porque tiene compras registradas en el sistema." 
      });
    }

    // [4] Ejecutar deleteProveedorModel
    const result = await deleteProveedorModel(id);
    if (result.affectedRows === 0) {
      // [5] Si affectedRows === 0, retornar 404
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }
    // [6] Retornar 200 json éxito
    res.json({ message: "Proveedor eliminado correctamente" });
  } catch (err) {
    // [7] Catch error
    console.error("❌ Error al eliminar proveedor:", err.message);
    // [8] Retornar 500
    res.status(500).json({ error: err.message });
  }
};

export const updateProveedor = async (req, res) => {
  const id = req.params.id;
  
  // [1] Inicio y validación ID
  if (!id || id.length !== 36) {
    // [2] Si ID es inválido, retornar 400
    return res.status(400).json({ error: "ID inválido" });
  }

  // [3] Obtener req.body
  const { nombreProveedor, nit, telefono, correo, direccion, estado } = req.body || {};

  // [4] Try catch
  try {
    // [5] Verificar nombre y correo con Promise.all
    const [existeNombre, existeCorreo] = await Promise.all([
      verificarCampoUnico('nombreProveedor', nombreProveedor, id),
      verificarCampoUnico('correo', correo, id)
    ]);

    if (existeNombre) {
      // [6] Si existeNombre, retornar 409
      return res.status(409).json({
        error: 'El nombre del proveedor ya está registrado',
        campo: 'nombreProveedor'
      });
    }

    if (existeCorreo) {
      // [7] Si existeCorreo, retornar 409
      return res.status(409).json({
        error: 'El correo electrónico ya está registrado',
        campo: 'correo'
      });
    }

    // [8] Ejecutar updateProveedorModel
    const result = await updateProveedorModel(id, {
      nombreProveedor,
      nit: nit || null,
      telefono,
      correo,
      direccion,
      estado
    });

    if (result.affectedRows === 0) {
      // [9] Si affectedRows === 0, retornar 404
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    // [10] Retornar 200 json éxito
    res.json({ message: "Proveedor actualizado correctamente" });
  } catch (err) {
    // [11] Catch error
    console.error("❌ Error al actualizar proveedor:", err);
    // [12] Retornar 500
    res.status(500).json({ error: err.message });
  }
};