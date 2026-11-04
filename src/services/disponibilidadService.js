import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

const LOCAL_STORAGE_KEY = 'aguacol_disponibilidad_registros_v2'

/**
 * Normaliza nombres o códigos de equipos de planta para enlace automático
 */
export const normalizeEquipoKey = (val) => {
  if (!val) return ''
  return String(val)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Parsea fechas seriales de Excel, ISO strings o strings DD/MM/YYYY
 */
export const parseExcelFecha = (val) => {
  if (!val) return null
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Número serial Excel
  if (typeof val === 'number' || (!isNaN(val) && !isNaN(parseFloat(val)) && isFinite(val) && typeof val !== 'string')) {
    try {
      const parsed = XLSX.SSF.parse_date_code(Number(val))
      if (parsed) {
        const y = parsed.y
        const m = String(parsed.m).padStart(2, '0')
        const d = String(parsed.d).padStart(2, '0')
        return `${y}-${m}-${d}`
      }
    } catch {
      // continuar
    }
  }

  if (typeof val === 'string') {
    const trimmed = val.trim()
    // DD/MM/YYYY o DD-MM-YYYY
    const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
    if (dmy) {
      const d = String(parseInt(dmy[1], 10)).padStart(2, '0')
      const m = String(parseInt(dmy[2], 10)).padStart(2, '0')
      const y = dmy[3]
      return `${y}-${m}-${d}`
    }
    // YYYY-MM-DD
    const ymd = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
    if (ymd) {
      const y = ymd[1]
      const m = String(parseInt(ymd[2], 10)).padStart(2, '0')
      const d = String(parseInt(ymd[3], 10)).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }

  return null
}

/**
 * Parsea horas numéricas o cadenas de tiempo tipo "HH:MM" o "02:30"
 */
export const parseHoras = (val) => {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') {
    return Math.max(0, Number(val.toFixed(2)))
  }
  const str = String(val).trim().replace(',', '.')
  if (!isNaN(str)) {
    return Math.max(0, Number(parseFloat(str).toFixed(2)))
  }
  // Formato HH:MM o HH:MM:SS
  const timeMatch = str.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/)
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10)
    const mins = parseInt(timeMatch[2], 10)
    const secs = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0
    const total = hours + (mins / 60) + (secs / 3600)
    return Math.max(0, Number(total.toFixed(2)))
  }
  return 0
}

/**
 * Consulta registros de disponibilidad en Supabase con fallback local
 */
export async function fetchRegistrosDisponibilidad(filtros = {}) {
  try {
    let query = supabase
      .from('registro_disponibilidad')
      .select('*')
      .order('fecha', { ascending: false })

    if (filtros.fechaInicio) {
      query = query.gte('fecha', filtros.fechaInicio)
    }
    if (filtros.fechaFin) {
      query = query.lte('fecha', filtros.fechaFin)
    }
    if (filtros.codigoEquipo && filtros.codigoEquipo !== 'todos') {
      query = query.eq('codigo_equipo', filtros.codigoEquipo)
    }
    if (filtros.area && filtros.area !== 'todas') {
      query = query.eq('area', filtros.area)
    }

    const { data, error } = await query

    if (!error && Array.isArray(data)) {
      return { registros: data, fromDb: true }
    }
    console.warn('Fallo consulta a BD Supabase, usando almacenamiento local:', error?.message)
  } catch (err) {
    console.warn('Error conectando a BD para disponibilidad:', err?.message)
  }

  // Fallback local
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    const locales = raw ? JSON.parse(raw) : []
    return { registros: locales, fromDb: false }
  } catch {
    return { registros: [], fromDb: false }
  }
}

/**
 * Guarda un lote de registros de disponibilidad importados desde Excel
 */
export async function guardarLoteDisponibilidad(registros = []) {
  if (!Array.isArray(registros) || registros.length === 0) {
    return { success: true, count: 0 }
  }

  let dbOk = false
  try {
    const { error } = await supabase
      .from('registro_disponibilidad')
      .insert(registros)

    if (!error) {
      dbOk = true
    } else {
      console.warn('Error al insertar lote en BD:', error.message)
    }
  } catch (err) {
    console.warn('Excepción al guardar en BD:', err?.message)
  }

  // Respaldo local
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    const combined = [...registros, ...list]
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(combined.slice(0, 1000)))
  } catch (e) {
    console.warn('No se pudo guardar localmente:', e)
  }

  return { success: true, count: registros.length, dbOk }
}

/**
 * Elimina un registro de disponibilidad
 */
export async function eliminarRegistroDisponibilidad(id) {
  if (!id) return false
  try {
    await supabase.from('registro_disponibilidad').delete().eq('id', id)
  } catch (e) {
    console.warn('Error eliminando en BD:', e)
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) {
      const list = JSON.parse(raw).filter((item) => item.id !== id)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list))
    }
  } catch {}

  return true
}

/**
 * Analiza y parsea la planilla Excel de producción para extraer:
 * - Horas disponibles
 * - Horas en mantención
 * Y calcula Disponibilidad = (Horas disponibles / (Horas disponibles + Horas en mantención)) * 100
 */
export async function parseExcelProduccionFile(file, equiposList = []) {
  const buf = await file.arrayBuffer()
  const workbook = XLSX.read(buf, { type: 'array' })

  // Tomar la primera hoja o una hoja relevante
  let sheetName = workbook.SheetNames[0]
  for (const name of workbook.SheetNames) {
    const low = name.toLowerCase()
    if (low.includes('disponib') || low.includes('mantencion') || low.includes('produccion') || low.includes('detencion')) {
      sheetName = name
      break
    }
  }

  const worksheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

  if (!rawRows || rawRows.length < 2) {
    throw new Error('La planilla seleccionada no contiene suficientes datos o filas.')
  }

  // Buscar fila de encabezados en las primeras 5 filas
  let headerIndex = -1
  let colMap = {}

  for (let r = 0; r < Math.min(5, rawRows.length); r++) {
    const row = rawRows[r]
    const map = {}
    row.forEach((cell, idx) => {
      const h = String(cell).toLowerCase().trim()
      if (h.includes('fecha') || h.includes('dia') || h.includes('día')) map.fecha = idx
      if (h.includes('equipo') || h.includes('maquina') || h.includes('máquina') || h.includes('activo') || h.includes('linea') || h.includes('línea')) map.equipo = idx

      // Horas disponibles (tiempo disponible / horas produccion operativas)
      if (
        h.includes('horas disp') ||
        h.includes('hora disp') ||
        h.includes('tiempo disp') ||
        h.includes('disponible') ||
        h.includes('disponibles') ||
        h.includes('tiempo prod') ||
        h.includes('horas prod') ||
        h.includes('hrs prod') ||
        h.includes('tiempo operativo') ||
        h.includes('produccion') ||
        h.includes('producción')
      ) {
        map.horas_disp = idx
      }

      // Horas en mantención (falla / detención)
      if (
        h.includes('horas en mant') ||
        h.includes('hora en mant') ||
        h.includes('horas mant') ||
        h.includes('tiempo mant') ||
        h.includes('mantencion') ||
        h.includes('mantención') ||
        h.includes('detencion') ||
        h.includes('detención') ||
        h.includes('horas det') ||
        h.includes('hrs det') ||
        h.includes('parada') ||
        h.includes('falla')
      ) {
        map.horas_mant = idx
      }

      if (h.includes('motivo') || h.includes('causa') || h.includes('tipo') || h.includes('falla')) map.motivo = idx
      if (h.includes('turno')) map.turno = idx
      if (h.includes('observacion') || h.includes('observación') || h.includes('comentario')) map.observaciones = idx
    })

    if (map.fecha !== undefined && (map.equipo !== undefined || map.horas_disp !== undefined)) {
      headerIndex = r
      colMap = map
      break
    }
  }

  // Si no se detectaron encabezados exactos, mapeo posicional
  if (headerIndex === -1) {
    headerIndex = 0
    colMap = { fecha: 0, equipo: 1, horas_disp: 2, horas_mant: 3, motivo: 4 }
  }

  const filasParseadas = []
  const hoyStr = new Date().toISOString().split('T')[0]

  for (let r = headerIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r]
    if (!row || row.length === 0) continue

    const rawFecha = colMap.fecha !== undefined ? row[colMap.fecha] : null
    const fecha = parseExcelFecha(rawFecha) || hoyStr

    const rawEquipo = colMap.equipo !== undefined ? String(row[colMap.equipo] || '').trim() : ''
    if (!rawEquipo && !rawFecha) continue

    // Tiempos según la fórmula oficial
    const horasDisponibles = colMap.horas_disp !== undefined ? parseHoras(row[colMap.horas_disp]) : 8
    const horasMantencion = colMap.horas_mant !== undefined ? parseHoras(row[colMap.horas_mant]) : 0

    // Enlazar equipo con catálogo oficial si está disponible
    let matchedEquipo = null
    const eqNorm = normalizeEquipoKey(rawEquipo)

    if (Array.isArray(equiposList)) {
      matchedEquipo = equiposList.find((e) => {
        const codNorm = normalizeEquipoKey(e.codigo)
        const nomNorm = normalizeEquipoKey(e.nombre)
        return codNorm === eqNorm || nomNorm === eqNorm || nomNorm.includes(eqNorm) || eqNorm.includes(nomNorm)
      })
    }

    // Fórmula: Disponibilidad = (Horas disponibles / (Horas disponibles + Horas en mantención)) * 100
    let dispPct = 0
    const denominador = horasDisponibles + horasMantencion
    if (denominador > 0) {
      dispPct = Math.max(0, Math.min(100, Number(((horasDisponibles / denominador) * 100).toFixed(2))))
    }

    const motivo = colMap.motivo !== undefined ? String(row[colMap.motivo] || '').trim() : ''
    const turno = colMap.turno !== undefined ? String(row[colMap.turno] || '').trim() : 'Turno 1'
    const obs = colMap.observaciones !== undefined ? String(row[colMap.observaciones] || '').trim() : ''

    filasParseadas.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `disp-${Date.now()}-${r}`,
      fecha,
      equipo_id: matchedEquipo?.id || null,
      codigo_equipo: matchedEquipo?.codigo || rawEquipo || 'SIN-CODIGO',
      nombre_equipo: matchedEquipo?.nombre || rawEquipo || 'Equipo sin especificar',
      area: matchedEquipo?.area || matchedEquipo?.ubicacion || 'Producción',
      linea: matchedEquipo?.linea || null,
      horas_disponibles: horasDisponibles,
      horas_mantencion: horasMantencion,
      disponibilidad_pct: dispPct,
      tipo_detencion: horasMantencion > 0 ? (motivo || 'Falla / Mantenimiento') : 'Sin detención',
      motivo: motivo || null,
      turno: turno || null,
      observaciones: obs || null,
      origen_importacion: 'Excel Producción',
      archivo_origen: file.name,
      registrado_por: 'Personal Producción',
    })
  }

  return {
    sheetName,
    totalFilas: filasParseadas.length,
    filas: filasParseadas,
  }
}

/**
 * Consolida indicadores KPI de disponibilidad según la fórmula oficial:
 * Disponibilidad = (Horas disponibles / (Horas disponibles + Horas en mantención)) * 100
 */
export function consolidarKpisDisponibilidad(registros = []) {
  if (!Array.isArray(registros) || registros.length === 0) {
    return {
      disponibilidadGlobal: 0,
      totalHorasDisponibles: 0,
      totalHorasMantencion: 0,
      totalHorasBase: 0,
      totalRegistros: 0,
      porEquipo: [],
      porDia: [],
      equipoMayorDisp: null,
      equipoMenorDisp: null,
    }
  }

  let totalDisp = 0
  let totalMant = 0

  const porEquipoMap = new Map()
  const porDiaMap = new Map()

  for (const reg of registros) {
    // Acepta horas_disponibles o retrocompatibilidad con tiempo_produccion_horas
    const hDisp = Number(reg.horas_disponibles !== undefined ? reg.horas_disponibles : reg.tiempo_produccion_horas) || 0
    const hMant = Number(reg.horas_mantencion !== undefined ? reg.horas_mantencion : reg.tiempo_detencion_horas) || 0

    totalDisp += hDisp
    totalMant += hMant

    // Consolidación por Equipo
    const keyEq = reg.codigo_equipo || reg.nombre_equipo || 'Desconocido'
    if (!porEquipoMap.has(keyEq)) {
      porEquipoMap.set(keyEq, {
        codigo: reg.codigo_equipo,
        nombre: reg.nombre_equipo || reg.codigo_equipo,
        area: reg.area || 'Producción',
        horas_disponibles: 0,
        horas_mantencion: 0,
        registros_count: 0,
      })
    }
    const eqItem = porEquipoMap.get(keyEq)
    eqItem.horas_disponibles += hDisp
    eqItem.horas_mantencion += hMant
    eqItem.registros_count += 1

    // Consolidación por Día
    const diaKey = reg.fecha || 'Sin fecha'
    if (!porDiaMap.has(diaKey)) {
      porDiaMap.set(diaKey, {
        fecha: diaKey,
        horas_disponibles: 0,
        horas_mantencion: 0,
      })
    }
    const diaItem = porDiaMap.get(diaKey)
    diaItem.horas_disponibles += hDisp
    diaItem.horas_mantencion += hMant
  }

  // Fórmula consolidada: Disponibilidad Global = (totalDisp / (totalDisp + totalMant)) * 100
  let dispGlobal = 0
  const denomGlobal = totalDisp + totalMant
  if (denomGlobal > 0) {
    dispGlobal = Math.max(0, Math.min(100, Number(((totalDisp / denomGlobal) * 100).toFixed(2))))
  }

  // Consolidado por equipo
  const porEquipo = Array.from(porEquipoMap.values()).map((eq) => {
    let pct = 0
    const denomEq = eq.horas_disponibles + eq.horas_mantencion
    if (denomEq > 0) {
      pct = Math.max(0, Math.min(100, Number(((eq.horas_disponibles / denomEq) * 100).toFixed(2))))
    }
    return {
      ...eq,
      total_horas: Number(denomEq.toFixed(2)),
      disponibilidad_pct: pct,
    }
  }).sort((a, b) => b.disponibilidad_pct - a.disponibilidad_pct)

  // Consolidado por día
  const porDia = Array.from(porDiaMap.values()).map((d) => {
    let pct = 0
    const denomDia = d.horas_disponibles + d.horas_mantencion
    if (denomDia > 0) {
      pct = Math.max(0, Math.min(100, Number(((d.horas_disponibles / denomDia) * 100).toFixed(2))))
    }
    return {
      ...d,
      disponibilidad_pct: pct,
    }
  }).sort((a, b) => (a.fecha > b.fecha ? 1 : -1))

  return {
    disponibilidadGlobal: dispGlobal,
    totalHorasDisponibles: Number(totalDisp.toFixed(2)),
    totalHorasMantencion: Number(totalMant.toFixed(2)),
    totalHorasBase: Number((totalDisp + totalMant).toFixed(2)),
    totalRegistros: registros.length,
    porEquipo,
    porDia,
    equipoMayorDisp: porEquipo.length > 0 ? porEquipo[0] : null,
    equipoMenorDisp: porEquipo.length > 0 ? porEquipo[porEquipo.length - 1] : null,
  }
}
