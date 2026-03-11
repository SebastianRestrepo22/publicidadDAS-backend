import {
  getAllCategorias as getAllCategoriasModel,
  getCategoriaById as getCategoriaByIdModel,
  createCategoria as createCategoriaModel,
  deleteCategoria as deleteCategoriaModel,
  updateCategoria as updateCategoriaModel
} from '../models/categoria.models.js';
import { v4 as uuidv4 } from 'uuid';

// Obtener todas las categorías
export const getAllCategorias = async (req, res) => {
  try {
    const categorias = await getAllCategoriasModel();
    res.json(categorias);
  } catch (err) {
    console.error("Error al obtener categorias:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Obtener categoría por ID
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

// Crear nueva categoría
export const createCategoria = async (req, res) => {
  const { nombreCategoria, descripcion } = req.body;

  if (!nombreCategoria || !descripcion) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  //validar solo letras 
  const nombreRegex =  /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  if (!nombreRegex.test(nombreCategoria)) {
    return res.status(400).json({
      error: "El nombre de la categoria solo puede contener letras y espacios"
    })
  }

  // validar que no tenga numeros
  const descripcionRegex =  /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  if (!descripcionRegex.test(descripcion)) {
    return res.status(400).json({
      error: "La descripcion solo debe de tener letras y espacion"
    })
  }

  try {
    const result = await createCategoriaModel({ nombreCategoria, descripcion });
    res.status(201).json(result);
  } catch (err) {
    console.error("Error al crear categoria:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Eliminar categoría
export const deleteCategoria = async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "ID inválido" });

  try {
    const result = await deleteCategoriaModel(id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Categoria no encontrado" });
    }
    res.json({ message: "Categoria eliminada correctamente" });
  } catch (err) {
    console.error("Error al eliminar categoria:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Actualizar categoría
export const updateCategoria = async (req, res) => {
  const id = req.params.id;
  const { nombreCategoria, descripcion } = req.body;

  if (!nombreCategoria || !descripcion) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const nombreRegex =  /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  if (!nombreRegex.test(nombreCategoria)) {
    return res.status(400).json({
      error: "El nombre de la categoria solo puede contener letras y espacios"
    })
  }

  // validar que no tenga numeros
  const descripcionRegex =  /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  if (!descripcionRegex.test(descripcion)) {
    return res.status(400).json({
      error: "La descripcion solo debe de tener letras y espacion"
    })
  }

  try {
    const result = await updateCategoriaModel(id, { nombreCategoria, descripcion });
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Categoria no encontrada" });
    }
    res.json({ message: "Categoria actualizada correctamente" });
  } catch (err) {
    console.error("Error al actualizar la categoria:", err.message);
    res.status(500).json({ error: err.message });
  }
};