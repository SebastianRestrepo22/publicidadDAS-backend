import { jest } from '@jest/globals';

// ===== MOCKS =====
const mockColorModel = {
  getAllColoresDB: jest.fn(),
  getColoresByProductoId: jest.fn(),
  setColoresProducto: jest.fn()
};

jest.unstable_mockModule('../../models/color.model.js', () => mockColorModel);

// ===== IMPORT DESPUÉS DEL MOCK =====
const {
  getColores,
  getColoresProducto,
  updateColoresProducto
} = await import('../../controllers/color.controller.js');

// ===== MOCK RESPONSE =====
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('COLORES CONTROLLER', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= GET COLORES =================
  describe('getColores', () => {

    test('retorna lista de colores correctamente', async () => {
      const req = {};
      const res = mockResponse();
      
      const mockColores = [
        { ColorId: 'C1', Nombre: 'Rojo', Hex: '#FF0000' },
        { ColorId: 'C2', Nombre: 'Azul', Hex: '#0000FF' }
      ];
      
      mockColorModel.getAllColoresDB.mockResolvedValue(mockColores);
      
      await getColores(req, res);
      
      expect(mockColorModel.getAllColoresDB).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockColores);
    });

    test('error interno del servidor', async () => {
      const req = {};
      const res = mockResponse();
      
      mockColorModel.getAllColoresDB.mockRejectedValue(new Error('DB Error'));
      
      await getColores(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error al obtener colores' });
    });

  });

  // ================= GET COLORES PRODUCTO =================
  describe('getColoresProducto', () => {

    test('retorna colores del producto correctamente', async () => {
      const req = { params: { id: 'P-123' } };
      const res = mockResponse();
      
      const mockColoresProducto = [
        { ColorId: 'C1', Nombre: 'Rojo', Hex: '#FF0000', Stock: 10 },
        { ColorId: 'C2', Nombre: 'Azul', Hex: '#0000FF', Stock: 5 }
      ];
      
      mockColorModel.getColoresByProductoId.mockResolvedValue(mockColoresProducto);
      
      await getColoresProducto(req, res);
      
      expect(mockColorModel.getColoresByProductoId).toHaveBeenCalledWith('P-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockColoresProducto);
    });

    test('error si no se envía ProductoId', async () => {
      const req = { params: { id: undefined } };
      const res = mockResponse();
      
      await getColoresProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'ProductoId requerido' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { id: 'P-123' } };
      const res = mockResponse();
      
      mockColorModel.getColoresByProductoId.mockRejectedValue(new Error('DB Error'));
      
      await getColoresProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error interno' });
    });

  });

  // ================= UPDATE COLORES PRODUCTO =================
  describe('updateColoresProducto', () => {

    test('actualiza colores correctamente', async () => {
      const req = { 
        params: { id: 'P-123' }, 
        body: { 
          colores: [
            { ColorId: 'C1', Stock: 10 },
            { ColorId: 'C2', Stock: 5 }
          ] 
        } 
      };
      const res = mockResponse();
      
      mockColorModel.setColoresProducto.mockResolvedValue();
      
      await updateColoresProducto(req, res);
      
      expect(mockColorModel.setColoresProducto).toHaveBeenCalledWith('P-123', [
        { ColorId: 'C1', Stock: 10 },
        { ColorId: 'C2', Stock: 5 }
      ]);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Colores actualizados correctamente',
        coloresActualizados: 2
      });
    });

    test('error si colores no es array', async () => {
      const req = { 
        params: { id: 'P-123' }, 
        body: { colores: 'no-es-array' } 
      };
      const res = mockResponse();
      
      await updateColoresProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'colores debe ser un array' });
    });

    // ✅ FIX: La validación lanza error SÍNCRONO antes del try/catch
    test('error si color no es objeto', async () => {
      const req = { 
        params: { id: 'P-123' }, 
        body: { colores: ['invalido'] } 
      };
      
      // El error se lanza síncronamente, esperamos que la promesa sea rechazada
      await expect(updateColoresProducto(req, mockResponse()))
        .rejects.toThrow('no es un objeto válido');
    });

    // ✅ FIX: Igual que arriba
    test('error si ColorId no es string', async () => {
      const req = { 
        params: { id: 'P-123' }, 
        body: { colores: [{ ColorId: 123, Stock: 10 }] } 
      };
      
      await expect(updateColoresProducto(req, mockResponse()))
        .rejects.toThrow('debe ser un string');
    });

    test('usa Stock por defecto 0 si no se envía', async () => {
      const req = { 
        params: { id: 'P-123' }, 
        body: { colores: [{ ColorId: 'C1' }] } 
      };
      const res = mockResponse();
      
      mockColorModel.setColoresProducto.mockResolvedValue();
      
      await updateColoresProducto(req, res);
      
      expect(mockColorModel.setColoresProducto).toHaveBeenCalledWith('P-123', [
        { ColorId: 'C1', Stock: 0 }
      ]);
    });

    test('error interno del servidor', async () => {
      const req = { 
        params: { id: 'P-123' }, 
        body: { colores: [{ ColorId: 'C1', Stock: 10 }] } 
      };
      const res = mockResponse();
      
      mockColorModel.setColoresProducto.mockRejectedValue(new Error('DB Error'));
      
      await updateColoresProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Error interno',
        error: 'DB Error'
      }));
    });

  });

});