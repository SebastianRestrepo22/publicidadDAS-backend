import { v4 as uuidv4 } from 'uuid';
import { dbPool } from '../lib/db.js';

const sanitize = (v) => (v === undefined ? null : v);

export const getAllDetallesModel = async () => {
  const [rows] = await dbPool.execute('SELECT * FROM DetalleCompras');
  
  // Parsear colores JSON para cada fila
  return rows.map(row => ({
    ...row,
    colores: row.colores ? JSON.parse(row.colores) : []
  }));
}

export const getDetalleByIdModel = async (id) => {
  const [rows] = await dbPool.execute(
    'SELECT * FROM DetalleCompras WHERE DetalleCompraId = ?',
    [id]
  );
  
  if (rows[0]) {
    rows[0].colores = rows[0].colores ? JSON.parse(rows[0].colores) : [];
  }
  
  return rows[0];
};

export const getDetalleByCompraIdModel = async (CompraId) => {
  try {
    console.log("🟡 [getDetalleByCompraIdModel] Ejecutando query para CompraId:", CompraId);
    
    const [rows] = await dbPool.execute(
      'SELECT * FROM DetalleCompras WHERE CompraId = ?',
      [CompraId]
    );
    
    console.log("🟢 [getDetalleByCompraIdModel] Filas obtenidas:", rows.length);
    
    // Procesar cada fila para parsear colores si es necesario
    return rows.map(row => {
      // Crear una copia del objeto
      const processedRow = { ...row };
      
      // Si colores es un string, intentar parsearlo
      if (processedRow.colores !== undefined && processedRow.colores !== null) {
        if (typeof processedRow.colores === 'string') {
          try {
            // Si el string es "[object Object]", es un error - devolver array vacío
            if (processedRow.colores === '[object Object]') {
              console.warn("⚠️ [getDetalleByCompraIdModel] [object Object] detectado, reemplazando con array vacío");
              processedRow.colores = [];
            } else if (processedRow.colores.trim() === '') {
              processedRow.colores = [];
            } else {
              // Intentar parsear el JSON
              const parsed = JSON.parse(processedRow.colores);
              processedRow.colores = Array.isArray(parsed) ? parsed : [];
            }
          } catch (e) {
            console.warn("⚠️ [getDetalleByCompraIdModel] JSON inválido:", e.message, "para colores:", processedRow.colores);
            processedRow.colores = [];
          }
        } 
        // Si ya es un array, verificar que sea válido
        else if (Array.isArray(processedRow.colores)) {
          // Ya es un array, verificar que no tenga objetos circulares
          try {
            // Intentar stringify para ver si hay problemas
            JSON.stringify(processedRow.colores);
          } catch (e) {
            console.warn("⚠️ [getDetalleByCompraIdModel] colores contiene objetos circulares, recreando");
            // Recrear el array con objetos planos
            processedRow.colores = processedRow.colores.map(color => {
              if (typeof color === 'object' && color !== null) {
                return {
                  ColorId: String(color.ColorId || ''),
                  Stock: Number(color.Stock || 0),
                  Nombre: String(color.Nombre || 'Color'),
                  Hex: String(color.Hex || '#CCCCCC')
                };
              }
              return color;
            });
          }
        } 
        // Si no es ni string ni array, establecer como array vacío
        else {
          console.log("🟡 [getDetalleByCompraIdModel] colores no es string ni array, tipo:", typeof processedRow.colores);
          processedRow.colores = [];
        }
      } else {
        processedRow.colores = [];
      }
      
      return processedRow;
    });
    
  } catch (error) {
    console.error("❌ [getDetalleByCompraIdModel] Error:", error.message);
    console.error("❌ Stack:", error.stack);
    throw error;
  }
};

export const createDetalleCompra = async ({  
    CompraId,
    ProductoId, 
    Cantidad, 
    Descripcion,
    PrecioUnitario,
    colores // Array de colores
 }) => {
  const DetalleCompraId = uuidv4();

  // Si hay colores, asegurarse de que sea un array y convertirlo a JSON string
  let coloresJSON = null;
  if (colores && Array.isArray(colores) && colores.length > 0) {
    // Asegurar que cada color sea un objeto plano sin métodos adicionales
    const coloresLimpios = colores.map(color => {
      // Crear un objeto nuevo y plano con solo las propiedades que necesitamos
      return {
        ColorId: String(color.ColorId || ''),
        Stock: Number(color.Stock || 0),
        Nombre: String(color.Nombre || 'Color'),
        Hex: String(color.Hex || '#CCCCCC')
      };
    });
    
    coloresJSON = JSON.stringify(coloresLimpios);
    console.log("Guardando colores en BD:", coloresJSON);
  }

  await dbPool.execute(
    `INSERT INTO DetalleCompras 
    (DetalleCompraId, CompraId, ProductoId, Cantidad, PrecioUnitario, Descripcion, colores) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      DetalleCompraId,
      CompraId, 
      sanitize(ProductoId), 
      sanitize(Cantidad),
      sanitize(PrecioUnitario || 0),
      sanitize(Descripcion),
      coloresJSON // Guardar el JSON string
    ]
  );
  
  return { 
    DetalleCompraId, 
    CompraId, 
    ProductoId, 
    Cantidad, 
    PrecioUnitario, 
    Descripcion,
    colores 
  };
};


// ✅ Update con soporte para múltiples colores
export const updateDetalleCompra = async (id, data) => {
  const { ProductoId, Cantidad, Descripcion, PrecioUnitario, colores } = data;

  const coloresJSON = colores && colores.length > 0 ? JSON.stringify(colores) : null;

  const [result] = await dbPool.execute(
    `UPDATE DetalleCompras
     SET ProductoId = ?, Cantidad = ?, PrecioUnitario = ?, Descripcion = ?, colores = ?
     WHERE DetalleCompraId = ?`,
    [
      sanitize(ProductoId), 
      sanitize(Cantidad), 
      sanitize(PrecioUnitario || 0),
      sanitize(Descripcion), 
      coloresJSON,
      id
    ]
  );

  return result;
};

export const deleteDetalleCompra = async (id) => {
  const [result] = await dbPool.execute(
    'DELETE FROM DetalleCompras WHERE DetalleCompraId = ?', 
    [id]
  );
  return result;
};

// ✅ Función para actualizar stock por color
export const actualizarStockPorColor = async (productoId, colorId, cantidad) => {
  // Verificar si existe stock para ese color
  const [existe] = await dbPool.execute(
    'SELECT Stock FROM productocolores_stock WHERE ProductoId = ? AND ColorId = ?',
    [productoId, colorId]
  );

  if (existe.length > 0) {
    // Actualizar stock existente
    const stockActual = existe[0].Stock || 0;
    const nuevoStock = stockActual + cantidad;

    await dbPool.execute(
      'UPDATE productocolores_stock SET Stock = ? WHERE ProductoId = ? AND ColorId = ?',
      [nuevoStock, productoId, colorId]
    );

    return { 
      productoId, 
      colorId, 
      stockAnterior: stockActual, 
      stockNuevo: nuevoStock,
      tipo: 'color'
    };
  } else {
    // Insertar nuevo registro de stock por color
    await dbPool.execute(
      'INSERT INTO productocolores_stock (ProductoId, ColorId, Stock) VALUES (?, ?, ?)',
      [productoId, colorId, cantidad]
    );

    return { 
      productoId, 
      colorId, 
      stockAnterior: 0, 
      stockNuevo: cantidad,
      tipo: 'color_nuevo'
    };
  }
};

// ✅ Función para actualizar stock general
export const actualizarStockGeneral = async (productoId, cantidad) => {
  const [producto] = await dbPool.execute(
    'SELECT Stock, UsaColores FROM Productos WHERE ProductoId = ?',
    [productoId]
  );

  if (producto.length === 0) {
    throw new Error(`Producto ${productoId} no encontrado`);
  }

  const stockActual = producto[0].Stock || 0;
  const nuevoStock = stockActual + cantidad;

  await dbPool.execute(
    'UPDATE Productos SET Stock = ? WHERE ProductoId = ?',
    [nuevoStock, productoId]
  );

  return { 
    productoId, 
    stockAnterior: stockActual, 
    stockNuevo: nuevoStock,
    usaColores: producto[0].UsaColores === 1,
    tipo: 'general'
  };
};

// ✅ Función para actualizar stock según corresponda
export const actualizarStockProducto = async (productoId, colorId, cantidad) => {
  const [producto] = await dbPool.execute(
    'SELECT UsaColores FROM Productos WHERE ProductoId = ?',
    [productoId]
  );

  if (producto.length === 0) {
    throw new Error(`Producto ${productoId} no encontrado`);
  }

  const usaColores = producto[0].UsaColores === 1;

  if (usaColores && colorId) {
    return await actualizarStockPorColor(productoId, colorId, cantidad);
  } else {
    return await actualizarStockGeneral(productoId, cantidad);
  }
};

// ✅ Actualizar stock de múltiples productos (soporta colores)
export const actualizarStockMultiple = async (items) => {
  const resultados = [];
  const errores = [];

  for (const item of items) {
    try {
      // Si tiene colores, actualizar cada color individualmente
      if (item.colores && item.colores.length > 0) {
        for (const color of item.colores) {
          const resultado = await actualizarStockProducto(
            item.ProductoId, 
            color.ColorId, 
            color.Stock
          );
          resultados.push(resultado);
        }
      } else {
        // Stock general
        const resultado = await actualizarStockProducto(
          item.ProductoId, 
          null, 
          item.Cantidad
        );
        resultados.push(resultado);
      }
    } catch (error) {
      errores.push({
        productoId: item.ProductoId,
        error: error.message
      });
    }
  }

  return {
    exitosos: resultados,
    errores: errores,
    totalExitosos: resultados.length,
    totalErrores: errores.length
  };
};

export const getDetallesConProducto = async (CompraId) => {
  const [rows] = await dbPool.execute(
    `SELECT dc.*, 
            p.Nombre as ProductoNombre, 
            p.SKU, 
            p.Stock as StockActual,
            p.UsaColores
     FROM DetalleCompras dc
     LEFT JOIN Productos p ON dc.ProductoId = p.ProductoId
     WHERE dc.CompraId = ?`,
    [CompraId]
  );

  // ✅ Manejo seguro: procesar cada fila
  return rows.map(row => {
    // Crear copia del objeto
    const processedRow = { ...row };
    
    let colores = processedRow.colores;
    
    // Si viene como string, parsearlo
    if (typeof colores === 'string') {
      try {
        if (colores === '[object Object]') {
          console.warn("⚠️ [object Object] detectado en getDetallesConProducto");
          colores = [];
        } else {
          colores = JSON.parse(colores);
        }
      } catch (e) {
        console.warn("⚠️ JSON inválido en colores:", processedRow.DetalleCompraId, e);
        colores = [];
      }
    }
    
    // Si es null o no es array, normalizar a array vacío
    if (!Array.isArray(colores)) {
      colores = colores ? [colores] : [];
    }
    
    // Asegurar que cada color sea un objeto plano
    colores = colores.map(color => {
      if (typeof color === 'object' && color !== null) {
        return {
          ColorId: String(color.ColorId || ''),
          Stock: Number(color.Stock || 0),
          Nombre: String(color.Nombre || 'Color'),
          Hex: String(color.Hex || '#CCCCCC')
        };
      }
      return color;
    });
    
    return {
      ...processedRow,
      colores
    };
  });
};

// Alias para nombres que usa el controlador
export const createDetalleModel = createDetalleCompra;
export const updateDetalleModel = updateDetalleCompra;
export const deleteDetalleModel = deleteDetalleCompra;