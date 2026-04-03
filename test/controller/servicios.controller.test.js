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

const mockServicesModel = {
  buscarServicioDB: jest.fn(),
  createService: jest.fn(),
  deleteDataService: jest.fn(),
  findDuplicateName: jest.fn(),
  getServiciosPaginated: jest.fn(),
  getDataServiceById: jest.fn(),
  nombreServiceExiste: jest.fn(),
  verificarAsociacionesServicio: jest.fn(),
  updateDataServicio: jest.fn()
};

jest.unstable_mockModule('../../models/services.model.js', () => mockServicesModel);

// ===== IMPORT DESPUÉS DEL MOCK =====
const {
  postService,
  getAllService,
  getServiceById,
  updateService,
  deleteService,
  validarNombre,
  buscarService,
  cambiarEstadoService
} = await import('../../controllers/servicios.controller.js');

// ===== MOCK RESPONSE =====
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('SERVICES CONTROLLER', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= POST SERVICE =================
  describe('postService', () => {

    test('crea servicio correctamente', async () => {
      const req = { 
        body: { 
          Nombre: 'Servicio Test',
          Descripcion: 'Desc',
          Imagen: 'img.jpg',
          CategoriaId: 1
        } 
      };
      const res = mockResponse();
      
      mockServicesModel.nombreServiceExiste.mockResolvedValue([]);
      mockServicesModel.createService.mockResolvedValue();
      
      await postService(req, res);
      
      expect(mockServicesModel.createService).toHaveBeenCalledWith({
        ServicioId: 'mock-uuid-123',
        Nombre: 'Servicio Test',
        Descripcion: 'Desc',
        Imagen: 'img.jpg',
        CategoriaId: 1
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Servicio creado exitosamente',
        ServicioId: 'mock-uuid-123'
      });
    });

    test('error si faltan campos obligatorios', async () => {
      const req = { body: { Nombre: 'Test' } };
      const res = mockResponse();
      
      await postService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Campos obligatorios faltantes: Nombre, Imagen, CategoriaId' 
      });
    });

    test('error servicio ya existe', async () => {
      const req = { 
        body: { 
          Nombre: 'Existente',
          Imagen: 'img.jpg',
          CategoriaId: 1
        } 
      };
      const res = mockResponse();
      
      mockServicesModel.nombreServiceExiste.mockResolvedValue([{ Nombre: 'Existente' }]);
      
      await postService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Servicio ya existe' });
    });

    test('error interno del servidor', async () => {
      const req = { 
        body: { 
          Nombre: 'Test',
          Imagen: 'img.jpg',
          CategoriaId: 1
        } 
      };
      const res = mockResponse();
      
      mockServicesModel.nombreServiceExiste.mockRejectedValue(new Error('DB Error'));
      
      await postService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });

  });

  // ================= GET ALL SERVICE =================
  describe('getAllService', () => {

    test('retorna lista paginada correctamente', async () => {
      const req = { query: { page: 1, limit: 10 } };
      const res = mockResponse();
      
      mockServicesModel.getServiciosPaginated.mockResolvedValue({
        data: [{ ServicioId: '1', Nombre: 'Servicio 1' }],
        totalItems: 1,
        currentPage: 1,
        totalPages: 1
      });
      
      await getAllService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: [{ ServicioId: '1', Nombre: 'Servicio 1' }],
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
      
      mockServicesModel.getServiciosPaginated.mockResolvedValue({
        data: [],
        totalItems: 0,
        currentPage: 1,
        totalPages: 1
      });
      
      await getAllService(req, res);
      
      expect(mockServicesModel.getServiciosPaginated).toHaveBeenCalledWith({
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
      
      mockServicesModel.getServiciosPaginated
        .mockResolvedValueOnce({ data: [], totalItems: 5, currentPage: 2, totalPages: 1 })
        .mockResolvedValueOnce({
          data: [{ ServicioId: '1' }],
          totalItems: 5,
          currentPage: 1,
          totalPages: 1
        });
      
      await getAllService(req, res);
      
      expect(mockServicesModel.getServiciosPaginated).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('error retorna fallback con datos vacíos', async () => {
      const req = { query: { limit: 10 } };
      const res = mockResponse();
      
      mockServicesModel.getServiciosPaginated.mockRejectedValue(new Error('DB Error'));
      
      await getAllService(req, res);
      
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

  // ================= GET SERVICE BY ID =================
  describe('getServiceById', () => {

    test('retorna servicio cuando existe', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      const mockServicio = [{ ServicioId: '123', Nombre: 'Test' }];
      mockServicesModel.getDataServiceById.mockResolvedValue(mockServicio);
      
      await getServiceById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockServicio[0]);
    });

    test('error servicio no encontrado', async () => {
      const req = { params: { id: '999' } };
      const res = mockResponse();
      
      mockServicesModel.getDataServiceById.mockResolvedValue([]);
      
      await getServiceById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Servicio no encontrado' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      mockServicesModel.getDataServiceById.mockRejectedValue(new Error('DB Error'));
      
      await getServiceById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });

  });

  // ================= UPDATE SERVICE =================
  describe('updateService', () => {

    test('actualiza servicio correctamente', async () => {
      const req = { 
        params: { ServicioId: '123' }, 
        body: { 
          Nombre: 'Servicio Actualizado',
          Estado: 'Activo'
        } 
      };
      const res = mockResponse();
      
      mockServicesModel.findDuplicateName.mockResolvedValue([]);
      mockServicesModel.getDataServiceById.mockResolvedValue([{ ServicioId: '123' }]);
      mockServicesModel.updateDataServicio.mockResolvedValue(1);
      
      await updateService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Servicio actualizado correctamente',
        servicio: { ServicioId: '123', Nombre: 'Servicio Actualizado', Estado: 'Activo' }
      });
    });

    test('error si nombre es obligatorio', async () => {
      const req = { params: { ServicioId: '123' }, body: {} };
      const res = mockResponse();
      
      await updateService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'El nombre es obligatorio' });
    });

    test('error nombre duplicado', async () => {
      const req = { params: { ServicioId: '123' }, body: { Nombre: 'Duplicado' } };
      const res = mockResponse();
      
      mockServicesModel.findDuplicateName.mockResolvedValue([{ Nombre: 'Duplicado' }]);
      
      await updateService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'El nombre ya existe.' });
    });

    test('error servicio no encontrado', async () => {
      const req = { params: { ServicioId: '999' }, body: { Nombre: 'Test' } };
      const res = mockResponse();
      
      // ✅ FIX: Mockear findDuplicateName PRIMERO para que no active el error 409
      mockServicesModel.findDuplicateName.mockResolvedValue([]);
      // ✅ Luego mockear getDataServiceById para que active el error 404
      mockServicesModel.getDataServiceById.mockResolvedValue([]);
      
      await updateService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Servicio no encontrado' });
    });

    test('error servicio sin cambios', async () => {
      const req = { params: { ServicioId: '123' }, body: { Nombre: 'Test' } };
      const res = mockResponse();
      
      mockServicesModel.findDuplicateName.mockResolvedValue([]);
      mockServicesModel.getDataServiceById.mockResolvedValue([{ ServicioId: '123' }]);
      mockServicesModel.updateDataServicio.mockResolvedValue(0);
      
      await updateService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Servicio no encontrado o sin cambios' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { ServicioId: '123' }, body: { Nombre: 'Test' } };
      const res = mockResponse();
      
      mockServicesModel.findDuplicateName.mockRejectedValue(new Error('DB Error'));
      
      await updateService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });

  });

  // ================= DELETE SERVICE =================
  describe('deleteService', () => {

    test('elimina servicio correctamente', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      mockServicesModel.verificarAsociacionesServicio.mockResolvedValue({ 
        tieneAsociaciones: false,
        detallePedidos: 0,
        detalleVentas: 0
      });
      mockServicesModel.deleteDataService.mockResolvedValue();
      
      await deleteService(req, res);
      
      expect(mockServicesModel.deleteDataService).toHaveBeenCalledWith('123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Servicio eliminado correctamente' });
    });

    test('error tiene asociaciones con pedidos', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      mockServicesModel.verificarAsociacionesServicio.mockResolvedValue({ 
        tieneAsociaciones: true,
        detallePedidos: 2,
        detalleVentas: 0
      });
      
      await deleteService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No se puede eliminar: este servicio está asociado a pedidos o ventas.',
        detalles: {
          pedidos: 2,
          ventas: 0
        }
      });
    });

    test('error tiene asociaciones con ventas', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      mockServicesModel.verificarAsociacionesServicio.mockResolvedValue({ 
        tieneAsociaciones: true,
        detallePedidos: 0,
        detalleVentas: 3
      });
      
      await deleteService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(409);
    });

    test('error interno del servidor', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      mockServicesModel.verificarAsociacionesServicio.mockRejectedValue(new Error('DB Error'));
      
      await deleteService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });

  });

  // ================= VALIDAR NOMBRE =================
  describe('validarNombre', () => {

    test('retorna exists true cuando nombre existe', async () => {
      const req = { query: { Nombre: 'Servicio Test' } };
      const res = mockResponse();
      
      mockServicesModel.nombreServiceExiste.mockResolvedValue([{ Nombre: 'Servicio Test' }]);
      
      await validarNombre(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ exists: true });
    });

    test('retorna exists false cuando nombre no existe', async () => {
      const req = { query: { Nombre: 'Inexistente' } };
      const res = mockResponse();
      
      mockServicesModel.nombreServiceExiste.mockResolvedValue([]);
      
      await validarNombre(req, res);
      
      expect(res.json).toHaveBeenCalledWith({ exists: false });
    });

    test('error interno del servidor', async () => {
      const req = { query: { Nombre: 'Test' } };
      const res = mockResponse();
      
      mockServicesModel.nombreServiceExiste.mockRejectedValue(new Error('DB Error'));
      
      await validarNombre(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });

  });

  // ================= BUSCAR SERVICE =================
  describe('buscarService', () => {

    test('campo inválido retorna error', async () => {
      const req = { query: { campo: 'invalido', valor: 'Test' } };
      const res = mockResponse();
      
      await buscarService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Campo de búsqueda inválido' });
    });

    test('búsqueda por nombre correctamente', async () => {
      const req = { query: { campo: 'nombre', valor: 'Test', page: 1, limit: 10 } };
      const res = mockResponse();
      
      mockServicesModel.getServiciosPaginated.mockResolvedValue({
        data: [{ Nombre: 'Servicio Test' }],
        totalItems: 1,
        currentPage: 1
      });
      
      await buscarService(req, res);
      
      expect(mockServicesModel.getServiciosPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filtroCampo: 'Nombre',
        filtroValor: 'Test',
        estado: null
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('búsqueda por descripción', async () => {
      const req = { query: { campo: 'descripcion', valor: 'Desc' } };
      const res = mockResponse();
      
      mockServicesModel.getServiciosPaginated.mockResolvedValue({
        data: [{ Descripcion: 'Desc' }],
        totalItems: 1,
        currentPage: 1
      });
      
      await buscarService(req, res);
      
      expect(mockServicesModel.getServiciosPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filtroCampo: 'Descripcion',
        filtroValor: 'Desc',
        estado: null
      });
    });

    test('búsqueda por categoría', async () => {
      const req = { query: { campo: 'categoria', valor: '1' } };
      const res = mockResponse();
      
      mockServicesModel.getServiciosPaginated.mockResolvedValue({
        data: [{ CategoriaId: 1 }],
        totalItems: 1,
        currentPage: 1
      });
      
      await buscarService(req, res);
      
      expect(mockServicesModel.getServiciosPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filtroCampo: 'CategoriaId',
        filtroValor: '1',
        estado: null
      });
    });

    test('búsqueda con estado', async () => {
      const req = { query: { campo: 'estado', valor: 'Activo' } };
      const res = mockResponse();
      
      mockServicesModel.getServiciosPaginated.mockResolvedValue({
        data: [],
        totalItems: 0,
        currentPage: 1
      });
      
      await buscarService(req, res);
      
      expect(mockServicesModel.getServiciosPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filtroCampo: 'Estado',
        filtroValor: 'Activo',
        estado: null
      });
    });

    test('usa valores por defecto page y limit', async () => {
      const req = { query: { campo: 'nombre', valor: 'Test' } };
      const res = mockResponse();
      
      mockServicesModel.getServiciosPaginated.mockResolvedValue({
        data: [],
        totalItems: 0,
        currentPage: 1
      });
      
      await buscarService(req, res);
      
      expect(mockServicesModel.getServiciosPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filtroCampo: 'Nombre',
        filtroValor: 'Test',
        estado: null
      });
    });

    test('error retorna fallback', async () => {
      const req = { query: { campo: 'nombre', valor: 'Test', limit: 10 } };
      const res = mockResponse();
      
      mockServicesModel.getServiciosPaginated.mockRejectedValue(new Error('DB Error'));
      
      await buscarService(req, res);
      
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

  // ================= CAMBIAR ESTADO SERVICE =================
  describe('cambiarEstadoService', () => {

    test('cambia estado a Activo correctamente', async () => {
      const req = { params: { id: '123' }, body: { Estado: 'Activo' } };
      const res = mockResponse();
      
      mockServicesModel.getDataServiceById.mockResolvedValue([{ ServicioId: '123' }]);
      mockDbPool.query.mockResolvedValue([{ affectedRows: 1 }]);
      
      await cambiarEstadoService(req, res);
      
      expect(mockDbPool.query).toHaveBeenCalledWith(
        'UPDATE servicios SET Estado = ? WHERE ServicioId = ?',
        ['Activo', '123']
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Servicio activado correctamente',
        ServicioId: '123',
        Estado: 'Activo'
      });
    });

    test('cambia estado a Inactivo correctamente', async () => {
      const req = { params: { id: '123' }, body: { Estado: 'Inactivo' } };
      const res = mockResponse();
      
      mockServicesModel.getDataServiceById.mockResolvedValue([{ ServicioId: '123' }]);
      mockDbPool.query.mockResolvedValue([{ affectedRows: 1 }]);
      
      await cambiarEstadoService(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        message: 'Servicio desactivado correctamente',
        ServicioId: '123',
        Estado: 'Inactivo'
      });
    });

    test('error si estado inválido', async () => {
      const req = { params: { id: '123' }, body: { Estado: 'Invalido' } };
      const res = mockResponse();
      
      await cambiarEstadoService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Estado inválido' });
    });

    test('error servicio no encontrado', async () => {
      const req = { params: { id: '999' }, body: { Estado: 'Activo' } };
      const res = mockResponse();
      
      mockServicesModel.getDataServiceById.mockResolvedValue([]);
      
      await cambiarEstadoService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Servicio no encontrado' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { id: '123' }, body: { Estado: 'Activo' } };
      const res = mockResponse();
      
      mockServicesModel.getDataServiceById.mockRejectedValue(new Error('DB Error'));
      
      await cambiarEstadoService(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });

  });

});