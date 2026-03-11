import { v4 as uuidv4 } from 'uuid';
import { createDataRole, getDataRolesPaginated, buscarRolesPaginated , getDataRolesById, updateDataRoles, rolesAsociados, deleteDataRole, changeDataStatus, validarDataRol, buscarRolesModel, getdataPermisos, getDataRolePermissions, existenPermisos, deletePermissos, actualizarPermisos, getDataRolUser, getDataPermissonRol, systemRole } from '../models/role.model.js';

// Crear rol
export const createRole = async (req, res) => {
  try {
    const { Nombre, Estado = 'Activo' } = req.body;

    // Validación de campos vacíos
    if (!Nombre || Nombre.trim() === '') {
      return res.status(400).json({ message: 'El nombre del rol es obligatorio' });
    }

    const RoleId = uuidv4(); // Genera UUID manualmente

    await createDataRole({
      RoleId,
      Nombre,
      Estado,
      IsSystem: false
    });


    res.status(201).json({
      message: 'Rol creado correctamente',
      role: { RoleId, Nombre, Estado }
    });
  } catch (error) {
    console.error('Error al crear el rol:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'El nombre del rol ya existe' });
    }

    res.status(500).json({ message: 'Error al crear el rol', error: error.message });
  }
};

// Listar todos los roles
export const getAllRoles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filtroCampo = req.query.filtroCampo || null;
    const filtroValor = req.query.filtroValor || null;

    const result = await getDataRolesPaginated({ page, limit, filtroCampo, filtroValor });

    if (result.data.length === 0 && page > 1) {
      // Si no hay datos y la página > 1, devolver página 1 con los mismos metadatos
      const fallback = await getDataRolesPaginated({ page: 1, limit, filtroCampo, filtroValor });
      return res.status(200).json({
        data: fallback.data,
        pagination: {
          totalItems: fallback.totalItems,
          totalPages: Math.ceil(fallback.totalItems / limit),
          currentPage: 1,
          itemsPerPage: limit
        }
      });
    }

    res.status(200).json({
      data: result.data,
      pagination: {
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / limit),
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage
      }
    });
  } catch (error) {
    console.error('Error al obtener roles con paginación:', error);
    res.status(500).json({ message: 'Error al obtener los roles', error: error.message });
  }
};

// Obtener rol por ID
export const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const roles = await getDataRolesById(id);

    if (roles.length === 0) {
      return res.status(409).json({ message: 'Rol no encontrado' });
    }
    res.status(200).json(roles[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el rol', error: error.message });
  }
};

// Actualizar rol
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { Nombre, Estado } = req.body;

    if (!Nombre || Nombre.trim() === '') {
      return res.status(400).json({ message: 'El nombre del rol no puede estar vacío' });
    }

    const result = await updateDataRoles({ id, Nombre, Estado })

    if (result.affectedRows === 0) return res.status(409).json({ message: 'Rol no encontrado' });

    res.status(200).json({
      message: 'Rol actualizado correctamente',
      role: { RoleId: id, Nombre, Estado }
    });
  } catch (error) {
    console.error('Error actualizando rol:', error);
    res.status(500).json({ message: 'Error al actualizar el rol', error: error.message });
  }
};

// Eliminar rol
export const deleteRole = async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si es rol del sistema
    const roles = await systemRole(id)

    if (roles.length === 0) {
      return res.status(404).json({
        message: 'El rol no existe'
      });
    }

    if (roles[0].IsSystem) {
      return res.status(403).json({
        message: `El rol "${roles[0].Nombre}" es un rol del sistema y no puede eliminarse`
      });
    }

    // 2. Verificar usuarios asociados
    const users = await rolesAsociados(id);
    if (users.length > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar el rol porque tiene usuarios asociados'
      });
    }

    // 3. Eliminar
    await deleteDataRole(id);
    return res.status(200).json({
      message: 'Rol eliminado correctamente'
    });

  } catch (error) {
    console.error('Error al eliminar rol:', error);
    return res.status(500).json({
      message: 'Error interno al eliminar el rol'
    });
  }
};


// Cambiar estado de un rol
export const changeState = async (req, res) => {
  const { estado } = req.body;
  const { id } = req.params;

  try {
    // Verifica si hay usuarios asociados a este rol
    const users = await rolesAsociados(id);

    if (users.length > 0) {
      return res.status(400).json({
        message: 'No se puede cambiar el estado del rol porque tiene usuarios asociados'
      });
    }

    // Si no hay usuarios, actualiza el estado
    const result = await changeDataStatus(estado, id);     

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }

    res.status(200).json({ message: 'Estado actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar estado del rol:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};

// Validar si el rol ya existe
export const validarRol = async (req, res) => {
  const { rol } = req.query;

  try {
    const roles = await validarDataRol(rol);

    res.status(200).json({ exists: roles.length > 0 });
  } catch (error) {
    console.error('Error en /validar-rol:', error);
    res.status(500).json({ message: 'Error al validar rol' });
  }
};

// Buscar roles
export const buscarRoles = async (req, res) => {
  const { campo, valor, page = 1, limit = 10 } = req.query;

  const columnasPermitidas = {
    id: 'RoleId',
    nombre: 'Nombre',
    estado: 'Estado',
  };

  const columna = columnasPermitidas[campo];

  if (!columna) {
    return res.status(400).json({ message: 'Campo de búsqueda inválido' });
  }

  try {
    const result = await buscarRolesPaginated({ 
      page: parseInt(page), 
      limit: parseInt(limit), 
      columna, 
      valor 
    });

    res.status(200).json({
      data: result.data,
      pagination: {
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / parseInt(limit)),
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage
      }
    });
  } catch (error) {
    console.error('Error al buscar roles con paginación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ========== NUEVAS FUNCIONES PARA PERMISOS ==========

// Obtener todos los permisos disponibles
export const getAllPermissions = async (req, res) => {
  try {
   const permisos = await getdataPermisos();
    res.status(200).json(permisos);
  } catch (error) {
    console.error('Error al obtener permisos:', error);
    res.status(500).json({ message: 'Error al obtener permisos', error: error.message });
  }
};

// Obtener permisos de un rol específico
export const getRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const permisos = await getDataRolePermissions(id);

    res.status(200).json(permisos);
  } catch (error) {
    console.error('Error al obtener permisos del rol:', error);
    res.status(500).json({ message: 'Error al obtener permisos del rol', error: error.message });
  }
};

// Actualizar permisos de un rol 
export const updateRolePermissions = async (req, res) => {
  const { id } = req.params;
  const { permisos } = req.body;

  console.log('Actualizando permisos para rol:', {
    roleId: id,
    permisosCount: permisos?.length || 0,
    permisos: permisos
  });

  if (!Array.isArray(permisos)) {
    return res.status(400).json({ message: 'Formato de permisos inválido. Se esperaba un array.' });
  }

  try {
    const roles = await getDataRolesById(id);

    if (roles.length === 0) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }

    // 2. Eliminar permisos actuales
    console.log('Eliminando permisos antiguos para rol:', id);
    await deletePermissos(id);

    // 3. Si no hay nuevos permisos, terminar aquí
    if (permisos.length === 0) {
      return res.status(200).json({
        message: 'Permisos actualizados correctamente (sin permisos)',
        totalPermisos: 0
      });
    }

    // 4. Verificar que los permisos existen
    console.log('Verificando que los permisos existen...');
    const placeholders = permisos.map(() => '?').join(',');

    const existentes = await existenPermisos({placeholders, permisos});

    const permisosExistentes = existentes.map(p => p.PermisoId);
    const permisosInexistentes = permisos.filter(p => !permisosExistentes.includes(p));

    if (permisosInexistentes.length > 0) {
      console.log('Permisos no encontrados:', permisosInexistentes);
      return res.status(400).json({
        message: 'Algunos permisos no existen en la base de datos',
        permisosInexistentes: permisosInexistentes
      });
    }

    // 5. Insertar nuevos permisos (uno por uno para mejor control)
    console.log(`Insertando ${permisos.length} permisos...`);
    for (let i = 0; i < permisos.length; i++) {
      const permisoId = permisos[i];
      try {
        await actualizarPermisos(id, permisoId);

        console.log(`Permiso ${i + 1}/${permisos.length} insertado:`, permisoId);
      } catch (insertError) {
        // Si hay error de duplicado (no debería pasar porque borramos primero), continuar
        if (insertError.code === 'ER_DUP_ENTRY') {
          console.warn(`Permiso duplicado (ignorado): ${permisoId}`);
          continue;
        }
        throw insertError;
      }
    }

    console.log('Permisos actualizados exitosamente');
    res.status(200).json({
      message: 'Permisos actualizados correctamente',
      totalPermisos: permisos.length,
      roleId: id,
      roleName: roles[0].Nombre
    });
  } catch (error) {
    console.error('Error CRÍTICO al actualizar permisos:', {
      error: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });

    // Errores específicos
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Error de duplicación. Algunos permisos ya estaban asignados.',
        error: error.sqlMessage
      });
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        message: 'Error de integridad referencial. El rol o algunos permisos no existen.',
        error: error.sqlMessage
      });
    }

    // Error genérico
    res.status(500).json({
      message: 'Error interno del servidor al actualizar permisos',
      error: error.message,
      code: error.code,
      suggestion: 'Verifique que el rol exista y que los IDs de permisos sean válidos'
    });
  }
};

// Obtener permisos por usuario (para login)
export const getUserPermissions = async (req, res) => {
  const { userId } = req.params;

  try {

    // Obtener rol del usuario
    const users = await getDataRolUser(userId);

    if (users.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const { RoleId } = users[0];

    // Obtener permisos del rol
    const permisos = await getDataPermissonRol(roleId);

    res.status(200).json(permisos);
  } catch (error) {
    console.error('Error al obtener permisos del usuario:', error);
    res.status(500).json({ message: 'Error al obtener permisos', error: error.message });
  }
};