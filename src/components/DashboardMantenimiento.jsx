import Icon from './Icon'
import { useState, useMemo } from 'react'
import { parseTecnicos } from '../lib/tecnicos'
import { calculateOtDashboardMetrics } from '../services/ordenesTrabajoService'

const TIPOS_INTERVENCION = [
  'Correctiva',
  'Preventiva',
  'Inspección',
  'Ajuste',
  'Mejora',
  'Otro'
]

const TIPOS_FALLA = [
  'Mecánica',
  'Eléctrica / Control',
  'Neumática',
  'Hidráulica / Refrigeración',
  'Ajuste / Otros'
]

const COLORS_INTERVENCION = {
  'Correctiva': '#ef4444',
  'Preventiva': '#10b981',
  'Inspección': '#3b82f6',
  'Ajuste': '#f59e0b',
  'Mejora': '#8b5cf6',
  'Otro': '#6b7280'
}

const COLORS_FALLA = {
  'Mecánica': '#f97316',
  'Eléctrica / Control': '#3b82f6',
  'Neumática': '#06b6d4',
  'Hidráulica / Refrigeración': '#8b5cf6',
  'Ajuste / Otros': '#64748b'
}

const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
]

export default function DashboardMantenimiento({
  bitacoraList = [],
  equiposList = [],
  ordenesTrabajoList = [],
  session = null,
  onNavigateToBitacora = () => {},
  onNavigateToActivo = () => {},
  onNavigateToOrdenesTrabajo = () => {},
  onRefreshData = () => {},
  loading = false
}) {
  // Estados de Filtros Globales (por defecto: toda_la_bitacora)
  const [filterPeriodo, setFilterPeriodo] = useState('toda_la_bitacora')
  const [selectedDia, setSelectedDia] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [selectedMes, setSelectedMes] = useState(() => new Date().getMonth() + 1)
  const [selectedMesAno, setSelectedMesAno] = useState(() => new Date().getFullYear())
  const [selectedAno, setSelectedAno] = useState(() => new Date().getFullYear())
  const [customFechaDesde, setCustomFechaDesde] = useState('')
  const [customFechaHasta, setCustomFechaHasta] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [filterEquipoId, setFilterEquipoId] = useState('')
  const [filterTecnico, setFilterTecnico] = useState('')
  const [filterTipoIntervencion, setFilterTipoIntervencion] = useState('')
  const [filterTipoFalla, setFilterTipoFalla] = useState('')
  const [lastUpdate] = useState(() => new Date())

  // Catálogo de áreas dinámicas
  const availableAreas = useMemo(() => {
    const areas = new Set()
    equiposList.forEach((eq) => {
      if (eq.area && eq.area.trim()) areas.add(eq.area.trim())
    })
    bitacoraList.forEach((b) => {
      if (b.area && b.area.trim()) areas.add(b.area.trim())
      if (b.equipo?.area && b.equipo.area.trim()) areas.add(b.equipo.area.trim())
    })
    return Array.from(areas).sort()
  }, [equiposList, bitacoraList])

  // Catálogo de técnicos dinámicos normalizado e individual
  const availableTecnicos = useMemo(() => {
    const tecs = new Set()
    bitacoraList.forEach((b) => {
      parseTecnicos(b.tecnico).forEach((t) => tecs.add(t))
    })
    return Array.from(tecs).sort((a, b) => a.localeCompare(b, 'es'))
  }, [bitacoraList])

  // Catálogo de años dinámicos extraídos de bitácora y órdenes de trabajo
  const availableAnos = useMemo(() => {
    const anos = new Set()
    const currentYear = new Date().getFullYear()
    anos.add(currentYear)
    anos.add(2026)
    bitacoraList.forEach((b) => {
      if (b.fecha_hora) {
        const d = new Date(b.fecha_hora)
        if (!isNaN(d.getTime())) {
          anos.add(d.getFullYear())
        }
      }
    })
    ordenesTrabajoList.forEach((ot) => {
      const fFin = ot.fecha_finalizacion ? new Date(ot.fecha_finalizacion) : null
      if (fFin && !isNaN(fFin.getTime())) anos.add(fFin.getFullYear())
      const fRep = ot.fecha_reporte ? new Date(ot.fecha_reporte) : null
      if (fRep && !isNaN(fRep.getTime())) anos.add(fRep.getFullYear())
    })
    return Array.from(anos).sort((a, b) => b - a)
  }, [bitacoraList, ordenesTrabajoList])

  // Validación de rango personalizado
  const customDateError = useMemo(() => {
    if (filterPeriodo === 'personalizado' && customFechaDesde && customFechaHasta) {
      return customFechaDesde > customFechaHasta
    }
    return false
  }, [filterPeriodo, customFechaDesde, customFechaHasta])

  // Cálculo de rango de fechas según período (inicio inclusivo y fin exclusivo, consistente con Chile y Postgres)
  const dateRange = useMemo(() => {
    const now = new Date()
    let start = null
    let end = null

    if (filterPeriodo === 'toda_la_bitacora') {
      start = null
      end = null
    } else if (filterPeriodo === 'hoy') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
    } else if (filterPeriodo === 'dia_especifico') {
      if (selectedDia) {
        const [y, m, d] = selectedDia.split('-').map(Number)
        start = new Date(y, m - 1, d, 0, 0, 0, 0)
        end = new Date(y, m - 1, d + 1, 0, 0, 0, 0)
      }
    } else if (filterPeriodo === 'mes_especifico') {
      start = new Date(selectedMesAno, selectedMes - 1, 1, 0, 0, 0, 0)
      end = new Date(selectedMesAno, selectedMes, 1, 0, 0, 0, 0)
    } else if (filterPeriodo === 'ano_especifico') {
      start = new Date(selectedAno, 0, 1, 0, 0, 0, 0)
      end = new Date(selectedAno + 1, 0, 1, 0, 0, 0, 0)
    } else if (filterPeriodo === 'ultimos_30_dias') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
    } else if (filterPeriodo === 'ultimos_3_meses') {
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
    } else if (filterPeriodo === 'ultimos_6_meses') {
      start = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
    } else if (filterPeriodo === 'ultimos_12_meses') {
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
    } else if (filterPeriodo === 'personalizado') {
      if (customFechaDesde) {
        const [y1, m1, d1] = customFechaDesde.split('-').map(Number)
        start = new Date(y1, m1 - 1, d1, 0, 0, 0, 0)
      }
      if (customFechaHasta) {
        const [y2, m2, d2] = customFechaHasta.split('-').map(Number)
        end = new Date(y2, m2 - 1, d2 + 1, 0, 0, 0, 0)
      }
    }

    return { start, end }
  }, [
    filterPeriodo,
    selectedDia,
    selectedMes,
    selectedMesAno,
    selectedAno,
    customFechaDesde,
    customFechaHasta
  ])

  // Texto amigable del período para la cabecera
  const periodoLabel = useMemo(() => {
    if (filterPeriodo === 'toda_la_bitacora') return 'Toda la bitácora'

    if (filterPeriodo === 'hoy') {
      const now = new Date()
      return now.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
    }

    if (filterPeriodo === 'dia_especifico') {
      if (!selectedDia) return 'Día específico'
      const [y, m, d] = selectedDia.split('-').map(Number)
      const dateObj = new Date(y, m - 1, d)
      return dateObj.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
    }

    if (filterPeriodo === 'mes_especifico') {
      const mesName = MESES.find((m) => m.value === selectedMes)?.label || 'Mes'
      return `${mesName} ${selectedMesAno}`
    }

    if (filterPeriodo === 'ano_especifico') {
      return `Año ${selectedAno}`
    }

    if (filterPeriodo === 'ultimos_30_dias') return 'Últimos 30 días'
    if (filterPeriodo === 'ultimos_3_meses') return 'Últimos 3 meses'
    if (filterPeriodo === 'ultimos_6_meses') return 'Últimos 6 meses'
    if (filterPeriodo === 'ultimos_12_meses') return 'Últimos 12 meses'

    if (filterPeriodo === 'personalizado') {
      if (customFechaDesde && customFechaHasta) {
        const [y1, m1, d1] = customFechaDesde.split('-').map(Number)
        const [y2, m2, d2] = customFechaHasta.split('-').map(Number)
        const f1 = new Date(y1, m1 - 1, d1).toLocaleDateString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
        const f2 = new Date(y2, m2 - 1, d2).toLocaleDateString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
        return `${f1} — ${f2}`
      }
      return 'Rango personalizado'
    }

    return 'Período seleccionado'
  }, [
    filterPeriodo,
    selectedDia,
    selectedMes,
    selectedMesAno,
    selectedAno,
    customFechaDesde,
    customFechaHasta
  ])

  // Métricas de Órdenes de Trabajo sincronizadas con orden_trabajo.estado (Requerimientos 17, 18 y 19)
  const otMetrics = useMemo(() => {
    return calculateOtDashboardMetrics(ordenesTrabajoList, dateRange, {
      area: filterArea,
      equipoId: filterEquipoId,
      tecnico: filterTecnico
    })
  }, [ordenesTrabajoList, dateRange, filterArea, filterEquipoId, filterTecnico])

  // Resetear filtros
  const handleResetFilters = () => {
    setFilterPeriodo('toda_la_bitacora')
    const now = new Date()
    setSelectedDia(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)
    setSelectedMes(now.getMonth() + 1)
    setSelectedMesAno(now.getFullYear())
    setSelectedAno(now.getFullYear())
    setCustomFechaDesde('')
    setCustomFechaHasta('')
    setFilterArea('')
    setFilterEquipoId('')
    setFilterTecnico('')
    setFilterTipoIntervencion('')
    setFilterTipoFalla('')
  }

  const hasActiveFilters =
    filterPeriodo !== 'toda_la_bitacora' ||
    Boolean(filterArea) ||
    Boolean(filterEquipoId) ||
    Boolean(filterTecnico) ||
    Boolean(filterTipoIntervencion) ||
    Boolean(filterTipoFalla) ||
    Boolean(customFechaDesde) ||
    Boolean(customFechaHasta)

  // Filtrado reactivo de bitácora
  const filteredIntervenciones = useMemo(() => {
    return bitacoraList.filter((item) => {
      // 1. Filtro por fecha (límite superior exclusivo para evitar desfases de zona horaria o milisegundos)
      if (dateRange.start || dateRange.end) {
        if (!item.fecha_hora) return false
        const itemDate = new Date(item.fecha_hora)
        if (isNaN(itemDate.getTime())) return false
        if (dateRange.start && itemDate < dateRange.start) return false
        if (dateRange.end && itemDate >= dateRange.end) return false
      }

      // 2. Filtro por área
      if (filterArea) {
        const itemArea = item.area || item.equipo?.area || ''
        if (itemArea.toLowerCase() !== filterArea.toLowerCase()) return false
      }

      // 3. Filtro por equipo
      if (filterEquipoId) {
        if (item.equipo_id !== filterEquipoId) return false
      }

      // 4. Filtro por técnico (soporta coincidencias individuales en tareas compartidas)
      if (filterTecnico) {
        const itemTecs = parseTecnicos(item.tecnico)
        const matches = itemTecs.some(
          (t) => t.toLowerCase() === filterTecnico.toLowerCase()
        )
        if (!matches) return false
      }

      // 5. Filtro por tipo de intervención
      if (filterTipoIntervencion) {
        if (!item.tipo_intervencion || item.tipo_intervencion.toLowerCase() !== filterTipoIntervencion.toLowerCase())
          return false
      }

      // 6. Filtro por tipo de falla
      if (filterTipoFalla) {
        const itemTipoFalla = (item.tipo_falla || '').toLowerCase()
        if (filterTipoFalla === 'Ajuste / Otros') {
          if (!itemTipoFalla.includes('ajuste') && !itemTipoFalla.includes('otro')) return false
        } else if (!itemTipoFalla.includes(filterTipoFalla.toLowerCase().split('/')[0].trim())) {
          return false
        }
      }

      return true
    })
  }, [
    bitacoraList,
    dateRange,
    filterArea,
    filterEquipoId,
    filterTecnico,
    filterTipoIntervencion,
    filterTipoFalla
  ])

  // Mapa de equipos para resolución rápida
  const equiposMap = useMemo(() => {
    const map = new Map()
    equiposList.forEach((eq) => map.set(eq.id, eq))
    return map
  }, [equiposList])

  // ==========================================
  // KPI 1 a 6
  // ==========================================
  const kpis = useMemo(() => {
    const totalIntervenciones = filteredIntervenciones.length
    let totalFallas = 0
    let totalPreventivas = 0
    let totalCorrectivas = 0
    const activosIntervenidosSet = new Set()
    const fallasPorEquipoMap = new Map()

    filteredIntervenciones.forEach((item) => {
      if (item.es_falla) {
        totalFallas++
        if (item.equipo_id) {
          fallasPorEquipoMap.set(
            item.equipo_id,
            (fallasPorEquipoMap.get(item.equipo_id) || 0) + 1
          )
        }
      }
      if (item.tipo_intervencion === 'Preventiva') totalPreventivas++
      if (item.tipo_intervencion === 'Correctiva') totalCorrectivas++
      if (item.equipo_id) activosIntervenidosSet.add(item.equipo_id)
    })

    // Activo con más fallas
    let topFallaEquipoId = null
    let topFallaCount = 0
    fallasPorEquipoMap.forEach((cnt, eqId) => {
      if (cnt > topFallaCount) {
        topFallaCount = cnt
        topFallaEquipoId = eqId
      }
    })

    const topEquipo = topFallaEquipoId ? equiposMap.get(topFallaEquipoId) : null

    return {
      totalIntervenciones,
      totalFallas,
      totalPreventivas,
      totalCorrectivas,
      activosIntervenidos: activosIntervenidosSet.size,
      topEquipoFalla: topEquipo
        ? {
            id: topEquipo.id,
            nombre: topEquipo.nombre,
            codigo: topEquipo.codigo,
            count: topFallaCount
          }
        : null
    }
  }, [filteredIntervenciones, equiposMap])

  // ==========================================
  // GRÁFICO 1: Intervenciones por tipo (por mes)
  // ==========================================
  const intervencionesPorTipoChart = useMemo(() => {
    const monthsMap = new Map()

    filteredIntervenciones.forEach((item) => {
      if (!item.fecha_hora) return
      const d = new Date(item.fecha_hora)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })

      if (!monthsMap.has(key)) {
        monthsMap.set(key, {
          key,
          label,
          Correctiva: 0,
          Preventiva: 0,
          Inspección: 0,
          Ajuste: 0,
          Mejora: 0,
          Otro: 0,
          total: 0
        })
      }

      const entry = monthsMap.get(key)
      const tipo = TIPOS_INTERVENCION.includes(item.tipo_intervencion)
        ? item.tipo_intervencion
        : 'Otro'
      entry[tipo] = (entry[tipo] || 0) + 1
      entry.total += 1
    })

    const sorted = Array.from(monthsMap.values()).sort((a, b) => a.key.localeCompare(b.key))
    const maxTotal = sorted.reduce((max, item) => Math.max(max, item.total), 0) || 1

    return { data: sorted, maxTotal }
  }, [filteredIntervenciones])

  // ==========================================
  // GRÁFICO 2: Fallas por Área
  // ==========================================
  const fallasPorArea = useMemo(() => {
    const areaCounts = new Map()
    let totalFallasArea = 0

    filteredIntervenciones.forEach((item) => {
      if (!item.es_falla) return
      const area = item.area || item.equipo?.area || 'Sin área asignada'
      areaCounts.set(area, (areaCounts.get(area) || 0) + 1)
      totalFallasArea++
    })

    const list = Array.from(areaCounts.entries())
      .map(([area, count]) => ({
        area,
        count,
        percentage: totalFallasArea > 0 ? Math.round((count / totalFallasArea) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)

    return { list, total: totalFallasArea }
  }, [filteredIntervenciones])

  // ==========================================
  // GRÁFICO 3: Tipos de falla (Donut)
  // ==========================================
  const tiposFallaDonut = useMemo(() => {
    const counts = {
      'Mecánica': 0,
      'Eléctrica / Control': 0,
      'Neumática': 0,
      'Hidráulica / Refrigeración': 0,
      'Ajuste / Otros': 0
    }
    let total = 0

    filteredIntervenciones.forEach((item) => {
      if (!item.es_falla) return
      total++
      const raw = (item.tipo_falla || '').toLowerCase()
      if (raw.includes('mecán') || raw.includes('mecan')) counts['Mecánica']++
      else if (raw.includes('eléct') || raw.includes('elect') || raw.includes('control')) counts['Eléctrica / Control']++
      else if (raw.includes('neumát') || raw.includes('neumat')) counts['Neumática']++
      else if (raw.includes('hidrául') || raw.includes('hidraul') || raw.includes('refrig')) counts['Hidráulica / Refrigeración']++
      else counts['Ajuste / Otros']++
    })

    const circumference = 2 * Math.PI * 80
    let accumulatedFraction = 0

    const segments = Object.entries(counts).map(([name, count]) => {
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0
      const segmentFraction = total > 0 ? count / total : 0
      const strokeDasharray = `${segmentFraction * circumference} ${circumference}`
      const strokeDashoffset = -(accumulatedFraction * circumference)
      accumulatedFraction += segmentFraction

      return {
        name,
        count,
        percentage,
        color: COLORS_FALLA[name] || '#94a3b8',
        strokeDasharray,
        strokeDashoffset
      }
    })

    return { total, segments }
  }, [filteredIntervenciones])

  // ==========================================
  // TABLA 4: Top 10 equipos con más fallas
  // ==========================================
  const top10EquiposFallas = useMemo(() => {
    const eqFallasMap = new Map()

    filteredIntervenciones.forEach((item) => {
      if (!item.es_falla || !item.equipo_id) return
      if (!eqFallasMap.has(item.equipo_id)) {
        eqFallasMap.set(item.equipo_id, {
          equipo_id: item.equipo_id,
          fallasCount: 0,
          ultimaFalla: null
        })
      }
      const entry = eqFallasMap.get(item.equipo_id)
      entry.fallasCount++
      const itemDate = item.fecha_hora ? new Date(item.fecha_hora) : null
      if (itemDate && (!entry.ultimaFalla || itemDate > entry.ultimaFalla)) {
        entry.ultimaFalla = itemDate
      }
    })

    const sorted = Array.from(eqFallasMap.values())
      .sort((a, b) => b.fallasCount - a.fallasCount)
      .slice(0, 10)
      .map((item, index) => {
        const eq = equiposMap.get(item.equipo_id)
        return {
          numero: index + 1,
          equipo_id: item.equipo_id,
          nombre: eq ? eq.nombre : 'Equipo desconocido',
          codigo: eq ? eq.codigo : '—',
          area: eq ? eq.area : '—',
          fallasCount: item.fallasCount,
          ultimaFalla: item.ultimaFalla
            ? item.ultimaFalla.toLocaleDateString('es-CL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })
            : '—'
        }
      })

    return sorted
  }, [filteredIntervenciones, equiposMap])

  // ==========================================
  // GRÁFICO 5: Intervenciones por técnico (Carga de trabajo)
  // ==========================================
  const intervencionesPorTecnico = useMemo(() => {
    const tecMap = new Map()

    filteredIntervenciones.forEach((item) => {
      const tecs = parseTecnicos(item.tecnico)
      const list = tecs.length > 0 ? tecs : ['No especificado']

      list.forEach((tec) => {
        // Si el filtro de técnico está activo, contabilizar únicamente al técnico seleccionado
        if (filterTecnico && tec.toLowerCase() !== filterTecnico.toLowerCase()) return

        if (!tecMap.has(tec)) {
          tecMap.set(tec, {
            tecnico: tec,
            correctivas: 0,
            preventivas: 0,
            inspecciones: 0,
            otros: 0,
            total: 0
          })
        }
        const entry = tecMap.get(tec)
        entry.total++
        const tipo = item.tipo_intervencion
        if (tipo === 'Correctiva') entry.correctivas++
        else if (tipo === 'Preventiva') entry.preventivas++
        else if (tipo === 'Inspección') entry.inspecciones++
        else entry.otros++
      })
    })

    const sorted = Array.from(tecMap.values()).sort((a, b) => b.total - a.total)
    const maxTotal = sorted.reduce((max, item) => Math.max(max, item.total), 0) || 1

    return { list: sorted, maxTotal }
  }, [filteredIntervenciones, filterTecnico])


  // Fecha de referencia para ventanas de 12 meses o indicadores relativos
  const referenceDate = useMemo(() => {
    const now = new Date()
    if (filterPeriodo === 'mes_especifico') {
      return new Date(selectedMesAno, selectedMes - 1, 1)
    }
    if (filterPeriodo === 'dia_especifico' && selectedDia) {
      const [y, m, d] = selectedDia.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    if (filterPeriodo === 'ano_especifico') {
      if (selectedAno === now.getFullYear()) {
        return now
      }
      return new Date(selectedAno, 11, 31)
    }
    if (filterPeriodo === 'personalizado' && customFechaHasta) {
      const [y, m, d] = customFechaHasta.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    return now
  }, [filterPeriodo, selectedMesAno, selectedMes, selectedDia, selectedAno, customFechaHasta])

  // ==========================================
  // PANEL 6: Equipos más críticos (Criticidad Operacional Reciente)
  // Formula:
  // Puntaje = (Fallas 30d * 3) + (Correctivas 30d * 1) + bonus_recurrencia (+3 si hay fallas separadas por <= 3 dias)
  // ==========================================
  const equiposCriticos = useMemo(() => {
    const ref = referenceDate
    const thirtyDaysAgo = new Date(ref.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(ref.getTime() - 60 * 24 * 60 * 60 * 1000)

    const eqStats = new Map()

    bitacoraList.forEach((item) => {
      if (!item.equipo_id || !item.fecha_hora) return

      // Respetar filtros complementarios
      if (filterArea) {
        const itemArea = item.area || item.equipo?.area || ''
        if (itemArea.toLowerCase() !== filterArea.toLowerCase()) return
      }
      if (filterEquipoId && item.equipo_id !== filterEquipoId) return
      if (filterTecnico) {
        const itemTecs = parseTecnicos(item.tecnico)
        if (!itemTecs.some((t) => t.toLowerCase() === filterTecnico.toLowerCase())) return
      }

      const d = new Date(item.fecha_hora)

      if (!eqStats.has(item.equipo_id)) {
        eqStats.set(item.equipo_id, {
          equipo_id: item.equipo_id,
          fallas30d: 0,
          correctivas30d: 0,
          fallasPrev30d: 0,
          fallasDates: []
        })
      }

      const st = eqStats.get(item.equipo_id)

      if (d >= thirtyDaysAgo && d <= ref) {
        if (item.es_falla) {
          st.fallas30d++
          st.fallasDates.push(d.getTime())
        }
        if (item.tipo_intervencion === 'Correctiva') {
          st.correctivas30d++
        }
      } else if (d >= sixtyDaysAgo && d < thirtyDaysAgo) {
        if (item.es_falla) {
          st.fallasPrev30d++
        }
      }
    })

    const scored = []
    eqStats.forEach((st) => {
      // Recurrencia: fallas separadas por <= 3 días (259200000 ms)
      let bonusRecurrencia = 0
      if (st.fallasDates.length >= 2) {
        st.fallasDates.sort((a, b) => a - b)
        for (let i = 1; i < st.fallasDates.length; i++) {
          const diffDays = (st.fallasDates[i] - st.fallasDates[i - 1]) / (1000 * 60 * 60 * 24)
          if (diffDays <= 3) {
            bonusRecurrencia = 3
            break
          }
        }
      }

      const puntaje = st.fallas30d * 3 + st.correctivas30d * 1 + bonusRecurrencia

      if (puntaje > 0) {
        let nivel = 'Baja'
        if (puntaje >= 8) nivel = 'Alta'
        else if (puntaje >= 4) nivel = 'Media'

        let tendencia = '→ Estable'
        if (st.fallas30d > st.fallasPrev30d) tendencia = '↑ Aumento'
        else if (st.fallas30d < st.fallasPrev30d) tendencia = '↓ Disminución'

        const eq = equiposMap.get(st.equipo_id)
        scored.push({
          equipo_id: st.equipo_id,
          nombre: eq ? eq.nombre : 'Equipo desconocido',
          codigo: eq ? eq.codigo : '—',
          area: eq ? eq.area : '—',
          fallas30d: st.fallas30d,
          correctivas30d: st.correctivas30d,
          bonusRecurrencia,
          puntaje,
          tendencia,
          nivel
        })
      }
    })

    scored.sort((a, b) => b.puntaje - a.puntaje)
    return scored.slice(0, 8)
  }, [bitacoraList, equiposMap, referenceDate, filterArea, filterEquipoId, filterTecnico])

  // ==========================================
  // GRÁFICO 7: Evolución de fallas — Últimos 12 meses
  // Strictly es_falla = true respecto a la fecha de referencia seleccionada
  // ==========================================
  const evolucionFallas12Meses = useMemo(() => {
    const ref = referenceDate
    const months = []

    // Generar 12 meses calendario terminando en el mes de referencia
    for (let i = 11; i >= 0; i--) {
      const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth()
      const key = `${year}-${String(month + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })
      months.push({ key, label, year, month, count: 0 })
    }

    bitacoraList.forEach((item) => {
      if (!item.es_falla || !item.fecha_hora) return

      // Aplicar filtros no temporales para mantener coherencia
      if (filterArea) {
        const itemArea = item.area || item.equipo?.area || ''
        if (itemArea.toLowerCase() !== filterArea.toLowerCase()) return
      }
      if (filterEquipoId && item.equipo_id !== filterEquipoId) return
      if (filterTecnico) {
        const itemTecs = parseTecnicos(item.tecnico)
        if (!itemTecs.some((t) => t.toLowerCase() === filterTecnico.toLowerCase())) return
      }
      if (filterTipoIntervencion) {
        if (!item.tipo_intervencion || item.tipo_intervencion.toLowerCase() !== filterTipoIntervencion.toLowerCase())
          return
      }
      if (filterTipoFalla) {
        const itemTipoFalla = (item.tipo_falla || '').toLowerCase()
        if (filterTipoFalla === 'Ajuste / Otros') {
          if (!itemTipoFalla.includes('ajuste') && !itemTipoFalla.includes('otro')) return
        } else if (!itemTipoFalla.includes(filterTipoFalla.toLowerCase().split('/')[0].trim())) {
          return
        }
      }

      const d = new Date(item.fecha_hora)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const m = months.find((x) => x.key === key)
      if (m) m.count++
    })

    // Calcular variación porcentual matemática del último mes vs anterior
    const currentMonth = months[months.length - 1]
    const prevMonth = months[months.length - 2]
    let variacionTexto = '0% vs. mes anterior'
    let variacionDireccion = 'neutral' // 'sube' | 'baja' | 'neutral'

    if (prevMonth && currentMonth) {
      if (prevMonth.count === 0 && currentMonth.count > 0) {
        variacionTexto = `↑ 100% vs. mes anterior`
        variacionDireccion = 'sube'
      } else if (prevMonth.count > 0) {
        const diff = currentMonth.count - prevMonth.count
        const pct = Math.round(Math.abs((diff / prevMonth.count) * 100))
        if (diff > 0) {
          variacionTexto = `↑ ${pct}% vs. mes anterior`
          variacionDireccion = 'sube'
        } else if (diff < 0) {
          variacionTexto = `↓ ${pct}% vs. mes anterior`
          variacionDireccion = 'baja'
        } else {
          variacionTexto = `→ 0% vs. mes anterior`
          variacionDireccion = 'neutral'
        }
      }
    }

    const maxCount = months.reduce((max, m) => Math.max(max, m.count), 0) || 1

    return { months, maxCount, variacionTexto, variacionDireccion }
  }, [
    referenceDate,
    bitacoraList,
    filterArea,
    filterEquipoId,
    filterTecnico,
    filterTipoIntervencion,
    filterTipoFalla
  ])

  return (
    <div className="fracttal-dashboard-container">
      {/* 1. CABECERA PRINCIPAL */}
      <header className="fracttal-dashboard-header">
        <div className="fracttal-header-titles">
          <div className="fracttal-title-with-badge">
            <h1 className="fracttal-page-title">Dashboard de Mantenimiento</h1>
            <span className="fracttal-badge-aguacol">AGUACOL</span>
          </div>
          <p className="fracttal-page-subtitle">
            Visión general del estado del mantenimiento en Aguacol
          </p>
        </div>

        <div className="fracttal-header-meta">
          <div className="fracttal-meta-pill" title="Período de análisis activo">
            <span className="fracttal-meta-icon"><Icon n="calendar" /></span>
            <span className="fracttal-meta-text">{periodoLabel}</span>
          </div>
          <div className="fracttal-meta-pill" title="Última actualización de datos">
            <span className="fracttal-meta-icon"><Icon n="clock" /></span>
            <span className="fracttal-meta-text">
              Actualizado: {lastUpdate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              type="button"
              className="fracttal-refresh-btn"
              onClick={onRefreshData}
              title="Recargar datos de Supabase"
            >
              <Icon n="refresh" />
            </button>
          </div>
          <div className="fracttal-meta-pill fracttal-user-pill">
            <span className="fracttal-meta-icon"><Icon n="user" /></span>
            <span className="fracttal-meta-text">
              {session?.user?.email || 'Usuario autenticado'}
            </span>
          </div>
        </div>
      </header>

      {/* 2. BARRA DE FILTROS GLOBALES */}
      <div className="fracttal-filters-card">
        <div className="fracttal-filters-header">
          <div className="fracttal-filters-title">
            <span className="fracttal-filter-icon"><Icon n="cog" /></span>
            <span>Filtros Globales de Mantenimiento</span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="fracttal-btn-clear"
              onClick={handleResetFilters}
            >
              <Icon n="x" /> Limpiar filtros
            </button>
          )}
        </div>

        <div className="fracttal-filters-grid">
          {/* Período */}
          <div className="fracttal-filter-control">
            <label className="fracttal-filter-label">Período</label>
            <select
              className="fracttal-select"
              value={filterPeriodo}
              onChange={(e) => setFilterPeriodo(e.target.value)}
            >
              <option value="toda_la_bitacora">Toda la bitácora</option>
              <option value="hoy">Hoy</option>
              <option value="dia_especifico">Día específico</option>
              <option value="mes_especifico">Mes específico</option>
              <option value="ano_especifico">Año específico</option>
              <option value="ultimos_30_dias">Últimos 30 días</option>
              <option value="ultimos_3_meses">Últimos 3 meses</option>
              <option value="ultimos_6_meses">Últimos 6 meses</option>
              <option value="ultimos_12_meses">Últimos 12 meses</option>
              <option value="personalizado">Rango personalizado</option>
            </select>
          </div>

          {/* Sub-selector: Día específico */}
          {filterPeriodo === 'dia_especifico' && (
            <div className="fracttal-filter-control">
              <label className="fracttal-filter-label">Día</label>
              <input
                type="date"
                className="fracttal-input"
                value={selectedDia}
                onChange={(e) => setSelectedDia(e.target.value)}
              />
            </div>
          )}

          {/* Sub-selector: Mes específico */}
          {filterPeriodo === 'mes_especifico' && (
            <>
              <div className="fracttal-filter-control">
                <label className="fracttal-filter-label">Mes</label>
                <select
                  className="fracttal-select"
                  value={selectedMes}
                  onChange={(e) => setSelectedMes(Number(e.target.value))}
                >
                  {MESES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fracttal-filter-control">
                <label className="fracttal-filter-label">Año</label>
                <select
                  className="fracttal-select"
                  value={selectedMesAno}
                  onChange={(e) => setSelectedMesAno(Number(e.target.value))}
                >
                  {availableAnos.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Sub-selector: Año específico */}
          {filterPeriodo === 'ano_especifico' && (
            <div className="fracttal-filter-control">
              <label className="fracttal-filter-label">Año</label>
              <select
                className="fracttal-select"
                value={selectedAno}
                onChange={(e) => setSelectedAno(Number(e.target.value))}
              >
                {availableAnos.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sub-selector: Rango personalizado */}
          {filterPeriodo === 'personalizado' && (
            <>
              <div className="fracttal-filter-control">
                <label className="fracttal-filter-label">Desde</label>
                <input
                  type="date"
                  className={`fracttal-input ${customDateError ? 'input-error' : ''}`}
                  value={customFechaDesde}
                  onChange={(e) => setCustomFechaDesde(e.target.value)}
                />
              </div>
              <div className="fracttal-filter-control">
                <label className="fracttal-filter-label">Hasta</label>
                <input
                  type="date"
                  className={`fracttal-input ${customDateError ? 'input-error' : ''}`}
                  value={customFechaHasta}
                  onChange={(e) => setCustomFechaHasta(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Área */}
          <div className="fracttal-filter-control">
            <label className="fracttal-filter-label">Área</label>
            <select
              className="fracttal-select"
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
            >
              <option value="">Todas las áreas</option>
              {availableAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          {/* Equipo */}
          <div className="fracttal-filter-control">
            <label className="fracttal-filter-label">Equipo</label>
            <select
              className="fracttal-select"
              value={filterEquipoId}
              onChange={(e) => setFilterEquipoId(e.target.value)}
            >
              <option value="">Todos los equipos ({equiposList.length})</option>
              {equiposList.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Técnico */}
          <div className="fracttal-filter-control">
            <label className="fracttal-filter-label">Técnico</label>
            <select
              className="fracttal-select"
              value={filterTecnico}
              onChange={(e) => setFilterTecnico(e.target.value)}
            >
              <option value="">Todos los técnicos ({availableTecnicos.length})</option>
              {availableTecnicos.map((tec) => (
                <option key={tec} value={tec}>
                  {tec}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de intervención */}
          <div className="fracttal-filter-control">
            <label className="fracttal-filter-label">Tipo de intervención</label>
            <select
              className="fracttal-select"
              value={filterTipoIntervencion}
              onChange={(e) => setFilterTipoIntervencion(e.target.value)}
            >
              <option value="">Todos los tipos</option>
              {TIPOS_INTERVENCION.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de falla */}
          <div className="fracttal-filter-control">
            <label className="fracttal-filter-label">Tipo de falla</label>
            <select
              className="fracttal-select"
              value={filterTipoFalla}
              onChange={(e) => setFilterTipoFalla(e.target.value)}
            >
              <option value="">Todos los tipos de falla</option>
              {TIPOS_FALLA.map((tf) => (
                <option key={tf} value={tf}>
                  {tf}
                </option>
              ))}
            </select>
          </div>
        </div>

        {customDateError && (
          <div className="fracttal-filter-error-banner" role="alert">
            <span><Icon n="warn" /></span>
            <span>La fecha &quot;Desde&quot; ({customFechaDesde}) no puede ser posterior a la fecha &quot;Hasta&quot; ({customFechaHasta}).</span>
          </div>
        )}
      </div>

      {loading && (
        <div className="fracttal-loading-banner">
          <span className="spinner"></span>
          <span>Actualizando indicadores y analítica en tiempo real...</span>
        </div>
      )}

      {/* 3. SEIS TARJETAS KPI SUPERIORES */}
      <div className="fracttal-kpi-grid">
        {/* KPI 1: Intervenciones */}
        <div
          className="fracttal-kpi-card"
          onClick={() => onNavigateToBitacora({})}
          title="Ver todas las intervenciones en Bitácora"
        >
          <div className="fracttal-kpi-top">
            <span className="fracttal-kpi-title">Intervenciones</span>
            <span className="fracttal-kpi-icon-wrapper kpi-icon-blue"><Icon n="list" /></span>
          </div>
          <div className="fracttal-kpi-value">{kpis.totalIntervenciones}</div>
          <div className="fracttal-kpi-subtitle">Total registradas en el período</div>
        </div>

        {/* KPI 2: Fallas */}
        <div
          className="fracttal-kpi-card fracttal-kpi-alert"
          onClick={() => onNavigateToBitacora({ esFalla: 'si' })}
          title="Ver fallas en Bitácora"
        >
          <div className="fracttal-kpi-top">
            <span className="fracttal-kpi-title text-alert">Fallas</span>
            <span className="fracttal-kpi-icon-wrapper kpi-icon-red"><Icon n="warn" /></span>
          </div>
          <div className="fracttal-kpi-value text-alert">{kpis.totalFallas}</div>
          <div className="fracttal-kpi-subtitle">Paradas y fallas operacionales</div>
        </div>

        {/* KPI 3: Preventivas */}
        <div
          className="fracttal-kpi-card"
          onClick={() => onNavigateToBitacora({ tipoIntervencion: 'Preventiva' })}
          title="Ver intervenciones preventivas en Bitácora"
        >
          <div className="fracttal-kpi-top">
            <span className="fracttal-kpi-title">Preventivas</span>
            <span className="fracttal-kpi-icon-wrapper kpi-icon-green"><Icon n="shield" /></span>
          </div>
          <div className="fracttal-kpi-value">{kpis.totalPreventivas}</div>
          <div className="fracttal-kpi-subtitle">Mantenimiento preventivo</div>
        </div>

        {/* KPI 4: Correctivas */}
        <div
          className="fracttal-kpi-card"
          onClick={() => onNavigateToBitacora({ tipoIntervencion: 'Correctiva' })}
          title="Ver intervenciones correctivas en Bitácora"
        >
          <div className="fracttal-kpi-top">
            <span className="fracttal-kpi-title">Correctivas</span>
            <span className="fracttal-kpi-icon-wrapper kpi-icon-amber"><Icon n="tools" /></span>
          </div>
          <div className="fracttal-kpi-value">{kpis.totalCorrectivas}</div>
          <div className="fracttal-kpi-subtitle">Reparaciones correctivas</div>
        </div>

        {/* KPI 5: Activos intervenidos */}
        <div className="fracttal-kpi-card">
          <div className="fracttal-kpi-top">
            <span className="fracttal-kpi-title">Activos intervenidos</span>
            <span className="fracttal-kpi-icon-wrapper kpi-icon-purple"><Icon n="factory" /></span>
          </div>
          <div className="fracttal-kpi-value">{kpis.activosIntervenidos}</div>
          <div className="fracttal-kpi-subtitle">Equipos con intervención</div>
        </div>

        {/* KPI 6: Activo con más fallas */}
        <div
          className={`fracttal-kpi-card fracttal-kpi-clickable ${kpis.topEquipoFalla ? 'fracttal-kpi-highlight' : ''}`}
          onClick={() => {
            if (kpis.topEquipoFalla?.id) {
              onNavigateToActivo({ equipoId: kpis.topEquipoFalla.id, tab: 'fallas' })
            }
          }}
          title={kpis.topEquipoFalla ? 'Clic para abrir ficha en Historial de Fallas' : 'Sin fallas'}
        >
          <div className="fracttal-kpi-top">
            <span className="fracttal-kpi-title">Activo con más fallas</span>
            <span className="fracttal-kpi-icon-wrapper kpi-icon-red"><Icon n="target" /></span>
          </div>
          {kpis.topEquipoFalla ? (
            <>
              <div className="fracttal-kpi-value-text" title={kpis.topEquipoFalla.nombre}>
                {kpis.topEquipoFalla.nombre}
              </div>
              <div className="fracttal-kpi-subtitle text-alert font-bold">
                {kpis.topEquipoFalla.count} {kpis.topEquipoFalla.count === 1 ? 'falla' : 'fallas'}
                <span className="fracttal-drill-hint"> (Ver historial →)</span>
              </div>
            </>
          ) : (
            <>
              <div className="fracttal-kpi-value-text">Ninguno</div>
              <div className="fracttal-kpi-subtitle">Sin fallas registradas</div>
            </>
          )}
        </div>
      </div>

      {/* 3B. INDICADORES DE ÓRDENES DE TRABAJO */}
      <div className="fracttal-card ot-dashboard-metrics-panel" style={{ marginBottom: '1.25rem' }}>
        <div className="fracttal-card-header" style={{ paddingBottom: '0.75rem' }}>
          <div>
            <h2 className="fracttal-card-title">
              <Icon n="tools" /> Estado Operacional y Cierre de Órdenes de Trabajo
            </h2>
            <p className="fracttal-card-desc">
              Resumen de órdenes pendientes, en curso y cerradas en el período seleccionado ({periodoLabel}).
            </p>
          </div>
          <button
            type="button"
            className="fracttal-btn-action"
            onClick={() => onNavigateToOrdenesTrabajo()}
          >
            Ver Órdenes de Trabajo →
          </button>
        </div>

        <div className="ot-dashboard-kpi-row">
          {/* OT Pendientes */}
          <div
            className="ot-dash-stat-box ot-dash-stat-pendiente"
            onClick={() => onNavigateToOrdenesTrabajo('Pendiente')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigateToOrdenesTrabajo('Pendiente')}
          >
            <div className="ot-dash-stat-top">
              <span className="ot-dash-stat-label">OT Pendientes</span>
              <span className="ot-status-pill ot-pill-pendiente">Pendiente</span>
            </div>
            <div className="ot-dash-stat-value">{otMetrics.pendientesActuales}</div>
            <div className="ot-dash-stat-meta">
              Órdenes por iniciar atención
            </div>
          </div>

          {/* OT En curso */}
          <div
            className="ot-dash-stat-box ot-dash-stat-encurso"
            onClick={() => onNavigateToOrdenesTrabajo('En curso')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigateToOrdenesTrabajo('En curso')}
          >
            <div className="ot-dash-stat-top">
              <span className="ot-dash-stat-label">OT En curso</span>
              <span className="ot-status-pill ot-pill-encurso">En curso</span>
            </div>
            <div className="ot-dash-stat-value">{otMetrics.enCursoActuales}</div>
            <div className="ot-dash-stat-meta">
              Órdenes en ejecución activa
            </div>
          </div>

          {/* OT Finalizadas del período */}
          <div
            className="ot-dash-stat-box ot-dash-stat-finalizada"
            onClick={() => onNavigateToOrdenesTrabajo('Finalizada')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigateToOrdenesTrabajo('Finalizada')}
          >
            <div className="ot-dash-stat-top">
              <span className="ot-dash-stat-label">OT Cerradas ({periodoLabel})</span>
              <span className="ot-status-pill ot-pill-finalizada">Finalizada</span>
            </div>
            <div className="ot-dash-stat-value">{otMetrics.finalizadasPeriodo}</div>
            <div className="ot-dash-stat-meta">
              Total finalizadas acumulado: {otMetrics.finalizadasTotales}
            </div>
          </div>
        </div>
      </div>

      {/* 4. FILA DE GRÁFICOS PRINCIPALES: Evolución 12 meses + Intervenciones por tipo */}
      <div className="fracttal-grid-two-cols">
        {/* GRÁFICO 11: Evolución de fallas — Últimos 12 meses */}
        <div className="fracttal-card">
          <div className="fracttal-card-header">
            <div>
              <h2 className="fracttal-card-title">Evolución de fallas — Últimos 12 meses</h2>
              <p className="fracttal-card-desc">
                Conteo mensual exclusivo de paradas y fallas operacionales (<code>es_falla = true</code>).
              </p>
            </div>
            <div className="fracttal-variance-badge" data-direction={evolucionFallas12Meses.variacionDireccion}>
              {evolucionFallas12Meses.variacionTexto}
            </div>
          </div>

          <div className="fracttal-chart-container">
            <div className="fracttal-line-chart-wrapper">
              <svg className="fracttal-svg-chart" viewBox="0 0 650 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="fallasGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Líneas horizontales de guía */}
                <line x1="40" y1="30" x2="630" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
                <line x1="40" y1="85" x2="630" y2="85" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
                <line x1="40" y1="140" x2="630" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />

                {/* Construcción de la línea de evolución */}
                {(() => {
                  const pts = evolucionFallas12Meses.months.map((m, idx) => {
                    const step = (630 - 50) / (evolucionFallas12Meses.months.length - 1 || 1)
                    const x = 50 + idx * step
                    const y = 150 - (m.count / evolucionFallas12Meses.maxCount) * 110
                    return { x, y, count: m.count, label: m.label }
                  })

                  const pathD = pts.reduce(
                    (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
                    ''
                  )
                  const areaD = `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} 150 L ${pts[0].x.toFixed(1)} 150 Z`

                  return (
                    <>
                      <path d={areaD} fill="url(#fallasGradient)" />
                      <path d={pathD} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                      {pts.map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#ef4444" strokeWidth="2.5" />
                          <text
                            x={p.x}
                            y={p.y - 8}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight="600"
                            fill="#1e293b"
                          >
                            {p.count}
                          </text>
                        </g>
                      ))}
                    </>
                  )
                })()}
              </svg>

              {/* Etiquetas Eje X */}
              <div className="fracttal-line-labels-row">
                {evolucionFallas12Meses.months.map((m) => (
                  <span key={m.key} className="fracttal-axis-label">
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* GRÁFICO 5: Intervenciones por tipo (Barras apiladas) */}
        <div className="fracttal-card">
          <div className="fracttal-card-header">
            <div>
              <h2 className="fracttal-card-title">Intervenciones por tipo de intervención</h2>
              <p className="fracttal-card-desc">
                Distribución mensual apilada según clasificación de trabajo.
              </p>
            </div>
            {/* Leyenda */}
            <div className="fracttal-mini-legend">
              {TIPOS_INTERVENCION.map((t) => (
                <div key={t} className="fracttal-legend-item">
                  <span className="fracttal-legend-dot" style={{ backgroundColor: COLORS_INTERVENCION[t] }} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="fracttal-chart-container">
            {intervencionesPorTipoChart.data.length === 0 ? (
              <div className="fracttal-empty-state">No hay intervenciones en el período seleccionado.</div>
            ) : (
              <div className="fracttal-stacked-bar-chart">
                {intervencionesPorTipoChart.data.map((col) => {
                  return (
                    <div key={col.key} className="fracttal-bar-col">
                      <div className="fracttal-bar-col-stack" title={`${col.label}: ${col.total} intervenciones`}>
                        {TIPOS_INTERVENCION.slice()
                          .reverse()
                          .map((tipo) => {
                            const cnt = col[tipo] || 0
                            if (cnt === 0) return null
                            const hPct = (cnt / col.total) * 100
                            return (
                              <div
                                key={tipo}
                                className="fracttal-bar-segment"
                                style={{
                                  height: `${hPct}%`,
                                  backgroundColor: COLORS_INTERVENCION[tipo]
                                }}
                                title={`${tipo}: ${cnt}`}
                              />
                            )
                          })}
                      </div>
                      <span className="fracttal-bar-col-total">{col.total}</span>
                      <span className="fracttal-bar-col-label">{col.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. FILA DE ANÁLISIS: Fallas por área + Tipos de falla (Donut) */}
      <div className="fracttal-grid-two-cols">
        {/* GRÁFICO 6: Fallas por área (Barras horizontales con Drill-Down) */}
        <div className="fracttal-card">
          <div className="fracttal-card-header">
            <div>
              <h2 className="fracttal-card-title">Fallas por área</h2>
              <p className="fracttal-card-desc">
                Concentración de fallas operacionales por zona física. Haga clic en un área para ver sus registros.
              </p>
            </div>
            <span className="fracttal-badge-count">{fallasPorArea.total} fallas</span>
          </div>

          <div className="fracttal-horizontal-bars-container">
            {fallasPorArea.list.length === 0 ? (
              <div className="fracttal-empty-state">No se registran fallas para las áreas filtradas.</div>
            ) : (
              fallasPorArea.list.map((item) => (
                <div
                  key={item.area}
                  className="fracttal-hbar-row fracttal-clickable-row"
                  onClick={() => onNavigateToBitacora({ area: item.area, esFalla: 'si' })}
                  title={`Ver bitácora de ${item.area} con fallas`}
                >
                  <div className="fracttal-hbar-labels">
                    <span className="fracttal-hbar-title">{item.area}</span>
                    <div className="fracttal-hbar-metrics">
                      <strong className="fracttal-hbar-count">{item.count}</strong>
                      <span className="fracttal-hbar-pct">{item.percentage}%</span>
                    </div>
                  </div>
                  <div className="fracttal-hbar-track">
                    <div
                      className="fracttal-hbar-fill"
                      style={{
                        width: `${Math.max(item.percentage, 4)}%`,
                        backgroundColor: '#ef4444'
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* GRÁFICO 7: Tipos de falla (Donut) */}
        <div className="fracttal-card">
          <div className="fracttal-card-header">
            <div>
              <h2 className="fracttal-card-title">Tipos de falla</h2>
              <p className="fracttal-card-desc">
                Clasificación por disciplina técnica de las averías reportadas.
              </p>
            </div>
            <span className="fracttal-badge-count">{tiposFallaDonut.total} total</span>
          </div>

          <div className="fracttal-donut-section">
            <div className="fracttal-donut-visual">
              <svg className="fracttal-donut-svg" viewBox="0 0 240 240">
                {(() => {
                  if (tiposFallaDonut.total === 0) {
                    return (
                      <circle
                        cx="120"
                        cy="120"
                        r="80"
                        fill="transparent"
                        stroke="#e2e8f0"
                        strokeWidth="30"
                      />
                    )
                  }

                  return (
                    <g transform="rotate(-90 120 120)">
                      {tiposFallaDonut.segments.map((seg) => {
                        if (seg.count === 0) return null

                        return (
                          <circle
                            key={seg.name}
                            cx="120"
                            cy="120"
                            r="80"
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth="30"
                            strokeDasharray={seg.strokeDasharray}
                            strokeDashoffset={seg.strokeDashoffset}
                            style={{ cursor: 'pointer', transition: 'stroke-width 0.2s ease' }}
                            onClick={() => onNavigateToBitacora({ tipoFalla: seg.name, esFalla: 'si' })}
                          >
                            <title>{`${seg.name}: ${seg.count} (${seg.percentage}%)`}</title>
                          </circle>
                        )
                      })}
                    </g>
                  )
                })()}
                {/* Texto Central Grande y Legible */}
                <g className="fracttal-donut-center-text">
                  <text x="120" y="115" textAnchor="middle" className="donut-center-number">
                    {tiposFallaDonut.total}
                  </text>
                  <text x="120" y="139" textAnchor="middle" className="donut-center-label">
                    FALLAS
                  </text>
                </g>
              </svg>
            </div>

            {/* Leyendas ubicadas estrictamente debajo del donut */}
            <div className="fracttal-donut-legend">
              {tiposFallaDonut.segments.map((seg) => (
                <div
                  key={seg.name}
                  className="fracttal-donut-legend-row"
                  onClick={() => onNavigateToBitacora({ tipoFalla: seg.name, esFalla: 'si' })}
                  title={`Filtrar bitácora por falla: ${seg.name}`}
                >
                  <div className="fracttal-legend-name-box">
                    <span className="fracttal-legend-dot" style={{ backgroundColor: seg.color }} />
                    <span className="fracttal-legend-name">{seg.name}</span>
                  </div>
                  <div className="fracttal-legend-values">
                    <span className="fracttal-legend-count">{seg.count}</span>
                    <span className="fracttal-legend-pct">{seg.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. FILA DE GESTIÓN TÉCNICA: Carga de trabajo por técnico */}
      <div className="fracttal-card">
        <div className="fracttal-card-header">
          <div>
            <h2 className="fracttal-card-title">Intervenciones por técnico</h2>
            <p className="fracttal-card-desc">
              <strong>Carga de trabajo registrada</strong> por cada técnico según tipo de intervención ejecutada.
            </p>
          </div>
          {/* Leyenda */}
          <div className="fracttal-mini-legend">
            <div className="fracttal-legend-item">
              <span className="fracttal-legend-dot" style={{ backgroundColor: '#ef4444' }} />
              <span>Correctivas</span>
            </div>
            <div className="fracttal-legend-item">
              <span className="fracttal-legend-dot" style={{ backgroundColor: '#10b981' }} />
              <span>Preventivas</span>
            </div>
            <div className="fracttal-legend-item">
              <span className="fracttal-legend-dot" style={{ backgroundColor: '#3b82f6' }} />
              <span>Inspecciones</span>
            </div>
            <div className="fracttal-legend-item">
              <span className="fracttal-legend-dot" style={{ backgroundColor: '#94a3b8' }} />
              <span>Otros</span>
            </div>
          </div>
        </div>

        <div className="fracttal-tecnicos-grid">
          {intervencionesPorTecnico.list.length === 0 ? (
            <div className="fracttal-empty-state">No hay registros de técnicos con los filtros activos.</div>
          ) : (
            intervencionesPorTecnico.list.map((tec) => {
              return (
                <div
                  key={tec.tecnico}
                  className="fracttal-tec-row fracttal-clickable-row"
                  onClick={() => onNavigateToBitacora({ tecnico: tec.tecnico })}
                  title={`Ver todas las intervenciones de ${tec.tecnico} en Bitácora`}
                >
                  <div className="fracttal-tec-info">
                    <span className="fracttal-tec-name">{tec.tecnico}</span>
                    <span className="fracttal-tec-total">{tec.total} total</span>
                  </div>
                  <div className="fracttal-tec-bar-track">
                    <div
                      className="fracttal-tec-bar-wrapper"
                      style={{ width: `${Math.max((tec.total / intervencionesPorTecnico.maxTotal) * 100, 5)}%` }}
                    >
                      {tec.correctivas > 0 && (
                        <div
                          className="fracttal-tec-bar-seg"
                          style={{
                            width: `${(tec.correctivas / tec.total) * 100}%`,
                            backgroundColor: '#ef4444'
                          }}
                          title={`Correctivas: ${tec.correctivas}`}
                        />
                      )}
                      {tec.preventivas > 0 && (
                        <div
                          className="fracttal-tec-bar-seg"
                          style={{
                            width: `${(tec.preventivas / tec.total) * 100}%`,
                            backgroundColor: '#10b981'
                          }}
                          title={`Preventivas: ${tec.preventivas}`}
                        />
                      )}
                      {tec.inspecciones > 0 && (
                        <div
                          className="fracttal-tec-bar-seg"
                          style={{
                            width: `${(tec.inspecciones / tec.total) * 100}%`,
                            backgroundColor: '#3b82f6'
                          }}
                          title={`Inspecciones: ${tec.inspecciones}`}
                        />
                      )}
                      {tec.otros > 0 && (
                        <div
                          className="fracttal-tec-bar-seg"
                          style={{
                            width: `${(tec.otros / tec.total) * 100}%`,
                            backgroundColor: '#94a3b8'
                          }}
                          title={`Otros: ${tec.otros}`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 7. FILA DE ACTORES CRÍTICOS: Top 10 Equipos con más fallas & Panel Equipos más críticos */}
      <div className="fracttal-grid-two-cols">
        {/* TABLA 8: Top 10 equipos con más fallas */}
        <div className="fracttal-card">
          <div className="fracttal-card-header">
            <div>
              <h2 className="fracttal-card-title">Top 10 equipos con más fallas</h2>
              <p className="fracttal-card-desc">
                Ranking de activos con mayor cantidad de incidencias (<code>es_falla = true</code>).
              </p>
            </div>
          </div>

          <div className="fracttal-table-wrapper">
            <table className="fracttal-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Nº</th>
                  <th>Equipo</th>
                  <th>Área</th>
                  <th className="text-center">Fallas</th>
                  <th>Última falla</th>
                  <th className="text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {top10EquiposFallas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center" style={{ padding: '2rem' }}>
                      Sin fallas registradas en los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  top10EquiposFallas.map((item) => (
                    <tr
                      key={item.equipo_id}
                      className="fracttal-table-row-clickable"
                      onClick={() => onNavigateToActivo({ equipoId: item.equipo_id, tab: 'fallas' })}
                    >
                      <td className="font-bold text-muted">{item.numero}</td>
                      <td>
                        <strong className="text-primary-link">{item.nombre}</strong>
                      </td>
                      <td>{item.area}</td>
                      <td className="text-center">
                        <span className="fracttal-pill-fallas">{item.fallasCount}</span>
                      </td>
                      <td className="text-muted font-mono">{item.ultimaFalla}</td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="fracttal-btn-action"
                          onClick={(e) => {
                            e.stopPropagation()
                            onNavigateToActivo({ equipoId: item.equipo_id, tab: 'fallas' })
                          }}
                        >
                          Ver ficha →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL 10: Equipos más críticos */}
        <div className="fracttal-card">
          <div className="fracttal-card-header">
            <div>
              <h2 className="fracttal-card-title">Equipos más críticos</h2>
              <p className="fracttal-card-desc">
                <strong>Criticidad operacional reciente:</strong> puntaje = (Fallas 30d × 3) + (Correctivas 30d × 1) + bonus recurrencia (+3 si ≤ 3 días).
              </p>
            </div>
            <span className="fracttal-badge-info" title="Indicador puramente operativo reciente, no modifica el maestro de criticidad">
              Operacional (30 días)
            </span>
          </div>

          <div className="fracttal-table-wrapper">
            <table className="fracttal-table">
              <thead>
                <tr>
                  <th style={{ width: '35px' }}>Nº</th>
                  <th>Equipo</th>
                  <th>Área</th>
                  <th className="text-center">Fallas 30d</th>
                  <th className="text-center">Corr. 30d</th>
                  <th className="text-center">Tendencia</th>
                  <th className="text-center">Nivel</th>
                  <th className="text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {equiposCriticos.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center" style={{ padding: '2rem' }}>
                      Sin criticidad operacional alta registrada en los últimos 30 días.
                    </td>
                  </tr>
                ) : (
                  equiposCriticos.map((item, idx) => {
                    let badgeClass = 'badge-nivel-baja'
                    if (item.nivel === 'Alta') badgeClass = 'badge-nivel-alta'
                    else if (item.nivel === 'Media') badgeClass = 'badge-nivel-media'

                    return (
                      <tr
                        key={item.equipo_id}
                        className="fracttal-table-row-clickable"
                        onClick={() => onNavigateToActivo({ equipoId: item.equipo_id, tab: 'fallas' })}
                      >
                        <td className="font-bold text-muted">{idx + 1}</td>
                        <td>
                          <strong className="text-primary-link">{item.nombre}</strong>
                        </td>
                        <td>{item.area}</td>
                        <td className="text-center font-bold text-alert">{item.fallas30d}</td>
                        <td className="text-center">{item.correctivas30d}</td>
                        <td className="text-center font-mono" style={{ fontSize: '0.85rem' }}>
                          {item.tendencia}
                        </td>
                        <td className="text-center">
                          <span className={`fracttal-nivel-badge ${badgeClass}`}>
                            {item.nivel}
                          </span>
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="fracttal-btn-action"
                            onClick={(e) => {
                              e.stopPropagation()
                              onNavigateToActivo({ equipoId: item.equipo_id, tab: 'fallas' })
                            }}
                          >
                            Ver ficha →
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="fracttal-card-footer-note">
            ℹ Los niveles de criticidad operacional reciente son una ayuda visual dinámica basada en la tasa de eventos recientes y no alteran la criticidad maestra del activo en base de datos.
          </div>
        </div>
      </div>
    </div>
  )
}
