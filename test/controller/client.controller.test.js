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

jest.unstable_mockModule('dayjs', () => ({
  default: jest.fn(() => ({
    add: jest.fn(() => ({
      toDate: jest.fn(() => new Date())
    }))
  }))
}));

jest.unstable_mockModule('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'mock_reset_token')
  }))
}));

jest.unstable_mockModule('../../utils/email.js', () => ({
  sendResetPasswordEmail: jest.fn().mockResolvedValue(true)
}));

const mockUserModel = {
  correoExiste: jest.fn(),
  validarDataCedula: jest.fn(),
  telefonoDataExistente: jest.fn(),
  createByAdmin: jest.fn(),
  getClientesPaginated: jest.fn(),
  getClientById: jest.fn(),
  traerDatosActuales: jest.fn(),
  updateDataUser: jest.fn(),
  obtenerUsuarioActualizado: jest.fn(),
  getUserSystem: jest.fn(),
  pedidosUsuarios: jest.fn(),
  deleteDataUser: jest.fn(),
};

jest.unstable_mockModule('../../models/user.model.js', () => mockUserModel);

const mockRoleModel = {
  getRoleIdByName: jest.fn()
};

jest.unstable_mockModule('../../models/role.model.js', () => mockRoleModel);

// ===== IMPORT =====
const {
  createClient,
  getAllClients,
  getClienteById,
  updateCliente,
  deleteCliente,
  searchClientesForPedidos,
  buscarClientes
} = await import('../../controllers/clientes.controller.js');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('CLIENTES CONTROLLER', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= CREATE CLIENT =================
  describe('createClient', () => {
    test('crea cliente con contraseña', async () => {
      const req = { body: { CedulaId: '123', CorreoElectronico: 'test@test.com', Contrasena: '123' } };
      const res = mockResponse();
      
      mockUserModel.correoExiste.mockResolvedValue(false);
      mockUserModel.validarDataCedula.mockResolvedValue([]);
      mockUserModel.telefonoDataExistente.mockResolvedValue([]);
      mockRoleModel.getRoleIdByName.mockResolvedValue([{ id: 2 }]);
      
      await createClient(req, res);
      
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('crea cliente sin contraseña (admin)', async () => {
      const req = { body: { CedulaId: '123', CorreoElectronico: 'test@test.com' } };
      const res = mockResponse();
      
      mockUserModel.correoExiste.mockResolvedValue(false);
      mockUserModel.validarDataCedula.mockResolvedValue([]);
      mockUserModel.telefonoDataExistente.mockResolvedValue([]);
      mockRoleModel.getRoleIdByName.mockResolvedValue([{ id: 2 }]);
      mockUserModel.createByAdmin.mockResolvedValue();
      
      await createClient(req, res);
      
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('error correo ya existe', async () => {
      const req = { body: { CorreoElectronico: 'existe@test.com' } };
      const res = mockResponse();
      
      mockUserModel.correoExiste.mockResolvedValue(true);
      
      await createClient(req, res);
      
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Usuario ya existe' });
    });

    test('error cédula ya existe', async () => {
      const req = { body: { CedulaId: '123', CorreoElectronico: 'test@test.com' } };
      const res = mockResponse();
      
      mockUserModel.correoExiste.mockResolvedValue(false);
      mockUserModel.validarDataCedula.mockResolvedValue([{ CedulaId: '123' }]);
      
      await createClient(req, res);
      
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Esta cédula ya está registrada' });
    });

    test('error teléfono ya existe', async () => {
      const req = { body: { CedulaId: '123', CorreoElectronico: 'test@test.com', Telefono: '123456789' } };
      const res = mockResponse();
      
      mockUserModel.correoExiste.mockResolvedValue(false);
      mockUserModel.validarDataCedula.mockResolvedValue([]);
      mockUserModel.telefonoDataExistente.mockResolvedValue([{ Telefono: '123456789' }]);
      
      await createClient(req, res);
      
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Este teléfono ya está registrado' });
    });

    test('error rol cliente no existe', async () => {
      const req = { body: { CedulaId: '123', CorreoElectronico: 'test@test.com' } };
      const res = mockResponse();
      
      mockUserModel.correoExiste.mockResolvedValue(false);
      mockUserModel.validarDataCedula.mockResolvedValue([]);
      mockUserModel.telefonoDataExistente.mockResolvedValue([]);
      mockRoleModel.getRoleIdByName.mockResolvedValue([]);
      
      await createClient(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('error interno servidor', async () => {
      const req = { body: { CorreoElectronico: 'test@test.com' } };
      const res = mockResponse();
      
      mockUserModel.correoExiste.mockRejectedValue(new Error('DB Error'));
      
      await createClient(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ================= GET ALL CLIENTS =================
  describe('getAllClients', () => {
    test('retorna lista paginada', async () => {
      const req = { query: { page: 1, limit: 10 } };
      const res = mockResponse();
      
      mockUserModel.getClientesPaginated.mockResolvedValue({
        data: [{ id: 1, nombre: 'Juan' }],
        totalItems: 1,
        currentPage: 1,
        itemsPerPage: 10
      });
      
      await getAllClients(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('usa valores por defecto', async () => {
      const req = { query: {} };
      const res = mockResponse();
      
      mockUserModel.getClientesPaginated.mockResolvedValue({
        data: [],
        totalItems: 0,
        currentPage: 1,
        itemsPerPage: 10
      });
      
      await getAllClients(req, res);
      
      expect(mockUserModel.getClientesPaginated).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 10 }));
    });

    test('fallback cuando página vacía', async () => {
      const req = { query: { page: 2, limit: 10 } };
      const res = mockResponse();
      
      mockUserModel.getClientesPaginated
        .mockResolvedValueOnce({ data: [], totalItems: 5, currentPage: 2, itemsPerPage: 10 })
        .mockResolvedValueOnce({ data: [{ id: 1 }], totalItems: 5, currentPage: 1, itemsPerPage: 10 });
      
      await getAllClients(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('error retorna fallback', async () => {
      const req = { query: { limit: 10 } };
      const res = mockResponse();
      
      mockUserModel.getClientesPaginated.mockRejectedValue(new Error('DB Error'));
      
      await getAllClients(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [] }));
    });
  });

  // ================= GET CLIENT BY ID =================
  describe('getClienteById', () => {
    test('retorna cliente cuando existe', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      mockRoleModel.getRoleIdByName.mockResolvedValue([{ id: 2 }]);
      mockUserModel.getClientById.mockResolvedValue({ CedulaId: '123', NombreCompleto: 'Juan' });
      
      await getClienteById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('error rol cliente no existe', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      mockRoleModel.getRoleIdByName.mockResolvedValue([]);
      
      await getClienteById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('error cliente no encontrado', async () => {
      const req = { params: { id: '999' } };
      const res = mockResponse();
      
      mockRoleModel.getRoleIdByName.mockResolvedValue([{ id: 2 }]);
      mockUserModel.getClientById.mockResolvedValue(null);
      
      await getClienteById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('error interno servidor', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      mockRoleModel.getRoleIdByName.mockRejectedValue(new Error('DB Error'));
      
      await getClienteById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ================= UPDATE CLIENT =================
  describe('updateCliente', () => {
    test('actualiza cliente correctamente', async () => {
      const req = { params: { id: '123' }, body: { NombreCompleto: 'Juan Actualizado' } };
      const res = mockResponse();
      
      mockRoleModel.getRoleIdByName.mockResolvedValue([{ id: 2 }]);
      mockUserModel.traerDatosActuales.mockResolvedValue([{ RoleId: 2, NombreCompleto: 'Juan Original' }]);
      mockUserModel.updateDataUser.mockResolvedValue();
      mockUserModel.obtenerUsuarioActualizado.mockResolvedValue([{ CedulaId: '123', NombreCompleto: 'Juan Actualizado' }]);
      
      await updateCliente(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('error rol cliente no existe', async () => {
      const req = { params: { id: '123' }, body: {} };
      const res = mockResponse();
      
      mockRoleModel.getRoleIdByName.mockResolvedValue([]);
      
      await updateCliente(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('error usuario no encontrado', async () => {
      const req = { params: { id: '123' }, body: {} };
      const res = mockResponse();
      
      mockRoleModel.getRoleIdByName.mockResolvedValue([{ id: 2 }]);
      mockUserModel.traerDatosActuales.mockResolvedValue([]);
      
      await updateCliente(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('error usuario no es cliente', async () => {
      const req = { params: { id: '123' }, body: {} };
      const res = mockResponse();
      
      mockRoleModel.getRoleIdByName.mockResolvedValue([{ id: 2 }]);
      mockUserModel.traerDatosActuales.mockResolvedValue([{ RoleId: 1 }]);
      
      await updateCliente(req, res);
      
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ================= DELETE CLIENT =================
  describe('deleteCliente', () => {
    test('elimina cliente correctamente', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      mockRoleModel.getRoleIdByName.mockResolvedValue([{ id: 2 }]);
      mockUserModel.getUserSystem.mockResolvedValue([{ RoleId: 2 }]);
      mockUserModel.pedidosUsuarios.mockResolvedValue([]);
      mockUserModel.deleteDataUser.mockResolvedValue();
      
      await deleteCliente(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('error rol cliente no existe', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      mockRoleModel.getRoleIdByName.mockResolvedValue([]);
      
      await deleteCliente(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('error cliente no encontrado', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      mockRoleModel.getRoleIdByName.mockResolvedValue([{ id: 2 }]);
      mockUserModel.getUserSystem.mockResolvedValue([]);
      
      await deleteCliente(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('error usuario no es cliente', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      mockRoleModel.getRoleIdByName.mockResolvedValue([{ id: 2 }]);
      mockUserModel.getUserSystem.mockResolvedValue([{ RoleId: 1 }]);
      
      await deleteCliente(req, res);
      
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('error tiene pedidos asociados', async () => {
      const req = { params: { id: '123' } };
      const res = mockResponse();
      
      mockRoleModel.getRoleIdByName.mockResolvedValue([{ id: 2 }]);
      mockUserModel.getUserSystem.mockResolvedValue([{ RoleId: 2 }]);
      mockUserModel.pedidosUsuarios.mockResolvedValue([{ id: 1 }]);
      
      await deleteCliente(req, res);
      
      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  // ================= SEARCH CLIENTES FOR PEDIDOS =================
  describe('searchClientesForPedidos', () => {
    test('busca sin filtro', async () => {
      const req = { query: { page: 1, limit: 5 } };
      const res = mockResponse();
      
      mockDbPool.query
        .mockResolvedValueOnce([[{ CedulaId: '123', NombreCompleto: 'Juan' }]])
        .mockResolvedValueOnce([[{ total: 1 }]]);
      
      await searchClientesForPedidos(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('busca con filtro', async () => {
      const req = { query: { search: 'Juan', page: 1, limit: 5 } };
      const res = mockResponse();
      
      mockDbPool.query
        .mockResolvedValueOnce([[{ CedulaId: '123', NombreCompleto: 'Juan' }]])
        .mockResolvedValueOnce([[{ total: 1 }]]);
      
      await searchClientesForPedidos(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('error interno', async () => {
      const req = { query: {} };
      const res = mockResponse();
      
      mockDbPool.query.mockRejectedValue(new Error('DB Error'));
      
      await searchClientesForPedidos(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ================= BUSCAR CLIENTES =================
  describe('buscarClientes', () => {
    test('campo inválido', async () => {
      const req = { query: { campo: 'invalido', valor: 'Juan' } };
      const res = mockResponse();
      
      await buscarClientes(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('búsqueda por cédula', async () => {
      const req = { query: { campo: 'cedula', valor: '123', page: 1, limit: 10 } };
      const res = mockResponse();
      
      mockUserModel.getClientesPaginated.mockResolvedValue({
        data: [{ CedulaId: '123' }],
        totalItems: 1,
        currentPage: 1,
        itemsPerPage: 10
      });
      
      await buscarClientes(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('búsqueda por nombre', async () => {
      const req = { query: { campo: 'nombre', valor: 'Juan', page: 1, limit: 10 } };
      const res = mockResponse();
      
      mockUserModel.getClientesPaginated.mockResolvedValue({
        data: [{ NombreCompleto: 'Juan' }],
        totalItems: 1,
        currentPage: 1,
        itemsPerPage: 10
      });
      
      await buscarClientes(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('búsqueda por correo', async () => {
      const req = { query: { campo: 'correo', valor: 'juan@test.com', page: 1, limit: 10 } };
      const res = mockResponse();
      
      mockUserModel.getClientesPaginated.mockResolvedValue({
        data: [{ CorreoElectronico: 'juan@test.com' }],
        totalItems: 1,
        currentPage: 1,
        itemsPerPage: 10
      });
      
      await buscarClientes(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('error retorna fallback', async () => {
      const req = { query: { campo: 'nombre', valor: 'Juan', limit: 10 } };
      const res = mockResponse();
      
      mockUserModel.getClientesPaginated.mockRejectedValue(new Error('DB Error'));
      
      await buscarClientes(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [] }));
    });
  });
});