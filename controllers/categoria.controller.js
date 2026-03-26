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


export const getAllCategorias = async (req, res) => {
  // [1] Inicio / Try
  try {
    // [2] Intentar obtener categorias
    const categorias = await getAllCategoriasModel();
    // [3] Retornar categorias éxito
    res.json(categorias);
  } catch (err) {
    // [4] Capturar error
    console.error("Error al obtener categorias:", err.message);
    // [5] Retornar error de servidor
    res.status(500).json({ error: "500 Internal Server Error" });
  }
};

// ==========  Obtener categorías con paginación ==========
export const getCategoriasPaginated = async (req, res) => {
  // [1] Inicio y recolección de query params
  try {
    // [2] Asignación de variables iniciales
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const filtroCampo = req.query.filtroCampo || null;
    const filtroValor = req.query.filtroValor || null;

    // [3] Consultar base de datos
    const result = await getCategoriasPaginatedModel({ 
      page, 
      limit, 
      filtroCampo, 
      filtroValor 
    });

    // [4] Validar si no hay resultados y la página es > 1
    if (result.data.length === 0 && page > 1) {
      // [5] Obtener datos de la página 1 (fallback)
      const fallback = await getCategoriasPaginatedModel({ 
        page: 1, 
        limit, 
        filtroCampo, 
        filtroValor 
      });
      
      // [6] Retornar fallback exitosamente
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

    // [7] Calcular total de páginas
    const totalPages = Math.ceil(result.totalItems / limit);

    // [8] Retornar resultados exitosamente
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
    // [9] Capturar error
    console.error("Error al obtener categorías con paginación:", err.message);
    // [10] Retornar error interno
    res.status(500).json({ error: "500 Internal Server Error" });
  }
};

// ========== Buscar categorías con paginación ==========
export const buscarCategorias = async (req, res) => {
  // [1] Inicio e inicialización de parámetros de búsqueda
  const { campo, valor, page = 1, limit = 10 } = req.query;

  const columnasPermitidas = {
    id: 'CategoriaId',
    nombre: 'Nombre',
    descripcion: 'Descripcion'
  };

  const columna = columnasPermitidas[campo];

  // [2] Validar si la columna es permitida
  if (!columna) {
    // [3] Retornar error de campo inválido
    return res.status(400).json({ 
      message: 'Campo de búsqueda inválido. Use: id, nombre o descripcion' 
    });
  }

  // [4] Validar que el valor no esté vacío
  if (!valor || valor.trim() === '') {
    // [5] Retornar error de valor vacío
    return res.status(400).json({ 
      message: 'El valor de búsqueda no puede estar vacío' 
    });
  }

  try {
    // [6] Ejecutar búsqueda en base de datos
    const result = await buscarCategoriasPaginated({ 
      page: parseInt(page), 
      limit: parseInt(limit), 
      columna, 
      valor: valor.trim() 
    });

    // [7] Calcular páginas y retornar éxito
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
    // [8] Capturar error en base de datos
    console.error('Error al buscar categorías con paginación:', err);
    // [9] Retornar error de servidor
    res.status(500).json({ error: "500 Internal Server Error" });
  }
};


export const getCategoriaById = async (req, res) => {
  // [1] Inicio y obtención de ID
  const id = req.params.id;
  
  // [2] Validar ID en params
  if (!id) return res.status(400).json({ error: "ID inválido" }); // [3] Retornar error ID

  try {
    // [4] Consultar categoría por ID
    const categoria = await getCategoriaByIdModel(id);
    
    // [5] Validar si existe categoría
    if (!categoria) return res.status(404).json({ message: "Categoria no encontrada" }); // [6] Retornar error 404
    
    // [7] Retornar categoría éxito
    res.json(categoria);
  } catch (err) {
    // [8] Capturar error DB
    console.error("Error al obtener la categoria por ID:", err.message);
    // [9] Retornar error servidor
    res.status(500).json({ error: "500 Internal Server Error" });
  }
};

export const createCategoria = async (req, res) => {
  // [1] Inicio e inicialización
  const { nombreCategoria, descripcion } = req.body;

  // [2] Validar campos obligados
  if (!nombreCategoria || !descripcion) {
    // [3] Retornar error incompletos
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  // [4] Establecer Regex
  const nombreRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  // [5] Probar regex nombre
  if (!nombreRegex.test(nombreCategoria)) {
    // [6] Retornar error formato inválido
    return res.status(400).json({
      error: "El nombre de la categoría solo puede contener letras y espacios"
    });
  }

  // [7] Buscar si existe en nombre
  const categoriaExistente = await getCategoriaByNombreModel(nombreCategoria.trim());
  // [8] Validar si ya existe
  if (categoriaExistente) {
    // [9] Retornar error existencia
    return res.status(400).json({
      error: "Ya existe una categoría con este nombre"
    });
  }

  try {
    // [10] Preparar creación DB uuid y query
    const CategoriaId = uuidv4();
    const result = await createCategoriaModel({ 
      CategoriaId,
      nombreCategoria: nombreCategoria.trim(), 
      descripcion: descripcion.trim() 
    });
    // [11] Retornar éxito creado
    res.status(201).json({
      message: "Categoría creada correctamente",
      categoria: { CategoriaId, nombreCategoria, descripcion }
    });
  } catch (err) {
    // [12] Capturar error try
    console.error("Error al crear categoria:", err.message);
    // [13] Retornar error de servidor
    res.status(500).json({ error: "500 Internal Server Error" });
  }
};

//  Eliminar categoría con validación de productos asociados
export const deleteCategoria = async (req, res) => {
  // [1] Inicio y obtención ID
  const id = req.params.id;
  // [2] Validar existencia ID
  if (!id) return res.status(400).json({ error: "ID inválido" }); // [3] Retornar error ID

  try {
    // [4] Verificar si hay productos
    const [productos] = await dbPool.execute(
      "SELECT COUNT(*) as total FROM productos WHERE CategoriaId = ?",
      [id]
    );

    const totalProductos = productos[0].total;

    // [5] Validar productos asociados
    if (totalProductos > 0) {
      // [6] Retornar error foreing key lógica
      return res.status(400).json({
        error: "No se puede eliminar la categoría",
        message: `La categoría tiene ${totalProductos} producto(s) asociado(s). Elimina o reasigna los productos primero.`
      });
    }

    // [7] Ejecutar eliminación DB
    const result = await deleteCategoriaModel(id);
    
    // [8] Validar affectedRows
    if (result.affectedRows === 0) {
      // [9] Retornar error no encontrada 404
      return res.status(404).json({ message: "Categoría no encontrada" });
    }
    
    // [10] Retornar éxito 200
    res.json({ 
      message: "Categoría eliminada correctamente",
      deleted: true
    });
  } catch (err) {
    // [11] Capturar error
    console.error("Error al eliminar categoria:", err.message);
    
    // [12] Validar si error es FOREING_KEY 2
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      // [13] Retornar error ForeignKey conflicto
      return res.status(400).json({
        error: "No se puede eliminar la categoría",
        message: "La categoría tiene productos asociados. Elimina o reasigna los productos primero."
      });
    }
    
    // [14] Retornar error servidor general 500
    res.status(500).json({ error: "500 Internal Server Error" });
  }
};

export const updateCategoria = async (req, res) => {
  // [1] Inicio y recolección
  const id = req.params.id;
  const { nombreCategoria, descripcion } = req.body;

  // [2] Validar campos obligatorios
  if (!nombreCategoria || !descripcion) {
    // [3] Retornar error campos
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  // [4] Asignar Regex
  const nombreRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  // [5] Probar regex
  if (!nombreRegex.test(nombreCategoria)) {
    // [6] Retornar error formato nombre
    return res.status(400).json({
      error: "El nombre de la categoría solo puede contener letras y espacios"
    });
  }

  // [7] Buscar categoría existente by nombre
  const categoriaExistente = await getCategoriaByNombreModel(nombreCategoria.trim());
  // [8] Validar coincidencia
  if (categoriaExistente && categoriaExistente.CategoriaId !== id) {
    // [9] Retornar error nombre en uso
    return res.status(400).json({
      error: "Ya existe otra categoría con este nombre"
    });
  }

  try {
    // [10] DB updateCategoriaModel
    const result = await updateCategoriaModel(id, { 
      nombreCategoria: nombreCategoria.trim(), 
      descripcion: descripcion.trim() 
    });
    // [11] Validar affectedRows
    if (result.affectedRows === 0) {
      // [12] Retornar error 404
      return res.status(404).json({ message: "Categoria no encontrada" });
    }
    // [13] Retornar éxito 200
    res.json({ 
      message: "Categoria actualizada correctamente",
      categoria: { CategoriaId: id, nombreCategoria, descripcion }
    });
  } catch (err) {
    // [14] Capturar error Try
    console.error("Error al actualizar la categoria:", err.message);
    // [15] Retornar error servidor 500
    res.status(500).json({ error: "500 Internal Server Error" });
  }
};




