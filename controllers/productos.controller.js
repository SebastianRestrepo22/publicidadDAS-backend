import { v4 as uuidv4 } from 'uuid';
import { dbPool } from '../lib/db.js';
import {
  buscarProductoDB,
  createProducto,
  deleteDataProducto,
  findDuplicateName,
  getDataAllProductos,
  getDataProductoById,
  nombreProductoExiste,
  updateDataProducto
} from '../models/producto.model.js';

// Crear producto - Ahora incluye UsaColores y Stock
export const postProducto = async (req, res) => {
  const {
    Nombre,
    Descripcion,
    Imagen,
    Precio,
    Descuento,
    CategoriaId,
    Estado,
    UsaColores = 0,
    Stock = null
  } = req.body;

  try {
    // Validación básica
    if (!Nombre || !Imagen || !Precio || Descuento === undefined || Descuento === null || !CategoriaId) {
      return res.status(400).json({
        message: 'Los campos son obligatorios'
      })
    }

    // Validar UsaColores
    if (UsaColores !== 0 && UsaColores !== 1) {
      return res.status(400).json({ message: 'UsaColores debe ser 0 o 1' });
    }

    // Si no usa colores, Stock es obligatorio
    if (UsaColores === 0 && (Stock === null || Stock === undefined || Stock < 0)) {
      return res.status(400).json({
        message: 'Para productos sin colores, el stock es obligatorio y debe ser mayor o igual a 0'
      });
    }

    // Si usa colores, Stock debe ser null
    if (UsaColores === 1 && Stock !== null) {
      return res.status(400).json({
        message: 'Para productos con colores, el stock debe ser null (se maneja por color)'
      });
    }

    const existente = await nombreProductoExiste(Nombre);

    if (existente.length > 0) {
      return res.status(409).json({ message: 'Producto ya existe' });
    }

    const ProductoId = uuidv4();

    await createProducto({
      ProductoId,
      Nombre,
      Descripcion,
      Imagen,
      Precio,
      Descuento,
      CategoriaId,
      Estado,
      UsaColores,
      Stock
    });

    res.status(201).json({
      message: 'Producto creado exitosamente',
      ProductoId,
      UsaColores,
      Stock
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Cambiar estado del producto
// Cambiar estado del producto - PRESERVANDO EL STOCK
export const cambiarEstadoProducto = async (req, res) => {
  const { id } = req.params;
  const { Estado } = req.body;

  try {
    if (!Estado || (Estado !== 'Activo' && Estado !== 'Inactivo')) {
      return res.status(400).json({
        message: 'Estado no válido. Debe ser "Activo" o "Inactivo"'
      });
    }

    // PRIMERO: Obtener el producto actual para preservar su stock
    const productoActual = await getDataProductoById(id);

    if (productoActual.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const producto = productoActual[0];

    // Preparar datos para actualizar, incluyendo el stock actual
    const datosActualizacion = {
      ProductoId: id,
      Estado
    };

    // PRESERVAR EL STOCK: solo si el producto no usa colores
    if (producto.UsaColores === 0) {
      datosActualizacion.Stock = producto.Stock;
    }

    // También preservar UsaColores para evitar que se pierda
    datosActualizacion.UsaColores = producto.UsaColores;

    // Actualizar con todos los datos necesarios
    const result = await updateDataProducto(datosActualizacion);

    if (result === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.status(200).json({
      message: `Producto ${Estado === 'Activo' ? 'activado' : 'desactivado'} correctamente`,
      producto: {
        ProductoId: id,
        Estado,
        Stock: producto.Stock,
        UsaColores: producto.UsaColores
      }
    });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener todos los productos - Adaptada para nuevo esquema
export const getAllProducto = async (req, res) => {
  try {
    const { estado } = req.query;
    const soloActivos = estado === 'Activo';
    
    const rows = await getDataAllProductos(soloActivos);

    const productosMap = {};

    for (const row of rows) {
      if (!productosMap[row.ProductoId]) {
        productosMap[row.ProductoId] = {
          ProductoId: row.ProductoId,
          Nombre: row.Nombre,
          Descripcion: row.Descripcion,
          Imagen: row.Imagen,
          Precio: row.Precio,
          Descuento: row.Descuento,
          CategoriaId: row.CategoriaId,
          UsaColores: parseInt(row.UsaColores),  // ← FORZAR CONVERSIÓN A NÚMERO
          Estado: row.Estado || 'Activo',
          Stock: row.UsaColores === 0 ? row.StockGeneral : null,
          Colores: []
        };
      }

      if (row.ColorId) {
        productosMap[row.ProductoId].Colores.push({
          ColorId: row.ColorId,
          Nombre: row.ColorNombre,
          Hex: row.Hex,
          Stock: row.StockColor || 0
        });
      }
    }

    res.status(200).json(Object.values(productosMap));
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Obtener producto por ID
export const getProductoById = async (req, res) => {
  const { id } = req.params;
  try {
    const productos = await getDataProductoById(id);

    if (productos.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.status(200).json(productos[0]);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar producto - Ahora incluye UsaColores y Stock
export const updateProducto = async (req, res) => {
  const { id } = req.params;
  const {
    Nombre,
    Descripcion,
    Imagen,
    Precio,
    Descuento,
    CategoriaId,
    UsaColores = 0,
    Stock = null
  } = req.body;

  console.log('========================================');
  console.log('📥 BACKEND - updateProducto:');
  console.log('ID:', id);
  console.log('UsaColores recibido:', UsaColores, 'Tipo:', typeof UsaColores);
  console.log('Stock recibido:', Stock, 'Tipo:', typeof Stock);
  console.log('Body completo:', req.body);
  console.log('========================================');

  try {

    // Al inicio de updateProducto
const UsaColores = parseInt(req.body.UsaColores) || 0;
const Stock = req.body.Stock !== null && req.body.Stock !== undefined 
  ? parseInt(req.body.Stock) 
  : null;

console.log('UsaColores convertido:', UsaColores, 'Tipo:', typeof UsaColores);
    if (!Nombre) {
      return res.status(400).json({
        message: 'El nombre es obligatorio'
      });
    }

    // Validar UsaColores
    if (UsaColores !== 0 && UsaColores !== 1) {
      return res.status(400).json({ message: 'UsaColores debe ser 0 o 1' });
    }

    // Si no usa colores, Stock debe ser un número >= 0
    if (UsaColores === 0) {
      if (Stock === null || Stock === undefined) {
        return res.status(400).json({
          message: 'Para productos sin colores, el stock es obligatorio'
        });
      }

      const stockNumber = Number(Stock);
      if (isNaN(stockNumber) || stockNumber < 0) {
        return res.status(400).json({
          message: 'El stock debe ser un número mayor o igual a 0'
        });
      }
    }

    // Si usa colores, Stock debe ser null o undefined
    if (UsaColores === 1) {
      if (Stock !== null && Stock !== undefined) {
        return res.status(400).json({
          message: 'Para productos con colores, el stock debe ser null (se maneja por color)'
        });
      }
    }

    const duplicates = await findDuplicateName({ ProductoId: id, Nombre });
    if (duplicates.length > 0) {
      return res.status(409).json({
        message: 'El nombre ya existe.'
      });
    };

    const result = await updateDataProducto({
      ProductoId: id,
      Nombre,
      Descripcion,
      Imagen,
      Precio,
      Descuento,
      CategoriaId,
      UsaColores,
      Stock
    });

    if (result === 0) {
      return res.status(409).json({ message: 'Producto no encontrado o sin cambios' });
    }

    res.status(200).json({
      message: 'Producto actualizado correctamente',
      producto: {
        ProductoId: id,
        Nombre,
        UsaColores,
        Stock
      }
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Eliminar producto - Modificado para verificar estado y relaciones
export const deleteProducto = async (req, res) => {
  const { id } = req.params;
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    // Verificar si el producto existe
    const [producto] = await connection.query(
      `SELECT * FROM Productos WHERE ProductoId = ?`,
      [id]
    );

    if (producto.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Verificar si tiene relaciones con ventas/pedidos (NO eliminar)
    const [detalleVentas] = await connection.query(
      `SELECT COUNT(*) as count FROM detalleventas WHERE ProductoId = ?`,
      [id]
    );

    const [detallePedidos] = await connection.query(
      `SELECT COUNT(*) as count FROM detallepedidosclientes WHERE ProductoId = ?`,
      [id]
    );

    if (detalleVentas[0].count > 0 || detallePedidos[0].count > 0) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Este producto no puede eliminarse porque tiene ventas o pedidos asociados.'
      });
    }

    // ELIMINAR PRIMERO LAS RELACIONES CON COLORES
    await connection.query(
      `DELETE FROM ProductoColores_Stock WHERE ProductoId = ?`,
      [id]
    );

    await connection.query(
      `DELETE FROM ProductoColores WHERE ProductoId = ?`,
      [id]
    );

    // Luego eliminar el producto
    await connection.query(
      `DELETE FROM Productos WHERE ProductoId = ?`,
      [id]
    );

    await connection.commit();
    res.status(200).json({ message: 'Producto eliminado correctamente' });

  } catch (error) {
    await connection.rollback();
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
};

// Cambiar estado del producto (Activo/Inactivo) - Versión mejorada
export const updateEstadoProducto = async (ProductoId, Estado) => {
  const estadosPermitidos = ['Activo', 'Inactivo'];

  if (!estadosPermitidos.includes(Estado)) {
    throw new Error('Estado no válido');
  }

  // Primero obtener el producto actual para preservar sus datos
  const [producto] = await dbPool.query(
    `SELECT * FROM Productos WHERE ProductoId = ?`,
    [ProductoId]
  );

  if (producto.length === 0) {
    throw new Error('Producto no encontrado');
  }

  // Actualizar estado manteniendo otros campos
  const [rows] = await dbPool.query(
    `UPDATE Productos SET Estado = ?, Stock = ?, UsaColores = ? WHERE ProductoId = ?`,
    [Estado, producto[0].Stock, producto[0].UsaColores, ProductoId]
  );

  return rows.affectedRows;
};

// Validar si el nombre ya existe
export const validarNombre = async (req, res) => {
  const { Nombre } = req.query;
  try {
    const productos = await nombreProductoExiste(Nombre);

    res.status(200).json({ exists: productos.length > 0 });
  } catch (error) {
    console.error('Error al validar nombre:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Buscar productos - Actualizada para incluir nuevos campos
export const buscarProducto = async (req, res) => {
  const { campo, valor } = req.query;

  const columnasPermitidas = {
    nombre: 'Nombre',
    descripcion: 'Descripcion',
    precio: 'Precio',
    descuento: 'Descuento',
    categoria: 'CategoriaId',
    usacolores: 'UsaColores',
    stock: 'Stock'
  };

  const columna = columnasPermitidas[campo?.toLowerCase()];
  if (!columna) {
    return res.status(400).json({ message: 'Campo de búsqueda inválido' });
  }

  if (valor === undefined || valor === '') {
    return res.status(400).json({ message: 'Valor de búsqueda requerido' });
  }

  try {
    const camposExactos = ['Precio', 'Descuento', 'CategoriaId', 'UsaColores', 'Stock'];
    const operador = camposExactos.includes(columna) ? '=' : 'LIKE';

    let valorFinal = valor;

    if (['Precio', 'Descuento', 'UsaColores', 'Stock'].includes(columna)) {
      valorFinal = Number(valor);
      if (Number.isNaN(valorFinal)) {
        return res.status(400).json({ message: `${columna} debe ser un número válido` });
      }
    }

    if (columna === 'CategoriaId') {
      if (!valor || typeof valor !== 'string') {
        return res.status(400).json({ message: 'CategoriaId inválido' });
      }
    }

    const parametro = operador === '=' ? valorFinal : `%${valor}%`;

    const productos = await buscarProductoDB({
      columna,
      operador,
      parametro
    });

    res.status(200).json({ results: productos });
  } catch (error) {
    console.error('Error al buscar productos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};