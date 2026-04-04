import { dbPool } from "../lib/db.js";

// 📦 Obtener todas las compras (sin paginación)
export const getAllCompras = async (req, res) => {
  // [1] Inicio y try
  try {
    // [2] Ejecutar query de selección
    const [rows] = await dbPool.query('SELECT * FROM compras ORDER BY FechaRegistro DESC');
    // [3] Retornar json
    res.json(rows);
  } catch (error) {
    // [4] Catch error
    console.error('Error al obtener compras:', error);
    // [5] Retornar 500
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 🔍 Obtener compra por ID
export const getCompraById = async (req, res) => {
  // [1] Inicio y obtención de parámetros
  const { id } = req.params;

  // [2] Validar formato de ID (UUID 36 caracteres)
  if (!id || id.length !== 36) {
    // [12] Retornar BadRequest si el ID es inválido
    return res.status(400).json({ error: "ID de compra inválido" });
  }

  // [3] Try catch para consulta
  try {
    // [4] Ejecutar query por ID
    const [rows] = await dbPool.query('SELECT * FROM compras WHERE CompraId = ?', [id]);
    
    // [5] Validar si la compra existe
    if (rows.length === 0) {
      // [13] Caso no encontrado retornar 404
      return res.status(404).json({ message: 'Compra no encontrada' });
    }

    // [6] Caso encontrado retornar 200 con el objeto
    res.json(rows[0]);
  } catch (error) {
    // [7] Catch error de servidor
    console.error('Error al obtener compra:', error);
    // [8] Retornar 500
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear nueva compra - SIEMPRE CON ESTADO APROBADO
export const createCompra = async (req, res) => {
  // [1] Inicio del proceso POST para crear compra
  const body = req.body;

  // [2] Validar que el objeto servicio no sea nulo
  if (!body || Object.keys(body).length === 0) {
    // [12] Retornar BadRequest si el cuerpo es nulo/vacío
    return res.status(400).json({ error: "El objeto compra no puede ser nulo" });
  }

  const { ProveedorId, Total } = body;
  
  // [3] Validar campo ProveedorId requerido
  if (!ProveedorId) {
    // [13] Retornar BadRequest si falta ProveedorId
    return res.status(400).json({ error: "El campo ProveedorId es requerido" });
  }

  // [4] Validar que el Total sea mayor a 0
  if (!Total || Total <= 0) {
    // [14] Retornar BadRequest si el Total es menor o igual a 0
    return res.status(400).json({ error: "El Total debe ser mayor a 0" });
  }

  // [5] Try catch para operaciones de base de datos
  try {
    const fechaActual = new Date();
    
    // [6] Generar UUID primero e Insertar
    const [uuidResult] = await dbPool.query('SELECT UUID() as uuid');
    const compraId = uuidResult[0].uuid;
        
    await dbPool.query(
      `INSERT INTO compras (CompraId, ProveedorId, Total, Estado, FechaRegistro) 
       VALUES (?, ?, ?, ?, ?)`,
      [compraId, ProveedorId, Total, 'aprobado', fechaActual]
    );
        
    // [7] Definir objeto respuesta
    const nuevaCompra = {
      CompraId: compraId,
      ProveedorId,
      Total,
      Estado: 'aprobado',
      FechaRegistro: fechaActual
    };

    // [8] Operación exitosa, preparar respuesta
    // [9] Retornar respuesta 201 Created
    res.status(201).json({ 
      message: 'Compra creada exitosamente',
      data: nuevaCompra,
      CompraId: compraId
    });
    
  } catch (error) {
    // [10] Manejar errores de actualización de base de datos
    console.error('Error al guardar compra:', error);
    // [11] Manejar errores inesperados / Retornar 500
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
};

//  Actualizar compra completa
export const updateCompra = async (req, res) => {
  // [1] Inicio y obtención de parámetros
  const { id } = req.params;

  // [2] Validar formato de ID (UUID 36 caracteres)
  if (!id || id.length !== 36) {
    // [12] Retornar BadRequest si el ID es inválido
    return res.status(400).json({ error: "ID de compra inválido" });
  }

  // [3] Obtener y validar req.body
  const body = req.body;
  if (!body || Object.keys(body).length === 0) {
    // [13] Error 400: Body vacío
    return res.status(400).json({ error: "El cuerpo de la petición no puede estar vacío" });
  }

  const { ProveedorId, Total } = body;
  
  // [4] Validar campos requeridos y valores
  if (!ProveedorId || !Total || Total <= 0) {
    // [14] Error 400: Campos incompletos o Total inválido
    return res.status(400).json({ error: "ProveedorId y Total (>0) son requeridos" });
  }

  // [5] Try catch para actualización
  try {
    // [6] Ejecutar query de actualización
    const [result] = await dbPool.query(
      `UPDATE compras SET ProveedorId = ?, Total = ? WHERE CompraId = ?`,
      [ProveedorId, Total, id]
    );
    
    // [7] Verificar si se afectaron filas
    if (result.affectedRows === 0) {
      // [15] Caso no encontrado retornar 404
      return res.status(404).json({ message: 'Compra no encontrada' });
    }
    
    // [8] Obtener la compra actualizada para confirmar
    const [updatedCompra] = await dbPool.query('SELECT * FROM compras WHERE CompraId = ?', [id]);
    
    // [9] Retornar 200 éxito con datos
    res.json({ 
      message: 'Compra actualizada exitosamente', 
      data: updatedCompra[0] 
    });
  } catch (error) {
    // [10] Catch error de servidor
    console.error('Error al actualizar compra:', error);
    // [11] Retornar 500
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};


//  Compras con paginación
export const getComprasPaginated = async (req, res) => {
  // [1] Inicio y try
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // [2] Ejecutar query de selección paginada
    const [rows] = await dbPool.query(
      'SELECT * FROM compras ORDER BY FechaRegistro DESC LIMIT ? OFFSET ?', 
      [limit, offset]
    );
    
    // [3] Ejecutar query count total
    const [total] = await dbPool.query('SELECT COUNT(*) as total FROM compras');

    // [4] Retornar json 200
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
    // [5] Catch error
    console.error('Error en paginación de compras:', error);
    // [6] Retornar 500
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

//  Buscar compras
export const buscarCompras = async (req, res) => {
  // [1] Inicio y try
  try {
    const { q, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const searchTerm = `%${q}%`;

    // [2] Ejecutar query de búsqueda
    const [rows] = await dbPool.query(
      `SELECT * FROM compras 
       WHERE ProveedorId LIKE ? OR CompraId LIKE ?
       ORDER BY FechaRegistro DESC 
       LIMIT ? OFFSET ?`,
      [searchTerm, searchTerm, parseInt(limit), parseInt(offset)]
    );

    // [3] Ejecutar query count búsqueda
    const [total] = await dbPool.query(
      `SELECT COUNT(*) as total FROM compras 
       WHERE ProveedorId LIKE ? OR CompraId LIKE ?`,
      [searchTerm, searchTerm]
    );

    // [4] Retornar json 200
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
    // [5] Catch error
    console.error('Error en búsqueda de compras:', error);
    // [6] Retornar 500
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
