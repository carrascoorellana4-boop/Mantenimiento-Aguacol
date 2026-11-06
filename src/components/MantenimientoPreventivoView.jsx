import { useState, useEffect, useMemo, useRef } from 'react'
import Icon from './Icon'
import './MantenimientoPreventivo.css'
import {
  MAQUINAS_PREVENTIVO,
  FAMILIAS_PREVENTIVO,
  getTareasPorMaquina,
  getHistorialEjecuciones,
  subirEvidencia,
  iniciarEjecucionTarea,
  cerrarEjecucionTarea,
  guardarProgresoTarea,
  calcularHorasTurnoMantenimiento,
  formatHorasTurno,
  crearOtPorHallazgoPreventivo,
} from '../services/preventivoService'

const formatFechaHora = (val) => {
  if (!val) return '—'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)
  } catch {
    return String(val)
  }
}

export default function MantenimientoPreventivoView({
  session,
  _isAdmin = false,
  isOperator = false,
  operatorArea = null,
  onBack,
}) {
  // Estado de navegación: null = selector de máquinas, o máquina seleccionada { id, codigo, nombre, titulo, alias, familia, ... }
  const [selectedMaquina, setSelectedMaquina] = useState(null)
  const [selectedFamilia, setSelectedFamilia] = useState(isOperator && operatorArea ? operatorArea : 'Todas')

  useEffect(() => {
    if (isOperator && operatorArea) {
      setSelectedFamilia(operatorArea)
    }
  }, [isOperator, operatorArea])
  const [activeTab, setActiveTab] = useState('plan') // 'plan' | 'historial'

  // Datos
  const [tareas, setTareas] = useState([])
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Filtro en lista de tareas
  const [searchFilter, setSearchFilter] = useState('')
  const [frecuenciaFilter, setFrecuenciaFilter] = useState('todas')

  // Modal de ejecución
  const [ejecutarModalTarea, setEjecutarModalTarea] = useState(null)
  const [activeEjecucion, setActiveEjecucion] = useState(null)
  const [observaciones, setObservaciones] = useState('')
  const [condicionEquipo, setCondicionEquipo] = useState('sin_observaciones') // 'sin_observaciones' | 'con_observaciones'
  const [evidenciasAdjuntas, setEvidenciasAdjuntas] = useState([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [savingEjecucion, setSavingEjecucion] = useState(false)
  const [confirmStep, setConfirmStep] = useState(false)

  // Modal de visualización de evidencia (Lightbox)
  const [lightboxItem, setLightboxItem] = useState(null) // { tipo: 'Foto' | 'Video', url, nombre }

  // Inputs ocultos para captura/subida
  const fotoCamaraRef = useRef(null)
  const fotoArchivoRef = useRef(null)
  const videoCamaraRef = useRef(null)
  const videoArchivoRef = useRef(null)

  // Cronómetro en vivo mientras la tarea esté 'En curso'
  const [liveNow, setLiveNow] = useState(Date.now())

  useEffect(() => {
    if (!ejecutarModalTarea || activeEjecucion?.estado !== 'En curso') return
    const timer = setInterval(() => {
      setLiveNow(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [ejecutarModalTarea, activeEjecucion?.estado])

  const formatCronometroEnVivo = (fechaInicio) => {
    if (!fechaInicio) return '00:00'
    const startMs = new Date(fechaInicio).getTime()
    if (isNaN(startMs)) return '00:00'
    const diffSec = Math.max(0, Math.floor((liveNow - startMs) / 1000))
    const hrs = Math.floor(diffSec / 3600)
    const mins = Math.floor((diffSec % 3600) / 60)
    const secs = diffSec % 60
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Cargar tareas al seleccionar máquina
  useEffect(() => {
    if (!selectedMaquina) return

    let isMounted = true
    setLoading(true)
    setErrorMsg('')

    Promise.all([
      getTareasPorMaquina(selectedMaquina.codigo),
      getHistorialEjecuciones(selectedMaquina.codigo),
    ])
      .then(([tareasRes, histRes]) => {
        if (!isMounted) return
        setTareas(tareasRes.tareas || [])
        setHistorial(histRes.ejecuciones || [])
      })
      .catch((err) => {
        if (!isMounted) return
        setErrorMsg('Error al cargar datos del plan: ' + (err?.message || err))
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedMaquina])

  // Mapa de la última ejecución por tarea (para saber si está 'En curso', 'Realizada' o 'Pendiente')
  const ejecucionesPorTarea = useMemo(() => {
    const map = new Map()
    for (const h of historial) {
      const keyId = h.tarea_id
      const keyNom = h.tarea?.tarea || h.tarea
      if (keyId && !map.has(keyId)) map.set(keyId, h)
      if (keyNom && !map.has(keyNom)) map.set(keyNom, h)
    }
    return map
  }, [historial])

  // Máquinas visibles según la familia seleccionada (o área obligatoria del operador tablet)
  const maquinasVisibles = useMemo(() => {
    if (isOperator && operatorArea) {
      return MAQUINAS_PREVENTIVO.filter(
        (m) => m.familia.toLowerCase() === operatorArea.toLowerCase()
      )
    }
    if (!selectedFamilia || selectedFamilia === 'Todas') {
      return MAQUINAS_PREVENTIVO
    }
    return MAQUINAS_PREVENTIVO.filter((m) => m.familia === selectedFamilia)
  }, [selectedFamilia, isOperator, operatorArea])

  // Conteo de máquinas por familia
  const conteoFamilias = useMemo(() => {
    const counts = { Todas: MAQUINAS_PREVENTIVO.length }
    for (const m of MAQUINAS_PREVENTIVO) {
      counts[m.familia] = (counts[m.familia] || 0) + 1
    }
    return counts
  }, [])

  // Lista de frecuencias únicas para el filtro
  const frecuenciasDisponibles = useMemo(() => {
    const s = new Set()
    for (const t of tareas) {
      if (t.frecuencia) s.add(t.frecuencia.trim())
    }
    return Array.from(s).sort()
  }, [tareas])

  // Tareas filtradas (si es operador en Tablet, filtrar estrictamente tareas donde responsable sea 'Operador')
  const filteredTareas = useMemo(() => {
    return tareas.filter((t) => {
      if (isOperator) {
        const resp = (t.responsable || '').toLowerCase()
        if (!resp.includes('operador')) return false
      }
      if (frecuenciaFilter !== 'todas' && t.frecuencia !== frecuenciaFilter) {
        return false
      }
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase()
        const matchTarea = (t.tarea || '').toLowerCase().includes(q)
        const matchResp = (t.responsable || '').toLowerCase().includes(q)
        const matchFrec = (t.frecuencia || '').toLowerCase().includes(q)
        const matchSist = (t.sistema || '').toLowerCase().includes(q)
        return matchTarea || matchResp || matchFrec || matchSist
      }
      return true
    })
  }, [tareas, searchFilter, frecuenciaFilter, isOperator])

  // Abrir modal de ejecución
  const handleOpenEjecutar = (tarea) => {
    const ejec = ejecucionesPorTarea.get(tarea.id) || ejecucionesPorTarea.get(tarea.tarea) || null
    setEjecutarModalTarea(tarea)
    setActiveEjecucion(ejec)
    const prevObs = ejec?.observaciones || ''
    setObservaciones(prevObs)
    if (prevObs && !prevObs.toLowerCase().includes('sin observaciones')) {
      setCondicionEquipo('con_observaciones')
    } else {
      setCondicionEquipo('sin_observaciones')
    }
    setEvidenciasAdjuntas(
      (ejec?.evidencias || []).map((ev) => ({
        ...ev,
        alreadySaved: true,
      }))
    )
    setConfirmStep(false)
    setErrorMsg('')
  }

  // Cerrar modal de ejecución
  const handleCloseEjecutar = () => {
    if (savingEjecucion || uploadingMedia) return
    setEjecutarModalTarea(null)
    setActiveEjecucion(null)
    setObservaciones('')
    setCondicionEquipo('sin_observaciones')
    setEvidenciasAdjuntas([])
    setConfirmStep(false)
  }

  // Iniciar tarea preventiva (registra automáticamente la hora de comienzo)
  const handleIniciarTarea = async () => {
    if (!ejecutarModalTarea || !selectedMaquina) return

    setSavingEjecucion(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const res = await iniciarEjecucionTarea({
        tarea: ejecutarModalTarea,
        codigo_equipo: selectedMaquina.codigo,
        session,
      })

      setActiveEjecucion(res.ejecucion)
      setSuccessMsg('Tarea preventiva iniciada. Hora de comienzo registrada automáticamente.')

      // Recargar historial
      const updatedHist = await getHistorialEjecuciones(selectedMaquina.codigo)
      setHistorial(updatedHist.ejecuciones || [])
    } catch (err) {
      setErrorMsg('Error al iniciar tarea: ' + (err?.message || err))
    } finally {
      setSavingEjecucion(false)
    }
  }

  // Guardar avance intermedio (fotos/notas) sin cerrar la tarea
  const handleGuardarAvance = async () => {
    if (!activeEjecucion) return
    setSavingEjecucion(true)
    setErrorMsg('')
    try {
      await guardarProgresoTarea({
        ejecucionId: activeEjecucion.id,
        observaciones,
        evidencias: evidenciasAdjuntas,
      })
      setSuccessMsg('Avance de tarea guardado correctamente.')
      const updatedHist = await getHistorialEjecuciones(selectedMaquina.codigo)
      setHistorial(updatedHist.ejecuciones || [])
    } catch (err) {
      setErrorMsg('Error al guardar avance: ' + (err?.message || err))
    } finally {
      setSavingEjecucion(false)
    }
  }

  // Cerrar y finalizar tarea:
  // Si conObservaciones === true -> valida comentario, cierra y crea automáticamente una OT en estado Pendiente
  // Si conObservaciones === false -> cierra como conforme, no crea OT y sube al historial preventivo
  const handleCerrarTarea = async (conObservaciones = false) => {
    if (!selectedMaquina || !ejecutarModalTarea) return

    if (conObservaciones && !observaciones.trim()) {
      setErrorMsg('Debes explicar en el cuadro de comentarios qué problema se detectó y qué se debe solucionar.')
      return
    }

    setSavingEjecucion(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      let currentEjec = activeEjecucion
      // Si aún no se había marcado inicio, iniciarlo de inmediato
      if (!currentEjec) {
        const initRes = await iniciarEjecucionTarea({
          tarea: ejecutarModalTarea,
          codigo_equipo: selectedMaquina.codigo,
          session,
        })
        currentEjec = initRes.ejecucion
      }

      const obsFinal = conObservaciones
        ? observaciones.trim()
        : 'Equipo sin observaciones de funcionamiento. Inspección preventiva conforme.'

      const res = await cerrarEjecucionTarea({
        ejecucionId: currentEjec.id,
        tarea: ejecutarModalTarea,
        codigo_equipo: selectedMaquina.codigo,
        fecha_hora_inicio: currentEjec.fecha_hora_inicio,
        observaciones: obsFinal,
        evidencias: evidenciasAdjuntas,
        session,
      })

      let otData = null
      // Si tiene observaciones, generar inmediatamente una Orden de Trabajo en Pendientes
      if (conObservaciones) {
        otData = await crearOtPorHallazgoPreventivo({
          codigo_equipo: selectedMaquina.codigo,
          tarea_codigo: ejecutarModalTarea.id_tarea_fuente || '',
          tarea_nombre: ejecutarModalTarea.tarea || '',
          observacion: obsFinal,
          session,
          evidencias: evidenciasAdjuntas,
        })
      }

      if (otData?.codigo_ot) {
        setSuccessMsg(
          `¡Inspección finalizada con observaciones! Se generó automáticamente la Orden de Trabajo N° ${otData.codigo_ot} en estado Pendiente para revisión.`
        )
      } else {
        setSuccessMsg(
          `¡Inspección preventiva conforme finalizada con éxito! Hora de cierre registrada (${formatHorasTurno(res.horasEfectivas)} computables).`
        )
      }

      const updatedHist = await getHistorialEjecuciones(selectedMaquina.codigo)
      setHistorial(updatedHist.ejecuciones || [])

      handleCloseEjecutar()
      setActiveTab('historial')
    } catch (err) {
      setErrorMsg('Error al finalizar tarea preventiva: ' + (err?.message || err))
    } finally {
      setSavingEjecucion(false)
    }
  }

  // Manejar subida o captura de archivo (Foto / Video)
  const handleFileSelected = async (e, tipo) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingMedia(true)
    setErrorMsg('')

    try {
      let evidenciaSubida = null
      const token = session?.access_token

      try {
        evidenciaSubida = await subirEvidencia(file, token)
      } catch (uploadErr) {
        console.warn('Fallo upload al servidor, creando preview local:', uploadErr)
        const localUrl = URL.createObjectURL(file)
        evidenciaSubida = {
          url: localUrl,
          filename: file.name,
          nombre_original: file.name,
          tipo,
          tamano_bytes: file.size,
          mime_type: file.type,
          isLocalBlob: true,
        }
      }

      setEvidenciasAdjuntas((prev) => [
        ...prev,
        {
          id: crypto.randomUUID ? crypto.randomUUID() : `ev-${Date.now()}`,
          tipo,
          url: evidenciaSubida.url,
          filename: evidenciaSubida.filename || file.name,
          nombre_original: evidenciaSubida.nombre_original || file.name,
          tamano_bytes: file.size,
          mime_type: file.type,
          isLocalBlob: !!evidenciaSubida.isLocalBlob,
          alreadySaved: false,
        },
      ])
    } catch (err) {
      setErrorMsg('No se pudo procesar el archivo: ' + (err?.message || err))
    } finally {
      setUploadingMedia(false)
      e.target.value = ''
    }
  }

  const handleRemoveEvidencia = (id) => {
    setEvidenciasAdjuntas((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <div className="mp-container">
      {/* CABECERA PRINCIPAL */}
      <header className="mp-header">
        <div className="mp-header-top">
          <div className="mp-title-wrap">
            {selectedMaquina ? (
              <button
                type="button"
                className="mp-btn-back"
                onClick={() => setSelectedMaquina(null)}
                title="Volver a lista de máquinas"
              >
                <Icon n="left" size="1.1em" /> Volver a Máquinas
              </button>
            ) : (
              onBack && (
                <button
                  type="button"
                  className="mp-btn-back"
                  onClick={onBack}
                  title="Volver al inicio"
                >
                  <Icon n="left" size="1.1em" /> Inicio
                </button>
              )
            )}
            <h1 className="mp-title">
              {selectedMaquina
                ? `${selectedMaquina.nombre} (${selectedMaquina.alias})`
                : 'Mantenimiento Preventivo'}
            </h1>
          </div>
          <span className="mp-badge-tag">
            <Icon n="calendar-check" size="1em" /> Módulo Activo
          </span>
        </div>
        <p className="mp-subtitle">
          {selectedMaquina
            ? `${selectedMaquina.codigo} • ${selectedMaquina.familia} • Registro automático de horas de comienzo, cierre y horas efectivas de turno.`
            : 'Planificación, ejecución y seguimiento de actividades preventivas por equipo según el Árbol de Activos.'}
        </p>
      </header>

      {/* MENSAJES DE ESTADO */}
      {errorMsg && (
        <div className="notice-banner notice-banner-error" role="alert">
          <Icon n="warn" />
          <span>{errorMsg}</span>
          <button type="button" className="notice-banner-close" onClick={() => setErrorMsg('')}>
            <Icon n="x" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="notice-banner notice-banner-success" role="status">
          <Icon n="check" />
          <span>{successMsg}</span>
          <button type="button" className="notice-banner-close" onClick={() => setSuccessMsg('')}>
            <Icon n="x" />
          </button>
        </div>
      )}

      {/* =========================================================================
          VISTA 1: SELECTOR DE MÁQUINAS (PLAN CONSOLIDADO COMPLETO)
         ========================================================================= */}
      {!selectedMaquina && (
        <>
          {isOperator ? (
            <div className="mp-tablet-operator-banner">
              <div className="mp-tablet-badge">
                <Icon n="tool" size="1.1em" /> TABLET EN PLANTA
              </div>
              <div className="mp-tablet-details">
                <h2 className="mp-tablet-title">Operador de {operatorArea || 'Planta'}</h2>
                <p className="mp-tablet-subtitle">
                  Checklist y tareas preventivas asignadas exclusivamente al operador. Selecciona la máquina para registrar inicio, observaciones, evidencias fotográficas/video y cierre.
                </p>
              </div>
              <div className="mp-tablet-user-pill">
                <Icon n="user" size="0.95em" />
                <span>{session?.user?.email || 'operador@aguacol.cl'}</span>
              </div>
            </div>
          ) : (
            <div className="mp-family-bar">
            {FAMILIAS_PREVENTIVO.map((fam) => {
              const count = conteoFamilias[fam] || 0
              const isActive = selectedFamilia === fam
              return (
                <button
                  key={fam}
                  type="button"
                  className={`mp-family-pill ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedFamilia(fam)}
                >
                  <Icon
                    n={
                      fam === 'Extrusión'
                        ? 'zap'
                        : fam === 'Inyección'
                        ? 'settings'
                        : fam === 'Soplado'
                        ? 'tool'
                        : 'list'
                    }
                    size="1em"
                  />
                  {fam} ({count})
                </button>
              )
            })}
          </div>
          )}

          <div className="mp-machines-grid">
            {maquinasVisibles.map((maq) => (
              <div
                key={maq.id}
                className="mp-machine-card"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMaquina(maq)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedMaquina(maq)}
              >
                <div className="mp-machine-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="mp-machine-badge">{maq.alias}</span>
                    <span className="mp-badge-tag" style={{ fontSize: '0.7rem' }}>
                      {maq.familia}
                    </span>
                  </div>
                  {maq.diaVentana && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: '#94a3b8',
                        background: 'rgba(255, 255, 255, 0.06)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      {maq.diaVentana}
                    </span>
                  )}
                </div>

                <div className="mp-machine-body">
                  <h3 className="mp-machine-name">{maq.nombre}</h3>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: '#38bdf8',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}
                  >
                    {maq.codigo}
                  </div>
                  {(maq.fabricante || maq.modelo) && (
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                      {maq.fabricante} {maq.modelo ? `· ${maq.modelo}` : ''}
                    </div>
                  )}
                  {maq.regimen && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        fontStyle: 'italic',
                        marginTop: '2px',
                      }}
                    >
                      {maq.regimen}
                    </div>
                  )}
                  <p className="mp-machine-tasks-count" style={{ marginTop: '0.5rem' }}>
                    <Icon n="list" size="0.9em" /> {isOperator ? 'Checklist / Preventivo Operador' : 'Tareas preventivas consolidadas'}
                  </p>
                </div>

                <div className="mp-machine-footer">
                  <span className="mp-machine-action">
                    Ver plan preventivo <span>→</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* =========================================================================
          VISTA 2: DETALLE DE MÁQUINA (PLAN PREVENTIVO E HISTORIAL)
         ========================================================================= */}
      {selectedMaquina && (
        <>
          {/* BARRA DE PESTAÑAS */}
          <div className="mp-tabs-bar">
            <button
              type="button"
              className={`mp-tab-btn ${activeTab === 'plan' ? 'active' : ''}`}
              onClick={() => setActiveTab('plan')}
            >
              <Icon n="list" size="1em" /> {isOperator ? 'Tareas Operador' : 'Plan preventivo'} ({filteredTareas.length})
            </button>
            <button
              type="button"
              className={`mp-tab-btn ${activeTab === 'historial' ? 'active' : ''}`}
              onClick={() => setActiveTab('historial')}
            >
              <Icon n="clock" size="1em" /> Historial ({historial.length})
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <Icon n="wait" size="1.5em" /> Cargando actividades del plan preventivo...
            </div>
          ) : (
            <>
              {/* PESTAÑA 1: PLAN PREVENTIVO */}
              {activeTab === 'plan' && (
                <>
                  <div className="mp-filter-bar">
                    <input
                      type="search"
                      className="mp-search-input"
                      placeholder="Buscar por tarea, responsable o frecuencia..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                    />
                    <select
                      className="mp-filter-select"
                      value={frecuenciaFilter}
                      onChange={(e) => setFrecuenciaFilter(e.target.value)}
                    >
                      <option value="todas">Todas las frecuencias</option>
                      {frecuenciasDisponibles.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mp-table-container">
                    <table className="mp-table">
                      <thead>
                        <tr>
                          <th style={{ width: '13%' }}>ID / Sistema</th>
                          <th style={{ width: '37%' }}>Actividad / Criterio</th>
                          <th style={{ width: '16%' }}>Frecuencia / Horas</th>
                          <th style={{ width: '16%' }}>Responsable / Condición</th>
                          <th style={{ width: '10%' }}>Estado</th>
                          <th style={{ width: '8%', textAlign: 'right' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTareas.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                              No se encontraron tareas con los filtros aplicados.
                            </td>
                          </tr>
                        ) : (
                          filteredTareas.map((item, idx) => {
                            const ejec = ejecucionesPorTarea.get(item.id) || ejecucionesPorTarea.get(item.tarea)
                            const isEnCurso = ejec?.estado === 'En curso'
                            const isRealizada = ejec?.estado === 'Realizada'
                            const idLabel = item.id_tarea_fuente || `T${String(idx + 1).padStart(2, '0')}`

                            return (
                              <tr key={item.id || `${item.codigo_equipo}-${idx}`}>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span
                                      className="mp-frec-badge"
                                      style={{
                                        alignSelf: 'flex-start',
                                        background: 'rgba(56, 189, 248, 0.15)',
                                        color: '#38bdf8',
                                        fontWeight: 700,
                                      }}
                                    >
                                      {idLabel}
                                    </span>
                                    {item.sistema && (
                                      <span className="mp-task-system" style={{ marginTop: 0 }}>
                                        {item.sistema}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <div className="mp-task-title">{item.tarea}</div>
                                  {item.criterio_registro && (
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
                                      <strong>Criterio:</strong> {item.criterio_registro}
                                    </div>
                                  )}
                                  {item.validacion_requerida && item.validacion_requerida !== 'Propuesta' && (
                                    <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '2px' }}>
                                      ⚡ {item.validacion_requerida}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span className="mp-frec-badge">{item.frecuencia}</span>
                                    {item.intervalo_h && (
                                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', paddingLeft: '4px' }}>
                                        Cada {item.intervalo_h} hrs
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span className="mp-resp-badge">{item.responsable}</span>
                                    {item.condicion_trabajo && (
                                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1', paddingLeft: '2px' }}>
                                        {item.condicion_trabajo}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  {isEnCurso ? (
                                    <span className="mp-status-pill encurso" title="Tarea iniciada por técnico">
                                      <Icon n="clock" size="0.85em" /> En curso
                                    </span>
                                  ) : isRealizada ? (
                                    <span className="mp-status-pill realizada">
                                      <Icon n="check" size="0.85em" /> Realizada
                                    </span>
                                  ) : (
                                    <span className="mp-status-pill pendiente">
                                      Pendiente
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {isEnCurso ? (
                                    <button
                                      type="button"
                                      className="mp-btn-execute"
                                      style={{ background: '#f59e0b' }}
                                      onClick={() => handleOpenEjecutar(item)}
                                      title="Tarea en curso: ingresar a continuar o cerrar"
                                    >
                                      <Icon n="clock" size="0.9em" /> Continuar
                                    </button>
                                  ) : isRealizada ? (
                                    <button
                                      type="button"
                                      className="mp-btn-execute"
                                      style={{ background: '#0284c7' }}
                                      onClick={() => handleOpenEjecutar(item)}
                                    >
                                      <Icon n="check" size="0.9em" /> Ver
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="mp-btn-execute"
                                      onClick={() => handleOpenEjecutar(item)}
                                    >
                                      <Icon n="plus" size="0.9em" /> Iniciar
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* PESTAÑA 2: HISTORIAL */}
              {activeTab === 'historial' && (
                <div className="mp-history-list">
                  {historial.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '3rem',
                        background: 'rgba(30, 41, 59, 0.3)',
                        borderRadius: '12px',
                        border: '1px dashed rgba(255, 255, 255, 0.1)',
                        color: '#94a3b8',
                      }}
                    >
                      <Icon n="clock" size="2em" />
                      <p style={{ marginTop: '0.5rem', fontWeight: 500 }}>
                        No hay ejecuciones registradas para {selectedMaquina.nombre}.
                      </p>
                      <span style={{ fontSize: '0.85rem' }}>
                        Selecciona una tarea de la pestaña &quot;Plan preventivo&quot; para iniciar la ejecución y registrar los tiempos de turno.
                      </span>
                    </div>
                  ) : (
                    historial.map((ej) => {
                      const tareaTexto =
                        ej.tarea?.tarea || ej.tarea_nombre || ej.tarea || 'Mantenimiento Preventivo Ejecutado'
                      const frecTexto = ej.tarea?.frecuencia || ej.frecuencia || 'Preventivo'
                      const evidencias = ej.evidencias || []
                      const horasEfectivas = ej.horas_efectivas_turno || calcularHorasTurnoMantenimiento(ej.fecha_hora_inicio || ej.fecha_ejecucion, ej.fecha_hora_cierre || new Date())

                      return (
                        <div key={ej.id} className="mp-history-card">
                          <div className="mp-history-header">
                            <span className="mp-history-date">
                              <Icon n="calendar" size="0.9em" /> {formatFechaHora(ej.fecha_hora_inicio || ej.fecha_ejecucion)}
                            </span>
                            <span
                              className={`mp-status-pill ${
                                ej.estado === 'En curso' ? 'encurso' : 'realizada'
                              }`}
                            >
                              <Icon n={ej.estado === 'En curso' ? 'clock' : 'done'} size="0.9em" />
                              {ej.estado || 'Realizada'}
                            </span>
                          </div>

                          <h4 className="mp-history-task">{tareaTexto}</h4>

                          {/* RECUADRO DE HORARIOS Y TIEMPOS DE TURNO EN HISTORIAL */}
                          <div className="mp-timer-box" style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                              <div>
                                <span className="mp-timer-label">Hora de Comienzo</span>
                                <div style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 600 }}>
                                  {formatFechaHora(ej.fecha_hora_inicio || ej.fecha_ejecucion)}
                                </div>
                              </div>

                              <div>
                                <span className="mp-timer-label">Hora de Cierre</span>
                                <div style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 600 }}>
                                  {ej.fecha_hora_cierre ? formatFechaHora(ej.fecha_hora_cierre) : 'En ejecución'}
                                </div>
                              </div>

                              <div>
                                <span className="mp-timer-label">Tiempo Computable en Turno</span>
                                <div style={{ color: '#38bdf8', fontSize: '0.9rem', fontWeight: 700 }}>
                                  {formatHorasTurno(horasEfectivas)}
                                </div>
                              </div>

                              <div>
                                <span className="mp-timer-label">Técnico / Responsable</span>
                                <div style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 600 }}>
                                  {ej.tecnico_nombre || ej.ejecutado_por_email || 'Técnico Mantenimiento'}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mp-history-meta">
                            <span>
                              <strong>Frecuencia:</strong> {frecTexto}
                            </span>
                            {evidencias.length > 0 && (
                              <span>
                                <strong>Evidencias:</strong> {evidencias.length} archivo(s)
                              </span>
                            )}
                          </div>

                          {ej.observaciones && (
                            <div style={{ marginTop: '0.6rem' }}>
                              <div className={`mp-history-result-badge ${(ej.observaciones || '').toLowerCase().includes('sin observaciones') ? 'badge-ok' : 'badge-alert'}`}>
                                <Icon n={(ej.observaciones || '').toLowerCase().includes('sin observaciones') ? 'check' : 'warn'} size="0.95em" />
                                <span>{(ej.observaciones || '').toLowerCase().includes('sin observaciones') ? 'Inspección Conforme' : 'Con Observaciones (OT Generada)'}</span>
                              </div>
                              <p className="mp-history-comment" style={{ marginTop: '0.4rem' }}>
                                <strong>Observaciones:</strong> {ej.observaciones}
                              </p>
                            </div>
                          )}

                          {evidencias.length > 0 && (
                            <div className="mp-history-evidencias">
                              {evidencias.map((ev, evIdx) => (
                                <div
                                  key={ev.id || evIdx}
                                  className="mp-evidencia-thumb"
                                  title={`Ver ${ev.tipo === 'Video' ? 'video' : 'foto'}`}
                                  onClick={() =>
                                    setLightboxItem({
                                      tipo: ev.tipo === 'Video' ? 'Video' : 'Foto',
                                      url: ev.url,
                                      nombre: ev.nombre_original || 'Evidencia adjunta',
                                    })
                                  }
                                >
                                  {ev.tipo === 'Video' ? (
                                    <>
                                      <video src={ev.url} preload="metadata" />
                                      <div className="mp-video-thumb-overlay">▶</div>
                                    </>
                                  ) : (
                                    <img src={ev.url} alt="Evidencia" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* =========================================================================
          MODAL 1: EJECUTAR TAREA PREVENTIVA CON CONTROL DE TIEMPO
         ========================================================================= */}
      {ejecutarModalTarea && (
        <div
          className="mp-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseEjecutar()
          }}
        >
          <div className="mp-modal-window" role="dialog" aria-modal="true" aria-labelledby="mp-modal-title">
            <div className="mp-modal-header">
              <h2 id="mp-modal-title" className="mp-modal-title">
                <Icon n="calendar-check" size="1.2em" />
                {activeEjecucion?.estado === 'En curso'
                  ? 'Tarea Preventiva en Ejecución'
                  : activeEjecucion?.estado === 'Realizada'
                  ? 'Detalle de Tarea Realizada'
                  : 'Iniciar Tarea Preventiva'}
              </h2>
              <button
                type="button"
                className="mp-modal-close-btn"
                onClick={handleCloseEjecutar}
                disabled={savingEjecucion}
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <div className="mp-modal-content">
              {/* DETALLE EXACTO DE LA TAREA */}
              <div className="mp-task-detail-box">
                <div className="mp-detail-row">
                  <span className="mp-detail-label">Máquina:</span>
                  <span className="mp-detail-value">
                    <strong>{selectedMaquina?.nombre}</strong> ({selectedMaquina?.codigo}) ·{' '}
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>{selectedMaquina?.alias}</span> ·{' '}
                    {selectedMaquina?.familia}
                  </span>
                </div>
                <div className="mp-detail-row">
                  <span className="mp-detail-label">Tarea / ID:</span>
                  <span className="mp-detail-value">
                    <span
                      className="mp-frec-badge"
                      style={{
                        marginRight: '6px',
                        background: 'rgba(56, 189, 248, 0.2)',
                        color: '#38bdf8',
                        fontWeight: 700,
                      }}
                    >
                      {ejecutarModalTarea.id_tarea_fuente || 'Tarea'}
                    </span>
                    <strong>{ejecutarModalTarea.tarea}</strong>
                  </span>
                </div>
                {ejecutarModalTarea.sistema && (
                  <div className="mp-detail-row">
                    <span className="mp-detail-label">Sistema:</span>
                    <span className="mp-detail-value">{ejecutarModalTarea.sistema}</span>
                  </div>
                )}
                <div className="mp-detail-row">
                  <span className="mp-detail-label">Frecuencia:</span>
                  <span className="mp-detail-value">
                    <span className="mp-frec-badge">{ejecutarModalTarea.frecuencia}</span>
                    {ejecutarModalTarea.intervalo_h && (
                      <span style={{ marginLeft: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
                        (Intervalo: {ejecutarModalTarea.intervalo_h} horas)
                      </span>
                    )}
                  </span>
                </div>
                <div className="mp-detail-row">
                  <span className="mp-detail-label">Responsable:</span>
                  <span className="mp-detail-value">
                    <span className="mp-resp-badge">{ejecutarModalTarea.responsable}</span>
                  </span>
                </div>
                {ejecutarModalTarea.condicion_trabajo && (
                  <div className="mp-detail-row">
                    <span className="mp-detail-label">Condición:</span>
                    <span className="mp-detail-value" style={{ color: '#cbd5e1' }}>
                      {ejecutarModalTarea.condicion_trabajo}
                    </span>
                  </div>
                )}
                {ejecutarModalTarea.criterio_registro && (
                  <div className="mp-detail-row">
                    <span className="mp-detail-label">Criterio / Registro:</span>
                    <span className="mp-detail-value" style={{ color: '#e2e8f0' }}>
                      {ejecutarModalTarea.criterio_registro}
                    </span>
                  </div>
                )}
                {ejecutarModalTarea.validacion_requerida &&
                  ejecutarModalTarea.validacion_requerida !== 'Propuesta' && (
                    <div className="mp-detail-row">
                      <span className="mp-detail-label">Validación:</span>
                      <span className="mp-detail-value" style={{ color: '#fbbf24' }}>
                        ⚡ {ejecutarModalTarea.validacion_requerida}
                      </span>
                    </div>
                  )}
              </div>

              {/* =================================================================
                  RECUADRO DE HORARIOS Y CONTROL AUTOMÁTICO DE TIEMPO
                 ================================================================= */}
              <div className="mp-timer-box">
                <div className="mp-timer-header">
                  <h4 className="mp-timer-title">
                    <Icon n="clock" /> Control Horario de Mantenimiento
                  </h4>
                  <span
                    className={`mp-status-pill ${
                      activeEjecucion?.estado === 'En curso'
                        ? 'encurso'
                        : activeEjecucion?.estado === 'Realizada'
                        ? 'realizada'
                        : 'pendiente'
                    }`}
                  >
                    {activeEjecucion?.estado === 'En curso'
                      ? 'En curso'
                      : activeEjecucion?.estado === 'Realizada'
                      ? 'Cerrada'
                      : 'No iniciada'}
                  </span>
                </div>

                <div className="mp-timer-grid">
                  <div className="mp-timer-item">
                    <span className="mp-timer-label">Hora de Comienzo</span>
                    <span className="mp-timer-val">
                      {activeEjecucion?.fecha_hora_inicio
                        ? formatFechaHora(activeEjecucion.fecha_hora_inicio)
                        : 'Automática al pulsar Iniciar'}
                    </span>
                  </div>

                  <div className="mp-timer-item">
                    <span className="mp-timer-label">Hora de Cierre</span>
                    <span className={`mp-timer-val ${activeEjecucion?.estado === 'En curso' ? 'active' : ''}`}>
                      {activeEjecucion?.fecha_hora_cierre
                        ? formatFechaHora(activeEjecucion.fecha_hora_cierre)
                        : activeEjecucion?.estado === 'En curso'
                        ? 'En curso (se registrará al cerrar)'
                        : 'Pendiente'}
                    </span>
                  </div>

                  <div className="mp-timer-item">
                    <span className="mp-timer-label">{activeEjecucion?.estado === 'En curso' ? 'Cronómetro en Vivo' : 'Tiempo Computable en Turno'}</span>
                    <span className="mp-timer-val" style={{ color: activeEjecucion?.estado === 'En curso' ? '#38bdf8' : '#34d399', fontFamily: activeEjecucion?.estado === 'En curso' ? 'monospace' : 'inherit' }}>
                      {activeEjecucion?.estado === 'En curso' ? (
                        <>⏱️ {formatCronometroEnVivo(activeEjecucion.fecha_hora_inicio)}</>
                      ) : activeEjecucion?.fecha_hora_inicio ? (
                        formatHorasTurno(
                          activeEjecucion.horas_efectivas_turno ||
                            calcularHorasTurnoMantenimiento(
                              activeEjecucion.fecha_hora_inicio,
                              activeEjecucion.fecha_hora_cierre || new Date()
                            )
                        )
                      ) : (
                        '0 min'
                      )}
                    </span>
                  </div>

                  <div className="mp-timer-item">
                    <span className="mp-timer-label">Técnico Operador</span>
                    <span className="mp-timer-val" style={{ fontSize: '0.9rem' }}>
                      {activeEjecucion?.tecnico_nombre ||
                        session?.user?.user_metadata?.nombre ||
                        session?.user?.email?.split('@')[0] ||
                        'Técnico Mantenimiento'}
                    </span>
                  </div>
                </div>

                <div className="mp-timer-footer">
                  <Icon n="shield" size="1.2em" />
                  <span>
                    <strong>Turnos computables AGUACOL:</strong> Lunes a Viernes 07:00 a 15:00 y 15:00 a 23:00 (16 hrs/día) | Sábados 04:00 a 09:00 (5 hrs). El tiempo se contabiliza únicamente dentro de estos intervalos aunque la tarea dure más de un día.
                  </span>
                </div>
              </div>

              {/* ESTADO 1: TAREA NO INICIADA -> Mostrar invitación a iniciar revisión */}
              {!activeEjecucion || (activeEjecucion?.estado !== 'En curso' && activeEjecucion?.estado !== 'Realizada') ? (
                <div className="mp-init-notice-box">
                  <div className="mp-init-notice-icon">
                    <Icon n="clock" size="1.8em" />
                  </div>
                  <div className="mp-init-notice-content">
                    <h4>Paso 1: Iniciar Tarea de Revisión</h4>
                    <p>
                      Presiona el botón verde <strong>&quot;Iniciar Tarea (Comenzar Revisión)&quot;</strong> al comenzar la inspección física. A partir de ese momento se registrará la hora de comienzo, se pondrá en marcha el cronómetro y se habilitarán las opciones de <strong>con o sin observaciones</strong> y registro de fotos/videos.
                    </p>
                  </div>
                </div>
              ) : activeEjecucion?.estado === 'En curso' ? (
                /* ESTADO 2: TAREA EN CURSO -> AQUÍ SE HABILITAN LAS OPCIONES */
                <>
                  <div className="mp-condicion-selector">
                    <span className="mp-condicion-title">
                      <Icon n="tool" size="1.1em" /> Condición del equipo en esta inspección:
                    </span>
                    <div className="mp-condicion-grid">
                      <button
                        type="button"
                        className={`mp-condicion-card card-conforme ${condicionEquipo === 'sin_observaciones' ? 'selected' : ''}`}
                        onClick={() => setCondicionEquipo('sin_observaciones')}
                      >
                        <div className="mp-condicion-card-header">
                          <span className="mp-condicion-icon">
                            <Icon n="check" size="1.2em" />
                          </span>
                          <strong className="mp-condicion-heading">Equipo sin observaciones de funcionamiento</strong>
                        </div>
                        <p className="mp-condicion-desc">
                          Inspección conforme. El equipo opera en condiciones normales sin ruidos ni fugas.
                        </p>
                        {condicionEquipo === 'sin_observaciones' && (
                          <span className="mp-condicion-selected-tag tag-conforme">
                            ✓ Conforme: Listo para cerrar tarea
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        className={`mp-condicion-card card-alerta ${condicionEquipo === 'con_observaciones' ? 'selected' : ''}`}
                        onClick={() => setCondicionEquipo('con_observaciones')}
                      >
                        <div className="mp-condicion-card-header">
                          <span className="mp-condicion-icon">
                            <Icon n="warn" size="1.2em" />
                          </span>
                          <strong className="mp-condicion-heading">Equipo con observaciones de funcionamiento</strong>
                        </div>
                        <p className="mp-condicion-desc">
                          Se detectó un problema o anomalía a solucionar. Generará una Orden de Trabajo en Pendiente.
                        </p>
                        {condicionEquipo === 'con_observaciones' && (
                          <span className="mp-condicion-selected-tag tag-alerta">
                            ⚠️ Con hallazgo: Requiere comentario y OT
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {condicionEquipo === 'sin_observaciones' ? (
                    <div className="mp-condicion-notice notice-conforme">
                      <Icon n="check" size="1.4em" />
                      <div>
                        <strong>Inspección Preventiva Conforme</strong>
                        <p>
                          El equipo no presenta observaciones. Al finalizar, la tarea se cerrará automáticamente, registrando hora de término y subiendo el resultado conforme al historial.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mp-condicion-notice notice-alerta">
                        <Icon n="warn" size="1.4em" />
                        <div>
                          <strong>Equipo con Observaciones de Funcionamiento</strong>
                          <p>
                            Explica a continuación qué anomalía se detectó y qué se debe solucionar. Se creará automáticamente una <strong>Orden de Trabajo en estado Pendiente</strong> para revisión de Mantenimiento.
                          </p>
                        </div>
                      </div>

                      {/* CUADRO OBLIGATORIO DE COMENTARIOS */}
                      <div className="mp-obs-wrapper">
                        <label htmlFor="mp-obs-input" className="mp-obs-title">
                          Describe el problema o trabajo requerido a solucionar (* obligatorio):
                        </label>
                        <textarea
                          id="mp-obs-input"
                          rows={3}
                          className="mp-search-input mp-obs-textarea"
                          placeholder="Explica qué se encontró en el equipo (fuga, ruido anormal, temperatura, ajuste o pieza dañada) y lo que se debe solucionar..."
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          required
                        />
                      </div>

                      {/* SECCIÓN EVIDENCIA MULTIMEDIA OBLIGATORIA / RECOMENDADA */}
                      <div className="mp-evidence-section">
                        <h3 className="mp-evidence-section-title">
                          <Icon n="camera" size="1.1em" /> Registro fotográfico o video del problema encontrado:
                        </h3>

                        <div className="mp-upload-buttons-row">
                          <button
                            type="button"
                            className="mp-btn-upload"
                            onClick={() => fotoCamaraRef.current?.click()}
                            disabled={uploadingMedia || savingEjecucion}
                          >
                            <Icon n="camera" size="1.1em" /> Tomar Foto (Cámara)
                          </button>
                          <input
                            ref={fotoCamaraRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileSelected(e, 'Foto')}
                          />

                          <button
                            type="button"
                            className="mp-btn-upload"
                            onClick={() => fotoArchivoRef.current?.click()}
                            disabled={uploadingMedia || savingEjecucion}
                          >
                            <Icon n="upload" size="1.1em" /> Subir Imagen
                          </button>
                          <input
                            ref={fotoArchivoRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileSelected(e, 'Foto')}
                          />

                          <button
                            type="button"
                            className="mp-btn-upload"
                            onClick={() => videoCamaraRef.current?.click()}
                            disabled={uploadingMedia || savingEjecucion}
                          >
                            <Icon n="video" size="1.1em" /> Grabar Video (Cámara)
                          </button>
                          <input
                            ref={videoCamaraRef}
                            type="file"
                            accept="video/*"
                            capture="environment"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileSelected(e, 'Video')}
                          />

                          <button
                            type="button"
                            className="mp-btn-upload"
                            onClick={() => videoArchivoRef.current?.click()}
                            disabled={uploadingMedia || savingEjecucion}
                          >
                            <Icon n="upload" size="1.1em" /> Subir Video
                          </button>
                          <input
                            ref={videoArchivoRef}
                            type="file"
                            accept="video/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileSelected(e, 'Video')}
                          />
                        </div>

                        {uploadingMedia && (
                          <p style={{ fontSize: '0.85rem', color: '#38bdf8', margin: '0.25rem 0' }}>
                            <Icon n="wait" size="1em" /> Procesando y subiendo archivo...
                          </p>
                        )}

                        {evidenciasAdjuntas.length > 0 && (
                          <div className="mp-attached-gallery">
                            {evidenciasAdjuntas.map((item) => (
                              <div key={item.id} className="mp-attached-item">
                                {item.tipo === 'Video' ? (
                                  <video src={item.url} />
                                ) : (
                                  <img src={item.url} alt="Evidencia previa" />
                                )}
                                <button
                                  type="button"
                                  className="mp-attached-remove"
                                  onClick={() => handleRemoveEvidencia(item.id)}
                                  title="Eliminar evidencia"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                /* VISTA DE TAREA YA REALIZADA PREVIAMENTE */
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: '#38bdf8', margin: '0.5rem 0' }}>
                    Evidencias registradas en esta ejecución:
                  </h4>
                  {evidenciasAdjuntas.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Sin evidencias adjuntas registradas.</p>
                  ) : (
                    <div className="mp-attached-gallery">
                      {evidenciasAdjuntas.map((item) => (
                        <div
                          key={item.id}
                          className="mp-attached-item"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setLightboxItem({ tipo: item.tipo, url: item.url, nombre: item.nombre_original })}
                        >
                          {item.tipo === 'Video' ? <video src={item.url} /> : <img src={item.url} alt="Evidencia" />}
                        </div>
                      ))}
                    </div>
                  )}

                  {observaciones && (
                    <p className="mp-history-comment" style={{ marginTop: '1rem' }}>
                      <strong>Observaciones:</strong> {observaciones}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* BOTONES DE ACCIÓN SEGÚN EL ESTADO DE LA TAREA */}
            <div className="mp-modal-footer">
              <button
                type="button"
                className="mp-btn-cancel"
                onClick={handleCloseEjecutar}
                disabled={savingEjecucion || uploadingMedia}
              >
                Cerrar Ventana
              </button>

              {/* CASO 1: NO INICIADA -> SOLO BOTÓN INICIAR TAREA */}
              {(!activeEjecucion || (activeEjecucion?.estado !== 'En curso' && activeEjecucion?.estado !== 'Realizada')) && (
                <button
                  type="button"
                  className="mp-btn-confirm mp-btn-start-large"
                  style={{ background: '#10b981', borderColor: '#059669', padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}
                  onClick={handleIniciarTarea}
                  disabled={savingEjecucion}
                >
                  {savingEjecucion ? (
                    <>
                      <Icon n="wait" size="1.1em" /> Iniciando tarea...
                    </>
                  ) : (
                    <>
                      <Icon n="clock" size="1.1em" /> Iniciar Tarea (Comenzar Revisión)
                    </>
                  )}
                </button>
              )}

              {/* CASO 2: EN CURSO */}
              {activeEjecucion?.estado === 'En curso' && (
                <>
                  {condicionEquipo === 'con_observaciones' && (
                    <button
                      type="button"
                      className="mp-btn-cancel"
                      style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
                      onClick={handleGuardarAvance}
                      disabled={savingEjecucion}
                    >
                      Guardar Avance
                    </button>
                  )}

                  {condicionEquipo === 'sin_observaciones' ? (
                    <button
                      type="button"
                      className="mp-btn-confirm"
                      style={{ background: '#10b981', borderColor: '#059669' }}
                      onClick={() => handleCerrarTarea(false)}
                      disabled={savingEjecucion}
                    >
                      {savingEjecucion ? (
                        <>
                          <Icon n="wait" size="1em" /> Cerrando...
                        </>
                      ) : (
                        <>
                          <Icon n="check" size="1em" /> Cerrar Tarea (Sin Observaciones)
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mp-btn-confirm"
                      style={{ background: '#f59e0b', borderColor: '#d97706', color: '#0f172a', fontWeight: 700 }}
                      onClick={() => handleCerrarTarea(true)}
                      disabled={savingEjecucion || !observaciones.trim()}
                    >
                      {savingEjecucion ? (
                        <>
                          <Icon n="wait" size="1em" /> Generando OT...
                        </>
                      ) : (
                        <>
                          <Icon n="warn" size="1em" /> Cerrar Tarea y Generar OT Pendiente
                        </>
                      )}
                    </button>
                  )}
                </>
              )}

              {/* CASO 3: YA REALIZADA */}
              {activeEjecucion?.estado === 'Realizada' && (
                <button
                  type="button"
                  className="mp-btn-confirm"
                  onClick={handleIniciarTarea}
                  disabled={savingEjecucion}
                  title="Iniciar un nuevo ciclo preventivo para esta tarea"
                >
                  <Icon n="refresh" size="1em" /> Iniciar Nuevo Ciclo Preventivo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: LIGHTBOX VISUALIZADOR DE EVIDENCIA
         ========================================================================= */}
      {lightboxItem && (
        <div
          className="mp-modal-backdrop"
          onClick={() => setLightboxItem(null)}
        >
          <div className="mp-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="mp-modal-close-btn"
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
              }}
              onClick={() => setLightboxItem(null)}
              aria-label="Cerrar visor"
            >
              ✕
            </button>
            {lightboxItem.tipo === 'Video' ? (
              <video src={lightboxItem.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '80vh' }} />
            ) : (
              <img src={lightboxItem.url} alt={lightboxItem.nombre} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
