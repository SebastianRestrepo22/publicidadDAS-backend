import { dbPool } from "../lib/db.js";

// 📦 Obtener todas las compras (sin paginación)
export const getAllCompras = async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM compras ORDER BY FechaRegistro DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener compras:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 🔍 Obtener compra por ID
export const getCompraById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await dbPool.query('SELECT * FROM compras WHERE CompraId = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Compra no encontrada' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener compra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ➕ Crear nueva compra - SIEMPRE CON ESTADO APROBADO
export const createCompra = async (req, res) => {
  try {
    const { 
      ProveedorId, 
      Total 
    } = req.body;
    
    console.log('📝 Creando compra con datos:', req.body);
    
    // 🔥 USAR SIEMPRE LA FECHA ACTUAL
    const fechaActual = new Date();
    
    // 1. Generar UUID primero
    const [uuidResult] = await dbPool.query('SELECT UUID() as uuid');
    const compraId = uuidResult[0].uuid;
    
    console.log('🔑 UUID generado:', compraId);
    
    // 2. Insertar la compra con el UUID generado y ESTADO APROBADO
    await dbPool.query(
      `INSERT INTO compras 
       (CompraId, ProveedorId, Total, Estado, FechaRegistro) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        compraId,
        ProveedorId, 
        Total || 0, 
        'aprobado', // 🔥 SIEMPRE APROBADO
        fechaActual
      ]
    );
    
    console.log('✅ Compra creada con ID:', compraId);
    
    // 3. Responder con los datos de la compra creada
    res.status(201).json({ 
      message: 'Compra creada exitosamente',
      data: {
        CompraId: compraId,
        ProveedorId,
        Total: Total || 0,
        Estado: 'aprobado', // 🔥 SIEMPRE APROBADO
        FechaRegistro: fechaActual
      },
      CompraId: compraId
    });
    
  } catch (error) {
    console.error('Error al crear compra:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
};

// ✏️ Actualizar compra completa
export const updateCompra = async (req, res) => {
  try {
    const { id } = req.params;
    const { ProveedorId, Total } = req.body;
    
    const [result] = await dbPool.query(
      `UPDATE compras 
       SET ProveedorId = ?, Total = ? 
       WHERE CompraId = ?`,
      [ProveedorId, Total, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Compra no encontrada' });
    }
    
    const [updatedCompra] = await dbPool.query('SELECT * FROM compras WHERE CompraId = ?', [id]);
    
    res.json({ 
      message: 'Compra actualizada exitosamente', 
      data: updatedCompra[0] 
    });
  } catch (error) {
    console.error('Error al actualizar compra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 🗑️ Eliminar compra
export const deleteCompra = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primero eliminar los detalles de la compra (si existen)
    await dbPool.query('DELETE FROM detalle_compras WHERE CompraId = ?', [id]);
    
    // Luego eliminar la compra
    const [result] = await dbPool.query('DELETE FROM compras WHERE CompraId = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Compra no encontrada' });
    }
    
    res.json({ message: 'Compra eliminada exitosamente', CompraId: id });
  } catch (error) {
    console.error('Error al eliminar compra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 📄 Compras con paginación
export const getComprasPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [rows] = await dbPool.query(
      'SELECT * FROM compras ORDER BY FechaRegistro DESC LIMIT ? OFFSET ?', 
      [limit, offset]
    );
    
    const [total] = await dbPool.query('SELECT COUNT(*) as total FROM compras');

    res.json({
      data: rows,
      pagination: {
        total: total[0].total,
        currentPage: page,
        itemsPerPage: limit,
        totalPages: Math.ceil(total[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error en paginación de compras:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const buscarCompras = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const searchTerm = `%${q}%`;

    const [rows] = await dbPool.query(
      `SELECT * FROM compras 
       WHERE ProveedorId LIKE ? OR CompraId LIKE ?
       ORDER BY FechaRegistro DESC 
       LIMIT ? OFFSET ?`,
      [searchTerm, searchTerm, parseInt(limit), parseInt(offset)]
    );

    const [total] = await dbPool.query(
      `SELECT COUNT(*) as total FROM compras 
       WHERE ProveedorId LIKE ? OR CompraId LIKE ?`,
      [searchTerm, searchTerm]
    );

    res.json({
      data: rows,
      pagination: {
        totalItems: total[0].total,
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
        totalPages: Math.ceil(total[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error en búsqueda de compras:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};