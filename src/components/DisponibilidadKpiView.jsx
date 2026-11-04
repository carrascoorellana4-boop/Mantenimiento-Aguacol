import { useState, useEffect, useMemo, useRef } from 'react'
import Icon from './Icon'
import './DisponibilidadKpi.css'
import * as XLSX from 'xlsx'
import {
  fetchRegistrosDisponibilidad,
  guardarLoteDisponibilidad,
  eliminarRegistroDisponibilidad,
  parseExcelProduccionFile,
  consolidarKpisDisponibilidad,
} from '../services/disponibilidadService'

export default function DisponibilidadKpiView({ _session, isAdmin = false, equiposList = [], onBack }) {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [activeTab, setActiveTab] = useState('resumen') // 'resumen' | 'detalle'

  // Filtros
  const [periodoFiltro, setPeriodoFiltro] = useState('todo') // 'todo' | '7dias' | '30dias' | 'mes' | 'custom'
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [equipoFiltro, setEquipoFiltro] = useState('todos')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal de importación de Excel
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [parsingExcel, setParsingExcel] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)

  // Cargar registros desde la BD
  const cargarRegistros = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetchRegistrosDisponibilidad()
      setRegistros(res.registros || [])
    } catch (err) {
      setErrorMsg('No se pudo cargar registros de disponibilidad: ' + (err?.message || err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarRegistros()
  }, [])

  // Filtrado de registros
  const registrosFiltrados = useMemo(() => {
    let result = [...registros]

    // Filtro de fechas
    const now = new Date()
    if (periodoFiltro === '7dias') {
      const d7 = new Date()
      d7.setDate(now.getDate() - 7)
      const d7Str = d7.toISOString().split('T')[0]
      result = result.filter((r) => r.fecha >= d7Str)
    } else if (periodoFiltro === '30dias') {
      const d30 = new Date()
      d30.setDate(now.getDate() - 30)
      const d30Str = d30.toISOString().split('T')[0]
      result = result.filter((r) => r.fecha >= d30Str)
    } else if (periodoFiltro === 'mes') {
      const mesStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      result = result.filter((r) => r.fecha >= mesStr)
    } else if (periodoFiltro === 'custom') {
      if (fechaDesde) result = result.filter((r) => r.fecha >= fechaDesde)
      if (fechaHasta) result = result.filter((r) => r.fecha <= fechaHasta)
    }

    // Filtro de equipo
    if (equipoFiltro !== 'todos') {
      result = result.filter((r) => r.codigo_equipo === equipoFiltro || r.nombre_equipo === equipoFiltro)
    }

    // Búsqueda general
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((r) => {
        const nom = (r.nombre_equipo || '').toLowerCase()
        const cod = (r.codigo_equipo || '').toLowerCase()
        const mot = (r.motivo || '').toLowerCase()
        const tur = (r.turno || '').toLowerCase()
        const obs = (r.observaciones || '').toLowerCase()
        return nom.includes(q) || cod.includes(q) || mot.includes(q) || tur.includes(q) || obs.includes(q)
      })
    }

    return result
  }, [registros, periodoFiltro, fechaDesde, fechaHasta, equipoFiltro, searchQuery])

  // KPIs consolidados
  const kpis = useMemo(() => {
    return consolidarKpisDisponibilidad(registrosFiltrados)
  }, [registrosFiltrados])

  // Lista única de equipos presentes para el selector
  const listaEquiposSelector = useMemo(() => {
    const s = new Map()
    registros.forEach((r) => {
      const key = r.codigo_equipo || r.nombre_equipo
      if (key && !s.has(key)) {
        s.set(key, r.nombre_equipo || r.codigo_equipo)
      }
    })
    return Array.from(s.entries()).map(([k, val]) => ({ codigo: k, nombre: val }))
  }, [registros])

  // Manejar selección de archivo Excel
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportFile(file)
    setParsingExcel(true)
    setErrorMsg('')

    try {
      const res = await parseExcelProduccionFile(file, equiposList)
      setPreviewData(res)
    } catch (err) {
      setErrorMsg('Error al leer el archivo Excel: ' + (err?.message || err))
      setPreviewData(null)
    } finally {
      setParsingExcel(false)
    }
  }

  // Confirmar importación a la base de datos
  const handleConfirmarImportacion = async () => {
    if (!previewData?.filas || previewData.filas.length === 0) return

    setImporting(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const res = await guardarLoteDisponibilidad(previewData.filas)
      setSuccessMsg(`¡Se importaron exitosamente ${res.count} registros de disponibilidad en la base de datos!`)
      setImportModalOpen(false)
      setImportFile(null)
      setPreviewData(null)
      await cargarRegistros()
    } catch (err) {
      setErrorMsg('Error al guardar registros: ' + (err?.message || err))
    } finally {
      setImporting(false)
    }
  }

  // Eliminar un registro puntual
  const handleEliminar = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro de disponibilidad?')) return
    await eliminarRegistroDisponibilidad(id)
    setRegistros((prev) => prev.filter((r) => r.id !== id))
    setSuccessMsg('Registro eliminado correctamente.')
  }

  // Generar y descargar plantilla Excel de ejemplo
  const handleDescargarPlantilla = () => {
    const plantillaData = [
      {
        'Fecha': '2026-11-04',
        'Equipo': 'Extrusora M1',
        'Tiempo Produccion (Horas)': 8,
        'Tiempo Detencion (Horas)': 0.5,
        'Motivo': 'Cambio de filtro de boquilla',
        'Turno': 'Turno 1',
        'Observaciones': 'Operación normal luego del ajuste',
      },
      {
        'Fecha': '2026-11-04',
        'Equipo': 'Extrusora M2',
        'Tiempo Produccion (Horas)': 8,
        'Tiempo Detencion (Horas)': 0,
        'Motivo': '',
        'Turno': 'Turno 1',
        'Observaciones': 'Turno sin paradas operativas',
      },
      {
        'Fecha': '2026-11-04',
        'Equipo': 'Extrusora M3',
        'Tiempo Produccion (Horas)': 8,
        'Tiempo Detencion (Horas)': 1.25,
        'Motivo': 'Falla eléctrica en calefactor zona 2',
        'Turno': 'Turno 2',
        'Observaciones': 'Reemplazo de resistencia',
      },
    ]

    const ws = XLSX.utils.json_to_sheet(plantillaData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Detenciones_Produccion')
    XLSX.writeFile(wb, 'Plantilla_Disponibilidad_Produccion.xlsx')
  }

  // Función para determinar clase de color según porcentaje
  const getPctClass = (val) => {
    if (val >= 90) return 'optimo'
    if (val >= 80) return 'alerta'
    return 'critico'
  }

  return (
    <div className="disp-container">
      {/* CABECERA */}
      <header className="disp-header">
        <div className="disp-header-top">
          <div className="disp-title-wrap">
            {onBack && (
              <button type="button" className="disp-btn-secondary" onClick={onBack} title="Volver al inicio">
                <Icon n="left" size="1.1em" /> Inicio
              </button>
            )}
            <h1 className="disp-title">KPI de Disponibilidad Operacional</h1>
          </div>

          <div className="disp-actions-bar">
            <button type="button" className="disp-btn-secondary" onClick={handleDescargarPlantilla} title="Descargar planilla Excel de ejemplo">
              <Icon n="doc" size="1.1em" /> Descargar Plantilla Excel
            </button>
            <button
              type="button"
              className="disp-btn-primary"
              onClick={() => {
                setImportModalOpen(true)
                setPreviewData(null)
                setImportFile(null)
              }}
            >
              <Icon n="upload" size="1.1em" /> Importar Excel de Producción
            </button>
          </div>
        </div>

        <p className="disp-subtitle">
          Consolidación de tiempos de producción, detenciones por falla o mantenimiento y cálculo de disponibilidad por activo.
        </p>

        {/* FÓRMULA OFICIAL VISIBLE */}
        <div className="disp-formula-banner">
          <div className="disp-formula-text">
            <Icon n="chart" size="1.1em" />
            <span>Fórmula Oficial de Disponibilidad:</span>
            <span className="disp-formula-badge">
              ((Tiempo Producción - Tiempo Detención) / Tiempo Producción) × 100
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Base de datos: PostgreSQL • {registros.length} registros cargados
          </span>
        </div>
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

      {/* TARJETAS KPI GLOBALES */}
      <div className="disp-kpi-grid">
        {/* KPI 1: Disponibilidad Global */}
        <div className="disp-kpi-card">
          <div className="disp-kpi-header">
            <h3 className="disp-kpi-title">Disponibilidad Global</h3>
            <div className="disp-kpi-icon disp-icon-disp">
              <Icon n="check" />
            </div>
          </div>
          <p className={`disp-kpi-value ${getPctClass(kpis.disponibilidadGlobal)}`}>
            {kpis.disponibilidadGlobal.toFixed(1)}%
          </p>
          <p className="disp-kpi-desc">
            Meta operacional: <strong>≥ 90.0%</strong>
          </p>
        </div>

        {/* KPI 2: Horas de Producción */}
        <div className="disp-kpi-card">
          <div className="disp-kpi-header">
            <h3 className="disp-kpi-title">Horas Programadas</h3>
            <div className="disp-kpi-icon disp-icon-prod">
              <Icon n="clock" />
            </div>
          </div>
          <p className="disp-kpi-value">{kpis.totalHorasProduccion.toFixed(1)} h</p>
          <p className="disp-kpi-desc">Tiempo total planificado de producción</p>
        </div>

        {/* KPI 3: Horas de Detención */}
        <div className="disp-kpi-card">
          <div className="disp-kpi-header">
            <h3 className="disp-kpi-title">Horas Detención</h3>
            <div className="disp-kpi-icon disp-icon-det">
              <Icon n="warn" />
            </div>
          </div>
          <p className="disp-kpi-value" style={{ color: kpis.totalHorasDetencion > 0 ? '#f87171' : '#f1f5f9' }}>
            {kpis.totalHorasDetencion.toFixed(1)} h
          </p>
          <p className="disp-kpi-desc">Paradas por falla o mantenimiento</p>
        </div>

        {/* KPI 4: Horas Netas Operativas */}
        <div className="disp-kpi-card">
          <div className="disp-kpi-header">
            <h3 className="disp-kpi-title">Horas Operativas</h3>
            <div className="disp-kpi-icon disp-icon-neto">
              <Icon n="zap" />
            </div>
          </div>
          <p className="disp-kpi-value">{kpis.totalHorasOperativas.toFixed(1)} h</p>
          <p className="disp-kpi-desc">Tiempo efectivo en marcha productiva</p>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="disp-filter-bar">
        <div className="disp-filter-group">
          <span className="disp-filter-label">Período:</span>
          <select
            className="disp-filter-select"
            value={periodoFiltro}
            onChange={(e) => setPeriodoFiltro(e.target.value)}
          >
            <option value="todo">Histórico Completo</option>
            <option value="7dias">Últimos 7 días</option>
            <option value="30dias">Últimos 30 días</option>
            <option value="mes">Mes actual</option>
            <option value="custom">Rango Personalizado</option>
          </select>
        </div>

        {periodoFiltro === 'custom' && (
          <div className="disp-filter-group">
            <input
              type="date"
              className="disp-filter-input"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              title="Fecha Desde"
            />
            <span style={{ color: '#94a3b8' }}>a</span>
            <input
              type="date"
              className="disp-filter-input"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              title="Fecha Hasta"
            />
          </div>
        )}

        <div className="disp-filter-group">
          <span className="disp-filter-label">Equipo:</span>
          <select
            className="disp-filter-select"
            value={equipoFiltro}
            onChange={(e) => setEquipoFiltro(e.target.value)}
          >
            <option value="todos">Todos los equipos</option>
            {listaEquiposSelector.map((eq) => (
              <option key={eq.codigo} value={eq.codigo}>
                {eq.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="disp-filter-group" style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="search"
            className="disp-filter-input"
            style={{ width: '100%' }}
            placeholder="Buscar por equipo, motivo, turno u observación..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* PESTAÑAS: RESUMEN POR EQUIPO O DETALLE CRONOLÓGICO */}
      <div className="disp-tabs-bar">
        <button
          type="button"
          className={`disp-tab-btn ${activeTab === 'resumen' ? 'active' : ''}`}
          onClick={() => setActiveTab('resumen')}
        >
          <Icon n="chart" size="1em" /> Tabla Consolidada por Equipo ({kpis.porEquipo.length})
        </button>
        <button
          type="button"
          className={`disp-tab-btn ${activeTab === 'detalle' ? 'active' : ''}`}
          onClick={() => setActiveTab('detalle')}
        >
          <Icon n="list" size="1em" /> Detalle de Registros ({registrosFiltrados.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <Icon n="wait" size="1.5em" /> Cargando datos de disponibilidad...
        </div>
      ) : (
        <>
          {/* PESTAÑA 1: TABLA CONSOLIDADA POR EQUIPO */}
          {activeTab === 'resumen' && (
            <div className="disp-table-container">
              <table className="disp-table">
                <thead>
                  <tr>
                    <th>Equipo / Activo</th>
                    <th>Área</th>
                    <th style={{ textAlign: 'right' }}>Horas Prod.</th>
                    <th style={{ textAlign: 'right' }}>Horas Detención</th>
                    <th style={{ textAlign: 'right' }}>Horas Operativas</th>
                    <th style={{ width: '220px' }}>Disponibilidad (%)</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.porEquipo.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                        No hay registros de producción cargados para el período seleccionado.
                        <div style={{ marginTop: '0.75rem' }}>
                          <button
                            type="button"
                            className="disp-btn-primary"
                            onClick={() => setImportModalOpen(true)}
                          >
                            <Icon n="upload" /> Importar Planilla Excel de Producción
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    kpis.porEquipo.map((eq) => {
                      const pctClass = getPctClass(eq.disponibilidad_pct)
                      return (
                        <tr key={eq.codigo}>
                          <td>
                            <strong>{eq.nombre}</strong>
                            {eq.codigo && eq.codigo !== eq.nombre && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{eq.codigo}</div>
                            )}
                          </td>
                          <td>
                            <span className="mp-badge-tag">{eq.area}</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {eq.tiempo_produccion_horas.toFixed(1)} h
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: eq.tiempo_detencion_horas > 0 ? '#f87171' : 'inherit' }}>
                            {eq.tiempo_detencion_horas.toFixed(1)} h
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#34d399' }}>
                            {eq.tiempo_operativo_horas.toFixed(1)} h
                          </td>
                          <td>
                            <div className="disp-progress-wrap">
                              <span style={{ fontWeight: 700, minWidth: '48px', textAlign: 'right' }} className={`disp-kpi-value ${pctClass}`}>
                                {eq.disponibilidad_pct.toFixed(1)}%
                              </span>
                              <div className="disp-progress-bar">
                                <div
                                  className={`disp-progress-fill ${pctClass}`}
                                  style={{ width: `${Math.min(100, eq.disponibilidad_pct)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            {eq.disponibilidad_pct >= 90 ? (
                              <span className="mp-resp-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                                Óptimo
                              </span>
                            ) : eq.disponibilidad_pct >= 80 ? (
                              <span className="mp-frec-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                                Alerta
                              </span>
                            ) : (
                              <span className="mp-frec-badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                                Crítico
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* PESTAÑA 2: DETALLE DE REGISTROS CRONOLÓGICOS */}
          {activeTab === 'detalle' && (
            <div className="disp-table-container">
              <table className="disp-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Equipo</th>
                    <th>Turno</th>
                    <th style={{ textAlign: 'right' }}>Horas Prod.</th>
                    <th style={{ textAlign: 'right' }}>Horas Det.</th>
                    <th>Disponibilidad</th>
                    <th>Motivo de Detención / Parada</th>
                    <th>Observaciones</th>
                    <th style={{ textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No hay registros que coincidan con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    registrosFiltrados.map((r) => {
                      const pctClass = getPctClass(r.disponibilidad_pct)
                      return (
                        <tr key={r.id}>
                          <td>{r.fecha}</td>
                          <td>
                            <strong>{r.nombre_equipo}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.codigo_equipo}</div>
                          </td>
                          <td>
                            <span className="mp-badge-tag">{r.turno || 'Turno 1'}</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {Number(r.tiempo_produccion_horas || 0).toFixed(1)} h
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: r.tiempo_detencion_horas > 0 ? '#f87171' : 'inherit' }}>
                            {Number(r.tiempo_detencion_horas || 0).toFixed(1)} h
                          </td>
                          <td>
                            <span style={{ fontWeight: 700 }} className={`disp-kpi-value ${pctClass}`}>
                              {Number(r.disponibilidad_pct || 0).toFixed(1)}%
                            </span>
                          </td>
                          <td>{r.motivo || r.tipo_detencion || '—'}</td>
                          <td style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{r.observaciones || '—'}</td>
                          <td style={{ textAlign: 'right' }}>
                            {isAdmin && (
                              <button
                                type="button"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#f87171',
                                  cursor: 'pointer',
                                  padding: '0.3rem',
                                }}
                                title="Eliminar registro"
                                onClick={() => handleEliminar(r.id)}
                              >
                                <Icon n="x" size="1.1em" />
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
          )}
        </>
      )}

      {/* =========================================================================
          MODAL: IMPORTAR PLANILLA EXCEL DE PRODUCCIÓN
         ========================================================================= */}
      {importModalOpen && (
        <div
          className="mp-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !importing) setImportModalOpen(false)
          }}
        >
          <div className="mp-modal-window" style={{ maxWidth: '780px' }} role="dialog" aria-modal="true">
            <div className="mp-modal-header">
              <h2 className="mp-modal-title">
                <Icon n="upload" size="1.2em" /> Importar Planilla Excel de Producción
              </h2>
              <button
                type="button"
                className="mp-modal-close-btn"
                onClick={() => !importing && setImportModalOpen(false)}
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <div className="mp-modal-content">
              {!previewData ? (
                <>
                  <div
                    className="disp-import-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    <div className="disp-dropzone-icon">
                      <Icon n="doc" size="1.5em" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem', color: '#ffffff' }}>
                        {importFile ? importFile.name : 'Haz clic para seleccionar o arrastra la planilla Excel de producción'}
                      </p>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        Archivos compatibles: .xlsx o .xls con columnas de fecha, equipo y tiempos
                      </span>
                    </div>
                  </div>

                  {parsingExcel && (
                    <div style={{ textAlign: 'center', color: '#38bdf8', padding: '1rem' }}>
                      <Icon n="wait" size="1.2em" /> Procesando planilla y calculando disponibilidad...
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>¿No tienes el formato exacto?</span>
                    <button type="button" className="disp-btn-secondary" onClick={handleDescargarPlantilla}>
                      <Icon n="doc" size="1em" /> Descargar Plantilla de Ejemplo
                    </button>
                  </div>
                </>
              ) : (
                /* VISTA PREVIA ANTES DE GUARDAR */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="disp-formula-banner">
                    <div>
                      <strong>Archivo:</strong> {importFile?.name} ({previewData.totalFilas} registros detectados)
                    </div>
                    <button
                      type="button"
                      style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => setPreviewData(null)}
                    >
                      Cambiar archivo
                    </button>
                  </div>

                  <div className="disp-preview-box">
                    <table className="disp-table" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Equipo</th>
                          <th style={{ textAlign: 'right' }}>Prod (h)</th>
                          <th style={{ textAlign: 'right' }}>Det (h)</th>
                          <th>Disp. Calculada</th>
                          <th>Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.filas.slice(0, 10).map((f, idx) => (
                          <tr key={idx}>
                            <td>{f.fecha}</td>
                            <td>{f.nombre_equipo}</td>
                            <td style={{ textAlign: 'right' }}>{f.tiempo_produccion_horas} h</td>
                            <td style={{ textAlign: 'right', color: f.tiempo_detencion_horas > 0 ? '#f87171' : 'inherit' }}>
                              {f.tiempo_detencion_horas} h
                            </td>
                            <td>
                              <span style={{ fontWeight: 700 }} className={`disp-kpi-value ${getPctClass(f.disponibilidad_pct)}`}>
                                {f.disponibilidad_pct}%
                              </span>
                            </td>
                            <td>{f.motivo || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {previewData.filas.length > 10 && (
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                      ... y {previewData.filas.length - 10} filas más listas para importar.
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="mp-modal-footer">
              <button
                type="button"
                className="mp-btn-cancel"
                onClick={() => setImportModalOpen(false)}
                disabled={importing}
              >
                Cancelar
              </button>
              {previewData && (
                <button
                  type="button"
                  className="mp-btn-confirm"
                  onClick={handleConfirmarImportacion}
                  disabled={importing}
                >
                  {importing ? (
                    <>
                      <Icon n="wait" size="1em" /> Guardando en Base de Datos...
                    </>
                  ) : (
                    <>
                      <Icon n="check" size="1em" /> Confirmar e Importar {previewData.totalFilas} Registros
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
