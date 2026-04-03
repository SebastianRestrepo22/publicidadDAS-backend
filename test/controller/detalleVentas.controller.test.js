import { jest } from '@jest/globals';

// ===== MOCKS =====
const mockDetalleVentaModel = {
  getDetalleVentaByVentaIdModel: jest.fn(),
  createDetalleVentaManualModel: jest.fn()
};

jest.unstable_mockModule('../../models/detalleVentas.models.js', () => mockDetalleVentaModel);

const mockVentaModel = {
  getVentaByIdModel: jest.fn()
};

jest.unstable_mockModule('../../models/venta.models.js', () => mockVentaModel);

// ===== IMPORT DESPUÉS DEL MOCK =====
const {
  getDetallesByVenta,
  createDetalle
} = await import('../../controllers/detalleVentas.controller.js');

// ===== MOCK RESPONSE =====
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('DETALLE VENTAS CONTROLLER', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= GET DETALLES BY VENTA =================
  describe('getDetallesByVenta', () => {

    test('retorna detalles de venta correctamente', async () => {
      const req = { params: { ventaId: 'V-123' } };
      const res = mockResponse();
      
      const mockVenta = { VentaId: 'V-123', Total: 100 };
      const mockDetalles = [
        { DetalleId: 1, ProductoId: 'P1', Cantidad: 2, PrecioUnitario: 50 },
        { DetalleId: 2, ProductoId: 'P2', Cantidad: 1, PrecioUnitario: 30 }
      ];
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue(mockVenta);
      mockDetalleVentaModel.getDetalleVentaByVentaIdModel.mockResolvedValue(mockDetalles);
      
      await getDetallesByVenta(req, res);
      
      expect(mockVentaModel.getVentaByIdModel).toHaveBeenCalledWith('V-123');
      expect(mockDetalleVentaModel.getDetalleVentaByVentaIdModel).toHaveBeenCalledWith('V-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDetalles);
    });

    test('error venta no encontrada', async () => {
      const req = { params: { ventaId: 'V-999' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue(null);
      
      await getDetallesByVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Venta no encontrada' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { ventaId: 'V-123' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockRejectedValue(new Error('DB Error'));
      
      await getDetallesByVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener detalles' });
    });

  });

  // ================= CREATE DETALLE =================
  describe('createDetalle', () => {

    test('crea detalle de venta correctamente', async () => {
      const req = { 
        params: { ventaId: 'V-123' }, 
        body: { 
          TipoItem: 'producto',
          ProductoId: 'P1',
          Cantidad: 2,
          PrecioUnitario: 50,
          Subtotal: 100
        } 
      };
      const res = mockResponse();
      
      const mockVenta = { VentaId: 'V-123', Estado: 'pagado' };
      const mockDetallesActualizados = [
        { DetalleId: 1, ProductoId: 'P1', Cantidad: 2, PrecioUnitario: 50 },
        { DetalleId: 2, ProductoId: 'P2', Cantidad: 1, PrecioUnitario: 30 }
      ];
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue(mockVenta);
      mockDetalleVentaModel.createDetalleVentaManualModel.mockResolvedValue(999);
      mockDetalleVentaModel.getDetalleVentaByVentaIdModel.mockResolvedValue(mockDetallesActualizados);
      
      await createDetalle(req, res);
      
      expect(mockVentaModel.getVentaByIdModel).toHaveBeenCalledWith('V-123');
      expect(mockDetalleVentaModel.createDetalleVentaManualModel).toHaveBeenCalledWith({
        TipoItem: 'producto',
        ProductoId: 'P1',
        Cantidad: 2,
        PrecioUnitario: 50,
        Subtotal: 100,
        VentaId: 'V-123'  // ← Se agregó automáticamente
      });
      expect(mockDetalleVentaModel.getDetalleVentaByVentaIdModel).toHaveBeenCalledWith('V-123');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Detalle creado exitosamente',
        detalles: mockDetallesActualizados
      });
    });

    test('error venta no encontrada', async () => {
      const req = { 
        params: { ventaId: 'V-999' }, 
        body: { TipoItem: 'producto', ProductoId: 'P1', Cantidad: 1, PrecioUnitario: 50, Subtotal: 50 } 
      };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue(null);
      
      await createDetalle(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Venta no encontrada' });
    });

    test('error venta anulada', async () => {
      const req = { 
        params: { ventaId: 'V-123' }, 
        body: { TipoItem: 'producto', ProductoId: 'P1', Cantidad: 1, PrecioUnitario: 50, Subtotal: 50 } 
      };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue({ VentaId: 'V-123', Estado: 'anulado' });
      
      await createDetalle(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pueden agregar detalles a una venta anulada' });
      expect(mockDetalleVentaModel.createDetalleVentaManualModel).not.toHaveBeenCalled();
    });

    test('error interno del servidor al crear', async () => {
      const req = { 
        params: { ventaId: 'V-123' }, 
        body: { TipoItem: 'producto', ProductoId: 'P1', Cantidad: 1, PrecioUnitario: 50, Subtotal: 50 } 
      };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue({ VentaId: 'V-123', Estado: 'pagado' });
      mockDetalleVentaModel.createDetalleVentaManualModel.mockRejectedValue(new Error('DB Error'));
      
      await createDetalle(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al crear detalle' });
    });

    test('error interno del servidor al obtener detalles', async () => {
      const req = { 
        params: { ventaId: 'V-123' }, 
        body: { TipoItem: 'producto', ProductoId: 'P1', Cantidad: 1, PrecioUnitario: 50, Subtotal: 50 } 
      };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue({ VentaId: 'V-123', Estado: 'pagado' });
      mockDetalleVentaModel.createDetalleVentaManualModel.mockResolvedValue(999);
      mockDetalleVentaModel.getDetalleVentaByVentaIdModel.mockRejectedValue(new Error('DB Error'));
      
      await createDetalle(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al crear detalle' });
    });

  });

});