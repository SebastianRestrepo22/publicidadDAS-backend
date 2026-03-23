import {
  getAllCategorias as getAllCategoriasModel,
  getCategoriaById as getCategoriaByIdModel,
  createCategoria as createCategoriaModel,
  deleteCategoria as deleteCategoriaModel,
  updateCategoria as updateCategoriaModel,
  getCategoriaByNombre as getCategoriaByNombreModel,
  getCategoriasPaginated as getCategoriasPaginatedModel,
  buscarCategoriasPaginated
} from '../models/categoria.models.js';
import { v4 as uuidv4 } from 'uuid';
import { dbPool } from '../lib/db.js';

// ========== la mantenemos para compatibilidad) ==========
export const getAllCategorias = async (req, res) => {
  try {
    const categorias = await getAllCategoriasModel();
    res.json(categorias);
  } catch (err) {
    console.error("Error al obtener categorias:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ==========  Obtener categorías con paginación ==========
export const getCategoriasPaginated = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const filtroCampo = req.query.filtroCampo || null;
    const filtroValor = req.query.filtroValor || null;

    const result = await getCategoriasPaginatedModel({ 
      page, 
      limit, 
      filtroCampo, 
      filtroValor 
    });

    if (result.data.length === 0 && page > 1) {
      const fallback = await getCategoriasPaginatedModel({ 
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
    console.error("Error al obtener categorías con paginación:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ========== NUEVA FUNCIÓN: Buscar categorías con paginación ==========
export const buscarCategorias = async (req, res) => {
  const { campo, valor, page = 1, limit = 10 } = req.query;

  const columnasPermitidas = {
    id: 'CategoriaId',
    nombre: 'Nombre',
    descripcion: 'Descripcion'
  };

  const columna = columnasPermitidas[campo];

  if (!columna) {
    return res.status(400).json({ 
      message: 'Campo de búsqueda inválido. Use: id, nombre o descripcion' 
    });
  }

  if (!valor || valor.trim() === '') {
    return res.status(400).json({ 
      message: 'El valor de búsqueda no puede estar vacío' 
    });
  }

  try {
    const result = await buscarCategoriasPaginated({ 
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
    console.error('Error al buscar categorías con paginación:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ========== FUNCIONES CRUD EXISTENTES ==========

export const getCategoriaById = async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "ID inválido" });

  try {
    const categoria = await getCategoriaByIdModel(id);
    if (!categoria) return res.status(404).json({ message: "Categoria no encontrada" });
    res.json(categoria);
  } catch (err) {
    console.error("Error al obtener la categoria por ID:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const createCategoria = async (req, res) => {
  const { nombreCategoria, descripcion } = req.body;

  if (!nombreCategoria || !descripcion) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const nombreRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  if (!nombreRegex.test(nombreCategoria)) {
    return res.status(400).json({
      error: "El nombre de la categoría solo puede contener letras y espacios"
    });
  }

  const categoriaExistente = await getCategoriaByNombreModel(nombreCategoria.trim());
  if (categoriaExistente) {
    return res.status(400).json({
      error: "Ya existe una categoría con este nombre"
    });
  }

  try {
    const CategoriaId = uuidv4();
    const result = await createCategoriaModel({ 
      CategoriaId,
      nombreCategoria: nombreCategoria.trim(), 
      descripcion: descripcion.trim() 
    });
    res.status(201).json({
      message: "Categoría creada correctamente",
      categoria: { CategoriaId, nombreCategoria, descripcion }
    });
  } catch (err) {
    console.error("Error al crear categoria:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 🔥 MODIFICADO: Eliminar categoría con validación de productos asociados
export const deleteCategoria = async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "ID inválido" });

  try {
    // 🔥 Verificar si hay productos usando esta categoría
    const [productos] = await dbPool.execute(
      "SELECT COUNT(*) as total FROM productos WHERE CategoriaId = ?",
      [id]
    );

    const totalProductos = productos[0].total;

    if (totalProductos > 0) {
      return res.status(400).json({
        error: "No se puede eliminar la categoría",
        message: `La categoría tiene ${totalProductos} producto(s) asociado(s). Elimina o reasigna los productos primero.`
      });
    }

    const result = await deleteCategoriaModel(id);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }
    
    res.json({ 
      message: "Categoría eliminada correctamente",
      deleted: true
    });
  } catch (err) {
    console.error("Error al eliminar categoria:", err.message);
    
    // Manejar error de foreign key por si acaso
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        error: "No se puede eliminar la categoría",
        message: "La categoría tiene productos asociados. Elimina o reasigna los productos primero."
      });
    }
    
    res.status(500).json({ error: err.message });
  }
};

export const updateCategoria = async (req, res) => {
  const id = req.params.id;
  const { nombreCategoria, descripcion } = req.body;

  if (!nombreCategoria || !descripcion) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const nombreRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  if (!nombreRegex.test(nombreCategoria)) {
    return res.status(400).json({
      error: "El nombre de la categoría solo puede contener letras y espacios"
    });
  }

  const categoriaExistente = await getCategoriaByNombreModel(nombreCategoria.trim());
  if (categoriaExistente && categoriaExistente.CategoriaId !== id) {
    return res.status(400).json({
      error: "Ya existe otra categoría con este nombre"
    });
  }

  try {
    const result = await updateCategoriaModel(id, { 
      nombreCategoria: nombreCategoria.trim(), 
      descripcion: descripcion.trim() 
    });
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Categoria no encontrada" });
    }
    res.json({ 
      message: "Categoria actualizada correctamente",
      categoria: { CategoriaId: id, nombreCategoria, descripcion }
    });
  } catch (err) {
    console.error("Error al actualizar la categoria:", err.message);
    res.status(500).json({ error: err.message });
  }
};