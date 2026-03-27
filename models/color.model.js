import { dbPool } from '../lib/db.js';

export const getAllColoresDB = async () => {
  const [rows] = await dbPool.query(
    "SELECT ColorId, Nombre, Hex FROM colores ORDER BY Nombre"
  );
  return rows;
};

export const getColoresByProductoId = async (ProductoId) => {
  const [rows] = await dbPool.query(`
    SELECT 
      c.ColorId, 
      c.Nombre, 
      c.Hex,
      COALESCE(pcs.Stock, 0) AS Stock
    FROM productocolores_stock pcs
    INNER JOIN colores c ON c.ColorId = pcs.ColorId
    WHERE pcs.ProductoId = ?
    ORDER BY c.Nombre
  `, [ProductoId]);  // 🔥 Ahora usamos directamente productocolores_stock
  return rows;
};

export const setColoresProducto = async (ProductoId, coloresConStock) => {
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    // Si hay colores, activar UsaColores = 1 y poner Stock = NULL
    if (coloresConStock.length > 0) {
      await connection.query(
        `UPDATE productos 
         SET UsaColores = 1, Stock = NULL 
         WHERE ProductoId = ?`,
        [ProductoId]
      );

      // Eliminar colores existentes
      await connection.query(
        "DELETE FROM productocolores_stock WHERE ProductoId = ?",
        [ProductoId]
      );

      // Insertar nuevos colores con stock
      const valuesStock = coloresConStock.map(({ ColorId, Stock }) => [ProductoId, ColorId, Stock || 0]);
      await connection.query(
        "INSERT INTO productocolores_stock (ProductoId, ColorId, Stock) VALUES ?",
        [valuesStock]
      );
    } else {
      // Si no hay colores, desactivar UsaColores y poner stock general
      await connection.query(
        `UPDATE productos 
         SET UsaColores = 0, Stock = 0 
         WHERE ProductoId = ?`,
        [ProductoId]
      );

      // Eliminar cualquier registro de colores que pudiera quedar
      await connection.query(
        "DELETE FROM productocolores_stock WHERE ProductoId = ?",
        [ProductoId]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};