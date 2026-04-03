import { jest } from '@jest/globals';

// ===== MOCKS =====
const mockDbPool = {
  query: jest.fn(),
  getConnection: jest.fn(),
  end: jest.fn()
};

jest.unstable_mockModule('../../lib/db.js', () => ({
  dbPool: mockDbPool
}));

jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

const mockVentaModel = {
  getAllVentasModel: jest.fn(),
  getVentaByIdModel: jest.fn(),
  createVentaFromPedidoModel: jest.fn(),
  createVentaManualModel: jest.fn(),
  existeVentaParaPedidoModel: jest.fn(),
  getVentasPaginated: jest.fn(),
  anularVentaModel: jest.fn(),
  rechazarVentaModel: jest.fn()
};

jest.unstable_mockModule('../../models/venta.models.js', () => mockVentaModel);

const mockDetalleVentaModel = {
  getDetalleVentaByVentaIdModel: jest.fn(),
  createDetallesVentaFromPedidoModel: jest.fn(),
  createDetalleVentaManualModel: jest.fn()
};

jest.unstable_mockModule('../../models/detalleVentas.models.js', () => mockDetalleVentaModel);

const mockEmailUtils = {
  sendVentaFacturaEmail: jest.fn().mockResolvedValue(true),
  sendVentaAnuladaEmail: jest.fn().mockResolvedValue(true),
  sendVentaRechazadaEmail: jest.fn().mockResolvedValue(true)
};

jest.unstable_mockModule('../../utils/email.js', () => mockEmailUtils);

// ===== IMPORT DESPUÉS DEL MOCK =====
const {
  getVentas,
  getVentaById,
  createVentaDesdePedido,
  createVentaManual,
  anularVenta,
  getDetallesByVenta,
  createDetalle,
  actualizarEstadoVenta,
  rechazarVenta
} = await import('../../controllers/ventas.controller.js');

// ===== MOCK RESPONSE =====
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('VENTAS CONTROLLER', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= GET VENTAS =================
  describe('getVentas', () => {

    test('retorna lista paginada correctamente', async () => {
      const req = { query: { page: 1, limit: 10 } };
      const res = mockResponse();
      
      mockVentaModel.getVentasPaginated.mockResolvedValue({
        data: [{ VentaId: '1', Total: 100 }],
        totalItems: 1,
        currentPage: 1
      });
      
      await getVentas(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: [{ VentaId: '1', Total: 100 }],
        pagination: {
          totalItems: 1,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: 10
        }
      });
    });

    test('usa valores por defecto cuando no hay query params', async () => {
      const req = { query: {} };
      const res = mockResponse();
      
      mockVentaModel.getVentasPaginated.mockResolvedValue({
        data: [],
        totalItems: 0,
        currentPage: 1
      });
      
      await getVentas(req, res);
      
      expect(mockVentaModel.getVentasPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filtroCampo: null,
        filtroValor: null,
        fechaInicio: null,
        fechaFin: null
      });
    });

    test('fallback cuando página vacía y page > 1', async () => {
      const req = { query: { page: 2, limit: 10 } };
      const res = mockResponse();
      
      mockVentaModel.getVentasPaginated
        .mockResolvedValueOnce({ data: [], totalItems: 5, currentPage: 2 })
        .mockResolvedValueOnce({
          data: [{ VentaId: '1' }],
          totalItems: 5,
          currentPage: 1
        });
      
      await getVentas(req, res);
      
      expect(mockVentaModel.getVentasPaginated).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('error retorna fallback con datos vacíos', async () => {
      const req = { query: { limit: 10 } };
      const res = mockResponse();
      
      mockVentaModel.getVentasPaginated.mockRejectedValue(new Error('DB Error'));
      
      await getVentas(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: [],
        pagination: {
          totalItems: 0,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: 10
        }
      });
    });

  });

  // ================= GET VENTA BY ID =================
  describe('getVentaById', () => {

    test('retorna venta con detalles cuando existe', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      const mockVenta = { VentaId: '123', Total: 100 };
      const mockDetalles = [{ DetalleId: 1, ProductoId: 'P1' }];
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue(mockVenta);
      mockDetalleVentaModel.getDetalleVentaByVentaIdModel.mockResolvedValue(mockDetalles);
      
      await getVentaById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ...mockVenta,
        detalle: mockDetalles
      });
    });

    test('error venta no encontrada', async () => {
      const req = { params: { id: '999' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue(null);
      
      await getVentaById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Venta no encontrada' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockRejectedValue(new Error('DB Error'));
      
      await getVentaById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener venta' });
    });

  });

  // ================= CREATE VENTA DESDE PEDIDO =================
  describe('createVentaDesdePedido', () => {

    test('crea venta desde pedido correctamente', async () => {
      const req = { body: { PedidoClienteId: 'PED-123', UsuarioVendedorId: 'USR-1' } };
      const res = mockResponse();
      
      const mockConnection = {
        query: jest.fn(),
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      
      mockVentaModel.existeVentaParaPedidoModel.mockResolvedValue(false);
      
      mockConnection.query
        .mockResolvedValueOnce([[{ 
          PedidoClienteId: 'PED-123', 
          MetodoPago: 'efectivo', 
          Total: 100,
          ClienteCorreo: 'test@test.com',
          ClienteNombre: 'Juan'
        }]])
        .mockResolvedValueOnce([[{ DetalleId: 1, ProductoId: 'P1' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);
      
      mockVentaModel.createVentaFromPedidoModel.mockResolvedValue({ success: true, VentaId: 'V-123' });
      mockDetalleVentaModel.createDetallesVentaFromPedidoModel.mockResolvedValue();
      mockVentaModel.getVentaByIdModel.mockResolvedValue({ 
        VentaId: 'V-123', 
        Total: 100, 
        Estado: 'pagado',
        ClienteCorreo: 'test@test.com',
        ClienteNombre: 'Juan'
      });
      mockDetalleVentaModel.getDetalleVentaByVentaIdModel.mockResolvedValue([]);
      mockEmailUtils.sendVentaFacturaEmail.mockResolvedValue(true);
      
      await createVentaDesdePedido(req, res);
      
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Venta creada exitosamente desde el pedido'
      }));
    });

    test('error si falta PedidoClienteId', async () => {
      const req = { body: {} };
      const res = mockResponse();
      
      await createVentaDesdePedido(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'PedidoClienteId es obligatorio' });
    });

    test('error si ya existe venta para el pedido', async () => {
      const req = { body: { PedidoClienteId: 'PED-123' } };
      const res = mockResponse();
      
      const mockConnection = {
        query: jest.fn(),
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      mockVentaModel.existeVentaParaPedidoModel.mockResolvedValue(true);
      
      await createVentaDesdePedido(req, res);
      
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ya existe una venta para este pedido' });
    });

    test('error si pedido no encontrado', async () => {
      const req = { body: { PedidoClienteId: 'PED-999' } };
      const res = mockResponse();
      
      const mockConnection = {
        query: jest.fn().mockResolvedValueOnce([[]]).mockResolvedValueOnce([[]]),
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      mockVentaModel.existeVentaParaPedidoModel.mockResolvedValue(false);
      
      await createVentaDesdePedido(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Pedido no encontrado' });
    });

    test('error si pedido no tiene detalles', async () => {
      const req = { body: { PedidoClienteId: 'PED-123' } };
      const res = mockResponse();
      
      const mockConnection = {
        query: jest.fn(),
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      mockVentaModel.existeVentaParaPedidoModel.mockResolvedValue(false);
      
      mockConnection.query
        .mockResolvedValueOnce([[{ PedidoClienteId: 'PED-123' }]])
        .mockResolvedValueOnce([[]]);
      
      await createVentaDesdePedido(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El pedido no tiene detalles' });
    });

    test('error interno del servidor', async () => {
      const req = { body: { PedidoClienteId: 'PED-123' } };
      const res = mockResponse();
      
      const mockConnection = {
        query: jest.fn().mockRejectedValue(new Error('DB Error')),
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      
      await createVentaDesdePedido(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al crear venta desde pedido' });
    });

  });

  // ================= CREATE VENTA MANUAL =================
  describe('createVentaManual', () => {

    test('crea venta manual correctamente', async () => {
      const req = { 
        body: { 
          UsuarioVendedorId: 'USR-1',
          Total: 100,
          detalles: [{ TipoItem: 'producto', ProductoId: 'P1', Cantidad: 1, PrecioUnitario: 100, Subtotal: 100 }],
          ClienteCorreo: 'test@test.com',
          ClienteNombre: 'Juan'
        } 
      };
      const res = mockResponse();
      
      const mockConnection = {
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      mockVentaModel.createVentaManualModel.mockResolvedValue('V-123');
      mockDetalleVentaModel.createDetalleVentaManualModel.mockResolvedValue(1);
      mockDetalleVentaModel.getDetalleVentaByVentaIdModel.mockResolvedValue([]);
      mockEmailUtils.sendVentaFacturaEmail.mockResolvedValue(true);
      
      await createVentaManual(req, res);
      
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Venta creada exitosamente',
        VentaId: 'V-123'
      });
    });

    test('error si no se reciben datos', async () => {
      const req = { body: null };
      const res = mockResponse();
      
      await createVentaManual(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No se recibieron datos de la venta'
      });
    });

    test('error si falta UsuarioVendedorId', async () => {
      const req = { body: { Total: 100, detalles: [] } };
      const res = mockResponse();
      
      await createVentaManual(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'UsuarioVendedorId es obligatorio'
      });
    });

    test('error si no hay detalles o no es array', async () => {
      const req = { body: { UsuarioVendedorId: 'USR-1', Total: 100 } };
      const res = mockResponse();
      
      await createVentaManual(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Debe incluir al menos un detalle'
      });
    });

    test('error stock insuficiente', async () => {
      const req = { 
        body: { 
          UsuarioVendedorId: 'USR-1',
          Total: 100,
          detalles: [{ TipoItem: 'producto', ProductoId: 'P1', Cantidad: 1, PrecioUnitario: 100, Subtotal: 100 }]
        } 
      };
      const res = mockResponse();
      
      const mockConnection = {
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      mockVentaModel.createVentaManualModel.mockRejectedValue(new Error('Stock insuficiente'));
      
      await createVentaManual(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Stock insuficiente'
      });
    });

    test('error interno del servidor', async () => {
      const req = { 
        body: { 
          UsuarioVendedorId: 'USR-1',
          Total: 100,
          detalles: [{ TipoItem: 'producto', ProductoId: 'P1', Cantidad: 1, PrecioUnitario: 100, Subtotal: 100 }]
        } 
      };
      const res = mockResponse();
      
      const mockConnection = {
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      mockVentaModel.createVentaManualModel.mockRejectedValue(new Error('Error genérico'));
      
      await createVentaManual(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error al crear la venta'
      });
    });

  });

  // ================= ANULAR VENTA =================
  describe('anularVenta', () => {

    test('anula venta de pedido correctamente', async () => {
      const req = { params: { id: 'V-123' }, body: { motivo: 'Error en pedido' } };
      const res = mockResponse();
      
      const mockVenta = { 
        VentaId: 'V-123', 
        Estado: 'pagado', 
        Origen: 'pedido',
        ClienteCorreo: 'test@test.com',
        ClienteNombre: 'Juan',
        Total: 100,
        FechaVenta: new Date().toISOString()
      };
      
      const mockConnection = {
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      mockVentaModel.getVentaByIdModel.mockResolvedValue(mockVenta);
      mockVentaModel.anularVentaModel.mockResolvedValue({ success: true });
      mockDetalleVentaModel.getDetalleVentaByVentaIdModel.mockResolvedValue([]);
      mockEmailUtils.sendVentaAnuladaEmail.mockResolvedValue(true);
      
      await anularVenta(req, res);
      
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Venta anulada correctamente'
      }));
    });

    test('error venta no encontrada', async () => {
      const req = { params: { id: 'V-999' }, body: { motivo: 'Test' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue(null);
      
      await anularVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Venta no encontrada' });
    });

    test('error venta ya anulada', async () => {
      const req = { params: { id: 'V-123' }, body: { motivo: 'Test' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue({ Estado: 'anulado' });
      
      await anularVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'La venta ya está anulada' });
    });

    test('error tiempo excedido para venta manual', async () => {
      const req = { params: { id: 'V-123' }, body: { motivo: 'Test' } };
      const res = mockResponse();
      
      const fechaAntigua = new Date();
      fechaAntigua.setHours(fechaAntigua.getHours() - 2);
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue({ 
        Estado: 'pagado', 
        Origen: 'manual',
        FechaVenta: fechaAntigua.toISOString()
      });
      
      await anularVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Ya no es posible anular'),
        codigo: 'TIEMPO_EXCEDIDO'
      }));
    });

    test('error al anular en modelo', async () => {
      const req = { params: { id: 'V-123' }, body: { motivo: 'Test' } };
      const res = mockResponse();
      
      const mockConnection = {
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      mockVentaModel.getVentaByIdModel.mockResolvedValue({ Estado: 'pagado', Origen: 'pedido' });
      mockVentaModel.anularVentaModel.mockResolvedValue({ success: false, message: 'Error en BD' });
      
      await anularVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error en BD' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { id: 'V-123' }, body: { motivo: 'Test' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockRejectedValue(new Error('DB Error'));
      
      await anularVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'DB Error'
      });
    });

  });

  // ================= GET DETALLES BY VENTA =================
  describe('getDetallesByVenta', () => {

    test('retorna detalles de venta correctamente', async () => {
      const req = { params: { ventaId: 'V-123' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue({ VentaId: 'V-123' });
      mockDetalleVentaModel.getDetalleVentaByVentaIdModel.mockResolvedValue([{ DetalleId: 1 }]);
      
      await getDetallesByVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ DetalleId: 1 }]);
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
        body: { TipoItem: 'producto', ProductoId: 'P1', Cantidad: 1, PrecioUnitario: 100, Subtotal: 100 } 
      };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue({ VentaId: 'V-123', Estado: 'pagado' });
      mockDetalleVentaModel.createDetalleVentaManualModel.mockResolvedValue(1);
      mockDetalleVentaModel.getDetalleVentaByVentaIdModel.mockResolvedValue([{ DetalleId: 1 }]);
      
      await createDetalle(req, res);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Detalle creado exitosamente'
      }));
    });

    test('error venta no encontrada', async () => {
      const req = { params: { ventaId: 'V-999' }, body: {} };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue(null);
      
      await createDetalle(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Venta no encontrada' });
    });

    test('error venta anulada', async () => {
      const req = { params: { ventaId: 'V-123' }, body: {} };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue({ Estado: 'anulado' });
      
      await createDetalle(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se pueden agregar detalles a una venta anulada' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { ventaId: 'V-123' }, body: {} };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockRejectedValue(new Error('DB Error'));
      
      await createDetalle(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al crear detalle' });
    });

  });

  // ================= ACTUALIZAR ESTADO VENTA =================
  describe('actualizarEstadoVenta', () => {

    test('actualiza estado a pagado correctamente', async () => {
      const req = { params: { id: 'V-123' }, body: { Estado: 'pagado' } };
      const res = mockResponse();
      
      const mockVenta = { 
        VentaId: 'V-123', 
        Estado: 'pendiente', 
        Origen: 'pedido',
        PedidoClienteId: 'PED-123',
        ClienteCorreo: 'test@test.com',
        ClienteNombre: 'Juan',
        Total: 100
      };
      
      const mockConnection = {
        query: jest.fn().mockResolvedValue([{ affectedRows: 1 }]),
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      mockVentaModel.getVentaByIdModel.mockResolvedValue(mockVenta);
      mockDetalleVentaModel.getDetalleVentaByVentaIdModel.mockResolvedValue([]);
      
      await actualizarEstadoVenta(req, res);
      
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Estado actualizado correctamente'
      }));
    });

    test('actualiza estado a rechazado con motivo', async () => {
      const req = { params: { id: 'V-123' }, body: { Estado: 'rechazado', motivo: 'Voucher inválido' } };
      const res = mockResponse();
      
      const mockVenta = { 
        VentaId: 'V-123', 
        Estado: 'pendiente',
        ClienteCorreo: 'test@test.com',
        ClienteNombre: 'Juan',
        Total: 100
      };
      
      const mockConnection = {
        query: jest.fn().mockResolvedValue([{ affectedRows: 1 }]),
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      mockVentaModel.getVentaByIdModel.mockResolvedValue(mockVenta);
      mockDetalleVentaModel.getDetalleVentaByVentaIdModel.mockResolvedValue([]);
      mockEmailUtils.sendVentaRechazadaEmail.mockResolvedValue(true);
      
      await actualizarEstadoVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Estado actualizado correctamente'
      }));
    });

    test('error estado no válido', async () => {
      const req = { params: { id: 'V-123' }, body: { Estado: 'Invalido' } };
      const res = mockResponse();
      
      await actualizarEstadoVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Estado no válido'
      }));
    });

    test('error venta no encontrada', async () => {
      const req = { params: { id: 'V-999' }, body: { Estado: 'pagado' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue(null);
      
      await actualizarEstadoVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Venta no encontrada' });
    });

    test('error no se puede modificar venta anulada', async () => {
      const req = { params: { id: 'V-123' }, body: { Estado: 'pagado' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue({ Estado: 'anulado' });
      
      await actualizarEstadoVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se puede modificar una venta anulada' });
    });

    test('error no se puede revertir venta pagada', async () => {
      const req = { params: { id: 'V-123' }, body: { Estado: 'pendiente' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue({ Estado: 'pagado' });
      
      await actualizarEstadoVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se puede revertir una venta pagada' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { id: 'V-123' }, body: { Estado: 'pagado' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockRejectedValue(new Error('DB Error'));
      
      await actualizarEstadoVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Error al actualizar el estado de la venta'
      }));
    });

  });

  // ================= RECHAZAR VENTA =================
  describe('rechazarVenta', () => {

    test('rechaza venta correctamente', async () => {
      const req = { params: { id: 'V-123' }, body: { motivo: 'Voucher inválido' } };
      const res = mockResponse();
      
      const mockVenta = { 
        VentaId: 'V-123', 
        Estado: 'pendiente',
        ClienteCorreo: 'test@test.com',
        ClienteNombre: 'Juan',
        Total: 100
      };
      
      const mockConnection = {
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      mockVentaModel.getVentaByIdModel.mockResolvedValue(mockVenta);
      mockVentaModel.rechazarVentaModel.mockResolvedValue({ success: true });
      mockDetalleVentaModel.getDetalleVentaByVentaIdModel.mockResolvedValue([]);
      mockEmailUtils.sendVentaRechazadaEmail.mockResolvedValue(true);
      
      await rechazarVenta(req, res);
      
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Venta rechazada correctamente'
      }));
    });

    test('error venta no encontrada', async () => {
      const req = { params: { id: 'V-999' }, body: { motivo: 'Test' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue(null);
      
      await rechazarVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Venta no encontrada' });
    });

    test('error venta ya rechazada', async () => {
      const req = { params: { id: 'V-123' }, body: { motivo: 'Test' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue({ Estado: 'rechazado' });
      
      await rechazarVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'La venta ya está rechazada' });
    });

    test('error no se puede rechazar venta anulada', async () => {
      const req = { params: { id: 'V-123' }, body: { motivo: 'Test' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue({ Estado: 'anulado' });
      
      await rechazarVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se puede rechazar una venta anulada' });
    });

    test('error no se puede rechazar venta pagada', async () => {
      const req = { params: { id: 'V-123' }, body: { motivo: 'Test' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockResolvedValue({ Estado: 'pagado' });
      
      await rechazarVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se puede rechazar una venta ya pagada' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { id: 'V-123' }, body: { motivo: 'Test' } };
      const res = mockResponse();
      
      mockVentaModel.getVentaByIdModel.mockRejectedValue(new Error('DB Error'));
      
      await rechazarVenta(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'DB Error'
      });
    });

  });

});