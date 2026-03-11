import { v4 as uuidv4 } from 'uuid';
import { dbPool } from '../lib/db.js';

const sanitize = (v) => (v === undefined ? null : v);

// Obtener todos los proveedores
export const getAllProveedores = async () => {
  const [rows] = await dbPool.query('SELECT * FROM Proveedores');
  return rows;
};

// Obtener proveedor por ID
export const getProveedorById = async (id) => {
  const [rows] = await dbPool.query(
    'SELECT * FROM Proveedores WHERE ProveedorId = ?',
    [id]
  );
  return rows[0];
};

// Crear un nuevo proveedor
export const createProveedor = async ({ nombreProveedor, telefono, correo, direccion, estado }) => {
  const proveedorId = uuidv4();

  await dbPool.query(
    `INSERT INTO Proveedores 
    (ProveedorId, NombreProveedor, Telefono, Correo, Direccion, Estado) 
    VALUES (?, ?, ?, ?, ?, ?)`,
    [proveedorId, nombreProveedor, telefono, correo, direccion, estado]
  );
  return { proveedorId, nombreProveedor, telefono, correo, direccion, estado };
};

// Eliminar un proveedor
export const deleteProveedor = async (id) => {
  const [result] = await dbPool.query(
    'DELETE FROM Proveedores WHERE ProveedorId = ?',
    [id]
  );
  return result;
};

// Actualizar un proveedor
export const updateProveedor = async (id, data) => {
  const { nombreProveedor, telefono, correo, direccion, estado } = data;

  const [result] = await dbPool.query(
    `UPDATE Proveedores
    SET NombreProveedor = ?, Telefono = ?, Correo = ?, Direccion = ?, Estado = ?
    WHERE proveedorId = ?`,
    [
      sanitize(nombreProveedor),
      sanitize(telefono),
      sanitize(correo),
      sanitize(direccion),
      sanitize(estado ? 1 : 0),
      id
    ]
  );

  return result;
};