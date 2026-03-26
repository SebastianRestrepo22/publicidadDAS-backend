import { dbPool } from "../lib/db.js";
import { v4 as uuidv4 } from 'uuid';

// Obtener todas las categorías (sin paginación)
export const getAllCategorias = async () => {
  const [categorias] = await dbPool.query('SELECT * FROM categorias ORDER BY Nombre');
  return categorias;
};

// Obtener categoría por ID
export const getCategoriaById = async (id) => {
  const [categoria] = await dbPool.query(
    'SELECT * FROM categorias WHERE CategoriaId = ?',
    [id]
  );
  return categoria[0];
};

// Obtener categoría por nombre (case insensitive)
export const getCategoriaByNombre = async (nombre) => {
  const [categoria] = await dbPool.query(
    'SELECT * FROM categorias WHERE LOWER(Nombre) = LOWER(?)',
    [nombre]
  );
  return categoria[0];
};

// Crear categoría
export const createCategoria = async ({ nombreCategoria, descripcion }) => {
  const CategoriaId = uuidv4();
  const [result] = await dbPool.query(
    'INSERT INTO categorias (CategoriaId, Nombre, Descripcion) VALUES (?, ?, ?)',
    [CategoriaId, nombreCategoria, descripcion]
  );
  return { CategoriaId, nombreCategoria, descripcion };
};

// Actualizar categoría
export const updateCategoria = async (id, { nombreCategoria, descripcion }) => {
  const [result] = await dbPool.query(
    'UPDATE categorias SET Nombre = ?, Descripcion = ? WHERE CategoriaId = ?',
    [nombreCategoria, descripcion, id]
  );
  return result;
};

// Eliminar categoría
export const deleteCategoria = async (id) => {
  const [result] = await dbPool.query(
    'DELETE FROM categorias WHERE CategoriaId = ?',
    [id]
  );
  return result;
};

// 🔥 NUEVA FUNCIÓN: Obtener categorías con paginación y filtros
export const getCategoriasPaginated = async ({ 
  page = 1, 
  limit = 10, 
  filtroCampo = null, 
  filtroValor = null,
  sortBy = 'Nombre',
  sortOrder = 'ASC'
}) => {
  const offset = (page - 1) * limit;
  let whereClause = '';
  let params = [];

  // Construir cláusula WHERE si hay filtros
  if (filtroCampo && filtroValor) {
    // Mapear nombres de campos amigables a nombres de columnas
    const campoMap = {
      id: 'CategoriaId',
      nombre: 'Nombre',
      descripcion: 'Descripcion'
    };

    const columna = campoMap[filtroCampo] || filtroCampo;

    if (columna === 'CategoriaId') {
      whereClause = 'WHERE CategoriaId = ?';
      params.push(filtroValor);
    } else {
      whereClause = `WHERE ${columna} LIKE ?`;
      params.push(`%${filtroValor}%`);
    }
  }

  // Validar sortOrder
  const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  
  // Validar sortBy (protección contra SQL injection)
  const columnasPermitidas = ['CategoriaId', 'Nombre', 'Descripcion'];
  const sortColumn = columnasPermitidas.includes(sortBy) ? sortBy : 'Nombre';

  // Consulta principal con LIMIT/OFFSET
  const [rows] = await dbPool.query(
    `SELECT * FROM categorias ${whereClause} ORDER BY ${sortColumn} ${order} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Consulta para obtener el total de registros
  const [countResult] = await dbPool.query(
    `SELECT COUNT(*) as total FROM categorias ${whereClause}`,
    params
  );

  return {
    data: rows,
    totalItems: countResult[0].total,
    currentPage: Number(page),
    itemsPerPage: Number(limit)
  };
};

// 🔥 NUEVA FUNCIÓN: Buscar categorías con paginación (wrapper de getCategoriasPaginated)
export const buscarCategoriasPaginated = async ({ page, limit, columna, valor }) => {
  return await getCategoriasPaginated({ 
    page, 
    limit, 
    filtroCampo: columna, 
    filtroValor: valor 
  });
};



