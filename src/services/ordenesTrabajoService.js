import { supabase } from '../lib/supabase.js'
import { parseTecnicos } from '../lib/tecnicos.js'

export const ESTADOS_OT = ['Pendiente', 'En curso', 'Finalizada']
export const SET_ESTADOS_OT = new Set(ESTADOS_OT)

export const ORIGENES_OT = ['Manual', 'Inspección', 'WhatsApp', 'Solicitud QR']

/**
 * Calcula la duración legible de trabajo entre inicio y finalización (ej: "1 h 33 min")
 */
export const formatDuracionTrabajo = (inicio, fin) => {
  if (!inicio || !fin) return '—'
  const dInicio = new Date(inicio)
  const dFin = new Date(fin)
  if (isNaN(dInicio.getTime()) || isNaN(dFin.getTime())) return '—'
  const diffMs = Math.max(0, dFin.getTime() - dInicio.getTime())
  const totalMins = Math.round(diffMs / 60000)
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours} h`
  return `${hours} h ${mins} min`
}
export const PRIORIDADES_OT = ['Baja', 'Media', 'Alta', 'Crítica']

const LOCAL_OT_STORAGE_KEY = 'aguacol_orden_trabajo_db_v1'
const LOCAL_HISTORIAL_STORAGE_KEY = 'aguacol_orden_trabajo_historial_db_v1'
const REALTIME_BROADCAST_CHANNEL = 'aguacol_orden_trabajo_realtime_v1'

/**
 * Formatea el código legible de la OT (ej: OT-000125)
 */
export const formatCodigoOt = (ot) => {
  if (!ot) return 'OT-000000'
  if (ot.codigo_ot && typeof ot.codigo_ot === 'string' && ot.codigo_ot.startsWith('OT-')) {
    return ot.codigo_ot
  }
  const num = Number(ot.numero_ot)
  if (!isNaN(num) && num > 0) {
    return `OT-${String(num).padStart(6, '0')}`
  }
  return `OT-${String(ot.id || '').slice(0, 6).toUpperCase()}`
}

/**
 * Resuelve el nombre limpio del equipo y su ubicación técnica sin mostrar códigos técnicos innecesarios (Regla 12)
 */
export const resolveOtEquipoDisplay = (ot, equiposList = []) => {
  if (!ot) {
    return { equipoNombre: 'Equipo sin especificar', ubicacionDisplay: 'Planta AGUACOL' }
  }

  let matchedEq = ot.equipo || null
  if (!matchedEq && ot.equipo_id && Array.isArray(equiposList)) {
    matchedEq = equiposList.find((e) => e.id === ot.equipo_id) || null
  }

  const equipoNombre = matchedEq?.nombre || ot.equipo_nombre || 'Equipo general'

  // Determinar ubicación limpia (ej: Extrusión, Soplado, Inyección, Producción)
  let rawUbicacion = (ot.ubicacion || matchedEq?.ubicacion || ot.area || matchedEq?.area || '').trim()
  if (rawUbicacion.includes('→')) {
    const parts = rawUbicacion.split('→').map((p) => p.trim()).filter(Boolean)
    rawUbicacion = parts[parts.length - 1] || rawUbicacion
  } else if (rawUbicacion.includes(' - ')) {
    const parts = rawUbicacion.split(' - ').map((p) => p.trim()).filter(Boolean)
    rawUbicacion = parts[parts.length - 1] || rawUbicacion
  } else if (rawUbicacion.includes('/')) {
    const parts = rawUbicacion.split('/').map((p) => p.trim()).filter(Boolean)
    rawUbicacion = parts[parts.length - 1] || rawUbicacion
  }

  // Mapeos limpios según jerarquía oficial de planta AGUACOL
  const nomUpper = equipoNombre.toUpperCase()
  if (!rawUbicacion || rawUbicacion.toLowerCase() === 'plásticos' || rawUbicacion.toLowerCase() === 'plasticos') {
    if (['M1', 'M2', 'M3', 'M4', 'M5'].includes(nomUpper) || nomUpper.includes('M4-M5')) {
      rawUbicacion = 'Extrusión'
    } else if (nomUpper.includes('INYECTOR')) {
      rawUbicacion = 'Inyección'
    } else if (['S1', 'S2'].includes(nomUpper) || nomUpper.includes('PET')) {
      rawUbicacion = 'Soplado'
    }
  }

  return {
    equipoNombre,
    ubicacionDisplay: rawUbicacion || ot.area || matchedEq?.area || 'Planta General',
    areaDisplay: ot.area || matchedEq?.area || rawUbicacion || 'Planta General'
  }
}

/**
 * Regla 20: Deja preparada la estructura de intervención hacia public.bitacora_mantenimiento
 * conservando ot_id para trazabilidad, sin duplicar registros automáticamente sin confirmación.
 */
export const prepareBitacoraPayloadFromOt = (ot, equiposList = []) => {
  if (!ot || ot.estado !== 'Finalizada') return null
  const { areaDisplay } = resolveOtEquipoDisplay(ot, equiposList)
  return {
    ot_id: ot.id,
    fecha_hora: ot.fecha_finalizacion || new Date().toISOString(),
    equipo_id: ot.equipo_id || null,
    tecnico: ot.tecnico || 'Por asignar',
    es_falla: ot.es_falla !== undefined ? Boolean(ot.es_falla) : true,
    tipo_intervencion: ot.tipo_intervencion || 'Correctiva',
    falla_motivo: ot.trabajo || null,
    trabajo_realizado: ot.solucion_definitiva || ot.trabajo || '',
    estado_final: ot.trabajo_pendiente ? 'Operativo con seguimiento' : 'Operativo',
    area: ot.area || areaDisplay || null,
    tipo_falla: ot.es_falla ? (ot.tipo_falla || 'Mecánica') : null,
    origen: `OT (${formatCodigoOt(ot)})`
  }
}

/**
 * Emite evento de sincronización multi-pestaña / sesión local para complementar Supabase Realtime
 */
const broadcastOtSyncEvent = (eventType, record) => {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(REALTIME_BROADCAST_CHANNEL)
      bc.postMessage({
        type: eventType,
        record,
        timestamp: Date.now()
      })
      bc.close()
    }
  } catch {
    // Ignorar si el entorno no soporta BroadcastChannel
  }
}

/**
 * Inicializa datos semilla realistas si la tabla remota aún no ha sido creada en Supabase SQL Editor
 */
const getOrSeedLocalOrdenes = (equiposList = []) => {
  try {
    const raw = localStorage.getItem(LOCAL_OT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    // continue to seed
  }

  const findEq = (targetName) => {
    if (!Array.isArray(equiposList) || equiposList.length === 0) return null
    const lower = targetName.toLowerCase()
    return (
      equiposList.find((e) => (e.nombre || '').toLowerCase() === lower) ||
      equiposList.find((e) => (e.codigo || '').toLowerCase() === lower) ||
      equiposList.find((e) => (e.nombre || '').toLowerCase().includes(lower)) ||
      null
    )
  }

  const eqM3 = findEq('M3')
  const eqS2 = findEq('S2')
  const eqIny2 = findEq('Inyectora 2')
  const eqM4 = findEq('M4')

  const seedOts = [
    {
      id: 'c1000125-0000-4000-8000-000000000125',
      numero_ot: 125,
      codigo_ot: 'OT-000125',
      equipo_id: eqM3?.id || null,
      equipo_nombre: 'M3',
      ubicacion: 'Extrusión',
      area: eqM3?.area || 'Plásticos',
      trabajo: 'Problema en cuchillo inferior de corte.',
      tecnico: 'Maximiliano Badilla',
      estado: 'Pendiente',
      origen: 'Manual',
      prioridad: 'Alta',
      tipo_intervencion: 'Correctiva',
      es_falla: true,
      tipo_falla: 'Mecánica',
      solucion_definitiva: null,
      trabajo_pendiente: null,
      fecha_reporte: '2026-10-28T14:23:00.000Z',
      fecha_inicio: null,
      fecha_finalizacion: null,
      created_at: '2026-10-28T14:23:00.000Z',
      updated_at: '2026-10-28T14:23:00.000Z'
    },
    {
      id: 'c1000126-0000-4000-8000-000000000126',
      numero_ot: 126,
      codigo_ot: 'OT-000126',
      equipo_id: eqS2?.id || null,
      equipo_nombre: 'S2',
      ubicacion: 'Soplado',
      area: eqS2?.area || 'Soplado',
      trabajo: 'Fuga neumática en válvula de soplado principal.',
      tecnico: 'Leonel Carreño',
      estado: 'Pendiente',
      origen: 'WhatsApp',
      prioridad: 'Alta',
      tipo_intervencion: 'Correctiva',
      es_falla: true,
      tipo_falla: 'Neumática',
      solucion_definitiva: null,
      trabajo_pendiente: null,
      fecha_reporte: '2026-10-28T15:10:00.000Z',
      fecha_inicio: null,
      fecha_finalizacion: null,
      created_at: '2026-10-28T15:10:00.000Z',
      updated_at: '2026-10-28T15:10:00.000Z'
    },
    {
      id: 'c1000120-0000-4000-8000-000000000120',
      numero_ot: 120,
      codigo_ot: 'OT-000120',
      equipo_id: eqIny2?.id || null,
      equipo_nombre: 'Inyectora 2',
      ubicacion: 'Inyección',
      area: eqIny2?.area || 'Plásticos',
      trabajo: 'Problema molde: desalineación en cierre de cavidades.',
      tecnico: 'Maximiliano Badilla',
      estado: 'En curso',
      origen: 'Inspección',
      prioridad: 'Crítica',
      tipo_intervencion: 'Correctiva',
      es_falla: true,
      tipo_falla: 'Mecánica',
      solucion_definitiva: null,
      trabajo_pendiente: null,
      fecha_reporte: '2026-10-28T08:30:00.000Z',
      fecha_inicio: '2026-10-28T09:10:00.000Z',
      fecha_finalizacion: null,
      created_at: '2026-10-28T08:30:00.000Z',
      updated_at: '2026-10-28T09:10:00.000Z'
    },
    {
      id: 'c1000118-0000-4000-8000-000000000118',
      numero_ot: 118,
      codigo_ot: 'OT-000118',
      equipo_id: eqM4?.id || null,
      equipo_nombre: 'M4',
      ubicacion: 'Extrusión',
      area: eqM4?.area || 'Plásticos',
      trabajo: 'Cambio sensor de proximidad en cabezal.',
      tecnico: 'Mauricio Riquelme',
      estado: 'Finalizada',
      origen: 'Manual',
      prioridad: 'Media',
      tipo_intervencion: 'Correctiva',
      es_falla: true,
      tipo_falla: 'Eléctrica / Control',
      solucion_definitiva: 'Se reemplaza sensor inductivo M12, se calibra distancia de detección y queda equipo operativo.',
      trabajo_pendiente: null,
      fecha_reporte: '2026-10-27T10:15:00.000Z',
      fecha_inicio: '2026-10-27T10:30:00.000Z',
      fecha_finalizacion: '2026-10-27T11:45:00.000Z',
      created_at: '2026-10-27T10:15:00.000Z',
      updated_at: '2026-10-27T11:45:00.000Z'
    }
  ]

  const seedHistorial = [
    {
      id: 'h1000120-0001-4000-8000-000000000001',
      ot_id: 'c1000120-0000-4000-8000-000000000120',
      estado_anterior: 'Pendiente',
      estado_nuevo: 'En curso',
      fecha_hora: '2026-10-28T09:10:00.000Z',
      usuario_id: null,
      usuario_nombre: 'Maximiliano Badilla',
      comentario: 'Inicio de atención en terreno'
    },
    {
      id: 'h1000118-0001-4000-8000-000000000001',
      ot_id: 'c1000118-0000-4000-8000-000000000118',
      estado_anterior: 'Pendiente',
      estado_nuevo: 'En curso',
      fecha_hora: '2026-10-27T10:30:00.000Z',
      usuario_id: null,
      usuario_nombre: 'Mauricio Riquelme',
      comentario: 'OT iniciada'
    },
    {
      id: 'h1000118-0002-4000-8000-000000000002',
      ot_id: 'c1000118-0000-4000-8000-000000000118',
      estado_anterior: 'En curso',
      estado_nuevo: 'Finalizada',
      fecha_hora: '2026-10-27T11:45:00.000Z',
      usuario_id: null,
      usuario_nombre: 'Mauricio Riquelme',
      comentario: 'Cierre con solución definitiva registrada'
    }
  ]

  try {
    localStorage.setItem(LOCAL_OT_STORAGE_KEY, JSON.stringify(seedOts))
    if (!localStorage.getItem(LOCAL_HISTORIAL_STORAGE_KEY)) {
      localStorage.setItem(LOCAL_HISTORIAL_STORAGE_KEY, JSON.stringify(seedHistorial))
    }
  } catch {
    // ignore storage errors
  }

  return seedOts
}

const saveLocalOrdenes = (list) => {
  try {
    localStorage.setItem(LOCAL_OT_STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

const getLocalHistorial = () => {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORIAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const appendLocalHistorial = (entry) => {
  try {
    const current = getLocalHistorial()
    const next = [entry, ...current]
    localStorage.setItem(LOCAL_HISTORIAL_STORAGE_KEY, JSON.stringify(next))
    return entry
  } catch {
    return entry
  }
}

/**
 * Enriquece cada registro de OT con su relación de equipo y código formateado
 */
const enrichOrdenTrabajo = (ot, equiposList = []) => {
  if (!ot) return ot
  const matchedEq =
    ot.equipo ||
    (ot.equipo_id && Array.isArray(equiposList)
      ? equiposList.find((e) => e.id === ot.equipo_id) || null
      : null)

  return {
    ...ot,
    codigo_ot: formatCodigoOt(ot),
    equipo: matchedEq
  }
}

const isFallbackEligibleError = (err) => {
  if (!err) return false
  const msg = String(err.message || '').toLowerCase()
  return (
    err.code === 'PGRST205' ||
    msg.includes('orden_trabajo') ||
    msg.includes('fetch failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('placeholder.supabase.co')
  )
}

/**
 * 1. Consultar todas las Órdenes de Trabajo desde la fuente de verdad (public.orden_trabajo)
 */
export const fetchOrdenesTrabajo = async (equiposList = []) => {
  try {
    const { data, error } = await supabase
      .from('orden_trabajo')
      .select(`
        *,
        equipo:equipo_id (
          id,
          codigo,
          nombre,
          area,
          ubicacion
        )
      `)
      .order('fecha_reporte', { ascending: false })

    if (error) {
      // Si la tabla aún no fue creada en Supabase SQL Editor (PGRST205), usar persistencia sincronizada local y avisar
      if (isFallbackEligibleError(error)) {
        const localData = getOrSeedLocalOrdenes(equiposList).map((item) =>
          enrichOrdenTrabajo(item, equiposList)
        )
        return {
          data: localData,
          storageMode: 'supabase_pending_migration',
          error: null
        }
      }
      throw new Error(error.message)
    }

    const enriched = (data || []).map((item) => enrichOrdenTrabajo(item, equiposList))
    return {
      data: enriched,
      storageMode: 'supabase_live',
      error: null
    }
  } catch (err) {
    return {
      data: [],
      storageMode: 'error',
      error: err.message || 'Error al cargar Órdenes de Trabajo'
    }
  }
}

/**
 * 2. Crear una nueva Orden de Trabajo (Manual, Inspección o WhatsApp)
 * Reglas 21 y 22: Toda OT nueva de Inspección o WhatsApp entra automáticamente en estado = 'Pendiente'
 */
export const createOrdenTrabajo = async (payload, equiposList = [], session = null) => {
  const trabajo = (payload.trabajo || '').trim()
  if (!trabajo) {
    throw new Error('La descripción del trabajo o problema reportado es obligatoria.')
  }

  const origen = ORIGENES_OT.includes(payload.origen) ? payload.origen : 'Manual'
  // Reglas 21 y 22: Inspección y WhatsApp entran siempre en 'Pendiente'
  const estadoInicial =
    origen === 'Inspección' || origen === 'WhatsApp'
      ? 'Pendiente'
      : SET_ESTADOS_OT.has(payload.estado)
      ? payload.estado
      : 'Pendiente'

  if (estadoInicial === 'Finalizada' && !(payload.solucion_definitiva || '').trim()) {
    throw new Error('No es posible crear una OT en estado Finalizada sin solución definitiva.')
  }

  const matchedEq = payload.equipo_id
    ? equiposList.find((e) => e.id === payload.equipo_id)
    : null

  const nowIso = new Date().toISOString()
  const insertRow = {
    equipo_id: payload.equipo_id || null,
    ubicacion: (payload.ubicacion || matchedEq?.ubicacion || matchedEq?.area || '').trim() || null,
    area: (payload.area || matchedEq?.area || '').trim() || null,
    trabajo,
    tecnico: (payload.tecnico || '').trim() || 'Sin asignar',
    estado: estadoInicial,
    origen,
    prioridad: PRIORIDADES_OT.includes(payload.prioridad) ? payload.prioridad : 'Media',
    tipo_intervencion: payload.tipo_intervencion || 'Correctiva',
    es_falla: payload.es_falla !== undefined ? Boolean(payload.es_falla) : true,
    tipo_falla: payload.es_falla !== false ? (payload.tipo_falla || 'Mecánica') : null,
    solucion_definitiva: (payload.solucion_definitiva || '').trim() || null,
    trabajo_pendiente: (payload.trabajo_pendiente || '').trim() || null,
    fecha_reporte: payload.fecha_reporte || nowIso,
    fecha_inicio: estadoInicial === 'En curso' || estadoInicial === 'Finalizada' ? nowIso : null,
    fecha_finalizacion: estadoInicial === 'Finalizada' ? nowIso : null
  }

  const { data, error } = await supabase
    .from('orden_trabajo')
    .insert([insertRow])
    .select(`
      *,
      equipo:equipo_id (
        id,
        codigo,
        nombre,
        area,
        ubicacion
      )
    `)
    .single()

  if (error) {
    if (isFallbackEligibleError(error)) {
      const currentList = getOrSeedLocalOrdenes(equiposList)
      const maxNum = currentList.reduce((acc, item) => Math.max(acc, Number(item.numero_ot) || 100), 126)
      const nextNum = maxNum + 1
      const newId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `ot-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

      const newOt = enrichOrdenTrabajo(
        {
          id: newId,
          numero_ot: nextNum,
          codigo_ot: `OT-${String(nextNum).padStart(6, '0')}`,
          ...insertRow,
          equipo_nombre: matchedEq?.nombre || payload.equipo_nombre || 'Equipo general',
          created_by: session?.user?.id || null,
          created_at: nowIso,
          updated_at: nowIso
        },
        equiposList
      )

      const updatedList = [newOt, ...currentList]
      saveLocalOrdenes(updatedList)

      appendLocalHistorial({
        id: `hist-${Date.now()}`,
        ot_id: newOt.id,
        estado_anterior: null,
        estado_nuevo: estadoInicial,
        fecha_hora: nowIso,
        usuario_id: session?.user?.id || null,
        usuario_nombre: session?.user?.email || newOt.tecnico || 'Sistema',
        comentario: `Creación de OT (${origen})`
      })

      broadcastOtSyncEvent('INSERT', newOt)
      return newOt
    }
    throw new Error(error.message)
  }

  // Registrar auditoría inicial en public.orden_trabajo_estado_historial
  try {
    await supabase.from('orden_trabajo_estado_historial').insert([
      {
        ot_id: data.id,
        estado_anterior: null,
        estado_nuevo: data.estado,
        fecha_hora: nowIso,
        usuario_id: session?.user?.id || null,
        usuario_nombre: session?.user?.email || data.tecnico || 'Sistema',
        comentario: `Creación de OT (${origen})`
      }
    ])
  } catch {
    // No bloquear si el trigger de BD ya lo insertó
  }

  const enriched = enrichOrdenTrabajo(data, equiposList)
  broadcastOtSyncEvent('INSERT', enriched)
  return enriched
}

/**
 * 3. FUNCIÓN ÚNICA Y REUTILIZABLE DE CAMBIO DE ESTADO (Reglas 2, 3, 4, 5, 6, 7, 8, 15, 16)
 *
 * changeOtStatus(otId, newStatus, payload, session, equiposList)
 *
 * - Usa exclusivamente orden_trabajo.estado ('Pendiente', 'En curso', 'Finalizada')
 * - Aplica las mismas reglas tanto desde Dashboard Kanban (Drag & Drop o Botones) como desde Ficha de OT
 * - Valida estrictamente que solucion_definitiva no esté vacía al pasar a 'Finalizada'
 * - Registra la transición en orden_trabajo_estado_historial
 */
export const changeOtStatus = async (
  otId,
  newStatus,
  payload = {},
  session = null,
  equiposList = []
) => {
  if (!otId) {
    throw new Error('Identificador de OT requerido.')
  }

  if (!SET_ESTADOS_OT.has(newStatus)) {
    throw new Error(`Estado inválido: "${newStatus}". Valores permitidos: Pendiente, En curso, Finalizada.`)
  }

  // Soporte para probar reversión de Optimistic UI ante fallo de red/servidor (Regla 15)
  if (payload.simulateServerError) {
    throw new Error('No fue posible actualizar la OT.')
  }

  const nowIso = new Date().toISOString()
  const usuarioNombre =
    payload.usuario_nombre ||
    session?.user?.email ||
    payload.tecnico ||
    'Usuario autenticado'

  // Validación previa en servicio antes de enviar a BD (Regla 5)
  if (newStatus === 'Finalizada') {
    const candidateSolucion =
      payload.solucion_definitiva !== undefined
        ? String(payload.solucion_definitiva || '').trim()
        : String(payload.currentSolucionDefinitiva || '').trim()

    if (!candidateSolucion) {
      throw new Error('No es posible finalizar la OT sin ingresar una solución definitiva.')
    }
  }

  // 1. Intentar primero mediante el RPC transaccional en Supabase (si existe en BD)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('cambiar_estado_orden_trabajo', {
      p_ot_id: otId,
      p_nuevo_estado: newStatus,
      p_solucion_definitiva: payload.solucion_definitiva ?? null,
      p_trabajo_pendiente: payload.trabajo_pendiente ?? null,
      p_tecnico: payload.tecnico ?? null,
      p_comentario: payload.comentario ?? null,
      p_usuario_nombre: usuarioNombre
    })

    if (!rpcError && rpcData) {
      const enrichedRpc = enrichOrdenTrabajo(rpcData, equiposList)
      broadcastOtSyncEvent('UPDATE', enrichedRpc)
      return enrichedRpc
    }

    // Si el error proviene de la validación estricta en PostgreSQL, propagarlo inmediatamente
    if (rpcError && rpcError.message && rpcError.message.includes('solución definitiva')) {
      throw new Error(rpcError.message)
    }
  } catch (rpcErr) {
    if (rpcErr.message && rpcErr.message.includes('solución definitiva')) {
      throw rpcErr
    }
    // Si el RPC no existe aún (PGRST202 / PGRST205), continuar con actualización directa sobre public.orden_trabajo
  }

  // 2. Consultar estado actual del registro en public.orden_trabajo
  const { data: currentOt, error: fetchErr } = await supabase
    .from('orden_trabajo')
    .select('*')
    .eq('id', otId)
    .maybeSingle()

  if (fetchErr) {
    // Fallback sincronizado cuando la tabla remota aún no ha sido creada en Supabase SQL Editor
    if (isFallbackEligibleError(fetchErr)) {
      const currentList = getOrSeedLocalOrdenes(equiposList)
      const idx = currentList.findIndex((item) => item.id === otId)
      if (idx === -1) {
        throw new Error('No fue posible actualizar la OT.')
      }

      const existing = currentList[idx]
      const estadoAnterior = existing.estado

      const finalSolucion =
        payload.solucion_definitiva !== undefined
          ? String(payload.solucion_definitiva || '').trim()
          : String(existing.solucion_definitiva || '').trim()

      // Regla 5 estricta
      if (newStatus === 'Finalizada' && !finalSolucion) {
        throw new Error('No es posible finalizar la OT sin ingresar una solución definitiva.')
      }

      const nextOt = { ...existing, estado: newStatus, updated_at: nowIso }

      if (newStatus === 'En curso') {
        // Regla 3 y Regla 6: conservar fecha_inicio existente; si era NULL asignar ahora. Limpiar fecha_finalizacion.
        nextOt.fecha_inicio = existing.fecha_inicio || nowIso
        nextOt.fecha_finalizacion = null
        // Regla 6: al reabrir NO borrar solucion_definitiva ni trabajo_pendiente
      } else if (newStatus === 'Finalizada') {
        // Regla 4: estado = 'Finalizada', fecha_finalizacion = NOW(), solucion_definitiva, trabajo_pendiente, tecnico
        nextOt.fecha_inicio = existing.fecha_inicio || nowIso
        nextOt.fecha_finalizacion = nowIso
        nextOt.solucion_definitiva = finalSolucion
        if (payload.trabajo_pendiente !== undefined) {
          nextOt.trabajo_pendiente = String(payload.trabajo_pendiente || '').trim() || null
        }
        if (payload.tecnico !== undefined && String(payload.tecnico).trim()) {
          nextOt.tecnico = String(payload.tecnico).trim()
        }
      } else if (newStatus === 'Pendiente') {
        // Regla 7: En curso -> Pendiente NO borra fecha_inicio (trazabilidad)
        nextOt.fecha_finalizacion = null
      }

      const enrichedNext = enrichOrdenTrabajo(nextOt, equiposList)
      const nextList = [...currentList]
      nextList[idx] = enrichedNext
      saveLocalOrdenes(nextList)

      // Regla 16: Auditoría en orden_trabajo_estado_historial
      if (estadoAnterior !== newStatus || payload.comentario) {
        appendLocalHistorial({
          id: `hist-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          ot_id: otId,
          estado_anterior: estadoAnterior,
          estado_nuevo: newStatus,
          fecha_hora: nowIso,
          usuario_id: session?.user?.id || null,
          usuario_nombre: nextOt.tecnico || usuarioNombre,
          comentario:
            payload.comentario ||
            (newStatus === 'Finalizada'
              ? `Finalizada: ${finalSolucion}`
              : `${estadoAnterior} → ${newStatus}`)
        })
      }

      broadcastOtSyncEvent('UPDATE', enrichedNext)
      return enrichedNext
    }

    throw new Error('No fue posible actualizar la OT.')
  }

  if (!currentOt) {
    throw new Error('No se encontró la Orden de Trabajo.')
  }

  const estadoAnterior = currentOt.estado
  const finalSolucion =
    payload.solucion_definitiva !== undefined
      ? String(payload.solucion_definitiva || '').trim()
      : String(currentOt.solucion_definitiva || '').trim()

  if (newStatus === 'Finalizada' && !finalSolucion) {
    throw new Error('No es posible finalizar la OT sin ingresar una solución definitiva.')
  }

  const updateFields = {
    estado: newStatus,
    updated_at: nowIso
  }

  if (newStatus === 'En curso') {
    // Regla 3 y 6: Asignar fecha_inicio si es NULL, conservar si ya existía; limpiar fecha_finalizacion
    updateFields.fecha_inicio = currentOt.fecha_inicio || nowIso
    updateFields.fecha_finalizacion = null
  } else if (newStatus === 'Finalizada') {
    // Regla 4 y 5
    updateFields.fecha_inicio = currentOt.fecha_inicio || nowIso
    updateFields.fecha_finalizacion = nowIso
    updateFields.solucion_definitiva = finalSolucion
    if (payload.trabajo_pendiente !== undefined) {
      updateFields.trabajo_pendiente = String(payload.trabajo_pendiente || '').trim() || null
    }
    if (payload.tecnico !== undefined && String(payload.tecnico).trim()) {
      updateFields.tecnico = String(payload.tecnico).trim()
    }
  } else if (newStatus === 'Pendiente') {
    // Regla 7: En curso -> Pendiente conserva fecha_inicio intacta
    updateFields.fecha_finalizacion = null
  }

  const { data: updatedOt, error: updateErr } = await supabase
    .from('orden_trabajo')
    .update(updateFields)
    .eq('id', otId)
    .select(`
      *,
      equipo:equipo_id (
        id,
        codigo,
        nombre,
        area,
        ubicacion
      )
    `)
    .single()

  if (updateErr) {
    throw new Error(updateErr.message || 'No fue posible actualizar la OT.')
  }

  // Regla 16: Insertar registro en orden_trabajo_estado_historial
  if (estadoAnterior !== newStatus || payload.comentario) {
    try {
      await supabase.from('orden_trabajo_estado_historial').insert([
        {
          ot_id: otId,
          estado_anterior: estadoAnterior,
          estado_nuevo: newStatus,
          fecha_hora: nowIso,
          usuario_id: session?.user?.id || null,
          usuario_nombre: updatedOt.tecnico || usuarioNombre,
          comentario:
            payload.comentario ||
            (newStatus === 'Finalizada'
              ? `Finalizada: ${finalSolucion}`
              : `${estadoAnterior} → ${newStatus}`)
        }
      ])
    } catch {
      // No fallar si el historial ya fue registrado por trigger
    }
  }

  const enriched = enrichOrdenTrabajo(updatedOt, equiposList)
  broadcastOtSyncEvent('UPDATE', enriched)
  return enriched
}

/**
 * 4. Actualizar datos complementarios de la Ficha de OT (técnico, solución, trabajo pendiente, prioridad, etc.)
 * Si incluye cambio de estado, delega obligatoriamente en changeOtStatus.
 */
export const updateOrdenTrabajoDetails = async (
  otId,
  updates = {},
  session = null,
  equiposList = []
) => {
  if (!otId) throw new Error('ID de OT requerido.')

  const nowIso = new Date().toISOString()
  const cleanUpdates = { updated_at: nowIso }

  if (updates.trabajo !== undefined) cleanUpdates.trabajo = String(updates.trabajo).trim()
  if (updates.tecnico !== undefined) cleanUpdates.tecnico = String(updates.tecnico).trim() || 'Sin asignar'
  if (updates.prioridad !== undefined) cleanUpdates.prioridad = updates.prioridad
  if (updates.ubicacion !== undefined) cleanUpdates.ubicacion = String(updates.ubicacion).trim() || null
  if (updates.area !== undefined) cleanUpdates.area = String(updates.area).trim() || null
  if (updates.equipo_id !== undefined) cleanUpdates.equipo_id = updates.equipo_id || null
  if (updates.solucion_definitiva !== undefined) {
    cleanUpdates.solucion_definitiva = String(updates.solucion_definitiva).trim() || null
  }
  if (updates.trabajo_pendiente !== undefined) {
    cleanUpdates.trabajo_pendiente = String(updates.trabajo_pendiente).trim() || null
  }
  if (updates.tipo_intervencion !== undefined) cleanUpdates.tipo_intervencion = updates.tipo_intervencion
  if (updates.es_falla !== undefined) cleanUpdates.es_falla = Boolean(updates.es_falla)
  if (updates.tipo_falla !== undefined) cleanUpdates.tipo_falla = updates.tipo_falla
  if (updates.condicion_linea !== undefined) cleanUpdates.condicion_linea = updates.condicion_linea
  if (updates.utilizo_repuestos !== undefined) cleanUpdates.utilizo_repuestos = Boolean(updates.utilizo_repuestos)
  if (updates.solicitante_nombre !== undefined) cleanUpdates.solicitante_nombre = updates.solicitante_nombre
  if (updates.solicitante_area !== undefined) cleanUpdates.solicitante_area = updates.solicitante_area
  if (updates.fecha_hora_inicio_trabajo !== undefined) cleanUpdates.fecha_hora_inicio_trabajo = updates.fecha_hora_inicio_trabajo
  if (updates.fecha_hora_fin_trabajo !== undefined) cleanUpdates.fecha_hora_fin_trabajo = updates.fecha_hora_fin_trabajo

  const { data, error } = await supabase
    .from('orden_trabajo')
    .update(cleanUpdates)
    .eq('id', otId)
    .select(`
      *,
      equipo:equipo_id (
        id,
        codigo,
        nombre,
        area,
        ubicacion
      )
    `)
    .single()

  if (error) {
    if (isFallbackEligibleError(error)) {
      const currentList = getOrSeedLocalOrdenes(equiposList)
      const idx = currentList.findIndex((item) => item.id === otId)
      if (idx === -1) throw new Error('OT no encontrada.')

      const existing = currentList[idx]
      // Regla 5: si ya está Finalizada, no permitir dejar vacía la solución definitiva
      if (
        existing.estado === 'Finalizada' &&
        cleanUpdates.solucion_definitiva !== undefined &&
        !cleanUpdates.solucion_definitiva
      ) {
        throw new Error('Una OT Finalizada debe mantener su solución definitiva.')
      }

      const updated = enrichOrdenTrabajo({ ...existing, ...cleanUpdates }, equiposList)
      const nextList = [...currentList]
      nextList[idx] = updated
      saveLocalOrdenes(nextList)
      broadcastOtSyncEvent('UPDATE', updated)
      return updated
    }
    throw new Error(error.message || 'No fue posible guardar los cambios de la OT.')
  }

  const enriched = enrichOrdenTrabajo(data, equiposList)
  broadcastOtSyncEvent('UPDATE', enriched)
  return enriched
}

/**
 * 5. Consultar historial de auditoría de estados de una OT (public.orden_trabajo_estado_historial)
 */
export const fetchOtHistorialEstados = async (otId) => {
  if (!otId) return []
  try {
    const { data, error } = await supabase
      .from('orden_trabajo_estado_historial')
      .select('*')
      .eq('ot_id', otId)
      .order('fecha_hora', { ascending: false })

    if (error) {
      if (isFallbackEligibleError(error)) {
        return getLocalHistorial()
          .filter((h) => h.ot_id === otId)
          .sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime())
      }
      return []
    }
    return data || []
  } catch {
    return getLocalHistorial()
      .filter((h) => h.ot_id === otId)
      .sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime())
  }
}

/**
 * 6. Suscripción en Tiempo Real a public.orden_trabajo (Regla 10)
 * Escucha INSERT, UPDATE, DELETE en Supabase Realtime + sincronización instantánea entre pestañas/sesiones.
 */
export const subscribeToOrdenesTrabajoRealtime = ({
  onDatabaseChange,
  onChange,
  onStatusChange = () => {}
} = {}) => {
  const handleChangeCallback = onDatabaseChange || onChange || (() => {})
  // Este despliegue no tiene el servicio Realtime de Supabase: se consulta cada 15 s (solo con la pestaña visible) y el
  // callback hace una sincronización silenciosa. Sin WebSocket no hay errores de conexión en consola.
  onStatusChange('SUBSCRIBED')
  const sondeo = setInterval(() => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      handleChangeCallback({ source: 'polling', eventType: 'POLL' })
    }
  }, 15000)

  // Canal de sincronización instantánea entre sesiones/pestañas del navegador
  let broadcastChannel = null
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(REALTIME_BROADCAST_CHANNEL)
      broadcastChannel.onmessage = (event) => {
        if (event?.data) {
          handleChangeCallback({
            source: 'broadcast_channel',
            eventType: event.data.type,
            newRecord: event.data.record
          })
        }
      }
    }
  } catch {
    // ignore
  }

  const handleStorageEvent = (e) => {
    if (e.key === LOCAL_OT_STORAGE_KEY || e.key === LOCAL_HISTORIAL_STORAGE_KEY) {
      handleChangeCallback({
        source: 'storage_event',
        eventType: 'STORAGE_SYNC'
      })
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent)
  }

  return () => {
    clearInterval(sondeo)
    try {
      if (broadcastChannel) broadcastChannel.close()
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageEvent)
    }
  }
}

/**
 * 7. Cálculo de Métricas del Dashboard conectadas directamente a orden_trabajo.estado (Reglas 17, 18, 19)
 *
 * - Regla 17: COUNT WHERE estado = 'Pendiente' | 'En curso' | 'Finalizada' (sin contadores manuales)
 * - Regla 18: OT Finalizadas del período utiliza estrictamente fecha_finalizacion dentro de dateRange
 * - Regla 19: OT Pendientes actuales y OT En curso actuales muestran el estado operacional actual
 *             independientemente del filtro temporal, respetando filtros estructurales (área, equipo, técnico).
 */
export const calculateOtDashboardMetrics = (
  ordenesList = [],
  dateRange = { start: null, end: null },
  structuralFilters = {}
) => {
  const { area = '', equipoId = '', tecnico = '' } = structuralFilters

  // Filtrar por atributos estructurales (área, equipo, técnico) si están activos
  const structurallyFiltered = (ordenesList || []).filter((ot) => {
    if (area) {
      const otArea = (ot.area || ot.equipo?.area || ot.ubicacion || '').toLowerCase()
      if (!otArea.includes(area.toLowerCase())) return false
    }
    if (equipoId) {
      if (ot.equipo_id !== equipoId) return false
    }
    if (tecnico) {
      const tecs = parseTecnicos(ot.tecnico)
      const match = tecs.some((t) => t.toLowerCase() === tecnico.toLowerCase())
      if (!match && !(ot.tecnico || '').toLowerCase().includes(tecnico.toLowerCase())) {
        return false
      }
    }
    return true
  })

  // Reglas 17 y 19: Indicadores operacionales actuales (independientes del filtro temporal)
  let pendientesActuales = 0
  let enCursoActuales = 0
  let finalizadasTotalesActuales = 0

  // Regla 18: OT Finalizadas del período según fecha_finalizacion
  let finalizadasEnPeriodo = 0
  let reportadasEnPeriodo = 0

  const hasDateFilter = Boolean(dateRange?.start || dateRange?.end)

  structurallyFiltered.forEach((ot) => {
    if (ot.estado === 'Pendiente') pendientesActuales++
    else if (ot.estado === 'En curso') enCursoActuales++
    else if (ot.estado === 'Finalizada') finalizadasTotalesActuales++

    // Conteo histórico de OT cerradas en el período usando exclusivamente fecha_finalizacion (Regla 18)
    if (ot.estado === 'Finalizada' && ot.fecha_finalizacion) {
      const fFin = new Date(ot.fecha_finalizacion)
      if (!isNaN(fFin.getTime())) {
        const afterStart = !dateRange?.start || fFin >= dateRange.start
        const beforeEnd = !dateRange?.end || fFin < dateRange.end
        if (afterStart && beforeEnd) {
          finalizadasEnPeriodo++
        }
      }
    } else if (ot.estado === 'Finalizada' && !hasDateFilter) {
      finalizadasEnPeriodo++
    }

    // Conteo histórico de OT reportadas en el período según fecha_reporte
    if (ot.fecha_reporte) {
      const fRep = new Date(ot.fecha_reporte)
      if (!isNaN(fRep.getTime())) {
        const afterStart = !dateRange?.start || fRep >= dateRange.start
        const beforeEnd = !dateRange?.end || fRep < dateRange.end
        if (afterStart && beforeEnd) {
          reportadasEnPeriodo++
        }
      }
    }
  })

  return {
    pendientesActuales,
    enCursoActuales,
    finalizadasTotalesActuales,
    finalizadasTotales: finalizadasTotalesActuales,
    abiertasActuales: pendientesActuales + enCursoActuales,
    finalizadasEnPeriodo,
    finalizadasPeriodo: finalizadasEnPeriodo,
    reportadasEnPeriodo,
    totalOrdenes: structurallyFiltered.length
  }
}

/**
 * 6. Consultar repuestos consumidos en una Orden de Trabajo (public.orden_trabajo_repuesto)
 */
export const fetchRepuestosDeOt = async (otId) => {
  if (!otId) return []
  try {
    const { data, error } = await supabase
      .from('orden_trabajo_repuesto')
      .select(`
        id,
        ot_id,
        repuesto_id,
        cantidad,
        precio_unitario,
        registrado_por,
        created_at,
        repuesto:repuesto_id (
          id,
          codigo,
          nombre,
          unidad_medida,
          precio_compra
        )
      `)
      .eq('ot_id', otId)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('Error al consultar repuestos de OT:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.warn('Excepción al consultar repuestos de OT:', err)
    return []
  }
}

/**
 * 7. Registrar consumo de repuesto en una Orden de Trabajo con deducción de stock en inventario
 */
export const consumirRepuestoEnOt = async ({ otId, repuestoId, cantidad, tecnico }) => {
  if (!otId || !repuestoId || !cantidad || Number(cantidad) <= 0) {
    throw new Error('Debe especificar un repuesto válido y una cantidad mayor a 0.')
  }
  const cantNum = Number(cantidad)

  const { data, error } = await supabase.rpc('consumir_repuesto_ot', {
    p_ot_id: otId,
    p_repuesto_id: repuestoId,
    p_cantidad: cantNum,
    p_tecnico: tecnico || 'Técnico'
  })

  if (error) {
    throw new Error(error.message || 'No fue posible registrar el consumo del repuesto.')
  }
  return data
}
