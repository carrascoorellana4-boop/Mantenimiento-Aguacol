import { useState, useEffect, useMemo, useRef } from 'react'
import Icon from './Icon'
import './MantenimientoPreventivo.css'
import {
  MAQUINAS_EXTRUSION,
  getTareasPorMaquina,
  getHistorialEjecuciones,
  subirEvidencia,
  registrarEjecucion,
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

export default function MantenimientoPreventivoView({ session, isAdmin = false, onBack }) {
  // Estado de navegación: null = selector de máquinas (Extrusión), o máquina seleccionada { id, codigo, nombre, titulo }
  const [selectedMaquina, setSelectedMaquina] = useState(null)
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
  const [observaciones, setObservaciones] = useState('')
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

  // Lista de frecuencias únicas para el filtro
  const frecuenciasDisponibles = useMemo(() => {
    const s = new Set()
    for (const t of tareas) {
      if (t.frecuencia) s.add(t.frecuencia.trim())
    }
    return Array.from(s).sort()
  }, [tareas])

  // Tareas filtradas
  const filteredTareas = useMemo(() => {
    return tareas.filter((t) => {
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
  }, [tareas, searchFilter, frecuenciaFilter])

  // Abrir modal de ejecución
  const handleOpenEjecutar = (tarea) => {
    setEjecutarModalTarea(tarea)
    setObservaciones('')
    setEvidenciasAdjuntas([])
    setConfirmStep(false)
    setErrorMsg('')
  }

  // Cerrar modal de ejecución
  const handleCloseEjecutar = () => {
    if (savingEjecucion || uploadingMedia) return
    setEjecutarModalTarea(null)
    setObservaciones('')
    setEvidenciasAdjuntas([])
    setConfirmStep(false)
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
        // Fallback local con Blob URL para no interrumpir el trabajo de campo
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
        },
      ])
    } catch (err) {
      setErrorMsg('No se pudo procesar el archivo: ' + (err?.message || err))
    } finally {
      setUploadingMedia(false)
      // Limpiar input para permitir seleccionar el mismo archivo nuevamente si se desea
      e.target.value = ''
    }
  }

  // Eliminar evidencia antes de guardar
  const handleRemoveEvidencia = (id) => {
    setEvidenciasAdjuntas((prev) => prev.filter((item) => item.id !== id))
  }

  // Confirmar y registrar la ejecución
  const handleConfirmarEjecucion = async () => {
    if (!ejecutarModalTarea || !selectedMaquina) return

    setSavingEjecucion(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const res = await registrarEjecucion({
        tarea: ejecutarModalTarea,
        codigo_equipo: selectedMaquina.codigo,
        observaciones,
        estado: 'Realizada',
        evidencias: evidenciasAdjuntas,
        session,
      })

      if (res.advertenciaSql) {
        setSuccessMsg(`Ejecución registrada exitosamente. Nota: ${res.advertenciaSql}`)
      } else {
        setSuccessMsg('¡Tarea preventiva ejecutada y registrada exitosamente!')
      }

      // Actualizar historial local inmediatamente
      const updatedHist = await getHistorialEjecuciones(selectedMaquina.codigo)
      setHistorial(updatedHist.ejecuciones || [])

      handleCloseEjecutar()
      setActiveTab('historial')
    } catch (err) {
      setErrorMsg('Error al guardar ejecución: ' + (err?.message || err))
    } finally {
      setSavingEjecucion(false)
    }
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
                <Icon n="left" size="1.1em" /> Volver a Extrusión
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
                ? `${selectedMaquina.titulo} — Mantenimiento Preventivo`
                : 'Mantenimiento Preventivo'}
            </h1>
          </div>
          <span className="mp-badge-tag">
            <Icon n="calendar-check" size="1em" /> Módulo Activo
          </span>
        </div>
        <p className="mp-subtitle">
          {selectedMaquina
            ? `${selectedMaquina.nombre} (${selectedMaquina.codigo}) • Registro y trazabilidad de rutinas operativas.`
            : 'Planificación, ejecución y seguimiento de actividades preventivas por equipo.'}
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
          VISTA 1: SELECTOR DE MÁQUINAS (EXTRUSIÓN)
         ========================================================================= */}
      {!selectedMaquina && (
        <>
          <div className="mp-family-bar">
            <button type="button" className="mp-family-pill active">
              <Icon n="zap" size="1em" /> Extrusión (5 máquinas)
            </button>
          </div>

          <div className="mp-machines-grid">
            {MAQUINAS_EXTRUSION.map((maq) => (
              <div
                key={maq.id}
                className="mp-machine-card"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMaquina(maq)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedMaquina(maq)}
              >
                <div className="mp-machine-card-header">
                  <span className="mp-machine-badge">{maq.titulo}</span>
                  <span className="mp-badge-tag">Planta GPL</span>
                </div>
                <div className="mp-machine-body">
                  <h3 className="mp-machine-name">{maq.nombre}</h3>
                  <p className="mp-machine-tasks-count">
                    <Icon n="list" size="0.9em" /> Tareas preventivas: 19
                  </p>
                </div>
                <div className="mp-machine-footer">
                  <span className="mp-machine-action">
                    Ver plan <span>→</span>
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
              <Icon n="list" size="1em" /> Plan preventivo ({tareas.length})
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
                          <th style={{ width: '45%' }}>Tarea</th>
                          <th style={{ width: '20%' }}>Frecuencia</th>
                          <th style={{ width: '20%' }}>Responsable</th>
                          <th style={{ width: '15%', textAlign: 'right' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTareas.length === 0 ? (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                              No se encontraron tareas con los filtros aplicados.
                            </td>
                          </tr>
                        ) : (
                          filteredTareas.map((item, idx) => (
                            <tr key={item.id || `${item.codigo_equipo}-${idx}`}>
                              <td>
                                <div className="mp-task-title">{item.tarea}</div>
                                {item.sistema && (
                                  <span className="mp-task-system">Sistema: {item.sistema}</span>
                                )}
                              </td>
                              <td>
                                <span className="mp-frec-badge">{item.frecuencia}</span>
                              </td>
                              <td>
                                <span className="mp-resp-badge">{item.responsable}</span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="mp-btn-execute"
                                  onClick={() => handleOpenEjecutar(item)}
                                >
                                  <Icon n="check" size="0.9em" /> Ejecutar
                                </button>
                              </td>
                            </tr>
                          ))
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
                        Selecciona una tarea de la pestaña &quot;Plan preventivo&quot; para registrar su primera ejecución con evidencias.
                      </span>
                    </div>
                  ) : (
                    historial.map((ej) => {
                      const tareaTexto =
                        ej.tarea?.tarea || ej.tarea_nombre || 'Mantenimiento Preventivo Ejecutado'
                      const frecTexto = ej.tarea?.frecuencia || 'Preventivo'
                      const evidencias = ej.evidencias || []

                      return (
                        <div key={ej.id} className="mp-history-card">
                          <div className="mp-history-header">
                            <span className="mp-history-date">
                              <Icon n="calendar" size="0.9em" /> {formatFechaHora(ej.fecha_ejecucion)}
                            </span>
                            <span className="mp-badge-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                              <Icon n="done" size="0.9em" /> {ej.estado || 'Realizada'}
                            </span>
                          </div>

                          <h4 className="mp-history-task">{tareaTexto}</h4>

                          <div className="mp-history-meta">
                            <span>
                              <strong>Frecuencia:</strong> {frecTexto}
                            </span>
                            <span>
                              <strong>Registrado por:</strong> {ej.ejecutado_por_email || 'Operador'}
                            </span>
                            {evidencias.length > 0 && (
                              <span>
                                <strong>Evidencias:</strong> {evidencias.length} archivo(s)
                              </span>
                            )}
                          </div>

                          {ej.observaciones && (
                            <p className="mp-history-comment">
                              <strong>Observaciones:</strong> {ej.observaciones}
                            </p>
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
          MODAL 1: EJECUTAR TAREA PREVENTIVA
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
                {confirmStep ? 'Confirmar Ejecución' : 'Ejecutar Tarea Preventiva'}
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
                    {selectedMaquina?.titulo} ({selectedMaquina?.nombre})
                  </span>
                </div>
                <div className="mp-detail-row">
                  <span className="mp-detail-label">Tarea:</span>
                  <span className="mp-detail-value">{ejecutarModalTarea.tarea}</span>
                </div>
                <div className="mp-detail-row">
                  <span className="mp-detail-label">Frecuencia:</span>
                  <span className="mp-detail-value">
                    <span className="mp-frec-badge">{ejecutarModalTarea.frecuencia}</span>
                  </span>
                </div>
                <div className="mp-detail-row">
                  <span className="mp-detail-label">Responsable:</span>
                  <span className="mp-detail-value">
                    <span className="mp-resp-badge">{ejecutarModalTarea.responsable}</span>
                  </span>
                </div>
              </div>

              {!confirmStep ? (
                <>
                  {/* SECCIÓN EVIDENCIAS */}
                  <div className="mp-evidence-section">
                    <h3 className="mp-evidence-section-title">
                      <Icon n="camera" size="1.1em" /> Evidencia de ejecución
                    </h3>

                    {/* Botones de acción para cámara o subida de archivo */}
                    <div className="mp-upload-buttons-row">
                      {/* 1. Foto con cámara */}
                      <button
                        type="button"
                        className="mp-btn-upload"
                        onClick={() => fotoCamaraRef.current?.click()}
                        disabled={uploadingMedia || savingEjecucion}
                      >
                        <Icon n="camera" size="1.1em" /> Tomar Foto
                      </button>
                      <input
                        ref={fotoCamaraRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileSelected(e, 'Foto')}
                      />

                      {/* 2. Subir imagen */}
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

                      {/* 3. Grabar video */}
                      <button
                        type="button"
                        className="mp-btn-upload"
                        onClick={() => videoCamaraRef.current?.click()}
                        disabled={uploadingMedia || savingEjecucion}
                      >
                        <Icon n="video" size="1.1em" /> Grabar Video
                      </button>
                      <input
                        ref={videoCamaraRef}
                        type="file"
                        accept="video/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileSelected(e, 'Video')}
                      />

                      {/* 4. Subir video */}
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

                    {/* Galería de evidencias adjuntas en este momento */}
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

                  {/* OBSERVACIONES */}
                  <div>
                    <label
                      htmlFor="mp-obs-input"
                      style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#ffffff',
                        marginBottom: '0.4rem',
                      }}
                    >
                      Observaciones / Hallazgos operativos:
                    </label>
                    <textarea
                      id="mp-obs-input"
                      rows={3}
                      className="mp-search-input"
                      style={{ width: '100%', resize: 'vertical' }}
                      placeholder="Indica cualquier novedad, nivel encontrado o ajuste realizado..."
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                    />
                  </div>

                  {!isAdmin && !session && (
                    <div className="notice-banner notice-banner-warning" style={{ margin: 0 }}>
                      <Icon n="warn" />
                      <span>Inicia sesión como administrador para registrar ejecuciones oficiales en el sistema.</span>
                    </div>
                  )}
                </>
              ) : (
                /* PANTALLA DE CONFIRMACIÓN PREVIA */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div
                    style={{
                      background: 'rgba(14, 165, 233, 0.1)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                      borderRadius: '8px',
                      padding: '1rem',
                      color: '#f1f5f9',
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>
                      ¿Deseas confirmar la ejecución de esta tarea preventiva?
                    </p>
                    <ul style={{ margin: '0.5rem 0 0 1.25rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
                      <li>Evidencias adjuntas: {evidenciasAdjuntas.length} archivo(s)</li>
                      <li>Observaciones: {observaciones ? `"${observaciones}"` : 'Ninguna'}</li>
                      <li>Operador / Usuario: {session?.user?.email || 'operador@aguacol.cl'}</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="mp-modal-footer">
              {!confirmStep ? (
                <>
                  <button
                    type="button"
                    className="mp-btn-cancel"
                    onClick={handleCloseEjecutar}
                    disabled={savingEjecucion || uploadingMedia}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="mp-btn-confirm"
                    onClick={() => setConfirmStep(true)}
                    disabled={uploadingMedia}
                  >
                    Continuar →
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="mp-btn-cancel"
                    onClick={() => setConfirmStep(false)}
                    disabled={savingEjecucion}
                  >
                    ← Modificar
                  </button>
                  <button
                    type="button"
                    className="mp-btn-confirm"
                    onClick={handleConfirmarEjecucion}
                    disabled={savingEjecucion}
                  >
                    {savingEjecucion ? (
                      <>
                        <Icon n="wait" size="1em" /> Guardando...
                      </>
                    ) : (
                      <>
                        <Icon n="check" size="1em" /> Confirmar y Registrar
                      </>
                    )}
                  </button>
                </>
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
