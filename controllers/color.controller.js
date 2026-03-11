import { getAllColoresDB, getColoresByProductoId, setColoresProducto } from "../models/color.model.js";

export const getColores = async (req, res) => {
    try {
        const colores = await getAllColoresDB();
        res.status(200).json(colores);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener colores" });
    }
};

export const getColoresProducto = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ message: 'ProductoId requerido' });
    }

    try {
        const colores = await getColoresByProductoId(id);
        res.status(200).json(colores);
    } catch (error) {
        console.error('Error al obtener colores del producto:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};

export const updateColoresProducto = async (req, res) => {
  const { id } = req.params;
  const { colores } = req.body; // [{ ColorId, Stock }, ...]

  console.log('DEBUG - Recibiendo colores para producto:', id);
  console.log('DEBUG - Colores recibidos:', colores);

  if (!Array.isArray(colores)) {
    return res.status(400).json({ message: 'colores debe ser un array' });
  }

  // Validar formato
  const coloresValidados = colores.map((c, index) => {
    if (!c || typeof c !== 'object') {
      throw new Error(`Color en posición ${index} no es un objeto válido`);
    }
    
    if (!c.ColorId || typeof c.ColorId !== 'string') {
      throw new Error(`ColorId en posición ${index} debe ser un string: ${c.ColorId}`);
    }
    
    return {
      ColorId: c.ColorId,
      Stock: c.Stock || 0
    };
  });

  try {
    await setColoresProducto(id, coloresValidados);
    res.status(200).json({ 
      message: 'Colores actualizados correctamente',
      coloresActualizados: coloresValidados.length
    });
  } catch (error) {
    console.error('Error al actualizar colores:', error);
    res.status(500).json({ 
      message: 'Error interno',
      error: error.message
    });
  }
};