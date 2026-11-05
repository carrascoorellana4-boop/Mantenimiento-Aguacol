import { useState, useEffect, useMemo, useRef } from 'react'
import Icon from './Icon'
import SelectorPeriodoVisual from './SelectorPeriodoVisual'
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
  const [periodoVisual, setPeriodoVisual] = useState({
    fechaDesde: '',
    fechaHasta: '',
    isAll: true,
    label: 'Todo el historial'
  })
  const [equipoFiltro, setEquipoFiltro] = useState('todos')
  const [searchQuery, setSearchQuery] = useState('')

  // Años disponibles detectados en los registros de disponibilidad
  const availableYears = useMemo(() => {
    const set = new Set([2024, 2025, 2026, new Date().getFullYear()])
    registros.forEach((r) => {
      if (r.fecha) {
        const y = parseInt(r.fecha.slice(0, 4), 10)
        if (!isNaN(y)) set.add(y)
      }
    })
    return Array.from(set).sort((a, b) => a - b)
  }, [registros])

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

    // Filtro visual de fechas (AÑO, MES, DÍAS)
    if (!periodoVisual.isAll) {
      if (periodoVisual.fechaDesde) {
        result = result.filter((r) => r.fecha >= periodoVisual.fechaDesde)
      }
      if (periodoVisual.fechaHasta) {
        result = result.filter((r) => r.fecha <= periodoVisual.fechaHasta)
      }
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
  }, [registros, periodoVisual, equipoFiltro, searchQuery])

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

  // Generar y descargar plantilla Excel de ejemplo con la fórmula oficial
  const handleDescargarPlantilla = () => {
    const plantillaData = [
      {
        'Fecha': '2026-11-04',
        'Equipo': 'Extrusora M1',
        'Horas disponibles': 7.5,
        'Horas en mantencion': 0.5,
        'Motivo de mantencion': 'Ajuste preventivo boquilla',
        'Turno': 'Turno 1',
        'Observaciones': 'Operación continua',
      },
      {
        'Fecha': '2026-11-04',
        'Equipo': 'Extrusora M2',
        'Horas disponibles': 8.0,
        'Horas en mantencion': 0.0,
        'Motivo de mantencion': '',
        'Turno': 'Turno 1',
        'Observaciones': 'Sin paradas en mantención',
      },
      {
        'Fecha': '2026-11-04',
        'Equipo': 'Extrusora M3',
        'Horas disponibles': 6.75,
        'Horas en mantencion': 1.25,
        'Motivo de mantencion': 'Falla eléctrica resistencia zona 2',
        'Turno': 'Turno 2',
        'Observaciones': 'Reemplazo completado por mantención',
      },
    ]

    const ws = XLSX.utils.json_to_sheet(plantillaData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Disponibilidad_Produccion')
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
          Consolidación de horas disponibles y horas en mantención por activo según planilla oficial de producción.
        </p>

        {/* FÓRMULA OFICIAL EXACTA */}
        <div className="disp-formula-banner">
          <div className="disp-formula-text">
            <Icon n="chart" size="1.1em" />
            <span>Fórmula Oficial:</span>
            <span className="disp-formula-badge">
              Disponibilidad = (Horas disponibles / (Horas disponibles + Horas en mantención)) × 100
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

      {/* SELECTOR VISUAL DE PERÍODO (AÑO, MES, DÍAS) */}
      <SelectorPeriodoVisual
        availableYears={availableYears}
        value={periodoVisual}
        onChange={setPeriodoVisual}
        allowAll={true}
      />

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
            {kpis.disponibilidadGlobal.toFixed(2)}%
          </p>
          <p className="disp-kpi-desc">
            Meta operacional: <strong>≥ 90.0%</strong>
          </p>
        </div>

        {/* KPI 2: Horas de Funcionamiento (Disponibles) */}
        <div className="disp-kpi-card">
          <div className="disp-kpi-header">
            <h3 className="disp-kpi-title">Horas Funcionamiento</h3>
            <div className="disp-kpi-icon disp-icon-prod">
              <Icon n="zap" />
            </div>
          </div>
          <p className="disp-kpi-value" style={{ color: '#34d399' }}>
            {kpis.totalHorasDisponibles.toLocaleString('es-CL')} h
          </p>
          <p className="disp-kpi-desc">
            {kpis.totalTurnosProd} turnos de producción programados
          </p>
        </div>

        {/* KPI 3: Horas Indisponibilidad Mantención */}
        <div className="disp-kpi-card">
          <div className="disp-kpi-header">
            <h3 className="disp-kpi-title">Indisponibilidad Mantención</h3>
            <div className="disp-kpi-icon disp-icon-det">
              <Icon n="warn" />
            </div>
          </div>
          <p className="disp-kpi-value" style={{ color: kpis.totalHorasMantencion > 0 ? '#f87171' : '#f1f5f9' }}>
            {kpis.totalHorasMantencion.toLocaleString('es-CL')} h
          </p>
          <p className="disp-kpi-desc">
            {kpis.totalTurnosMant} turnos indisp. • {kpis.totalHorasEfectivasMant} h efectivas
          </p>
        </div>

        {/* KPI 4: Cambios de Molde */}
        <div className="disp-kpi-card">
          <div className="disp-kpi-header">
            <h3 className="disp-kpi-title">Cambios de Molde</h3>
            <div className="disp-kpi-icon disp-icon-neto">
              <Icon n="tool" />
            </div>
          </div>
          <p className="disp-kpi-value" style={{ color: '#38bdf8' }}>
            {kpis.totalCambiosMolde} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>({kpis.totalHorasCambioMolde} h)</span>
          </p>
          <p className="disp-kpi-desc">Registro operativo aparte (no resta disp.)</p>
        </div>
      </div>

      {/* BARRA DE FILTROS SECUNDARIOS */}
      <div className="disp-filter-bar">
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

        {(!periodoVisual.isAll || equipoFiltro !== 'todos' || searchQuery) && (
          <button
            type="button"
            className="disp-btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            onClick={() => {
              setPeriodoVisual({ fechaDesde: '', fechaHasta: '', isAll: true, label: 'Todo el historial' })
              setEquipoFiltro('todos')
              setSearchQuery('')
            }}
          >
            <Icon n="x" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* PESTAÑAS: RESUMEN POR MÁQUINA, POR PERÍODO O DETALLE */}
      <div className="disp-tabs-bar">
        <button
          type="button"
          className={`disp-tab-btn ${activeTab === 'resumen' ? 'active' : ''}`}
          onClick={() => setActiveTab('resumen')}
        >
          <Icon n="chart" size="1em" /> Resumen por Máquina ({kpis.porEquipo.length})
        </button>
        <button
          type="button"
          className={`disp-tab-btn ${activeTab === 'periodos' ? 'active' : ''}`}
          onClick={() => setActiveTab('periodos')}
        >
          <Icon n="calendar-check" size="1em" /> Resumen por Períodos ({kpis.porPeriodo.length})
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
          {/* PESTAÑA 1: TABLA CONSOLIDADA "RESUMEN POR MÁQUINA" */}
          {activeTab === 'resumen' && (
            <div className="disp-table-container">
              <table className="disp-table">
                <thead>
                  <tr>
                    <th>Máquina / Activo</th>
                    <th style={{ textAlign: 'center' }}>Turnos Prod.</th>
                    <th style={{ textAlign: 'right' }}>Horas Funcionamiento</th>
                    <th style={{ textAlign: 'center' }}>Turnos Mant.</th>
                    <th style={{ textAlign: 'right' }}>Horas Indisp. Mant.</th>
                    <th style={{ textAlign: 'right' }}>Horas Efectivas</th>
                    <th style={{ textAlign: 'center' }}>Cambios de Molde</th>
                    <th style={{ width: '200px' }}>Disponibilidad (%)</th>
                    <th>Cobertura</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.porEquipo.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
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
                    <>
                      {kpis.porEquipo.map((eq) => {
                        const pctClass = getPctClass(eq.disponibilidad_pct)
                        return (
                          <tr key={eq.codigo}>
                            <td>
                              <strong>{eq.nombre}</strong>
                              <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                                {eq.codigo}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>
                              {eq.turnos_produccion || 0}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#34d399' }}>
                              {eq.horas_disponibles.toLocaleString('es-CL')} h
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600, color: eq.turnos_mantencion > 0 ? '#f87171' : 'inherit' }}>
                              {eq.turnos_mantencion || 0}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: eq.horas_mantencion > 0 ? '#f87171' : 'inherit' }}>
                              {eq.horas_mantencion.toLocaleString('es-CL')} h
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 500, color: '#cbd5e1' }}>
                              {(eq.horas_efectivas_mantenimiento || 0).toLocaleString('es-CL')} h
                            </td>
                            <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                              {eq.cambios_molde > 0 ? (
                                <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                                  {eq.cambios_molde} ({eq.horas_cambio_molde || 0} h)
                                </span>
                              ) : (
                                <span style={{ color: '#64748b' }}>0</span>
                              )}
                            </td>
                            <td>
                              <div className="disp-progress-wrap">
                                <span
                                  style={{ fontWeight: 700, minWidth: '55px', textAlign: 'right' }}
                                  className={`disp-kpi-value ${pctClass}`}
                                >
                                  {eq.disponibilidad_pct.toFixed(2)}%
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
                              <span
                                className="mp-resp-badge"
                                style={{
                                  background: eq.disponibilidad_pct >= 95 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                  color: eq.disponibilidad_pct >= 95 ? '#34d399' : '#fbbf24',
                                  fontSize: '0.72rem',
                                }}
                              >
                                {eq.cobertura || 'Parcial validada'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}

                      {/* FILA DE TOTAL / PROMEDIO */}
                      <tr className="disp-total-row">
                        <td>
                          <strong>TOTAL / PROMEDIO</strong>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Consolidado 10 máquinas</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{kpis.totalTurnosProd}</td>
                        <td style={{ textAlign: 'right', color: '#34d399' }}>
                          {kpis.totalHorasDisponibles.toLocaleString('es-CL')} h
                        </td>
                        <td style={{ textAlign: 'center', color: kpis.totalTurnosMant > 0 ? '#f87171' : 'inherit' }}>
                          {kpis.totalTurnosMant}
                        </td>
                        <td style={{ textAlign: 'right', color: kpis.totalHorasMantencion > 0 ? '#f87171' : 'inherit' }}>
                          {kpis.totalHorasMantencion.toLocaleString('es-CL')} h
                        </td>
                        <td style={{ textAlign: 'right', color: '#e2e8f0' }}>
                          {kpis.totalHorasEfectivasMant.toLocaleString('es-CL')} h
                        </td>
                        <td style={{ textAlign: 'center', color: '#38bdf8' }}>
                          {kpis.totalCambiosMolde} ({kpis.totalHorasCambioMolde} h)
                        </td>
                        <td>
                          <span
                            className={`disp-kpi-value ${getPctClass(kpis.disponibilidadGlobal)}`}
                            style={{ fontSize: '1.1rem', fontWeight: 800 }}
                          >
                            {kpis.disponibilidadGlobal.toFixed(2)}%
                          </span>
                        </td>
                        <td>
                          <span className="mp-badge-tag" style={{ fontSize: '0.72rem' }}>
                            Oficial AGUACOL
                          </span>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* PESTAÑA 2: TABLA RESUMEN POR PERÍODOS */}
          {activeTab === 'periodos' && (
            <div className="disp-table-container">
              <table className="disp-table">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Rango Fechas</th>
                    <th style={{ textAlign: 'center' }}>Turnos Prod.</th>
                    <th style={{ textAlign: 'right' }}>Horas Funcionamiento</th>
                    <th style={{ textAlign: 'center' }}>Turnos Mant.</th>
                    <th style={{ textAlign: 'right' }}>Horas Indisp.</th>
                    <th style={{ textAlign: 'right' }}>Horas Efectivas</th>
                    <th style={{ textAlign: 'center' }}>Cambios de Molde</th>
                    <th style={{ width: '180px' }}>Disponibilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.porPeriodo.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No hay períodos registrados para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    kpis.porPeriodo.map((p) => {
                      const pctClass = getPctClass(p.disponibilidad_pct)
                      return (
                        <tr key={p.periodo}>
                          <td>
                            <strong>{p.periodo}</strong>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                            {p.fecha_desde} al {p.fecha_hasta}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{p.turnos_produccion}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#34d399' }}>
                            {p.horas_disponibles.toLocaleString('es-CL')} h
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: p.turnos_mantencion > 0 ? '#f87171' : 'inherit' }}>
                            {p.turnos_mantencion}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: p.horas_mantencion > 0 ? '#f87171' : 'inherit' }}>
                            {p.horas_mantencion.toLocaleString('es-CL')} h
                          </td>
                          <td style={{ textAlign: 'right', color: '#cbd5e1' }}>
                            {p.horas_efectivas_mantenimiento} h
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {p.cambios_molde > 0 ? (
                              <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                                {p.cambios_molde} ({p.horas_cambio_molde} h)
                              </span>
                            ) : (
                              <span style={{ color: '#64748b' }}>0</span>
                            )}
                          </td>
                          <td>
                            <div className="disp-progress-wrap">
                              <span style={{ fontWeight: 700, minWidth: '55px', textAlign: 'right' }} className={`disp-kpi-value ${pctClass}`}>
                                {p.disponibilidad_pct.toFixed(2)}%
                              </span>
                              <div className="disp-progress-bar">
                                <div
                                  className={`disp-progress-fill ${pctClass}`}
                                  style={{ width: `${Math.min(100, p.disponibilidad_pct)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* PESTAÑA 3: DETALLE DE REGISTROS CRONOLÓGICOS */}
          {activeTab === 'detalle' && (
            <div className="disp-table-container">
              <table className="disp-table">
                <thead>
                  <tr>
                    <th>Período / Fecha</th>
                    <th>Equipo / Activo</th>
                    <th>Turno / Régimen</th>
                    <th style={{ textAlign: 'right' }}>Horas Disp.</th>
                    <th style={{ textAlign: 'right' }}>Horas Mant.</th>
                    <th style={{ textAlign: 'center' }}>Cambio Molde</th>
                    <th>Disponibilidad</th>
                    <th>Motivo de Mantención</th>
                    <th>Observación de Producción</th>
                    <th style={{ textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No hay registros que coincidan con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    registrosFiltrados.map((r) => {
                      const pctClass = getPctClass(r.disponibilidad_pct)
                      const hDisp = Number(r.horas_disponibles !== undefined ? r.horas_disponibles : r.tiempo_produccion_horas) || 0
                      const hMant = Number(r.horas_mantencion !== undefined ? r.horas_mantencion : r.tiempo_detencion_horas) || 0

                      return (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.periodo || r.fecha}</strong>
                            {r.fecha && r.fecha_fin && r.fecha !== r.fecha_fin && (
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                {r.fecha} a {r.fecha_fin}
                              </div>
                            )}
                          </td>
                          <td>
                            <strong>{r.nombre_equipo}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                              {r.codigo_equipo}
                            </div>
                          </td>
                          <td>
                            <span className="mp-badge-tag">{r.turno || '8h'}</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#34d399' }}>
                            {hDisp.toFixed(1)} h
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: hMant > 0 ? '#f87171' : 'inherit' }}>
                            {hMant.toFixed(1)} h
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                            {r.cambios_molde > 0 ? `${r.cambios_molde} (${r.horas_cambio_molde || 0} h)` : '—'}
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
                        Archivos compatibles: .xlsx o .xls con Horas disponibles y Horas en mantención
                      </span>
                    </div>
                  </div>

                  {parsingExcel && (
                    <div style={{ textAlign: 'center', color: '#38bdf8', padding: '1rem' }}>
                      <Icon n="wait" size="1.2em" /> Procesando planilla y calculando disponibilidad...
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>¿Deseas usar la plantilla con la fórmula oficial?</span>
                    <button type="button" className="disp-btn-secondary" onClick={handleDescargarPlantilla}>
                      <Icon n="doc" size="1em" /> Descargar Plantilla Oficial
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
                          <th style={{ textAlign: 'right' }}>Horas Disp.</th>
                          <th style={{ textAlign: 'right' }}>Horas Mant.</th>
                          <th>Disponibilidad</th>
                          <th>Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.filas.slice(0, 10).map((f, idx) => (
                          <tr key={idx}>
                            <td>{f.fecha}</td>
                            <td>{f.nombre_equipo}</td>
                            <td style={{ textAlign: 'right', color: '#34d399' }}>{f.horas_disponibles} h</td>
                            <td style={{ textAlign: 'right', color: f.horas_mantencion > 0 ? '#f87171' : 'inherit' }}>
                              {f.horas_mantencion} h
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
