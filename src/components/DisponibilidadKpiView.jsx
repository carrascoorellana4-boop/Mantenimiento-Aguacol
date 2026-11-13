// Formateo de números enteros (sin decimales, con separador de miles '.')
const formatEntero = (val) => {
  if (val === null || val === undefined || val === '' || isNaN(Number(val))) return '0';
  const rounded = Math.round(Number(val));
  return rounded.toLocaleString('es-CL');
};

// Formateo de porcentajes con exactamente 1 decimal después de la coma (ej: 99,3%)
const formatPorcentaje = (val) => {
  if (val === null || val === undefined || val === '' || isNaN(Number(val))) return '0,0%';
  const num = Number(val);
  return `${num.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
};

import { useState, useEffect, useMemo, useRef } from 'react'
import Icon from './Icon'
import SelectorPeriodoVisual from './SelectorPeriodoVisual'
import disponibilidadInicial from '../config/disponibilidadConsolidadaInicial.json'
import './DisponibilidadKpi.css'
import * as XLSX from 'xlsx'
import { getUserAllowedArea, isAreaMatching } from '../lib/authRoles'
import {
  fetchRegistrosDisponibilidad,
  guardarLoteDisponibilidad,
  eliminarRegistroDisponibilidad,
  parseExcelProduccionFile,
  consolidarKpisDisponibilidad,
  fetchOtsConTiempoDetencion,
  validarTiempoDetencionOt,
  omitirTiempoDetencionOt,
  revertirValidacionOt,
} from '../services/disponibilidadService'

export default function DisponibilidadKpiView({ session = null, _session, isAdmin = false, equiposList = [], onBack }) {
  const currentSession = session || _session
  const userAllowedArea = useMemo(() => {
    return getUserAllowedArea(currentSession?.user)
  }, [currentSession?.user])
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [activeTab, setActiveTab] = useState('resumen') // 'resumen' | 'periodos' | 'detalle' | 'criterios' | 'tiempos-ot'

  // Validación de tiempos de detención de OTs (Exclusivo Administrador)
  const [otsDetencion, setOtsDetencion] = useState([])
  const [loadingOts, setLoadingOts] = useState(false)
  const [filtroOtEstado, setFiltroOtEstado] = useState('pendientes') // 'pendientes' | 'validados' | 'omitidos' | 'todos'
  const [searchOtQuery, setSearchOtQuery] = useState('')
  const [horasEditadas, setHorasEditadas] = useState({})
  const [accionOtLoading, setAccionOtLoading] = useState(null)

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

  // Cargar OTs con tiempos de detención para auditoría del administrador
  const cargarOtsDetencion = async () => {
    if (!isAdmin) return
    setLoadingOts(true)
    try {
      const data = await fetchOtsConTiempoDetencion()
      setOtsDetencion(data)
    } catch (err) {
      console.warn('Error cargando OTs con tiempo de detención:', err)
    } finally {
      setLoadingOts(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      cargarOtsDetencion()
    }
  }, [isAdmin])

  const otsPendientesCount = useMemo(() => {
    return otsDetencion.filter((ot) => !ot.kpi_validado && !ot.kpi_omitido).length
  }, [otsDetencion])

  const otsValidadosCount = useMemo(() => {
    return otsDetencion.filter((ot) => ot.kpi_validado).length
  }, [otsDetencion])

  const otsOmitidosCount = useMemo(() => {
    return otsDetencion.filter((ot) => ot.kpi_omitido).length
  }, [otsDetencion])

  const otsFiltradas = useMemo(() => {
    let list = [...otsDetencion]

    if (filtroOtEstado === 'pendientes') {
      list = list.filter((ot) => !ot.kpi_validado && !ot.kpi_omitido)
    } else if (filtroOtEstado === 'validados') {
      list = list.filter((ot) => ot.kpi_validado)
    } else if (filtroOtEstado === 'omitidos') {
      list = list.filter((ot) => ot.kpi_omitido)
    }

    if (searchOtQuery.trim()) {
      const q = searchOtQuery.toLowerCase().trim()
      list = list.filter((ot) => {
        const cod = (ot.codigo_ot || '').toLowerCase()
        const eq = (ot.equipo_display || '').toLowerCase()
        const trab = (ot.trabajo || '').toLowerCase()
        const tec = (ot.tecnico || '').toLowerCase()
        const sol = (ot.solicitante_nombre || '').toLowerCase()
        return cod.includes(q) || eq.includes(q) || trab.includes(q) || tec.includes(q) || sol.includes(q)
      })
    }

    return list
  }, [otsDetencion, filtroOtEstado, searchOtQuery])

  const handleValidarOt = async (ot) => {
    const horasInput = horasEditadas[ot.id] !== undefined ? horasEditadas[ot.id] : ot.horas_defecto
    const horasVal = Number(parseFloat(horasInput).toFixed(2))

    if (isNaN(horasVal) || horasVal < 0) {
      alert('Ingresa un valor válido de horas de detención (mayor o igual a 0).')
      return
    }

    setAccionOtLoading(ot.id)
    setErrorMsg('')
    try {
      await validarTiempoDetencionOt({
        ot,
        horasValidadas: horasVal,
        usuario: currentSession?.user?.email || 'Administrador',
      })
      setSuccessMsg(`¡Tiempo de detención de ${ot.codigo_ot || 'la OT'} (${horasVal} h) validado e incorporado exitosamente al KPI de ${ot.equipo_display}!`)
      await Promise.all([cargarOtsDetencion(), cargarRegistros()])
    } catch (err) {
      setErrorMsg('Error al validar tiempo de OT: ' + (err?.message || err))
    } finally {
      setAccionOtLoading(null)
    }
  }

  const handleOmitirOt = async (ot) => {
    if (!window.confirm(`¿Seguro que deseas omitir el tiempo de ${ot.codigo_ot || 'esta OT'} para que no impacte los KPI de disponibilidad?`)) return
    setAccionOtLoading(ot.id)
    setErrorMsg('')
    try {
      await omitirTiempoDetencionOt({
        otId: ot.id,
        usuario: currentSession?.user?.email || 'Administrador',
      })
      setSuccessMsg(`Tiempo de ${ot.codigo_ot || 'la OT'} omitido de los KPI.`)
      await cargarOtsDetencion()
    } catch (err) {
      setErrorMsg('Error al omitir tiempo de OT: ' + (err?.message || err))
    } finally {
      setAccionOtLoading(null)
    }
  }

  const handleRevertirOt = async (ot) => {
    if (!window.confirm(`¿Revertir la validación de ${ot.codigo_ot || 'esta OT'}? Se retirará el registro de indisponibilidad y volverá a estado pendiente.`)) return
    setAccionOtLoading(ot.id)
    setErrorMsg('')
    try {
      await revertirValidacionOt({
        otId: ot.id,
        registroId: ot.kpi_registro_id,
      })
      setSuccessMsg(`Validación de ${ot.codigo_ot || 'la OT'} revertida. Volvió a estado pendiente.`)
      await Promise.all([cargarOtsDetencion(), cargarRegistros()])
    } catch (err) {
      setErrorMsg('Error al revertir validación: ' + (err?.message || err))
    } finally {
      setAccionOtLoading(null)
    }
  }

  // Filtrado de registros
  const registrosFiltrados = useMemo(() => {
    let result = [...registros]

    // Filtro estricto por área asignada al usuario
    if (userAllowedArea) {
      result = result.filter(
        (r) => isAreaMatching(r.area, userAllowedArea) || isAreaMatching(r.nombre_equipo, userAllowedArea)
      )
    }

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
  }, [registros, userAllowedArea, periodoVisual, equipoFiltro, searchQuery])

  // KPIs consolidados
  const kpis = useMemo(() => {
    return consolidarKpisDisponibilidad(registrosFiltrados)
  }, [registrosFiltrados])

  // Lista única de equipos presentes para el selector
  const listaEquiposSelector = useMemo(() => {
    const s = new Map()
    const baseRegistros = userAllowedArea
      ? registros.filter(
          (r) => isAreaMatching(r.area, userAllowedArea) || isAreaMatching(r.nombre_equipo, userAllowedArea)
        )
      : registros

    baseRegistros.forEach((r) => {
      const key = r.codigo_equipo || r.nombre_equipo
      if (key && !s.has(key)) {
        s.set(key, r.nombre_equipo || r.codigo_equipo)
      }
    })
    return Array.from(s.entries()).map(([k, val]) => ({ codigo: k, nombre: val }))
  }, [registros, userAllowedArea])

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
          {userAllowedArea && (
            <span style={{ marginLeft: '8px', color: '#38bdf8', fontWeight: 600 }}>
              • Área asignada: {userAllowedArea}
            </span>
          )}
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

      {/* NOTIFICACIÓN ADMINISTRADOR: TIEMPOS DE OT PENDIENTES */}
      {isAdmin && otsPendientesCount > 0 && activeTab !== 'tiempos-ot' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.16), rgba(245, 158, 11, 0.06))',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            borderRadius: '10px',
            padding: '0.85rem 1.25rem',
            color: '#fef3c7',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
              <Icon n="warn" size="1.3em" style={{ color: '#fbbf24' }} />
            </div>
            <div>
              <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>
                {otsPendientesCount} {otsPendientesCount === 1 ? 'Orden de Trabajo tiene tiempo' : 'Órdenes de Trabajo tienen tiempos'} de detención pendiente de validación
              </strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                Como administrador, debes auditar y aprobar estos tiempos para que se computen en las horas de mantención y disponibilidad de cada máquina.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="disp-btn-secondary"
            onClick={() => setActiveTab('tiempos-ot')}
            style={{
              borderColor: '#f59e0b',
              color: '#fbbf24',
              background: 'rgba(245, 158, 11, 0.15)',
              fontWeight: 700,
            }}
          >
            Revisar y Validar <Icon n="right" size="0.9em" />
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
            {formatPorcentaje(kpis.disponibilidadGlobal)}
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
            {formatEntero(kpis.totalHorasDisponibles)} h
          </p>
          <p className="disp-kpi-desc">
            {formatEntero(kpis.totalTurnosProd)} turnos de producción programados
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
            {formatEntero(kpis.totalHorasMantencion)} h
          </p>
          <p className="disp-kpi-desc">
            {formatEntero(kpis.totalTurnosMant)} turnos indisp. • {formatEntero(kpis.totalHorasEfectivasMant)} h efectivas
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
            {formatEntero(kpis.totalCambiosMolde)} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>({formatEntero(kpis.totalHorasCambioMolde)} h)</span>
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
        <button
          type="button"
          className={`disp-tab-btn ${activeTab === 'criterios' ? 'active' : ''}`}
          onClick={() => setActiveTab('criterios')}
        >
          <Icon n="shield" size="1em" /> Criterios y Cobertura
        </button>
        {isAdmin && (
          <button
            type="button"
            className={`disp-tab-btn ${activeTab === 'tiempos-ot' ? 'active' : ''}`}
            onClick={() => setActiveTab('tiempos-ot')}
            style={otsPendientesCount > 0 ? { borderColor: '#f59e0b', color: '#fbbf24' } : {}}
          >
            <Icon n="wrench" size="1em" />
            Validación Tiempos OT
            {otsPendientesCount > 0 && (
              <span
                style={{
                  background: '#f59e0b',
                  color: '#0f172a',
                  fontWeight: 800,
                  borderRadius: '999px',
                  padding: '0.1rem 0.5rem',
                  fontSize: '0.75rem',
                  marginLeft: '4px',
                }}
              >
                {otsPendientesCount}
              </span>
            )}
          </button>
        )}
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
                              {formatEntero(eq.turnos_produccion)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#34d399' }}>
                              {formatEntero(eq.horas_disponibles)} h
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600, color: eq.turnos_mantencion > 0 ? '#f87171' : 'inherit' }}>
                              {formatEntero(eq.turnos_mantencion)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: eq.horas_mantencion > 0 ? '#f87171' : 'inherit' }}>
                              {formatEntero(eq.horas_mantencion)} h
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 500, color: '#cbd5e1' }}>
                              {formatEntero(eq.horas_efectivas_mantenimiento)} h
                            </td>
                            <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                              {eq.cambios_molde > 0 ? (
                                <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                                  {formatEntero(eq.cambios_molde)} ({formatEntero(eq.horas_cambio_molde)} h)
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
                                  {formatPorcentaje(eq.disponibilidad_pct)}
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
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Consolidado {kpis.porEquipo.length} máquinas (validado hasta 01-nov)</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{formatEntero(kpis.totalTurnosProd)}</td>
                        <td style={{ textAlign: 'right', color: '#34d399' }}>
                          {formatEntero(kpis.totalHorasDisponibles)} h
                        </td>
                        <td style={{ textAlign: 'center', color: kpis.totalTurnosMant > 0 ? '#f87171' : 'inherit' }}>
                          {formatEntero(kpis.totalTurnosMant)}
                        </td>
                        <td style={{ textAlign: 'right', color: kpis.totalHorasMantencion > 0 ? '#f87171' : 'inherit' }}>
                          {formatEntero(kpis.totalHorasMantencion)} h
                        </td>
                        <td style={{ textAlign: 'right', color: '#e2e8f0' }}>
                          {formatEntero(kpis.totalHorasEfectivasMant)} h
                        </td>
                        <td style={{ textAlign: 'center', color: '#38bdf8' }}>
                          {formatEntero(kpis.totalCambiosMolde)} ({formatEntero(kpis.totalHorasCambioMolde)} h)
                        </td>
                        <td>
                          <span
                            className={`disp-kpi-value ${getPctClass(kpis.disponibilidadGlobal)}`}
                            style={{ fontSize: '1.1rem', fontWeight: 800 }}
                          >
                            {formatPorcentaje(kpis.disponibilidadGlobal)}
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
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{formatEntero(p.turnos_produccion)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#34d399' }}>
                            {formatEntero(p.horas_disponibles)} h
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: p.turnos_mantencion > 0 ? '#f87171' : 'inherit' }}>
                            {formatEntero(p.turnos_mantencion)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: p.horas_mantencion > 0 ? '#f87171' : 'inherit' }}>
                            {formatEntero(p.horas_mantencion)} h
                          </td>
                          <td style={{ textAlign: 'right', color: '#cbd5e1' }}>
                            {formatEntero(p.horas_efectivas_mantenimiento)} h
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {p.cambios_molde > 0 ? (
                              <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                                {formatEntero(p.cambios_molde)} ({formatEntero(p.horas_cambio_molde)} h)
                              </span>
                            ) : (
                              <span style={{ color: '#64748b' }}>0</span>
                            )}
                          </td>
                          <td>
                            <div className="disp-progress-wrap">
                              <span style={{ fontWeight: 700, minWidth: '55px', textAlign: 'right' }} className={`disp-kpi-value ${pctClass}`}>
                                {formatPorcentaje(p.disponibilidad_pct)}
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
                            {formatEntero(hDisp)} h
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: hMant > 0 ? '#f87171' : 'inherit' }}>
                            {formatEntero(hMant)} h
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                            {r.cambios_molde > 0 ? `${formatEntero(r.cambios_molde)} (${formatEntero(r.horas_cambio_molde)} h)` : '—'}
                          </td>
                          <td>
                            <span style={{ fontWeight: 700 }} className={`disp-kpi-value ${pctClass}`}>
                              {formatPorcentaje(r.disponibilidad_pct)}
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

          {/* PESTAÑA 4: CRITERIOS OPERATIVOS Y REGLAS DE COBERTURA */}
          {activeTab === 'criterios' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Card 1: Reglas y Criterios */}
              <div className="disp-table-container">
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155', background: '#0f172a' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon n="tool" size="1.1em" /> Reglas y Criterios Operativos del Consolidado
                  </h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                    Definiciones oficiales para el cálculo de disponibilidad, turnos e indisponibilidad aplicadas en AGUACOL.
                  </p>
                </div>
                <table className="disp-table">
                  <thead>
                    <tr>
                      <th style={{ width: '280px' }}>Concepto</th>
                      <th>Regla Aplicada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(disponibilidadInicial.conceptosReglas || []).map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong style={{ color: '#38bdf8' }}>{item.concepto}</strong>
                        </td>
                        <td style={{ color: '#e2e8f0', fontSize: '0.9rem', lineHeight: 1.45 }}>
                          {item.regla}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Card 2: Cobertura por rangos */}
              <div className="disp-table-container">
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155', background: '#0f172a' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon n="calendar-check" size="1.1em" /> Estado de Cobertura y Validación por Rango
                  </h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                    Trazabilidad de semanas procesadas desde las planificaciones físicas y registros de planta.
                  </p>
                </div>
                <table className="disp-table">
                  <thead>
                    <tr>
                      <th style={{ width: '180px' }}>Rango</th>
                      <th style={{ width: '200px' }}>Estado</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>En Consolidado</th>
                      <th>Comentario Técnico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(disponibilidadInicial.coberturaRangos || []).map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong>{item.rango}</strong>
                        </td>
                        <td>
                          <span
                            className="mp-resp-badge"
                            style={{
                              background: item.incluido === 'Sí' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                              color: item.incluido === 'Sí' ? '#34d399' : '#94a3b8',
                              fontSize: '0.78rem'
                            }}
                          >
                            {item.estado}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: item.incluido === 'Sí' ? '#34d399' : '#f87171'
                            }}
                          >
                            {item.incluido}
                          </span>
                        </td>
                        <td style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                          {item.comentario}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PESTAÑA 5: VALIDACIÓN DE TIEMPOS DE OT PARA KPI (EXCLUSIVO ADMINISTRADOR) */}
          {isAdmin && activeTab === 'tiempos-ot' && (
            <div className="disp-table-container">
              <div className="kpi-ot-panel-header">
                <div>
                  <h3 className="kpi-ot-panel-title">
                    <Icon n="shield" size="1.2em" style={{ color: '#38bdf8' }} />
                    Validación de Tiempos Perdidos de OT para KPI
                    <span
                      style={{
                        fontSize: '0.78rem',
                        color: '#38bdf8',
                        background: 'rgba(56, 189, 248, 0.15)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        marginLeft: '0.5rem',
                        fontWeight: 600,
                      }}
                    >
                      Exclusivo Administrador
                    </span>
                  </h3>
                  <p className="kpi-ot-panel-desc">
                    Audita y valida los tiempos de línea detenida reportados en las Órdenes de Trabajo antes de que computen como horas de mantención en la disponibilidad oficial de cada equipo.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="search"
                    className="disp-filter-input"
                    style={{ width: '260px' }}
                    placeholder="Buscar OT, equipo o trabajo..."
                    value={searchOtQuery}
                    onChange={(e) => setSearchOtQuery(e.target.value)}
                  />
                  <button
                    type="button"
                    className="disp-btn-secondary"
                    onClick={cargarOtsDetencion}
                    title="Recargar OTs"
                    style={{ padding: '0.45rem 0.8rem' }}
                  >
                    <Icon n="sync" size="1em" /> Actualizar
                  </button>
                </div>
              </div>

              {/* BANNERS DE ESTADO VISIBLES EN ESTA PESTAÑA */}
              {errorMsg && (
                <div style={{ padding: '0.75rem 1.5rem 0 1.5rem' }}>
                  <div className="notice-banner notice-banner-error" role="alert" style={{ margin: 0 }}>
                    <Icon n="warn" />
                    <span>{errorMsg}</span>
                    <button type="button" className="notice-banner-close" onClick={() => setErrorMsg('')}>
                      <Icon n="x" />
                    </button>
                  </div>
                </div>
              )}

              {successMsg && (
                <div style={{ padding: '0.75rem 1.5rem 0 1.5rem' }}>
                  <div className="notice-banner notice-banner-success" role="status" style={{ margin: 0 }}>
                    <Icon n="check" />
                    <span>{successMsg}</span>
                    <button type="button" className="notice-banner-close" onClick={() => setSuccessMsg('')}>
                      <Icon n="x" />
                    </button>
                  </div>
                </div>
              )}

              {/* Filtros por estado */}
              <div className="kpi-ot-filter-pills">
                <button
                  type="button"
                  className={`kpi-ot-pill-btn ${filtroOtEstado === 'pendientes' ? 'active' : ''}`}
                  onClick={() => setFiltroOtEstado('pendientes')}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }}></span>
                  Pendientes de Validar
                  <span className="kpi-ot-pill-count">{otsPendientesCount}</span>
                </button>

                <button
                  type="button"
                  className={`kpi-ot-pill-btn ${filtroOtEstado === 'validados' ? 'active' : ''}`}
                  onClick={() => setFiltroOtEstado('validados')}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }}></span>
                  Validados e Incorporados
                  <span className="kpi-ot-pill-count">{otsValidadosCount}</span>
                </button>

                <button
                  type="button"
                  className={`kpi-ot-pill-btn ${filtroOtEstado === 'omitidos' ? 'active' : ''}`}
                  onClick={() => setFiltroOtEstado('omitidos')}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8' }}></span>
                  Omitidos de KPI
                  <span className="kpi-ot-pill-count">{otsOmitidosCount}</span>
                </button>

                <button
                  type="button"
                  className={`kpi-ot-pill-btn ${filtroOtEstado === 'todos' ? 'active' : ''}`}
                  onClick={() => setFiltroOtEstado('todos')}
                >
                  Todos
                  <span className="kpi-ot-pill-count">{otsDetencion.length}</span>
                </button>
              </div>

              {/* Tabla de OTs */}
              {loadingOts ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <Icon n="wait" size="1.4em" /> Cargando órdenes de trabajo con tiempos de detención...
                </div>
              ) : otsFiltradas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94a3b8' }}>
                  <Icon n="check" size="2em" style={{ color: '#34d399', marginBottom: '0.5rem' }} />
                  <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#f1f5f9' }}>
                    {filtroOtEstado === 'pendientes'
                      ? '¡No hay tiempos de detención de OT pendientes de validación!'
                      : 'No se encontraron registros con los filtros seleccionados.'}
                  </p>
                  <span style={{ fontSize: '0.85rem' }}>
                    {filtroOtEstado === 'pendientes'
                      ? 'Todos los tiempos reportados en las OT han sido validados o revisados.'
                      : 'Prueba cambiando los filtros o el término de búsqueda.'}
                  </span>
                </div>
              ) : (
                <table className="disp-table">
                  <thead>
                    <tr>
                      <th>OT / Fecha</th>
                      <th>Máquina / Área</th>
                      <th>Trabajo / Falla</th>
                      <th style={{ textAlign: 'center' }}>Tiempo Reportado</th>
                      <th style={{ textAlign: 'center' }}>Horas a Imputar</th>
                      <th style={{ textAlign: 'center' }}>Estado KPI</th>
                      <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otsFiltradas.map((ot) => {
                      const isProcessing = accionOtLoading === ot.id
                      const horasActuales = horasEditadas[ot.id] !== undefined ? horasEditadas[ot.id] : ot.horas_defecto

                      return (
                        <tr key={ot.id}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <strong style={{ color: '#38bdf8', fontSize: '0.92rem' }}>
                                {ot.codigo_ot || `OT-${ot.numero_ot}`}
                              </strong>
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                {ot.fecha_reporte ? String(ot.fecha_reporte).slice(0, 10) : 'Sin fecha'}
                              </span>
                              {ot.solicitante_nombre && (
                                <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                                  Por: {ot.solicitante_nombre}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <strong style={{ color: '#ffffff' }}>{ot.equipo_display}</strong>
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                {ot.area_display} {ot.equipo_codigo_display ? `• ${ot.equipo_codigo_display}` : ''}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ maxWidth: '320px' }}>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 500 }}>
                                {ot.trabajo || 'Sin descripción'}
                              </p>
                              <span style={{ fontSize: '0.75rem', color: '#f87171' }}>
                                Condición: {ot.condicion_linea || 'Línea detenida'}
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: '#f87171', fontSize: '0.95rem' }}>
                                {ot.minutos_calculados > 0 ? `${ot.minutos_calculados} min` : '0 min'}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                ({ot.horas_defecto} h)
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {ot.kpi_validado ? (
                              <span style={{ fontWeight: 800, color: '#34d399', fontSize: '1rem' }}>
                                {Number(ot.kpi_horas_aprobadas || ot.horas_defecto).toFixed(2)} h
                              </span>
                            ) : ot.kpi_omitido ? (
                              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>0.00 h</span>
                            ) : (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  className="kpi-ot-input-horas"
                                  value={horasActuales}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setHorasEditadas((prev) => ({ ...prev, [ot.id]: val }))
                                  }}
                                />
                                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>h</span>
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {ot.kpi_validado ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span className="kpi-ot-badge-status validado">
                                  <Icon n="check" size="0.9em" /> Validado en KPI
                                </span>
                                {ot.kpi_validado_el && (
                                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                                    {String(ot.kpi_validado_el).slice(0, 10)}
                                  </span>
                                )}
                              </div>
                            ) : ot.kpi_omitido ? (
                              <span className="kpi-ot-badge-status omitido">
                                <Icon n="x" size="0.9em" /> Omitido de KPI
                              </span>
                            ) : (
                              <span className="kpi-ot-badge-status pendiente">
                                <Icon n="warn" size="0.9em" /> Pendiente
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                              {!ot.kpi_validado && !ot.kpi_omitido && (
                                <>
                                  <button
                                    type="button"
                                    className="kpi-ot-btn-validar"
                                    disabled={isProcessing}
                                    onClick={() => handleValidarOt(ot)}
                                    title="Aprobar tiempo e incorporar a la disponibilidad del equipo"
                                  >
                                    <Icon n={isProcessing ? 'wait' : 'check'} size="1em" />
                                    {isProcessing ? 'Guardando...' : 'Validar a KPI'}
                                  </button>
                                  <button
                                    type="button"
                                    className="kpi-ot-btn-omitir"
                                    disabled={isProcessing}
                                    onClick={() => handleOmitirOt(ot)}
                                    title="Omitir este tiempo para que no reste disponibilidad"
                                  >
                                    <Icon n="x" size="0.9em" /> Omitir
                                  </button>
                                </>
                              )}

                              {ot.kpi_validado && (
                                <button
                                  type="button"
                                  className="kpi-ot-btn-revertir"
                                  disabled={isProcessing}
                                  onClick={() => handleRevertirOt(ot)}
                                  title="Revertir validación y quitar del cálculo de KPI"
                                >
                                  <Icon n={isProcessing ? 'wait' : 'undo'} size="1em" />
                                  {isProcessing ? 'Revirtiendo...' : 'Revertir'}
                                </button>
                              )}

                              {ot.kpi_omitido && (
                                <button
                                  type="button"
                                  className="kpi-ot-btn-revertir"
                                  disabled={isProcessing}
                                  onClick={() => handleRevertirOt(ot)}
                                  title="Volver a poner esta OT en estado pendiente de validación"
                                >
                                  <Icon n={isProcessing ? 'wait' : 'sync'} size="1em" />
                                  {isProcessing ? 'Reactivando...' : 'Reactivar'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
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
                            <td style={{ textAlign: 'right', color: '#34d399' }}>{formatEntero(f.horas_disponibles)} h</td>
                            <td style={{ textAlign: 'right', color: f.horas_mantencion > 0 ? '#f87171' : 'inherit' }}>
                              {formatEntero(f.horas_mantencion)} h
                            </td>
                            <td>
                              <span style={{ fontWeight: 700 }} className={`disp-kpi-value ${getPctClass(f.disponibilidad_pct)}`}>
                                {formatPorcentaje(f.disponibilidad_pct)}
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
