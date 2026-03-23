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
  updateDataProducto,
  getProductosPaginated
} from '../models/producto.model.js';
import { actualizarStockProducto } from '../models/detalleCompras.model.js';

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
    UsaColores = 0,  // 🔥 ÚNICO indicador: ¿el producto PUEDE tener colores?
  } = req.body;

  try {
    // Validación básica
    if (!Nombre || !Imagen || !Precio || Descuento === undefined || Descuento === null || !CategoriaId) {
      return res.status(400).json({
        message: 'Los campos son obligatorios'
      })
    }

    // Validar UsaColores (solo 0 o 1)
    if (UsaColores !== 0 && UsaColores !== 1) {
      return res.status(400).json({ message: 'UsaColores debe ser 0 o 1' });
    }

    const existente = await nombreProductoExiste(Nombre);

    if (existente.length > 0) {
      return res.status(409).json({ message: 'Producto ya existe' });
    }

    const ProductoId = uuidv4();

    // 🔥 SOLO guardar información básica, NO colores
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
      Stock: 0
    });

    res.status(201).json({
      message: 'Producto creado exitosamente',
      ProductoId,
      UsaColores,
      Stock: 0
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Cambiar estado del producto
export const cambiarEstadoProducto = async (req, res) => {
  const { id } = req.params;
  const { Estado } = req.body;

  try {
    if (!Estado || (Estado !== 'Activo' && Estado !== 'Inactivo')) {
      return res.status(400).json({
        message: 'Estado no válido. Debe ser "Activo" o "Inactivo"'
      });
    }

    // Solo actualizar el estado, el stock no se toca
    const result = await updateDataProducto({
      ProductoId: id,
      Estado
      // ❌ No incluir Stock ni UsaColores
    });

    if (result === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.status(200).json({
      message: `Producto ${Estado === 'Activo' ? 'activado' : 'desactivado'} correctamente`
    });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener todos los productos 
export const getAllProducto = async (req, res) => {
  try {
    const { estado, page = 1, limit = 10, filtroCampo, filtroValor } = req.query;

    // Validar y convertir parámetros
    const currentPage = Math.max(1, parseInt(page) || 1);
    const itemsPerPage = Math.max(1, parseInt(limit) || 10);

    const result = await getProductosPaginated({
      page: currentPage,
      limit: itemsPerPage,
      filtroCampo: filtroCampo || null,
      filtroValor: filtroValor || null,
      estado: estado || null
    });

    // Validación defensiva
    const data = result && result.data && Array.isArray(result.data) ? result.data : [];
    const totalItems = result?.totalItems || 0;
    const totalPages = result?.totalPages || Math.ceil(totalItems / itemsPerPage) || 1;

    // Si no hay datos y la página > 1, volver a página 1
    if (data.length === 0 && currentPage > 1 && totalItems > 0) {
      const fallback = await getProductosPaginated({
        page: 1,
        limit: itemsPerPage,
        filtroCampo: filtroCampo || null,
        filtroValor: filtroValor || null,
        estado: estado || null
      });
      
      const fallbackData = fallback && fallback.data && Array.isArray(fallback.data) ? fallback.data : [];
      const fallbackTotal = fallback?.totalItems || 0;
      const fallbackPages = fallback?.totalPages || Math.ceil(fallbackTotal / itemsPerPage) || 1;
      
      return res.status(200).json({
        data: fallbackData,
        pagination: {
          totalItems: fallbackTotal,
          totalPages: fallbackPages,
          currentPage: 1,
          itemsPerPage: itemsPerPage
        }
      });
    }

    res.status(200).json({
      data: data,
      pagination: {
        totalItems: totalItems,
        totalPages: totalPages,
        currentPage: currentPage,
        itemsPerPage: itemsPerPage
      }
    });

  } catch (error) {
    console.error('Error en getAllProducto:', error);
    res.status(200).json({
      data: [],
      pagination: {
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: parseInt(req.query.limit) || 10
      }
    });
  }
};

// Obtener producto por ID
export const getProductoById = async (req, res) => {
  const { id } = req.params;
  try {
    const [productoRows] = await dbPool.query(
      `SELECT * FROM productos WHERE ProductoId = ?`,
      [id]
    );

    if (productoRows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const producto = productoRows[0];

    // 🔥 SIMPLIFICADO: Solo obtener colores con stock de productocolores_stock
    const [coloresConStock] = await dbPool.query(`
      SELECT 
        c.ColorId,
        c.Nombre,
        c.Hex,
        COALESCE(pcs.Stock, 0) AS Stock
      FROM productocolores_stock pcs
      INNER JOIN colores c ON c.ColorId = pcs.ColorId
      WHERE pcs.ProductoId = ?
    `, [id]);

    // Si el producto usa colores pero no tiene stock, aún así devolvemos los colores con stock 0
    // Pero necesitamos saber qué colores están asignados al producto
    // Para eso necesitas una tabla de relación (producto_colores)
    // Si no tienes esa tabla, no podrás saber qué colores están asignados sin stock

    res.status(200).json({
      ...producto,
      Colores: coloresConStock
    });
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
  } = req.body;

  try {
    const usaColoresNum = parseInt(UsaColores) || 0;

    if (!Nombre) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    if (usaColoresNum !== 0 && usaColoresNum !== 1) {
      return res.status(400).json({ message: 'UsaColores debe ser 0 o 1' });
    }

    // Obtener producto actual
    const productoActual = await getDataProductoById(id);
    if (productoActual.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const producto = productoActual[0];

    // 🔥 Verificar si ya tiene colores en compras
    const [coloresEnCompras] = await dbPool.query(
      `SELECT DISTINCT ColorId FROM detallecompras 
       WHERE ProductoId = ? AND ColorId IS NOT NULL`,
      [id]
    );

    // Si ya tiene colores registrados por compras, no permitir cambiar UsaColores a false
    if (coloresEnCompras.length > 0 && usaColoresNum === 0) {
      return res.status(400).json({
        message: 'No puedes desactivar colores porque ya hay compras con colores para este producto'
      });
    }

    // Verificar duplicados de nombre
    const duplicates = await findDuplicateName({ ProductoId: id, Nombre });
    if (duplicates.length > 0) {
      return res.status(409).json({ message: 'El nombre ya existe.' });
    }

    // Actualizar SOLO datos básicos, NO colores ni stock
    const result = await updateDataProducto({
      ProductoId: id,
      Nombre,
      Descripcion,
      Imagen,
      Precio,
      Descuento,
      CategoriaId,
      UsaColores: usaColoresNum,
      // NO incluir colores ni stock
    });

    if (result === 0) {
      return res.status(409).json({ message: 'Producto no encontrado o sin cambios' });
    }

    res.status(200).json({
      message: 'Producto actualizado correctamente',
      producto: {
        ProductoId: id,
        Nombre,
        UsaColores: usaColoresNum,
        Stock: producto.Stock
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
      `SELECT * FROM productos WHERE ProductoId = ?`,
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
      `DELETE FROM productocolores_stock WHERE ProductoId = ?`,
      [id]
    );

    // Luego eliminar el producto
    await connection.query(
      `DELETE FROM productos WHERE ProductoId = ?`,
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
    `SELECT * FROM productos WHERE ProductoId = ?`,
    [ProductoId]
  );

  if (producto.length === 0) {
    throw new Error('Producto no encontrado');
  }

  // Actualizar estado manteniendo otros campos
  const [rows] = await dbPool.query(
    `UPDATE productos SET Estado = ?, Stock = ?, UsaColores = ? WHERE ProductoId = ?`,
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
  const { campo, valor, page = 1, limit = 10, estado } = req.query;

  const columnasPermitidas = {
    nombre: 'nombre',
    descripcion: 'descripcion',
    precio: 'precio',
    descuento: 'descuento',
    categoria: 'categoria',
    stock: 'stock',
    usacolores: 'usacolores'
  };

  const filtroCampo = columnasPermitidas[campo?.toLowerCase()];
  
  if (campo && !filtroCampo) {
    return res.status(400).json({ message: 'Campo de búsqueda inválido' });
  }

  try {
    const result = await getProductosPaginated({
      page: Math.max(1, parseInt(page) || 1),
      limit: Math.max(1, parseInt(limit) || 10),
      filtroCampo: filtroCampo || null,
      filtroValor: valor || null,
      estado: estado || null
    });

    const data = result && result.data && Array.isArray(result.data) ? result.data : [];
    const totalItems = typeof result?.totalItems === 'number' ? result.totalItems : 0;
    const currentPage = typeof result?.currentPage === 'number' ? result.currentPage : 1;
    const itemsPerPage = Math.max(1, parseInt(limit) || 10);

    res.status(200).json({
      data: data,
      pagination: {
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / itemsPerPage),
        currentPage: currentPage,
        itemsPerPage: itemsPerPage
      }
    });

  } catch (error) {
    console.error('Error en buscarProducto:', error);
    res.status(200).json({
      data: [],
      pagination: {
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: parseInt(limit) || 10
      }
    });
  }
};