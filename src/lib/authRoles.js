/**
 * Módulo de Roles y Permisos AGUACOL
 * Soporta administradores, visualizadores y operadores directos para Tablet en planta:
 * - operador_extrusion (Extrusión)
 * - operador_soplado (Soplado / PET)
 * - operador_inyeccion (Inyección)
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
  if (metaRole && (metaRole in ROLES_OPERADOR || metaRole === 'viewer' || metaRole === 'operador')) {
    return metaRole
  }

  // 3. Inferencia por nombre de usuario o correo electrónico
  const strId = ((user.email || '') + ' ' + (user.user_metadata?.username || '')).toLowerCase().trim()
  if (strId.includes('opextrusion') || strId.includes('operador.extrusion') || strId.includes('operador_extrusion')) {
    return 'operador_extrusion'
  }
  if (strId.includes('opsoplado') || strId.includes('operador.soplado') || strId.includes('operador_soplado')) {
    return 'operador_soplado'
  }
  if (strId.includes('opinyeccion') || strId.includes('operador.inyeccion') || strId.includes('operador_inyeccion')) {
    return 'operador_inyeccion'
  }
  if (email.includes('operador')) {
    return 'operador'
  }

  return 'viewer'
}

/**
 * Retorna si el rol corresponde a un operador de planta
 */
export function isOperatorRole(role) {
  return typeof role === 'string' && role.startsWith('operador')
}

/**
 * Obtiene el área asignada al operador ('Extrusión' | 'Soplado' | 'Inyección' | null)
 */
export function getOperatorArea(role, user = null) {
  if (user?.user_metadata?.area) return user.user_metadata.area
  if (role === 'operador_extrusion') return 'Extrusión'
  if (role === 'operador_soplado') return 'Soplado'
  if (role === 'operador_inyeccion') return 'Inyección'
  return null
}

