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

export default parseTecnicos
