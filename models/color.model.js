import { dbPool } from '../lib/db.js';

export const getAllColoresDB = async () => {
  const [rows] = await dbPool.query(
    "SELECT ColorId, Nombre, Hex FROM Colores ORDER BY Nombre"
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
    FROM ProductoColores pc
    JOIN Colores c ON c.ColorId = pc.ColorId
    LEFT JOIN ProductoColores_Stock pcs ON pcs.ProductoId = pc.ProductoId AND pcs.ColorId = pc.ColorId
    WHERE pc.ProductoId = ?
    ORDER BY c.Nombre
  `, [ProductoId]);
  return rows;
};

export const setColoresProducto = async (ProductoId, coloresConStock) => {
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    // Solo actualizar UsaColores si hay colores
    if (coloresConStock.length > 0) {
      // Si hay colores, activar UsaColores = 1
      await connection.query(
        `UPDATE Productos 
         SET UsaColores = 1, Stock = NULL 
         WHERE ProductoId = ?`,
        [ProductoId]
      );
    }
    // Si el array está vacío, NO modificar UsaColores (se mantiene como estaba)

    // Eliminar registros existentes
    await connection.query(
      "DELETE FROM ProductoColores WHERE ProductoId = ?",
      [ProductoId]
    );

    await connection.query(
      "DELETE FROM ProductoColores_Stock WHERE ProductoId = ?",
      [ProductoId]
    );

    // Insertar nuevos (si hay)
    if (coloresConStock.length > 0) {
      // Insertar en ProductoColores (relación)
      const valuesProductoColores = coloresConStock.map(({ ColorId }) => [ProductoId, ColorId]);
      await connection.query(
        "INSERT INTO ProductoColores (ProductoId, ColorId) VALUES ?",
        [valuesProductoColores]
      );

      // Insertar en ProductoColores_Stock (stock)
      const valuesStock = coloresConStock.map(({ ColorId, Stock }) => [ProductoId, ColorId, Stock || 0]);
      await connection.query(
        "INSERT INTO ProductoColores_Stock (ProductoId, ColorId, Stock) VALUES ?",
        [valuesStock]
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

// Nueva función para quitar colores a un producto (convertir a producto sin colores)
export const quitarColoresProducto = async (ProductoId, nuevoStockGeneral) => {
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    // Eliminar todos los colores y stock por color
    await connection.query(
      "DELETE FROM ProductoColores WHERE ProductoId = ?",
      [ProductoId]
    );

    await connection.query(
      "DELETE FROM ProductoColores_Stock WHERE ProductoId = ?",
      [ProductoId]
    );

    // Actualizar producto para que NO use colores y tenga stock general
    await connection.query(
      `UPDATE Productos 
       SET UsaColores = 0, Stock = ? 
       WHERE ProductoId = ?`,
      [nuevoStockGeneral, ProductoId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};