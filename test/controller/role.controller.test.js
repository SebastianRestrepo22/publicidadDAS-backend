import { jest } from '@jest/globals';

// ===== MOCK =====
const mockModel = {
  createDataRole: jest.fn(),
  getDataRolesPaginated: jest.fn(),
  buscarRolesPaginated: jest.fn(),
  getDataRolesById: jest.fn(),
  updateDataRoles: jest.fn(),
  rolesAsociados: jest.fn(),
  deleteDataRole: jest.fn(),
  changeDataStatus: jest.fn(),
  validarDataRol: jest.fn(),
  getdataPermisos: jest.fn(),
  getDataRolePermissions: jest.fn(),
  existenPermisos: jest.fn(),
  deletePermissos: jest.fn(),
  actualizarPermisos: jest.fn(),
  getDataRolUser: jest.fn(),
  getDataPermissonRol: jest.fn(),
  systemRole: jest.fn(),
};

jest.unstable_mockModule('../../models/role.model.js', () => mockModel);

// Mock para uuid
jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

// ===== IMPORT DESPUÉS DEL MOCK =====
const {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  changeState,
  validarRol,
  buscarRoles,
  getAllPermissions,
  getRolePermissions,
  updateRolePermissions,
  getUserPermissions
} = await import('../../controllers/role.controller.js');

// ===== MOCK RESPONSE =====
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ROLE CONTROLLER', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= CREATE ROLE =================
  describe('createRole', () => {

    test('crea rol correctamente', async () => {
      const req = { body: { Nombre: 'Admin', Estado: 'Activo' } };
      const res = mockResponse();

      mockModel.createDataRole.mockResolvedValue();

      await createRole(req, res);

      expect(mockModel.createDataRole).toHaveBeenCalledWith({
        RoleId: 'mock-uuid-123',
        Nombre: 'Admin',
        Estado: 'Activo',
        IsSystem: false
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Rol creado correctamente',
        role: { RoleId: 'mock-uuid-123', Nombre: 'Admin', Estado: 'Activo' }
      });
    });

    test('crea rol con estado por defecto Activo', async () => {
      const req = { body: { Nombre: 'Admin' } };
      const res = mockResponse();

      mockModel.createDataRole.mockResolvedValue();

      await createRole(req, res);

      expect(mockModel.createDataRole).toHaveBeenCalledWith({
        RoleId: 'mock-uuid-123',
        Nombre: 'Admin',
        Estado: 'Activo',
        IsSystem: false
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('error si nombre vacío', async () => {
      const req = { body: { Nombre: '' } };
      const res = mockResponse();

      await createRole(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'El nombre del rol es obligatorio' });
    });

    test('error si nombre solo espacios', async () => {
      const req = { body: { Nombre: '   ' } };
      const res = mockResponse();

      await createRole(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'El nombre del rol es obligatorio' });
    });

    test('error duplicado', async () => {
      const req = { body: { Nombre: 'Admin' } };
      const res = mockResponse();

      mockModel.createDataRole.mockRejectedValue({ code: 'ER_DUP_ENTRY' });

      await createRole(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'El nombre del rol ya existe' });
    });

    test('error interno del servidor', async () => {
      const req = { body: { Nombre: 'Admin' } };
      const res = mockResponse();

      mockModel.createDataRole.mockRejectedValue(new Error('Error de BD'));

      await createRole(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Error al crear el rol', 
        error: 'Error de BD' 
      });
    });

  });

  // ================= GET ALL ROLES =================
  describe('getAllRoles', () => {

    test('retorna datos paginados correctamente', async () => {
      const req = { query: { page: 1, limit: 10 } };
      const res = mockResponse();

      const mockResult = {
        data: [{ id: 1, Nombre: 'Admin' }],
        totalItems: 1,
        currentPage: 1,
        itemsPerPage: 10
      };
      mockModel.getDataRolesPaginated.mockResolvedValue(mockResult);

      await getAllRoles(req, res);

      expect(mockModel.getDataRolesPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filtroCampo: null,
        filtroValor: null
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: mockResult.data,
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

      mockModel.getDataRolesPaginated.mockResolvedValue({
        data: [],
        totalItems: 0,
        currentPage: 1,
        itemsPerPage: 10
      });

      await getAllRoles(req, res);

      expect(mockModel.getDataRolesPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filtroCampo: null,
        filtroValor: null
      });
    });

    test('fallback cuando página vacía y page > 1', async () => {
      const req = { query: { page: 2, limit: 10 } };
      const res = mockResponse();

      mockModel.getDataRolesPaginated
        .mockResolvedValueOnce({ data: [], totalItems: 0, currentPage: 2, itemsPerPage: 10 })
        .mockResolvedValueOnce({
          data: [{ id: 1 }],
          totalItems: 1,
          currentPage: 1,
          itemsPerPage: 10
        });

      await getAllRoles(req, res);

      expect(mockModel.getDataRolesPaginated).toHaveBeenCalledTimes(2);
      expect(mockModel.getDataRolesPaginated).toHaveBeenLastCalledWith({
        page: 1,
        limit: 10,
        filtroCampo: null,
        filtroValor: null
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('maneja filtros correctamente', async () => {
      const req = { query: { page: 1, limit: 5, filtroCampo: 'nombre', filtroValor: 'Admin' } };
      const res = mockResponse();

      mockModel.getDataRolesPaginated.mockResolvedValue({
        data: [{ id: 1 }],
        totalItems: 1,
        currentPage: 1,
        itemsPerPage: 5
      });

      await getAllRoles(req, res);

      expect(mockModel.getDataRolesPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 5,
        filtroCampo: 'nombre',
        filtroValor: 'Admin'
      });
    });

    test('error interno del servidor', async () => {
      const req = { query: {} };
      const res = mockResponse();

      mockModel.getDataRolesPaginated.mockRejectedValue(new Error('Error de BD'));

      await getAllRoles(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Error al obtener los roles', 
        error: 'Error de BD' 
      });
    });

  });

  // ================= GET ROLE BY ID =================
  describe('getRoleById', () => {

    test('retorna rol cuando existe', async () => {
      const req = { params: { id: 1 } };
      const res = mockResponse();
      const mockRole = [{ id: 1, Nombre: 'Admin', Estado: 'Activo' }];

      mockModel.getDataRolesById.mockResolvedValue(mockRole);

      await getRoleById(req, res);

      expect(mockModel.getDataRolesById).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockRole[0]);
    });

    test('error 409 cuando rol no encontrado', async () => {
      const req = { params: { id: 999 } };
      const res = mockResponse();

      mockModel.getDataRolesById.mockResolvedValue([]);

      await getRoleById(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Rol no encontrado' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { id: 1 } };
      const res = mockResponse();

      mockModel.getDataRolesById.mockRejectedValue(new Error('Error de BD'));

      await getRoleById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Error al obtener el rol', 
        error: 'Error de BD' 
      });
    });

  });

  // ================= UPDATE ROLE =================
  describe('updateRole', () => {

    test('actualiza correctamente', async () => {
      const req = { params: { id: 1 }, body: { Nombre: 'Nuevo', Estado: 'Inactivo' } };
      const res = mockResponse();

      mockModel.updateDataRoles.mockResolvedValue({ affectedRows: 1 });

      await updateRole(req, res);

      expect(mockModel.updateDataRoles).toHaveBeenCalledWith({ 
        id: 1, 
        Nombre: 'Nuevo', 
        Estado: 'Inactivo' 
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Rol actualizado correctamente',
        role: { RoleId: 1, Nombre: 'Nuevo', Estado: 'Inactivo' }
      });
    });

    test('nombre vacío', async () => {
      const req = { params: { id: 1 }, body: { Nombre: '', Estado: 'Activo' } };
      const res = mockResponse();

      await updateRole(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'El nombre del rol no puede estar vacío' });
    });

    test('nombre solo espacios', async () => {
      const req = { params: { id: 1 }, body: { Nombre: '   ', Estado: 'Activo' } };
      const res = mockResponse();

      await updateRole(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('rol no encontrado', async () => {
      const req = { params: { id: 999 }, body: { Nombre: 'Test', Estado: 'Activo' } };
      const res = mockResponse();

      mockModel.updateDataRoles.mockResolvedValue({ affectedRows: 0 });

      await updateRole(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Rol no encontrado' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { id: 1 }, body: { Nombre: 'Test' } };
      const res = mockResponse();

      mockModel.updateDataRoles.mockRejectedValue(new Error('Error de BD'));

      await updateRole(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

  });

  // ================= DELETE ROLE =================
  describe('deleteRole', () => {

    test('elimina correctamente', async () => {
      const req = { params: { id: 1 } };
      const res = mockResponse();

      mockModel.systemRole.mockResolvedValue([{ IsSystem: false, Nombre: 'Usuario' }]);
      mockModel.rolesAsociados.mockResolvedValue([]);
      mockModel.deleteDataRole.mockResolvedValue();

      await deleteRole(req, res);

      expect(mockModel.systemRole).toHaveBeenCalledWith(1);
      expect(mockModel.rolesAsociados).toHaveBeenCalledWith(1);
      expect(mockModel.deleteDataRole).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Rol eliminado correctamente' });
    });

    test('rol no existe', async () => {
      const req = { params: { id: 999 } };
      const res = mockResponse();

      mockModel.systemRole.mockResolvedValue([]);

      await deleteRole(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'El rol no existe' });
    });

    test('rol de sistema no se puede eliminar', async () => {
      const req = { params: { id: 1 } };
      const res = mockResponse();

      mockModel.systemRole.mockResolvedValue([{ IsSystem: true, Nombre: 'Admin' }]);

      await deleteRole(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'El rol "Admin" es un rol del sistema y no puede eliminarse' 
      });
    });

    test('usuarios asociados no se puede eliminar', async () => {
      const req = { params: { id: 1 } };
      const res = mockResponse();

      mockModel.systemRole.mockResolvedValue([{ IsSystem: false, Nombre: 'Usuario' }]);
      mockModel.rolesAsociados.mockResolvedValue([{ userId: 1 }]);

      await deleteRole(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'No se puede eliminar el rol porque tiene usuarios asociados' 
      });
    });

    test('error interno del servidor', async () => {
      const req = { params: { id: 1 } };
      const res = mockResponse();

      mockModel.systemRole.mockRejectedValue(new Error('Error de BD'));

      await deleteRole(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Error interno al eliminar el rol' 
      });
    });

  });

  // ================= CHANGE STATE =================
  describe('changeState', () => {

    test('cambia estado correctamente', async () => {
      const req = { params: { id: 1 }, body: { estado: 'Inactivo' } };
      const res = mockResponse();

      mockModel.rolesAsociados.mockResolvedValue([]);
      mockModel.changeDataStatus.mockResolvedValue({ affectedRows: 1 });

      await changeState(req, res);

      expect(mockModel.rolesAsociados).toHaveBeenCalledWith(1);
      expect(mockModel.changeDataStatus).toHaveBeenCalledWith('Inactivo', 1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Estado actualizado correctamente' });
    });

    test('usuarios asociados no permite cambio', async () => {
      const req = { params: { id: 1 }, body: { estado: 'Inactivo' } };
      const res = mockResponse();

      mockModel.rolesAsociados.mockResolvedValue([{ userId: 1 }]);

      await changeState(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'No se puede cambiar el estado del rol porque tiene usuarios asociados' 
      });
    });

    test('rol no encontrado', async () => {
      const req = { params: { id: 999 }, body: { estado: 'Activo' } };
      const res = mockResponse();

      mockModel.rolesAsociados.mockResolvedValue([]);
      mockModel.changeDataStatus.mockResolvedValue({ affectedRows: 0 });

      await changeState(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Rol no encontrado' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { id: 1 }, body: { estado: 'Activo' } };
      const res = mockResponse();

      mockModel.rolesAsociados.mockRejectedValue(new Error('Error de BD'));

      await changeState(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

  });

  // ================= VALIDAR ROL =================
  describe('validarRol', () => {

    test('exists true cuando rol existe', async () => {
      const req = { query: { rol: 'Admin' } };
      const res = mockResponse();

      mockModel.validarDataRol.mockResolvedValue([{ id: 1 }]);

      await validarRol(req, res);

      expect(mockModel.validarDataRol).toHaveBeenCalledWith('Admin');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ exists: true });
    });

    test('exists false cuando rol no existe', async () => {
      const req = { query: { rol: 'Inexistente' } };
      const res = mockResponse();

      mockModel.validarDataRol.mockResolvedValue([]);

      await validarRol(req, res);

      expect(res.json).toHaveBeenCalledWith({ exists: false });
    });

    test('error interno del servidor', async () => {
      const req = { query: { rol: 'Admin' } };
      const res = mockResponse();

      mockModel.validarDataRol.mockRejectedValue(new Error('Error de BD'));

      await validarRol(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error al validar rol' });
    });

  });

  // ================= BUSCAR ROLES =================
  describe('buscarRoles', () => {

    test('campo inválido', async () => {
      const req = { query: { campo: 'campo_invalido', valor: 'Admin' } };
      const res = mockResponse();

      await buscarRoles(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Campo de búsqueda inválido' });
    });

    test('búsqueda por id', async () => {
      const req = { query: { campo: 'id', valor: '1', page: 1, limit: 10 } };
      const res = mockResponse();

      mockModel.buscarRolesPaginated.mockResolvedValue({
        data: [{ id: 1 }],
        totalItems: 1,
        currentPage: 1,
        itemsPerPage: 10
      });

      await buscarRoles(req, res);

      expect(mockModel.buscarRolesPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        columna: 'RoleId',
        valor: '1'
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('búsqueda por nombre', async () => {
      const req = { query: { campo: 'nombre', valor: 'Admin', page: 1, limit: 5 } };
      const res = mockResponse();

      mockModel.buscarRolesPaginated.mockResolvedValue({
        data: [{ id: 1 }],
        totalItems: 1,
        currentPage: 1,
        itemsPerPage: 5
      });

      await buscarRoles(req, res);

      expect(mockModel.buscarRolesPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 5,
        columna: 'Nombre',
        valor: 'Admin'
      });
    });

    test('búsqueda por estado', async () => {
      const req = { query: { campo: 'estado', valor: 'Activo' } };
      const res = mockResponse();

      mockModel.buscarRolesPaginated.mockResolvedValue({
        data: [],
        totalItems: 0,
        currentPage: 1,
        itemsPerPage: 10
      });

      await buscarRoles(req, res);

      expect(mockModel.buscarRolesPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        columna: 'Estado',
        valor: 'Activo'
      });
    });

    test('usa valores por defecto page y limit', async () => {
      const req = { query: { campo: 'nombre', valor: 'Admin' } };
      const res = mockResponse();

      mockModel.buscarRolesPaginated.mockResolvedValue({
        data: [],
        totalItems: 0,
        currentPage: 1,
        itemsPerPage: 10
      });

      await buscarRoles(req, res);

      expect(mockModel.buscarRolesPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        columna: 'Nombre',
        valor: 'Admin'
      });
    });

    test('error interno del servidor', async () => {
      const req = { query: { campo: 'nombre', valor: 'Admin' } };
      const res = mockResponse();

      mockModel.buscarRolesPaginated.mockRejectedValue(new Error('Error de BD'));

      await buscarRoles(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });

  });

  // ================= GET ALL PERMISSIONS =================
  describe('getAllPermissions', () => {

    test('retorna lista de permisos', async () => {
      const req = {};
      const res = mockResponse();
      const mockPermisos = [{ PermisoId: 1, Nombre: 'crear' }, { PermisoId: 2, Nombre: 'editar' }];

      mockModel.getdataPermisos.mockResolvedValue(mockPermisos);

      await getAllPermissions(req, res);

      expect(mockModel.getdataPermisos).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockPermisos);
    });

    test('error interno del servidor', async () => {
      const req = {};
      const res = mockResponse();

      mockModel.getdataPermisos.mockRejectedValue(new Error('Error de BD'));

      await getAllPermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Error al obtener permisos', 
        error: 'Error de BD' 
      });
    });

  });

  // ================= GET ROLE PERMISSIONS =================
  describe('getRolePermissions', () => {

    test('retorna permisos del rol', async () => {
      const req = { params: { id: 1 } };
      const res = mockResponse();
      const mockPermisos = [{ PermisoId: 1, Nombre: 'crear' }];

      mockModel.getDataRolePermissions.mockResolvedValue(mockPermisos);

      await getRolePermissions(req, res);

      expect(mockModel.getDataRolePermissions).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockPermisos);
    });

    test('error interno del servidor', async () => {
      const req = { params: { id: 1 } };
      const res = mockResponse();

      mockModel.getDataRolePermissions.mockRejectedValue(new Error('Error de BD'));

      await getRolePermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Error al obtener permisos del rol', 
        error: 'Error de BD' 
      });
    });

  });

  // ================= UPDATE ROLE PERMISSIONS =================
  describe('updateRolePermissions', () => {

    test('actualiza permisos correctamente', async () => {
      const req = { params: { id: 1 }, body: { permisos: [1, 2, 3] } };
      const res = mockResponse();

      mockModel.getDataRolesById.mockResolvedValue([{ RoleId: 1, Nombre: 'Admin' }]);
      mockModel.deletePermissos.mockResolvedValue();
      mockModel.existenPermisos.mockResolvedValue([{ PermisoId: 1 }, { PermisoId: 2 }, { PermisoId: 3 }]);
      mockModel.actualizarPermisos.mockResolvedValue();

      await updateRolePermissions(req, res);

      expect(mockModel.getDataRolesById).toHaveBeenCalledWith(1);
      expect(mockModel.deletePermissos).toHaveBeenCalledWith(1);
      expect(mockModel.existenPermisos).toHaveBeenCalled();
      expect(mockModel.actualizarPermisos).toHaveBeenCalledTimes(3);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Permisos actualizados correctamente',
        totalPermisos: 3,
        roleId: 1,
        roleName: 'Admin'
      });
    });

    test('error si permisos no es array', async () => {
      const req = { params: { id: 1 }, body: { permisos: 'no-array' } };
      const res = mockResponse();

      await updateRolePermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Formato de permisos inválido. Se esperaba un array.' 
      });
    });

    test('rol no encontrado', async () => {
      const req = { params: { id: 999 }, body: { permisos: [1, 2] } };
      const res = mockResponse();

      mockModel.getDataRolesById.mockResolvedValue([]);

      await updateRolePermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Rol no encontrado' });
    });

    test('actualiza con array vacío (elimina todos)', async () => {
      const req = { params: { id: 1 }, body: { permisos: [] } };
      const res = mockResponse();

      mockModel.getDataRolesById.mockResolvedValue([{ RoleId: 1, Nombre: 'Admin' }]);
      mockModel.deletePermissos.mockResolvedValue();

      await updateRolePermissions(req, res);

      expect(mockModel.deletePermissos).toHaveBeenCalledWith(1);
      expect(mockModel.existenPermisos).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Permisos actualizados correctamente (sin permisos)',
        totalPermisos: 0
      });
    });

    test('error cuando hay permisos inexistentes', async () => {
      const req = { params: { id: 1 }, body: { permisos: [1, 2, 999] } };
      const res = mockResponse();

      mockModel.getDataRolesById.mockResolvedValue([{ RoleId: 1, Nombre: 'Admin' }]);
      mockModel.deletePermissos.mockResolvedValue();
      mockModel.existenPermisos.mockResolvedValue([{ PermisoId: 1 }, { PermisoId: 2 }]);

      await updateRolePermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Algunos permisos no existen en la base de datos',
        permisosInexistentes: [999]
      });
    });

    test('error ER_NO_REFERENCED_ROW_2 en actualización', async () => {
      const req = { params: { id: 1 }, body: { permisos: [1, 2] } };
      const res = mockResponse();

      mockModel.getDataRolesById.mockResolvedValue([{ RoleId: 1, Nombre: 'Admin' }]);
      mockModel.deletePermissos.mockResolvedValue();
      mockModel.existenPermisos.mockResolvedValue([{ PermisoId: 1 }, { PermisoId: 2 }]);
      mockModel.actualizarPermisos.mockRejectedValue({ code: 'ER_NO_REFERENCED_ROW_2', sqlMessage: 'Foreign key fails' });

      await updateRolePermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error de integridad referencial. El rol o algunos permisos no existen.',
        error: 'Foreign key fails'
      });
    });

    test('error interno del servidor genérico', async () => {
      const req = { params: { id: 1 }, body: { permisos: [1, 2] } };
      const res = mockResponse();

      mockModel.getDataRolesById.mockRejectedValue(new Error('Error de BD'));

      await updateRolePermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error interno del servidor al actualizar permisos',
        error: 'Error de BD',
        code: undefined,
        suggestion: 'Verifique que el rol exista y que los IDs de permisos sean válidos'
      });
    });

  });

  // ================= GET USER PERMISSIONS =================
  describe('getUserPermissions', () => {

    test('retorna permisos del usuario', async () => {
      const req = { params: { userId: 1 } };
      const res = mockResponse();
      const mockUser = [{ RoleId: 'role-123' }];
      const mockPermisos = [{ PermisoId: 1, Nombre: 'crear' }];

      mockModel.getDataRolUser.mockResolvedValue(mockUser);
      mockModel.getDataPermissonRol.mockResolvedValue(mockPermisos);

      await getUserPermissions(req, res);

      expect(mockModel.getDataRolUser).toHaveBeenCalledWith(1);
      expect(mockModel.getDataPermissonRol).toHaveBeenCalledWith('role-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockPermisos);
    });

    test('usuario no encontrado', async () => {
      const req = { params: { userId: 999 } };
      const res = mockResponse();

      mockModel.getDataRolUser.mockResolvedValue([]);

      await getUserPermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Usuario no encontrado' });
    });

    test('error interno del servidor', async () => {
      const req = { params: { userId: 1 } };
      const res = mockResponse();

      mockModel.getDataRolUser.mockRejectedValue(new Error('Error de BD'));

      await getUserPermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Error al obtener permisos', 
        error: 'Error de BD' 
      });
    });

  });

});