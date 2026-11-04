import { supabase } from '../lib/supabase.js'
import planPreventivoData from '../config/planPreventivoExtrusion.json'

export const MAQUINAS_EXTRUSION = [
  { id: 'M1', codigo: 'AGL-PLA-GPL-M01', nombre: 'Extrusora M1', titulo: 'M1' },
  { id: 'M2', codigo: 'AGL-PLA-GPL-M02', nombre: 'Extrusora M2', titulo: 'M2' },
  { id: 'M3', codigo: 'AGL-PLA-GPL-M03', nombre: 'Extrusora M3', titulo: 'M3' },
  { id: 'M4', codigo: 'AGL-PLA-GPL-M04', nombre: 'Extrusora M4', titulo: 'M4' },
  { id: 'M5', codigo: 'AGL-PLA-GPL-M05', nombre: 'Extrusora M5', titulo: 'M5' },
]

const LOCAL_STORAGE_KEY = 'aguacol_preventivo_ejecuciones_v1'

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
    list.unshift(ejecucion)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.warn('No se pudo guardar localmente la ejecución:', e)
  }
}

/**
 * Obtiene las tareas preventivas asignadas a una máquina.
 * Consulta primero la base de datos (tabla public.plan_preventivo_tarea).
 * Si la tabla aún no existe o está vacía, utiliza como respaldo verificado el plan consolidado oficial.
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

  // Fallback seguro con datos exactos del consolidado oficial de Extrusión
  const tareasLocales = planPreventivoData.filter((t) => t.codigo_equipo === codigoEquipo)
  return { tareas: tareasLocales, fromDb: false }
}

/**
 * Obtiene el total de tareas preventivas registradas para cada máquina de Extrusión.
 */
export async function getResumenTareasExtrusion() {
  const resumen = {}
  for (const m of MAQUINAS_EXTRUSION) {
    const { tareas } = await getTareasPorMaquina(m.codigo)
    resumen[m.id] = tareas.length
  }
  return resumen
}

/**
 * Sube una evidencia (foto o video) al almacenamiento en servidor propio.
 * Valida tamaño y envía la solicitud autenticada con JWT a /api/evidencias/upload.
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
      .order('fecha_ejecucion', { ascending: false })

    if (!error && Array.isArray(data)) {
      dbEjecuciones = data
      fromDb = true
    }
  } catch (err) {
    console.warn('No se pudo consultar historial en BD:', err?.message || err)
  }

  // Combinar con posibles ejecuciones guardadas localmente que aún no sincronicen
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

  const resultado = Array.from(map.values()).sort(
    (a, b) => new Date(b.fecha_ejecucion).getTime() - new Date(a.fecha_ejecucion).getTime()
  )

  return { ejecuciones: resultado, fromDb }
}

/**
 * Registra una ejecución de tarea preventiva con sus evidencias adjuntas.
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
  const now = new Date().toISOString()
  const user = session?.user

  const ejecucionPayload = {
    id: ejecucionId,
    tarea_id: tarea?.id || null,
    codigo_equipo,
    estado,
    observaciones: observaciones?.trim() || null,
    ejecutado_por_id: user?.id || null,
    ejecutado_por_email: user?.email || 'operador@aguacol.cl',
    fecha_ejecucion: now,
  }

  let dbOk = false

  try {
    const { error: insErr } = await supabase.from('plan_preventivo_ejecucion').insert(ejecucionPayload)
    if (!insErr) {
      dbOk = true
      // Insertar evidencias asociadas en tabla relacional
      if (evidencias.length > 0) {
        const evPayloads = evidencias.map((ev) => ({
          ejecucion_id: ejecucionId,
          tipo: ev.tipo === 'video' ? 'Video' : 'Foto',
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
    console.warn('No se pudo guardar en Supabase directamente:', err?.message || err)
  }

  // Guardar siempre una copia local por seguridad operativa
  const localCopy = {
    ...ejecucionPayload,
    tarea,
    evidencias: evidencias.map((ev) => ({
      id: ev.id || crypto.randomUUID?.() || `ev-${Date.now()}-${Math.random()}`,
      ejecucion_id: ejecucionId,
      tipo: ev.tipo === 'video' ? 'Video' : 'Foto',
      url: ev.url,
      nombre_original: ev.nombre_original || ev.filename || 'evidencia',
      mime_type: ev.mime_type,
      tamano_bytes: ev.tamano_bytes,
      created_at: now,
    })),
  }

  saveLocalEjecucion(localCopy)

  return {
    success: true,
    ejecucion: localCopy,
    dbOk,
    advertenciaSql: !dbOk ? 'Guardado localmente. La base de datos requiere ejecutar el script deploy/sql/30_mantenimiento_preventivo.sql' : null,
  }
}

