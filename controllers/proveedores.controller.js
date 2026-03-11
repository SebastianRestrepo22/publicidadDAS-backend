import {
    getAllProveedores as getAllProveedoresModel,
    getProveedorById as getProveedorByIdModel,
    createProveedor as createProveedorModel,
    deleteProveedor as deleteProveedorModel,
    updateProveedor as updateProveedorModel
} from '../models/proveedores.models.js';


// Obtener todos los proveedores
export const getAllProveedores = async (req, res) => {
  try {
    const proveedores = await getAllProveedoresModel();
    res.json(proveedores);
  } catch (err) {
    console.error(" Error al obtener proveedores:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Obtener proveedor por ID
export const getProveedorById = async (req, res) => {
  const id = req.params.id;

  try {
    const proveedor = await getProveedorByIdModel(id);
    if (!proveedor) return res.status(404).json({ message: "Proveedor no encontrado" });
    res.json(proveedor);
  } catch (err) {
    console.error(" Error al obtener proveedor por ID:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Crear nuevo proveedor
export const createProveedor = async (req, res) => {
  const { nombreProveedor, telefono, correo, direccion, estado } = req.body;

  if (!nombreProveedor || !telefono || !correo || !direccion || !estado) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    const result = await createProveedorModel({ nombreProveedor, telefono, correo, direccion, estado });
    res.status(201).json({ id: result.insertId, nombreProveedor, telefono, correo, direccion, estado });
  } catch (err) {
    console.error(" Error al crear proveedor:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Eliminar proveedor por ID
export const deleteProveedor = async (req, res) => {
  const id = req.params.id;

  try {
    const result = await deleteProveedorModel(id);
    if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Proveedor no encontrado" });
    }
    res.json({ message: "Proveedor eliminado correctamente" });
  } catch (err) {
    console.error(" Error al eliminar proveedor:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const updateProveedor = async (req, res) => {
  const id = req.params.id;

  if (!id || id.length !== 36){
    return res.status(400).json({ error: "ID invalido"})
  }

  const {nombreProveedor, telefono, correo, direccion, estado} = req.body;

  try {
    const result = await updateProveedorModel(id, {
      nombreProveedor,
      telefono, 
      correo,
      direccion,
      estado
    })

    if (result.affectedRows === 0 ) {
       return res.status(404).json({ message: "Proveedor no encontrado"})
    }
    res.json({ message: "Proveedor actualizado correctamente"});

   }catch (err) {
    console.error("Error al actualizar proveedor:", err)
    res.status(500).json({ error: err.message})
   }
};

  
