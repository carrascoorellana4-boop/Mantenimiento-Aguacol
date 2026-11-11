/**
 * Módulo de Roles y Permisos AGUACOL
 * Soporta administradores, visualizadores, operadores directos para Tablet en planta
 * y usuarios con permisos restringidos por área y módulo:
 * - operador_extrusion (Extrusión)
 * - operador_soplado (Soplado / PET)
 * - operador_inyeccion (Inyección)
 * - visor_ot_plasticos (Lizette Donoso, Ernesto Galaz -> solo OT Plásticos)
 * - visor_ot_jjv (Daniel Oteiza -> solo OT Producción JJV)
 * - supervisor_plasticos (Bastián Oteiza -> OT, Preventivo y KPI Plásticos)
 */

export const ROLES_OPERADOR = {
  operador_extrusion: {
    id: 'operador_extrusion',
    label: 'Operador Extrusión (Tablet)',
    area: 'Extrusión',
    hint: 'Acceso en Tablet exclusivamente a tareas preventivas de Extrusión donde es responsable el operador.',
    defaultUsername: 'opextrusion',
    defaultPassword: 'Extrusion2026',
  },
  operador_soplado: {
    id: 'operador_soplado',
    label: 'Operador Soplado (Tablet)',
    area: 'Soplado',
    hint: 'Acceso en Tablet exclusivamente a tareas preventivas de Soplado donde es responsable el operador.',
    defaultUsername: 'opsoplado',
    defaultPassword: 'Soplado2026',
  },
  operador_inyeccion: {
    id: 'operador_inyeccion',
    label: 'Operador Inyección (Tablet)',
    area: 'Inyección',
    hint: 'Acceso en Tablet exclusivamente a tareas preventivas de Inyección donde es responsable el operador.',
    defaultUsername: 'opinyeccion',
    defaultPassword: 'Inyeccion2026',
  },
}

export const ROLES_ESPECIALES = {
  visor_ot_plasticos: {
    id: 'visor_ot_plasticos',
    label: 'Visor OT Plásticos',
    area: 'Plásticos',
    allowedViews: ['ordenes-trabajo'],
    hint: 'Acceso de solo lectura a órdenes de trabajo de Plásticos (Extrusión, Inyección, Soplado).',
  },
  visor_ot_jjv: {
    id: 'visor_ot_jjv',
    label: 'Visor OT Producción JJV',
    area: 'Producción JJV',
    allowedViews: ['ordenes-trabajo'],
    hint: 'Acceso de solo lectura a órdenes de trabajo de Producción JJV.',
  },
  supervisor_plasticos: {
    id: 'supervisor_plasticos',
    label: 'Supervisor Plásticos',
    area: 'Plásticos',
    allowedViews: ['ordenes-trabajo', 'mantenimiento-preventivo', 'disponibilidad'],
    hint: 'Acceso a Mantenimiento Preventivo, KPI y Órdenes de Trabajo del área Plásticos.',
  },
}

/**
 * Obtiene el rol normalizado del usuario a partir de su sesión de Supabase/GoTrue
 */
export function getUserRole(user) {
  if (!user) return 'anon'

  // 1. Verificación directa de administrador
  if (user.role === 'mant_admin' || user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin') {
    return 'admin'
  }

  // 2. Rol explícito en metadatos
  const metaRole = user.user_metadata?.role || user.app_metadata?.role
  if (
    metaRole &&
    (metaRole in ROLES_OPERADOR ||
      metaRole in ROLES_ESPECIALES ||
      metaRole === 'viewer' ||
      metaRole === 'operador')
  ) {
    return metaRole
  }

  // 3. Inferencia por nombre de usuario o correo electrónico
  const strId = ((user.email || '') + ' ' + (user.user_metadata?.username || '')).toLowerCase().trim()
  if (strId.includes('ldonoso')) {
    return 'visor_ot_plasticos'
  }
  if (strId.includes('egalaz')) {
    return 'visor_ot_plasticos'
  }
  if (strId.includes('doteiza')) {
    return 'visor_ot_jjv'
  }
  if (strId.includes('boteiza')) {
    return 'supervisor_plasticos'
  }
  if (strId.includes('opextrusion') || strId.includes('operador.extrusion') || strId.includes('operador_extrusion')) {
    return 'operador_extrusion'
  }
  if (strId.includes('opsoplado') || strId.includes('operador.soplado') || strId.includes('operador_soplado')) {
    return 'operador_soplado'
  }
  if (strId.includes('opinyeccion') || strId.includes('operador.inyeccion') || strId.includes('operador_inyeccion')) {
    return 'operador_inyeccion'
  }
  if (strId.includes('operador')) {
    return 'operador'
  }

  return 'viewer'
}

/**
 * Retorna si el rol corresponde a un operador de planta (modo Tablet)
 */
export function isOperatorRole(role) {
  return typeof role === 'string' && role.startsWith('operador')
}

/**
 * Retorna si el rol tiene restricción de módulos o área
 */
export function isRestrictedRole(role) {
  return role in ROLES_ESPECIALES || isOperatorRole(role)
}

/**
 * Obtiene el área asignada al usuario o rol
 */
export function getUserAllowedArea(roleOrUser) {
  if (!roleOrUser) return null
  let role = ''
  let user = null
  if (typeof roleOrUser === 'object') {
    user = roleOrUser
    role = getUserRole(user)
    if (user.user_metadata?.area) return user.user_metadata.area
  } else {
    role = roleOrUser
  }

  if (role === 'visor_ot_plasticos' || role === 'supervisor_plasticos') return 'Plásticos'
  if (role === 'visor_ot_jjv') return 'Producción JJV'
  if (role === 'operador_extrusion') return 'Extrusión'
  if (role === 'operador_soplado') return 'Soplado'
  if (role === 'operador_inyeccion') return 'Inyección'
  return null
}

/**
 * Obtiene el área asignada al operador ('Extrusión' | 'Soplado' | 'Inyección' | null)
 */
export function getOperatorArea(role, user = null) {
  return getUserAllowedArea(user || role)
}

/**
 * Retorna la lista de vistas/módulos permitidos para el usuario
 */
export function getUserAllowedViews(user) {
  if (!user) return ['home', 'ordenes-trabajo', 'solicitud-mantenimiento', 'mantenimiento-preventivo', 'disponibilidad', 'dashboard', 'bitacora', 'arbol-activos', 'dashboard-inventario', 'repuestos', 'compras']
  const role = getUserRole(user)
  if (role === 'admin') return ['*'] // Acceso total
  if (role in ROLES_ESPECIALES) {
    return ROLES_ESPECIALES[role].allowedViews
  }
  if (isOperatorRole(role)) {
    return ['mantenimiento-preventivo']
  }
  return ['home', 'ordenes-trabajo', 'solicitud-mantenimiento', 'mantenimiento-preventivo', 'disponibilidad', 'dashboard', 'bitacora', 'arbol-activos', 'dashboard-inventario', 'repuestos', 'compras']
}

/**
 * Verifica si un texto de área, línea o equipo coincide con el área permitida
 */
export function isAreaMatching(targetText, allowedArea) {
  if (!allowedArea) return true
  if (!targetText) return false
  const target = String(targetText)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  const allowed = String(allowedArea)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  if (allowed.includes('plastico')) {
    return (
      target.includes('plastico') ||
      target.includes('extrusion') ||
      target.includes('inyeccion') ||
      target.includes('soplado') ||
      target.includes('refrigeracion') ||
      target.includes('extrusora') ||
      target.includes('inyectora') ||
      target.includes('sopladora') ||
      target.includes('molino') ||
      target.includes('borche')
    )
  }

  if (allowed.includes('jjv') || allowed.includes('produccion')) {
    return (
      target.includes('jjv') ||
      target.includes('produccion') ||
      target.includes('linea 1') ||
      target.includes('linea 2') ||
      target.includes('linea 3') ||
      target.includes('linea 4') ||
      target.includes('linea 5') ||
      target.includes('linea 6') ||
      target.includes('linea 7') ||
      target.includes('linea 8') ||
      target.includes('linea 9') ||
      target.includes('cloro') ||
      target.includes('tratamiento de agua')
    )
  }

  return target.includes(allowed)
}

/**
 * Evalúa si una OT pertenece al área asignada al usuario
 */
export function isOtInAllowedArea(ot, allowedArea, equiposList = []) {
  if (!allowedArea) return true
  if (!ot) return false
  if (ot.area && isAreaMatching(ot.area, allowedArea)) return true
  if (ot.solicitante_area && isAreaMatching(ot.solicitante_area, allowedArea)) return true
  if (ot.ubicacion && isAreaMatching(ot.ubicacion, allowedArea)) return true
  if (ot.equipo_id && Array.isArray(equiposList) && equiposList.length > 0) {
    const eq = equiposList.find((e) => e.id === ot.equipo_id)
    if (eq && (isAreaMatching(eq.area, allowedArea) || isAreaMatching(eq.nombre, allowedArea))) {
      return true
    }
  }
  return false
}

/**
 * Retorna el nombre para mostrar y la etiqueta del rol
 */
export function getUserDisplayInfo(user) {
  if (!user) return { name: '', badge: '' }
  const role = getUserRole(user)
  const meta = user.user_metadata || {}

  let name = meta.nombre || ''
  if (!name) {
    const userPart = (user.email || '').split('@')[0].toUpperCase()
    if (userPart === 'LDONOSO') name = 'Lizette Donoso'
    else if (userPart === 'EGALAZ') name = 'Ernesto Galaz'
    else if (userPart === 'DOTEIZA') name = 'Daniel Oteiza'
    else if (userPart === 'BOTEIZA') name = 'Bastián Oteiza'
    else if (userPart === 'OPEXTRUSION') name = 'Operador Extrusión'
    else if (userPart === 'OPINYECCION') name = 'Operador Inyección'
    else if (userPart === 'OPSOPLADO') name = 'Operador Soplado'
    else name = userPart
  }

  let badge = 'Visualizador'
  if (role === 'admin') badge = 'Administrador'
  else if (role in ROLES_ESPECIALES) badge = ROLES_ESPECIALES[role].label
  else if (role in ROLES_OPERADOR) badge = ROLES_OPERADOR[role].label
  else if (role === 'operador') badge = 'Operador Planta'

  return { name, badge, role, allowedArea: getUserAllowedArea(user) }
}


