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

const mockProductoModel = {
  buscarProductoDB: jest.fn(),
  createProducto: jest.fn(),
  deleteDataProducto: jest.fn(),
  findDuplicateName: jest.fn(),
  getDataAllProductos: jest.fn(),
  getDataProductoById: jest.fn(),
  nombreProductoExiste: jest.fn(),
  updateDataProducto: jest.fn(),
  getProductosPaginated: jest.fn()
};

jest.unstable_mockModule('../../models/producto.model.js', () => mockProductoModel);

const mockDetalleComprasModel = {
  actualizarStockProducto: jest.fn()
};

jest.unstable_mockModule('../../models/detalleCompras.model.js', () => mockDetalleComprasModel);

// ===== IMPORT DESPUÉS DEL MOCK =====
const {
  postProducto,
  cambiarEstadoProducto,
  getAllProducto,
  getProductoById,
  updateProducto,
  deleteProducto,
  validarNombre,
  buscarProducto
} = await import('../../controllers/productos.controller.js');

// ===== MOCK RESPONSE =====
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('PRODUCTO CONTROLLER', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= POST PRODUCTO =================
  describe('postProducto', () => {

    test('crea producto correctamente', async () => {
      const req = { 
        body: { 
          Nombre: 'Producto Test',
          Descripcion: 'Desc',
          Imagen: 'img.jpg',
          Precio: 100,
          Descuento: 0,
          CategoriaId: 1,
          Estado: 'Activo',
          UsaColores: 0
        } 
      };
      const res = mockResponse();
      
      mockProductoModel.nombreProductoExiste.mockResolvedValue([]);
      mockProductoModel.createProducto.mockResolvedValue();
      
      await postProducto(req, res);
      
      expect(mockProductoModel.createProducto).toHaveBeenCalledWith({
        ProductoId: 'mock-uuid-123',
        Nombre: 'Producto Test',
        Descripcion: 'Desc',
        Imagen: 'img.jpg',
        Precio: 100,
        Descuento: 0,
        CategoriaId: 1,
        Estado: 'Activo',
        UsaColores: 0,
        Stock: 0
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Producto creado exitosamente',
        ProductoId: 'mock-uuid-123',
        UsaColores: 0,
        Stock: 0
      });
    });

    test('error si faltan campos obligatorios', async () => {
      const req = { body: { Nombre: 'Test' } };
      const res = mockResponse();
      
      await postProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Los campos son obligatorios' });
    });

    test('error si UsaColores no es 0 o 1', async () => {
      const req = { 
        body: { 
          Nombre: 'Test',
          Imagen: 'img.jpg',
          Precio: 100,
          Descuento: 0,
          CategoriaId: 1,
          UsaColores: 2
        } 
      };
      const res = mockResponse();
      
      await postProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'UsaColores debe ser 0 o 1' });
    });

    test('error producto ya existe', async () => {
      const req = { 
        body: { 
          Nombre: 'Existente',
          Imagen: 'img.jpg',
          Precio: 100,
          Descuento: 0,
          CategoriaId: 1
        } 
      };
      const res = mockResponse();
      
      mockProductoModel.nombreProductoExiste.mockResolvedValue([{ Nombre: 'Existente' }]);
      
      await postProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Producto ya existe' });
    });

    test('error interno del servidor', async () => {
      const req = { 
        body: { 
          Nombre: 'Test',
          Imagen: 'img.jpg',
          Precio: 100,
          Descuento: 0,
          CategoriaId: 1
        } 
      };
      const res = mockResponse();
      
      mockProductoModel.nombreProductoExiste.mockRejectedValue(new Error('DB Error'));
      
      await postProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });

  });

  // ================= CAMBIAR ESTADO PRODUCTO =================
  describe('cambiarEstadoProducto', () => {

    test('cambia estado a Activo correctamente', async () => {
      const req = { params: { id: '123' }, body: { Estado: 'Activo' } };
      const res = mockResponse();
      
      mockProductoModel.updateDataProducto.mockResolvedValue(1);
      
      await cambiarEstadoProducto(req, res);
      
      expect(mockProductoModel.updateDataProducto).toHaveBeenCalledWith({
        ProductoId: '123',
        Estado: 'Activo'
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Producto activado correctamente'
      });
    });

    test('cambia estado a Inactivo correctamente', async () => {
      const req = { params: { id: '123' }, body: { Estado: 'Inactivo' } };
      const res = mockResponse();
      
      mockProductoModel.updateDataProducto.mockResolvedValue(1);
      
      await cambiarEstadoProducto(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        message: 'Producto desactivado correctamente'
      });
    });

    test('error si estado no válido', async () => {
      const req = { params: { id: '123' }, body: { Estado: 'Invalido' } };
      const res = mockResponse();
      
      await cambiarEstadoProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Estado no válido. Debe ser "Activo" o "Inactivo"' 
      });
    });

    test('error producto no encontrado', async () => {
      const req = { params: { id: '999' }, body: { Estado: 'Activo' } };
      const res = mockResponse();
      
      mockProductoModel.updateDataProducto.mockResolvedValue(0);
      
      await cambiarEstadoProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Producto no encontrado' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { id: '123' }, body: { Estado: 'Activo' } };
      const res = mockResponse();
      
      mockProductoModel.updateDataProducto.mockRejectedValue(new Error('DB Error'));
      
      await cambiarEstadoProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });

  });

  // ================= GET ALL PRODUCTO =================
  describe('getAllProducto', () => {

    test('retorna lista paginada correctamente', async () => {
      const req = { query: { page: 1, limit: 10 } };
      const res = mockResponse();
      
      mockProductoModel.getProductosPaginated.mockResolvedValue({
        data: [{ ProductoId: '1', Nombre: 'Producto 1' }],
        totalItems: 1,
        currentPage: 1,
        totalPages: 1
      });
      
      await getAllProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: [{ ProductoId: '1', Nombre: 'Producto 1' }],
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
      
      mockProductoModel.getProductosPaginated.mockResolvedValue({
        data: [],
        totalItems: 0,
        currentPage: 1,
        totalPages: 1
      });
      
      await getAllProducto(req, res);
      
      expect(mockProductoModel.getProductosPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filtroCampo: null,
        filtroValor: null,
        estado: null
      });
    });

    test('fallback cuando página vacía y page > 1', async () => {
      const req = { query: { page: 2, limit: 10 } };
      const res = mockResponse();
      
      mockProductoModel.getProductosPaginated
        .mockResolvedValueOnce({ data: [], totalItems: 5, currentPage: 2, totalPages: 1 })
        .mockResolvedValueOnce({
          data: [{ ProductoId: '1' }],
          totalItems: 5,
          currentPage: 1,
          totalPages: 1
        });
      
      await getAllProducto(req, res);
      
      expect(mockProductoModel.getProductosPaginated).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('error retorna fallback con datos vacíos', async () => {
      const req = { query: { limit: 10 } };
      const res = mockResponse();
      
      mockProductoModel.getProductosPaginated.mockRejectedValue(new Error('DB Error'));
      
      await getAllProducto(req, res);
      
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

  // ================= GET PRODUCTO BY ID =================
  describe('getProductoById', () => {

    test('retorna producto con colores cuando existe', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      const mockProducto = [{ ProductoId: '123', Nombre: 'Test', Stock: 10 }];
      const mockColores = [
        { ColorId: 1, Nombre: 'Rojo', Hex: '#FF0000', Stock: 5 }
      ];
      
      mockDbPool.query
        .mockResolvedValueOnce([mockProducto])
        .mockResolvedValueOnce([mockColores]);
      
      await getProductoById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ...mockProducto[0],
        Colores: mockColores
      });
    });

    test('error producto no encontrado', async () => {
      const req = { params: { id: '999' } };
      const res = mockResponse();
      
      mockDbPool.query.mockResolvedValueOnce([[]]);
      
      await getProductoById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Producto no encontrado' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      mockDbPool.query.mockRejectedValue(new Error('DB Error'));
      
      await getProductoById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });

  });

  // ================= UPDATE PRODUCTO =================
  describe('updateProducto', () => {

    test('actualiza producto correctamente', async () => {
      const req = { 
        params: { id: '123' }, 
        body: { 
          Nombre: 'Producto Actualizado',
          Precio: 150,
          UsaColores: 1
        } 
      };
      const res = mockResponse();
      
      const mockProductoActual = [{ ProductoId: '123', Nombre: 'Original', Stock: 10, UsaColores: 0 }];
      
      mockProductoModel.getDataProductoById.mockResolvedValue(mockProductoActual);
      mockDbPool.query.mockResolvedValueOnce([[]]);
      mockProductoModel.findDuplicateName.mockResolvedValue([]);
      mockProductoModel.updateDataProducto.mockResolvedValue(1);
      
      await updateProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Producto actualizado correctamente',
        producto: {
          ProductoId: '123',
          Nombre: 'Producto Actualizado',
          UsaColores: 1,
          Stock: 10
        }
      });
    });

    test('error si nombre es obligatorio', async () => {
      const req = { params: { id: '123' }, body: {} };
      const res = mockResponse();
      
      await updateProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'El nombre es obligatorio' });
    });

    test('error si UsaColores no es 0 o 1', async () => {
      const req = { params: { id: '123' }, body: { Nombre: 'Test', UsaColores: 2 } };
      const res = mockResponse();
      
      await updateProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'UsaColores debe ser 0 o 1' });
    });

    test('error producto no encontrado', async () => {
      const req = { params: { id: '999' }, body: { Nombre: 'Test' } };
      const res = mockResponse();
      
      mockProductoModel.getDataProductoById.mockResolvedValue([]);
      
      await updateProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Producto no encontrado' });
    });

    test('error no puede desactivar colores si hay compras', async () => {
      const req = { params: { id: '123' }, body: { Nombre: 'Test', UsaColores: 0 } };
      const res = mockResponse();
      
      mockProductoModel.getDataProductoById.mockResolvedValue([{ ProductoId: '123' }]);
      mockDbPool.query.mockResolvedValueOnce([[{ ColorId: 1 }]]);
      
      await updateProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No puedes desactivar colores porque ya hay compras con colores para este producto'
      });
    });

    test('error nombre duplicado', async () => {
      const req = { params: { id: '123' }, body: { Nombre: 'Duplicado' } };
      const res = mockResponse();
      
      mockProductoModel.getDataProductoById.mockResolvedValue([{ ProductoId: '123' }]);
      mockDbPool.query.mockResolvedValueOnce([[]]);
      mockProductoModel.findDuplicateName.mockResolvedValue([{ Nombre: 'Duplicado' }]);
      
      await updateProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'El nombre ya existe.' });
    });

    test('error producto sin cambios', async () => {
      const req = { params: { id: '123' }, body: { Nombre: 'Test' } };
      const res = mockResponse();
      
      mockProductoModel.getDataProductoById.mockResolvedValue([{ ProductoId: '123' }]);
      mockDbPool.query.mockResolvedValueOnce([[]]);
      mockProductoModel.findDuplicateName.mockResolvedValue([]);
      mockProductoModel.updateDataProducto.mockResolvedValue(0);
      
      await updateProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Producto no encontrado o sin cambios' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { id: '123' }, body: { Nombre: 'Test' } };
      const res = mockResponse();
      
      mockProductoModel.getDataProductoById.mockRejectedValue(new Error('DB Error'));
      
      await updateProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });

  });

  // ================= DELETE PRODUCTO =================
  describe('deleteProducto', () => {

    test('elimina producto correctamente', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      const mockConnection = {
        query: jest.fn(),
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      mockConnection.query
        .mockResolvedValueOnce([[{ ProductoId: '123' }]])
        .mockResolvedValueOnce([[{ count: 0 }]])
        .mockResolvedValueOnce([[{ count: 0 }]])
        .mockResolvedValueOnce()
        .mockResolvedValueOnce();
      
      await deleteProducto(req, res);
      
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Producto eliminado correctamente' });
    });

    test('error producto no encontrado', async () => {
      const req = { params: { id: '999' } };
      const res = mockResponse();
      
      const mockConnection = {
        query: jest.fn().mockResolvedValueOnce([[]]),
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      
      await deleteProducto(req, res);
      
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Producto no encontrado' });
    });

    test('error tiene ventas asociadas', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      const mockConnection = {
        query: jest.fn()
          .mockResolvedValueOnce([[{ ProductoId: '123' }]])
          .mockResolvedValueOnce([[{ count: 1 }]])
          .mockResolvedValueOnce([[{ count: 0 }]]),
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      
      await deleteProducto(req, res);
      
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Este producto no puede eliminarse porque tiene ventas o pedidos asociados.'
      });
    });

    test('error tiene pedidos asociados', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      const mockConnection = {
        query: jest.fn()
          .mockResolvedValueOnce([[{ ProductoId: '123' }]])
          .mockResolvedValueOnce([[{ count: 0 }]])
          .mockResolvedValueOnce([[{ count: 1 }]]),
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      
      await deleteProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('error interno del servidor con rollback', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      const mockConnection = {
        query: jest.fn().mockRejectedValue(new Error('DB Error')),
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      mockDbPool.getConnection.mockResolvedValue(mockConnection);
      
      await deleteProducto(req, res);
      
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });

  });

  // ================= VALIDAR NOMBRE =================
  describe('validarNombre', () => {

    test('retorna exists true cuando nombre existe', async () => {
      const req = { query: { Nombre: 'Producto Test' } };
      const res = mockResponse();
      
      mockProductoModel.nombreProductoExiste.mockResolvedValue([{ Nombre: 'Producto Test' }]);
      
      await validarNombre(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ exists: true });
    });

    test('retorna exists false cuando nombre no existe', async () => {
      const req = { query: { Nombre: 'Inexistente' } };
      const res = mockResponse();
      
      mockProductoModel.nombreProductoExiste.mockResolvedValue([]);
      
      await validarNombre(req, res);
      
      expect(res.json).toHaveBeenCalledWith({ exists: false });
    });

    test('error interno del servidor', async () => {
      const req = { query: { Nombre: 'Test' } };
      const res = mockResponse();
      
      mockProductoModel.nombreProductoExiste.mockRejectedValue(new Error('DB Error'));
      
      await validarNombre(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });

  });

  // ================= BUSCAR PRODUCTO =================
  describe('buscarProducto', () => {

    test('campo inválido retorna error', async () => {
      const req = { query: { campo: 'invalido', valor: 'Test' } };
      const res = mockResponse();
      
      await buscarProducto(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Campo de búsqueda inválido' });
    });

    test('búsqueda por nombre correctamente', async () => {
      const req = { query: { campo: 'nombre', valor: 'Test', page: 1, limit: 10 } };
      const res = mockResponse();
      
      mockProductoModel.getProductosPaginated.mockResolvedValue({
        data: [{ Nombre: 'Producto Test' }],
        totalItems: 1,
        currentPage: 1
      });
      
      await buscarProducto(req, res);
      
      expect(mockProductoModel.getProductosPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filtroCampo: 'nombre',
        filtroValor: 'Test',
        estado: null
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('búsqueda por precio', async () => {
      const req = { query: { campo: 'precio', valor: '100' } };
      const res = mockResponse();
      
      mockProductoModel.getProductosPaginated.mockResolvedValue({
        data: [{ Precio: 100 }],
        totalItems: 1,
        currentPage: 1
      });
      
      await buscarProducto(req, res);
      
      expect(mockProductoModel.getProductosPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filtroCampo: 'precio',
        filtroValor: '100',
        estado: null
      });
    });

    test('búsqueda con estado', async () => {
      const req = { query: { campo: 'nombre', valor: 'Test', estado: 'Activo' } };
      const res = mockResponse();
      
      mockProductoModel.getProductosPaginated.mockResolvedValue({
        data: [],
        totalItems: 0,
        currentPage: 1
      });
      
      await buscarProducto(req, res);
      
      expect(mockProductoModel.getProductosPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filtroCampo: 'nombre',
        filtroValor: 'Test',
        estado: 'Activo'
      });
    });

    test('usa valores por defecto page y limit', async () => {
      const req = { query: { campo: 'nombre', valor: 'Test' } };
      const res = mockResponse();
      
      mockProductoModel.getProductosPaginated.mockResolvedValue({
        data: [],
        totalItems: 0,
        currentPage: 1
      });
      
      await buscarProducto(req, res);
      
      expect(mockProductoModel.getProductosPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filtroCampo: 'nombre',
        filtroValor: 'Test',
        estado: null
      });
    });

    test('error retorna fallback', async () => {
      const req = { query: { campo: 'nombre', valor: 'Test', limit: 10 } };
      const res = mockResponse();
      
      mockProductoModel.getProductosPaginated.mockRejectedValue(new Error('DB Error'));
      
      await buscarProducto(req, res);
      
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

});