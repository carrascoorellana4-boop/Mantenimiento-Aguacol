import { TECNICOS_BASE } from '../config/tecnicos'

/**
 * Normaliza el campo técnico de bitácora permitiendo separar tareas
 * compartidas delimitadas por "/" o ";", eliminando espacios y resultados vacíos.
 * 
 * Ejemplo:
 * parseTecnicos('Maximiliano Badilla / Willi Orellana')
 * => ['Maximiliano Badilla', 'Willi Orellana']
 * 
 * @param {string} tecnico - Cadena con uno o más técnicos
 * @returns {string[]} Array con los nombres limpios e individuales de cada técnico
 */
export const parseTecnicos = (tecnico) => {
  if (!tecnico || typeof tecnico !== 'string') return []
  return tecnico
    .split(/[/;]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

/**
 * Normaliza una cadena de texto de técnico eliminando tildes, minúsculas y espacios extra.
 */
export const normalizarTextoTecnico = (str) => {
  if (!str || typeof str !== 'string') return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Resuelve el nombre oficial de un técnico del catálogo si coincide (con o sin tildes/variantes).
 * Si no pertenece al catálogo oficial, retorna null.
 */
export const obtenerNombreTecnicoOficial = (nombre) => {
  if (!nombre) return null
  const norm = normalizarTextoTecnico(nombre)
  const normVariante = norm.replace(/\bwilly\b/g, 'willi')
  const found = TECNICOS_BASE.find(
    (t) => normalizarTextoTecnico(t.nombre) === norm || normalizarTextoTecnico(t.nombre) === normVariante
  )
  return found ? found.nombre : null
}

/**
 * Verifica si un técnico individual pertenece al catálogo oficial.
 */
export const isTecnicoOficial = (nombre) => {
  return Boolean(obtenerNombreTecnicoOficial(nombre))
}

/**
 * Valida si todos los técnicos de una cadena (individual o compartida)
 * pertenecen al catálogo oficial.
 */
export const areTecnicosOficiales = (tecnicoStr) => {
  const tecs = parseTecnicos(tecnicoStr)
  if (tecs.length === 0) return false
  return tecs.every((t) => isTecnicoOficial(t))
}

/**
 * Normaliza una cadena de técnicos (ej. "Willy Orellana / Leonel Carreno")
 * a sus nombres oficiales exactos: "Willi Orellana / Leonel Carreño".
 */
export const normalizarCadenaTecnicosOficiales = (tecnicoStr) => {
  const tecs = parseTecnicos(tecnicoStr)
  if (tecs.length === 0) return ''
  return tecs
    .map((t) => obtenerNombreTecnicoOficial(t) || t)
    .join(' / ')
}

export default parseTecnicos
