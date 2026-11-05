import { supabase } from '../lib/supabase.js'
import planPreventivoData from '../config/planPreventivoConsolidado.json'

export const FAMILIAS_PREVENTIVO = ['Todas', 'Extrusión', 'Inyección', 'Soplado']

export const MAQUINAS_PREVENTIVO = [
  // EXTRUSIÓN
  {
    id: 'M1',
    alias: 'E1',
    familia: 'Extrusión',
    codigo: 'AGL-PLA-GPL-M01',
    nombre: 'Extrusora M1',
    titulo: 'E1 · M1',
    fabricante: 'TONGDA',
    modelo: 'HTS-12L/1',
    serie: '4276',
    regimen: '10 L natural y blanco · 168 h programadas',
    diaVentana: 'Lunes',
  },
  {
    id: 'M2',
    alias: 'E2',
    familia: 'Extrusión',
    codigo: 'AGL-PLA-GPL-M02',
    nombre: 'Extrusora M2',
    titulo: 'E2 · M2',
    fabricante: 'TONGDA',
    modelo: 'HSII-12L/2-L',
    serie: '5316',
    regimen: 'Galón, 3 L detergente y 4,5 L · 168 h programadas',
    diaVentana: 'Martes',
  },
  {
    id: 'M3',
    alias: 'E3',
    familia: 'Extrusión',
    codigo: 'AGL-PLA-GPL-M03',
    nombre: 'Extrusora M3',
    titulo: 'E3 · M3',
    fabricante: 'TONGDA',
    modelo: 'HSII-12L/2-L',
    serie: '5905',
    regimen: 'Asa lateral · 168 h programadas',
    diaVentana: 'Miércoles',
  },
  {
    id: 'M4',
    alias: 'E4',
    familia: 'Extrusión',
    codigo: 'AGL-PLA-GPL-M04',
    nombre: 'Extrusora M4',
    titulo: 'E4 · M4',
    fabricante: 'TONGDA',
    modelo: 'HSII-12L/2-L',
    serie: '7004',
    regimen: 'Apilables · 168 h programadas',
    diaVentana: 'Jueves',
  },
  {
    id: 'M5',
    alias: 'E5',
    familia: 'Extrusión',
    codigo: 'AGL-PLA-GPL-M05',
    nombre: 'Extrusora M5',
    titulo: 'E5 · M5',
    fabricante: 'TONGDA',
    modelo: 'HSII-12L/2-L',
    serie: '8884',
    regimen: 'Apilables · 168 h programadas',
    diaVentana: 'Viernes',
  },
  // INYECCIÓN
  {
    id: 'INY-PREF',
    alias: 'I1',
    familia: 'Inyección',
    codigo: 'AGL-PLA-GPL-INY-PREF',
    nombre: 'Inyectora de preformas 1',
    titulo: 'I1 · Iny. Preformas 1',
    fabricante: 'Ningbo Yongjiang',
    modelo: 'YJP1400Z-A310',
    serie: '00109N',
    regimen: 'Preformas 25, 36, 47 y 90 g · 168 h programadas',
    diaVentana: 'Lunes',
  },
  {
    id: 'INY-PREF-02',
    alias: 'I2',
    familia: 'Inyección',
    codigo: 'AGL-PLA-GPL-INY-PREF-02',
    nombre: 'Inyectora de preformas 2',
    titulo: 'I2 · Iny. Preformas 2',
    fabricante: 'Ningbo Yongjiang',
    modelo: 'Modelo por confirmar',
    serie: '00106N',
    regimen: 'Preformas 25, 36, 47 y 90 g · 168 h programadas',
    diaVentana: 'Martes',
  },
  {
    id: 'INY-BOR',
    alias: 'I3',
    familia: 'Inyección',
    codigo: 'AGL-PLA-GPL-INY-BOR',
    nombre: 'Inyectora BORCHE BS150-III',
    titulo: 'I3 · BORCHE BS150-III',
    fabricante: 'BORCHE Machinery',
    modelo: 'BS150-III',
    serie: '2203U241',
    regimen: 'Manillas y tapas PET de 5 L · 168 h programadas',
    diaVentana: 'Miércoles',
  },
  {
    id: 'INY-02',
    alias: 'I4',
    familia: 'Inyección',
    codigo: 'AGL-PLA-GPL-INY-02',
    nombre: 'Inyectora 2 de Tapas/Manillas',
    titulo: 'I4 · Iny. 2 Tapas/Manillas',
    fabricante: 'Ningbo Yongjiang',
    modelo: 'YJSA200',
    serie: '00288N',
    regimen: 'Tapas de 38 mm · 168 h programadas',
    diaVentana: 'Jueves',
  },
  // SOPLADO
  {
    id: 'S01',
    alias: 'S1',
    familia: 'Soplado',
    codigo: 'AGL-SOP-S01',
    nombre: 'S1',
    titulo: 'S1 · Sopladora 1',
    fabricante: 'RC-4AL',
    modelo: 'RC-4AL 5LT',
    serie: 'Pendiente de placa',
    regimen: 'PET 3 y 5 L · 42 h efectivas/semana',
    diaVentana: 'Fuera de producción',
  },
  {
    id: 'S02',
    alias: 'S2',
    familia: 'Soplado',
    codigo: 'AGL-SOP-S02',
    nombre: 'S2',
    titulo: 'S2 · Sopladora 2',
    fabricante: 'RC-4AL',
    modelo: 'RC-4AL 2LT',
    serie: 'Pendiente de placa',
    regimen: '½ L, 750 cc, 1 L y 2 L · hasta 90 h/semana',
    diaVentana: 'Fuera de producción',
  },
]

export const MAQUINAS_EXTRUSION = MAQUINAS_PREVENTIVO.filter((m) => m.familia === 'Extrusión')

const LOCAL_STORAGE_KEY = 'aguacol_preventivo_ejecuciones_v2'

function getLocalEjecuciones() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalEjecucion(ejecucion) {
  try {
    const list = getLocalEjecuciones()
    const idx = list.findIndex((e) => e.id === ejecucion.id)
    if (idx >= 0) {
      list[idx] = ejecucion
    } else {
      list.unshift(ejecucion)
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.warn('No se pudo guardar localmente la ejecución:', e)
  }
}

/**
 * Calcula las horas efectivas computables dentro de los turnos oficiales de mantenimiento:
 * - Lunes a Viernes: 07:00 a 15:00 y 15:00 a 23:00 (07:00 a 23:00 = 16 horas diarias)
 * - Sábados: 04:00 a 09:00 (5 horas)
 * - Domingos: sin turno (0 horas)
 */
export function calcularHorasTurnoMantenimiento(fechaInicio, fechaFin = new Date()) {
  if (!fechaInicio) return 0
  const dStart = new Date(fechaInicio)
  const dEnd = new Date(fechaFin)

  if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime()) || dStart >= dEnd) {
    return 0
  }

  const ONE_MIN = 60 * 1000
  let minutosValidos = 0
  let cursor = new Date(dStart.getTime())
  const endMs = dEnd.getTime()

  // Iteración por minuto para exactitud absoluta con saltos de día/turno
  while (cursor.getTime() < endMs) {
    const dia = cursor.getDay() // 0: Dom, 1: Lun, ..., 6: Sáb
    const hora = cursor.getHours()
    const minuto = cursor.getMinutes()
    const timeDec = hora + minuto / 60

    if (dia >= 1 && dia <= 5) {
      // Lunes a Viernes: 07:00 a 23:00
      if (timeDec >= 7 && timeDec < 23) {
        minutosValidos++
      }
    } else if (dia === 6) {
      // Sábado: 04:00 a 09:00
      if (timeDec >= 4 && timeDec < 9) {
        minutosValidos++
      }
    }

    cursor = new Date(cursor.getTime() + ONE_MIN)
  }

  return Number((minutosValidos / 60).toFixed(2))
}

/**
 * Formatea horas numéricas a cadena amigable "Xh Ym"
 */
export function formatHorasTurno(horasNum) {
  if (!horasNum || isNaN(horasNum) || horasNum <= 0) return '0 min'
  const totalMinutos = Math.round(Number(horasNum) * 60)
  const h = Math.floor(totalMinutos / 60)
  const m = totalMinutos % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

/**
 * Obtiene las tareas preventivas asignadas a una máquina.
 */
export async function getTareasPorMaquina(codigoEquipo) {
  try {
    const { data, error } = await supabase
      .from('plan_preventivo_tarea')
      .select('*')
      .eq('codigo_equipo', codigoEquipo)
      .eq('activo', true)
      .order('orden', { ascending: true })

    if (!error && Array.isArray(data) && data.length > 0) {
      return { tareas: data, fromDb: true }
    }
  } catch (err) {
    console.warn('Fallback a plan consolidado local:', err?.message || err)
  }

  const tareasLocales = planPreventivoData.filter((t) => t.codigo_equipo === codigoEquipo)
  return { tareas: tareasLocales, fromDb: false }
}

/**
 * Sube una evidencia (foto o video) al almacenamiento en servidor propio.
 */
export async function subirEvidencia(file, token) {
  if (!file) throw new Error('No se seleccionó ningún archivo.')

  const MAX_SIZE = 35 * 1024 * 1024 // 35 MB
  if (file.size > MAX_SIZE) {
    throw new Error('El archivo excede el tamaño máximo permitido de 35 MB.')
  }

  const formData = new FormData()
  formData.append('file', file)

  const headers = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch('/api/evidencias/upload', {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.error || `Error ${res.status} al subir evidencia al servidor.`)
  }

  return await res.json()
}

/**
 * Obtiene el historial de ejecuciones de una máquina junto con sus evidencias.
 */
export async function getHistorialEjecuciones(codigoEquipo) {
  let dbEjecuciones = []
  let fromDb = false

  try {
    const { data, error } = await supabase
      .from('plan_preventivo_ejecucion')
      .select(`
        *,
        tarea:plan_preventivo_tarea(*),
        evidencias:plan_preventivo_evidencia(*)
      `)
      .eq('codigo_equipo', codigoEquipo)
      .order('fecha_hora_inicio', { ascending: false })

    if (!error && Array.isArray(data)) {
      dbEjecuciones = data
      fromDb = true
    }
  } catch (err) {
    console.warn('No se pudo consultar historial en BD:', err?.message || err)
  }

  const locales = getLocalEjecuciones().filter((item) => item.codigo_equipo === codigoEquipo)

  const map = new Map()
  for (const item of dbEjecuciones) {
    map.set(item.id, item)
  }
  for (const item of locales) {
    if (!map.has(item.id)) {
      map.set(item.id, item)
    }
  }

  const resultado = Array.from(map.values()).sort((a, b) => {
    const fA = new Date(b.fecha_hora_inicio || b.fecha_ejecucion).getTime()
    const fB = new Date(a.fecha_hora_inicio || a.fecha_ejecucion).getTime()
    return fA - fB
  })

  return { ejecuciones: resultado, fromDb }
}

/**
 * INICIA la ejecución de una tarea preventiva:
 * Registra automáticamente la fecha y hora de comienzo en estado 'En curso'.
 */
export async function iniciarEjecucionTarea({ tarea, codigo_equipo, session }) {
  const ejecucionId = crypto.randomUUID ? crypto.randomUUID() : `ejec-${Date.now()}`
  const now = new Date().toISOString()
  const user = session?.user

  const ejecucionPayload = {
    id: ejecucionId,
    tarea_id: tarea?.id || null,
    codigo_equipo,
    estado: 'En curso',
    fecha_hora_inicio: now,
    fecha_hora_cierre: null,
    horas_efectivas_turno: 0,
    observaciones: null,
    ejecutado_por_id: user?.id || null,
    ejecutado_por_email: user?.email || 'operador@aguacol.cl',
    tecnico_nombre: user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Técnico Mantenimiento',
    fecha_ejecucion: now,
  }

  let dbOk = false
  try {
    const { error: insErr } = await supabase.from('plan_preventivo_ejecucion').insert(ejecucionPayload)
    if (!insErr) dbOk = true
  } catch (err) {
    console.warn('No se pudo insertar en Supabase:', err?.message)
  }

  const localCopy = { ...ejecucionPayload, tarea, evidencias: [] }
  saveLocalEjecucion(localCopy)

  return { success: true, ejecucion: localCopy, dbOk }
}

/**
 * CIERRA y finaliza la ejecución de una tarea preventiva:
 * Registra automáticamente la fecha y hora de cierre, y calcula las horas efectivas dentro de turnos.
 */
export async function cerrarEjecucionTarea({
  ejecucionId,
  tarea,
  codigo_equipo,
  fecha_hora_inicio,
  observaciones = '',
  evidencias = [],
  session = null,
}) {
  const now = new Date()
  const fechaCierreStr = now.toISOString()
  const horasEfectivas = calcularHorasTurnoMantenimiento(fecha_hora_inicio, now)
  const user = session?.user

  const updatePayload = {
    estado: 'Realizada',
    fecha_hora_cierre: fechaCierreStr,
    horas_efectivas_turno: horasEfectivas,
    observaciones: observaciones?.trim() || null,
    fecha_ejecucion: fechaCierreStr,
  }

  let dbOk = false
  try {
    const { error: updErr } = await supabase
      .from('plan_preventivo_ejecucion')
      .update(updatePayload)
      .eq('id', ejecucionId)

    if (!updErr) {
      dbOk = true
      // Insertar evidencias adjuntas
      if (evidencias.length > 0) {
        const evPayloads = evidencias
          .filter((ev) => !ev.alreadySaved)
          .map((ev) => ({
            ejecucion_id: ejecucionId,
            tipo: ev.tipo === 'Video' ? 'Video' : 'Foto',
            url: ev.url,
            filename: ev.filename || null,
            nombre_original: ev.nombre_original || ev.filename || 'evidencia',
            tamano_bytes: ev.tamano_bytes || null,
            mime_type: ev.mime_type || null,
          }))

        if (evPayloads.length > 0) {
          await supabase.from('plan_preventivo_evidencia').insert(evPayloads)
        }
      }
    }
  } catch (err) {
    console.warn('Error cerrando en Supabase:', err?.message)
  }

  // Actualizar copia local
  const localCopy = {
    id: ejecucionId,
    tarea_id: tarea?.id,
    codigo_equipo,
    tarea,
    ...updatePayload,
    fecha_hora_inicio,
    ejecutado_por_id: user?.id,
    ejecutado_por_email: user?.email || 'operador@aguacol.cl',
    evidencias: evidencias.map((ev) => ({
      ...ev,
      ejecucion_id: ejecucionId,
      alreadySaved: true,
    })),
  }
  saveLocalEjecucion(localCopy)

  return { success: true, ejecucion: localCopy, horasEfectivas, dbOk }
}

/**
 * Guarda progreso intermedio de una tarea en curso (observaciones o evidencias) sin cerrarla todavía.
 */
export async function guardarProgresoTarea({
  ejecucionId,
  observaciones = '',
  evidencias = [],
}) {
  try {
    await supabase
      .from('plan_preventivo_ejecucion')
      .update({ observaciones: observaciones?.trim() || null })
      .eq('id', ejecucionId)

    const nuevasEvidencias = evidencias.filter((ev) => !ev.alreadySaved)
    if (nuevasEvidencias.length > 0) {
      const evPayloads = nuevasEvidencias.map((ev) => ({
        ejecucion_id: ejecucionId,
        tipo: ev.tipo === 'Video' ? 'Video' : 'Foto',
        url: ev.url,
        filename: ev.filename || null,
        nombre_original: ev.nombre_original || ev.filename || 'evidencia',
        tamano_bytes: ev.tamano_bytes || null,
        mime_type: ev.mime_type || null,
      }))
      await supabase.from('plan_preventivo_evidencia').insert(evPayloads)
    }
  } catch (err) {
    console.warn('Error guardando progreso:', err?.message)
  }

  return { success: true }
}

/**
 * Registra directamente una ejecución directa (retrocompatible)
 */
export async function registrarEjecucion({
  tarea,
  codigo_equipo,
  observaciones = '',
  estado = 'Realizada',
  evidencias = [],
  session = null,
}) {
  const ejecucionId = crypto.randomUUID ? crypto.randomUUID() : `ejec-${Date.now()}`
  const now = new Date()
  const nowStr = now.toISOString()
  const user = session?.user

  // Si se registra de forma directa, inicio y cierre coinciden
  const ejecucionPayload = {
    id: ejecucionId,
    tarea_id: tarea?.id || null,
    codigo_equipo,
    estado,
    fecha_hora_inicio: nowStr,
    fecha_hora_cierre: nowStr,
    horas_efectivas_turno: 0,
    observaciones: observaciones?.trim() || null,
    ejecutado_por_id: user?.id || null,
    ejecutado_por_email: user?.email || 'operador@aguacol.cl',
    tecnico_nombre: user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Técnico Mantenimiento',
    fecha_ejecucion: nowStr,
  }

  let dbOk = false
  try {
    const { error: insErr } = await supabase.from('plan_preventivo_ejecucion').insert(ejecucionPayload)
    if (!insErr) {
      dbOk = true
      if (evidencias.length > 0) {
        const evPayloads = evidencias.map((ev) => ({
          ejecucion_id: ejecucionId,
          tipo: ev.tipo === 'Video' ? 'Video' : 'Foto',
          url: ev.url,
          filename: ev.filename || null,
          nombre_original: ev.nombre_original || ev.filename || 'evidencia',
          tamano_bytes: ev.tamano_bytes || null,
          mime_type: ev.mime_type || null,
        }))
        await supabase.from('plan_preventivo_evidencia').insert(evPayloads)
      }
    }
  } catch (err) {
    console.warn('Error insertando en Supabase:', err?.message)
  }

  const localCopy = {
    ...ejecucionPayload,
    tarea,
    evidencias: evidencias.map((ev) => ({
      id: ev.id || `ev-${Date.now()}`,
      ejecucion_id: ejecucionId,
      tipo: ev.tipo === 'Video' ? 'Video' : 'Foto',
      url: ev.url,
      nombre_original: ev.nombre_original || ev.filename || 'evidencia',
    })),
  }
  saveLocalEjecucion(localCopy)

  return { success: true, ejecucion: localCopy, dbOk }
}
