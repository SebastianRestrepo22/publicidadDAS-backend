import { v4 as uuidv4 } from 'uuid';
import { createDataRole, getDataRolesPaginated, buscarRolesPaginated, getDataRolesById, updateDataRoles, rolesAsociados, deleteDataRole, changeDataStatus, validarDataRol, buscarRolesModel, getdataPermisos, getDataRolePermissions, existenPermisos, deletePermissos, actualizarPermisos, getDataRolUser, getDataPermissonRol, systemRole } from '../models/role.model.js';

// Crear rol
//1. incicio
export const createRole = async (req, res) => {
  try {
    // 2 obtener los datos del body
    const { Nombre, Estado = 'Activo' } = req.body;

    // 3 Validación de campos vacíos
    if (!Nombre || Nombre.trim() === '') {
      //4 error de nombre obligatorio
      return res.status(400).json({ message: 'El nombre del rol es obligatorio' });
    }

    // 5 generar el uuid
    const RoleId = uuidv4();

    // 6 Insertar rol en la BD
    await createDataRole({
      RoleId,
      Nombre,
      Estado,
      IsSystem: false
    });

    // 7 respuesta exitosa
    res.status(201).json({
      message: 'Rol creado correctamente',
      role: { RoleId, Nombre, Estado }
    });

    //8. catch error
  } catch (error) {
    console.error('Error al crear el rol:', error);

    // 9. Error de duplicación
    if (error.code === 'ER_DUP_ENTRY') {
      //10 error 409
      return res.status(409).json({ message: 'El nombre del rol ya existe' });
    }

    // 11. Error interno en el servidor
    res.status(500).json({ message: 'Error al crear el rol', error: error.message });

    // F fin
  }
};

// Listar todos los roles
//1. Inicio
export const getAllRoles = async (req, res) => {
  try {
    // 2. Obtener query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filtroCampo = req.query.filtroCampo || null;
    const filtroValor = req.query.filtroValor || null;

    //3. Llamar getDataRolesPaginated
    const result = await getDataRolesPaginated({ page, limit, filtroCampo, filtroValor });

    //4 ¿result.data.length === 0 && page > 1?
    if (result.data.length === 0 && page > 1) {
      // Si no hay datos y la página > 1, devolver página 1 con los mismos metadatos
      // 5 Ejecutar fallback (page 1)
      const fallback = await getDataRolesPaginated({ page: 1, limit, filtroCampo, filtroValor });
      // 6 Respuesta 200 fallback
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

    //7 Respuesta 200 normal
    res.status(200).json({
      data: result.data,
      pagination: {
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / limit),
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage
      }
    });

    //8 Catch error
  } catch (error) {
    console.error('Error al obtener roles con paginación:', error);
    //9 Respuesta 500
    res.status(500).json({ message: 'Error al obtener los roles', error: error.message });
  }
  //F Fin
};

// Obtener rol por ID
// 1 Inicio
export const getRoleById = async (req, res) => {
  try {
    // 2 Obtener id del request
    const { id } = req.params;
    // 3 Consultar rol en la BD
    const roles = await getDataRolesById(id);
    //4 ¿roles.length === 0?
    if (roles.length === 0) {
      // 5 Error 409 rol no encontrado
      return res.status(409).json({ message: 'Rol no encontrado' });
    }
    //6 Respuesta 200 con rol
    res.status(200).json(roles[0]);
    //7 Catch error
  } catch (error) {
    //8 Respuesta 500
    res.status(500).json({ message: 'Error al obtener el rol', error: error.message });
    //F Fin
  }
};

// Actualizar rol
// 1 Inicio
export const updateRole = async (req, res) => {
  try {
    //2 Obtener id del params
    const { id } = req.params;
    //3 Obtener datos del body
    const { Nombre, Estado } = req.body;
    //4 ¿Nombre vacío?
    if (!Nombre || Nombre.trim() === '') {
      //5 Error 400 nombre vacío
      return res.status(400).json({ message: 'El nombre del rol no puede estar vacío' });
    }
    //6 Actualizar rol en BD
    const result = await updateDataRoles({ id, Nombre, Estado })
    //7 ¿affectedRows === 0?
    if (result.affectedRows === 0)
      //8 Error 409 rol no encontrado
      return res.status(409).json({
        message: 'Rol no encontrado'
      });
    //9 Respuesta 200 rol actualizado
    res.status(200).json({
      message: 'Rol actualizado correctamente',
      role: { RoleId: id, Nombre, Estado }
    });
    //10 Catch error
  } catch (error) {
    console.error('Error actualizando rol:', error);
    //11 Error 500
    res.status(500).json({ message: 'Error al actualizar el rol', error: error.message });
  }
  //F Fin
};

// Eliminar rol
//1 Inicio
export const deleteRole = async (req, res) => {
  //2 Obtener id del request
  const { id } = req.params;
  try {
    // Verificar si es rol del sistema
    //3 Consultar rol en BD (systemRole)
    const roles = await systemRole(id)
    //4 ¿roles.length === 0?
    if (roles.length === 0) {
      //5 Error 404 rol no existe
      return res.status(404).json({
        message: 'El rol no existe'
      });
    }
    //6 ¿roles[0].IsSystem?
    if (roles[0].IsSystem) {
      //7 Error 403 rol del sistema
      return res.status(403).json({
        message: `El rol "${roles[0].Nombre}" es un rol del sistema y no puede eliminarse`
      });
    }
    // 8 Consultar usuarios asociados
    const users = await rolesAsociados(id);
    //9 ¿users.length > 0?
    if (users.length > 0) {
      //10 Error 400 usuarios asociados
      return res.status(400).json({
        message: 'No se puede eliminar el rol porque tiene usuarios asociados'
      });
    }
    // 11 Eliminar rol
    await deleteDataRole(id);
    //12 Respuesta 200 rol eliminado
    return res.status(200).json({
      message: 'Rol eliminado correctamente'
    });
    //13 Catch error
  } catch (error) {
    console.error('Error al eliminar rol:', error);
    //14 Error 500
    return res.status(500).json({
      message: 'Error interno al eliminar el rol'
    });
    //F Fin
  }
};

// Cambiar estado de un rol
// 1 Inicio
export const changeState = async (req, res) => {
  //2 Obtener estado del body
  const { estado } = req.body;
  //3 Obtener id del params
  const { id } = req.params;
  try {
    // Verifica si hay usuarios asociados a este rol
    //4 Consultar usuarios asociados
    const users = await rolesAsociados(id);
    //5 ¿users.length > 0?
    if (users.length > 0) {
      return res.status(400).json({
        //6 Error 400 usuarios asociados
        message: 'No se puede cambiar el estado del rol porque tiene usuarios asociados'
      });
    }
    // Si no hay usuarios, actualiza el estado
    //7 Actualizar estado en BD
    const result = await changeDataStatus(estado, id);
    //8 ¿affectedRows === 0?
    if (result.affectedRows === 0) {
      //9 Error 404 rol no encontrado
      return res.status(404).json({ message: 'Rol no encontrado' });
    }
    //10 Respuesta 200 estado actualizado
    res.status(200).json({ message: 'Estado actualizado correctamente' });
    //11 Catch error
  } catch (error) {
    console.error('Error al actualizar estado del rol:', error);
    //12 Error 500
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
    //F Fin
  }
};

// Validar si el rol ya existe
//1 Inicio
export const validarRol = async (req, res) => {
  //2 Obtener rol del query
  const { rol } = req.query;

  try {
    //3 Consultar rol en BD
    const roles = await validarDataRol(rol);
    //4 ¿roles.length > 0?
    //5 Respuesta 200 exists: true
    //6 Respuesta 200 exists: false
    res.status(200).json({ exists: roles.length > 0 });
    //7 Catch error
  } catch (error) {
    console.error('Error en /validar-rol:', error);
    //8 Error 500
    res.status(500).json({ message: 'Error al validar rol' });
    //F Fin
  }
};

// Buscar roles
//1 Inicio
export const buscarRoles = async (req, res) => {
  //2 Obtener parámetros query
  const { campo, valor, page = 1, limit = 10 } = req.query;
  //3 Definir columnas permitidas
  const columnasPermitidas = {
    id: 'RoleId',
    nombre: 'Nombre',
    estado: 'Estado',
  };
  //4 Obtener columna según campo
  const columna = columnasPermitidas[campo];
  //5 ¿columna existe?
  if (!columna) {
    //6 Error 400 campo inválido
    return res.status(400).json({ message: 'Campo de búsqueda inválido' });
  }

  try {
    //7 Ejecutar búsqueda en BD
    const result = await buscarRolesPaginated({
      page: parseInt(page),
      limit: parseInt(limit),
      columna,
      valor
    });
    //8 Respuesta 200 resultados
    res.status(200).json({
      data: result.data,
      pagination: {
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / parseInt(limit)),
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage
      }
    });
    //9 Catch error
  } catch (error) {
    console.error('Error al buscar roles con paginación:', error);
    //10 Error 500
    res.status(500).json({ message: 'Error interno del servidor' });
    //F Fin
  }
};

// ========== NUEVAS FUNCIONES PARA PERMISOS ==========

// Obtener todos los permisos disponibles
//1 Inicio
export const getAllPermissions = async (req, res) => {
  try {
    //2 Ejecutar consulta de permisos
    const permisos = await getdataPermisos();
    //3 Respuesta 200 lista de permisos
    res.status(200).json(permisos);
    //4 Catch error
  } catch (error) {
    console.error('Error al obtener permisos:', error);
    //5 Respuesta 500
    res.status(500).json({ message: 'Error al obtener permisos', error: error.message });
    //F Fin
  }
};

// Obtener permisos de un rol específico
//1 Inicio
export const getRolePermissions = async (req, res) => {
  try {
    //2 Obtener id del params
    const { id } = req.params;
    console.log("ID recibido:", id);
    //3 Consultar permisos del rol en BD
    const permisos = await getDataRolePermissions(id);
    //4 Respuesta 200 permisos
    res.status(200).json(permisos);
    //5 Catch error
  } catch (error) {
    console.error('Error al obtener permisos del rol:', error);
    //6 Respuesta 500
    res.status(500).json({ message: 'Error al obtener permisos del rol', error: error.message });
    //F Fin
  }
};

// Actualizar permisos de un rol 
//1 Inicio
export const updateRolePermissions = async (req, res) => {
  //2 Obtener id del params
  const { id } = req.params;
  //3 Obtener permisos del body
  const { permisos } = req.body;

  console.log('Actualizando permisos para rol:', {
    roleId: id,
    permisosCount: permisos?.length || 0,
    permisos: permisos
  });
  //4 ¿permisos es array?
  if (!Array.isArray(permisos)) {
    //5 Error 400 formato inválido
    return res.status(400).json({ message: 'Formato de permisos inválido. Se esperaba un array.' });
  }

  try {
    //6 Consultar rol en BD
    const roles = await getDataRolesById(id);
    //7 ¿rol existe?
    if (roles.length === 0) {
      //8 Error 404 rol no encontrado
      return res.status(404).json({ message: 'Rol no encontrado' });
    }

    // 9 Eliminar permisos actuales
    console.log('Eliminando permisos antiguos para rol:', id);
    await deletePermissos(id);

    // 10 ¿permisos.length === 0?
    if (permisos.length === 0) {
      //11 Respuesta 200 sin permisos
      return res.status(200).json({
        message: 'Permisos actualizados correctamente (sin permisos)',
        totalPermisos: 0
      });
    }

    // 12 Verificar permisos existentes
    console.log('Verificando que los permisos existen...');
    const placeholders = permisos.map(() => '?').join(',');
    //13 ¿hay permisos inexistentes?
    const existentes = await existenPermisos({ placeholders, permisos });

    const permisosExistentes = existentes.map(p => p.PermisoId);
    const permisosInexistentes = permisos.filter(p => !permisosExistentes.includes(p));

    if (permisosInexistentes.length > 0) {
      console.log('Permisos no encontrados:', permisosInexistentes);
      //14 Error 400 permisos inválidos
      return res.status(400).json({
        message: 'Algunos permisos no existen en la base de datos',
        permisosInexistentes: permisosInexistentes
      });
    }

    // 15 Insertar permisos (loop)
    console.log(`Insertando ${permisos.length} permisos...`);
    for (let i = 0; i < permisos.length; i++) {
      const permisoId = permisos[i];
      try {
        await actualizarPermisos(id, permisoId);

        console.log(`Permiso ${i + 1}/${permisos.length} insertado:`, permisoId);
      } catch (insertError) {
        // Si hay error de duplicado (no debería pasar porque borramos primero), continuar
        //16 ¿error duplicado?
        if (insertError.code === 'ER_DUP_ENTRY') {
          console.warn(`Permiso duplicado (ignorado): ${permisoId}`);
          continue;
        }
        //17 Ignorar duplicado
        throw insertError;
      }
    }

    console.log('Permisos actualizados exitosamente');
    //18 Respuesta 200 permisos actualizados
    res.status(200).json({
      message: 'Permisos actualizados correctamente',
      totalPermisos: permisos.length,
      roleId: id,
      roleName: roles[0].Nombre
    });
    //19 Catch error
  } catch (error) {
    console.error('Error CRÍTICO al actualizar permisos:', {
      error: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });

    // Errores específicos
    //20 ¿error ER_DUP_ENTRY?
    if (error.code === 'ER_DUP_ENTRY') {
      //21 Error 409
      return res.status(409).json({
        message: 'Error de duplicación. Algunos permisos ya estaban asignados.',
        error: error.sqlMessage
      });
    }
    //22 ¿error ER_NO_REFERENCED_ROW_2?
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      //23 Error 400 integridad referencial
      return res.status(400).json({
        message: 'Error de integridad referencial. El rol o algunos permisos no existen.',
        error: error.sqlMessage
      });
    }

    // 24 Error 500 genérico
    res.status(500).json({
      message: 'Error interno del servidor al actualizar permisos',
      error: error.message,
      code: error.code,
      suggestion: 'Verifique que el rol exista y que los IDs de permisos sean válidos'
    });
    //F Fin
  }
};

// Obtener permisos por usuario (para login)
//1 Inicio
export const getUserPermissions = async (req, res) => {
  //2 Obtener userId del params
  const { userId } = req.params;
  try {
    // Obtener rol del usuario
    //3 Consultar rol del usuario
    const users = await getDataRolUser(userId);
    //4 ¿users.length === 0?
    if (users.length === 0) {
      //5 Error 404 usuario no encontrado
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    //6 Obtener RoleId
    const { RoleId } = users[0];
    // Obtener permisos del rol
    //7 Consultar permisos del rol
    const permisos = await getDataPermissonRol(RoleId);
    //8 Respuesta 200 permisos
    res.status(200).json(permisos);
    //9 Catch error
  } catch (error) {
    console.error('Error al obtener permisos del usuario:', error);
    //10 Error 500
    res.status(500).json({ message: 'Error al obtener permisos', error: error.message });
    //F Fin
  }
};