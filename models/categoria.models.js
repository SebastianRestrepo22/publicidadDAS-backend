import { v4 as uuidv4 } from 'uuid';
import { dbPool } from '../lib/db.js';

export const getAllCategorias = async () => {
  const [rows] = await dbPool.execute('SELECT * FROM Categorias');
  return rows;
};

export const getCategoriaById = async (id) => {
  const [rows] = await dbPool.execute('SELECT * FROM Categorias WHERE CategoriaId = ?', [id]);
  return rows[0] || null;
};

export const createCategoria = async ({ nombreCategoria, descripcion }) => {
  const categoriaId = uuidv4();
  await dbPool.execute(
    'INSERT INTO Categorias (CategoriaId, Nombre, Descripcion) VALUES (?, ?, ?)',
    [categoriaId, nombreCategoria, descripcion]
  );
  return { CategoriaId: categoriaId, Nombre: nombreCategoria, Descripcion: descripcion };
};

export const deleteCategoria = async (id) => {
  const [result] = await dbPool.execute('DELETE FROM Categorias WHERE CategoriaId = ?', [id]);
  return result;
};

export const updateCategoria = async (id, { nombreCategoria, descripcion }) => {
  const [result] = await dbPool.execute(
    'UPDATE Categorias SET Nombre = ?, Descripcion = ? WHERE CategoriaId = ?',
    [nombreCategoria, descripcion, id]
  );
  return result;
};