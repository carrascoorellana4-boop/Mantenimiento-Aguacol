import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './lib/supabase'
import * as XLSX from 'xlsx'
import { CLASIFICACIONES_APROBADAS_REGISTRO } from './config/maestroJerarquia'
import { buildActivosTree, findActivoInTree, ESTADOS_ACTIVO, PLANTA_NOMBRE, JERARQUIA_APROBADA } from './config/activosTree'
import { TECNICOS_BASE } from './config/tecnicos'
import DashboardMantenimiento from './components/DashboardMantenimiento'
import ValidacionPendientesView from './components/ValidacionPendientesView'
import OrdenesTrabajoView from './components/OrdenesTrabajoView'
import { fetchOrdenesTrabajo, subscribeToOrdenesTrabajoRealtime } from './services/ordenesTrabajoService'
import './App.css'

const INITIAL_FORM_STATE = {
  codigo: '',
  nombre: '',
  categoria: 'Mecánica',
  fabricante: '',
  numero_parte: '',
  unidad_medida: 'UND',
  precio_compra: '',
  moneda_compra: 'CLP',
  stock_minimo: '',
  stock_maximo: '',
  ubicacion_repuesto: '',
  criticidad: 'Media',
  estado: 'Activo',
  stock_inicial: ''
}

const INITIAL_INTERVENCION_STATE = {
  fecha_hora: '',
  equipo_id: '',
  tecnico: '',
  es_falla: false,
  tipo_intervencion: 'Correctiva',
  falla_motivo: '',
  trabajo_realizado: '',
  estado_final: 'Operativo',
  area: '',
  tipo_falla: ''
}

// Formateador de moneda para pesos chilenos (CLP)
const formatCLP = (val) => {
  const num = Number(val) || 0
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(num)
}

// Formateador de fecha y hora local (DD/MM/YYYY HH:mm)
const formatDateTime = (val) => {
  if (!val) return '-'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d)
  } catch {
    return String(val)
  }
}

// Formateador de fecha corta (DD/MM/YYYY)
const formatDateOnly = (val) => {
  if (!val) return '-'
  try {
    const d = val instanceof Date ? val : new Date(val)
    if (isNaN(d.getTime())) return String(val)
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d)
  } catch {
    return String(val)
  }
}

// Parser robusto para fechas seriales de Excel o ISO (sin desfase de zona horaria)
const parseExcelDate = (val) => {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val === 'number' || (!isNaN(val) && !isNaN(parseFloat(val)) && isFinite(val) && typeof val !== 'string')) {
    const parsed = XLSX.SSF.parse_date_code(Number(val))
    if (parsed) {
      return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0)
    }
  }
  if (typeof val === 'string') {
    const trimmed = val.trim()
    // Número serial expresado como string
    if (!isNaN(trimmed) && !isNaN(parseFloat(trimmed)) && isFinite(trimmed) && !trimmed.includes('/') && !trimmed.includes('-')) {
      const parsed = XLSX.SSF.parse_date_code(Number(trimmed))
      if (parsed) {
        return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0)
      }
    }
    // Formato YYYY-MM-DD o YYYY/MM/DD
    const ymd = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?/)
    if (ymd) {
      const year = parseInt(ymd[1], 10)
      const month = parseInt(ymd[2], 10) - 1
      const day = parseInt(ymd[3], 10)
      const hour = ymd[4] ? parseInt(ymd[4], 10) : 0
      const min = ymd[5] ? parseInt(ymd[5], 10) : 0
      return new Date(year, month, day, hour, min)
    }
    // Formato DD-MM-YYYY o DD/MM/YYYY
    const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2}))?/)
    if (dmy) {
      const day = parseInt(dmy[1], 10)
      const month = parseInt(dmy[2], 10) - 1
      let year = parseInt(dmy[3], 10)
      if (year < 100) year += 2000
      const hour = dmy[4] ? parseInt(dmy[4], 10) : 0
      const min = dmy[5] ? parseInt(dmy[5], 10) : 0
      return new Date(year, month, day, hour, min)
    }
  }
  const parsed = new Date(val)
  if (!isNaN(parsed.getTime())) return parsed
  return null
}

// Función para normalizar texto eliminando tildes/acentos y pasando a minúsculas
const normalizeText = (text) =>
  (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

// Parser seguro de fechas ISO/SQL preservando día local chileno sin desfases
const parseSafeDate = (val) => {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val === 'string') {
    const trimmed = val.trim()
    const m = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/)
    if (m) {
      const year = parseInt(m[1], 10)
      const month = parseInt(m[2], 10) - 1
      const day = parseInt(m[3], 10)
      const hour = m[4] ? parseInt(m[4], 10) : 0
      const min = m[5] ? parseInt(m[5], 10) : 0
      const sec = m[6] ? parseInt(m[6], 10) : 0
      return new Date(year, month, day, hour, min, sec)
    }
    const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/)
    if (dmy) {
      const day = parseInt(dmy[1], 10)
      const month = parseInt(dmy[2], 10) - 1
      let year = parseInt(dmy[3], 10)
      if (year < 100) year += 2000
      const hour = dmy[4] ? parseInt(dmy[4], 10) : 0
      const min = dmy[5] ? parseInt(dmy[5], 10) : 0
      const sec = dmy[6] ? parseInt(dmy[6], 10) : 0
      return new Date(year, month, day, hour, min, sec)
    }
  }
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

// Formateador chileno de fecha de intervención (DD/MM/YYYY con HH:mm opcional si existe hora útil)
const formatIntervencionFecha = (val) => {
  if (!val) return '—'
  const d = parseSafeDate(val)
  if (!d) return String(val)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const fechaStr = `${day}/${month}/${year}`

  const hours = d.getHours()
  const minutes = d.getMinutes()
  if (hours !== 0 || minutes !== 0) {
    const horaStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    return (
      <span style={{ whiteSpace: 'nowrap' }}>
        {fechaStr}{' '}
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{horaStr}</span>
      </span>
    )
  }
  return <span style={{ whiteSpace: 'nowrap' }}>{fechaStr}</span>
}

// Clase CSS según tipo de intervención oficial
const getTipoIntervencionBadgeClass = (tipo) => {
  const normTipo = normalizeText(tipo || '')
  if (normTipo.includes('correctiv')) return 'badge-tipo-correctiva'
  if (normTipo.includes('preventiv')) return 'badge-tipo-preventiva'
  if (normTipo.includes('inspecc')) return 'badge-tipo-inspeccion'
  if (normTipo.includes('ajuste')) return 'badge-tipo-ajuste'
  if (normTipo.includes('mejora')) return 'badge-tipo-mejora'
  return 'badge-tipo-otro'
}

// Normalización estricta requerida por la regla de resolución (trim, espacios repetidos, minúsculas sin fuzzy matching)
const normalizarNombre = (texto = '') =>
  (texto || '')
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

// Términos generales y ambiguos que NO deben convertirse automáticamente en equipos (Requirement 6)
const TERMINOS_AMBIGUOS = new Set([
  'refrigeracion',
  'refrigeración',
  'extrusion',
  'extrusión',
  'produccion',
  'producción',
  'cocina',
  'instalaciones',
  'pet',
  'plasticos',
  'plásticos',
  'soplado',
  'servicios generales'
])

// Valores estrictos permitidos por el check constraint "chk_tipo_intervencion" en public.bitacora_mantenimiento
const TIPOS_INTERVENCION_VALIDOS = [
  'Correctiva',
  'Preventiva',
  'Inspección',
  'Ajuste',
  'Mejora',
  'Otro'
]

const SET_TIPOS_INTERVENCION_VALIDOS = new Set(TIPOS_INTERVENCION_VALIDOS)

/**
 * Normaliza y clasifica estrictamente el tipo de intervención según el contrato chk_tipo_intervencion
 * Valores de salida exclusivos: 'Correctiva', 'Preventiva', 'Inspección', 'Ajuste', 'Mejora', 'Otro'
 */
const normalizarTipoIntervencion = ({
  esFalla = false,
  tipoIntervencion = null,
  trabajoRealizado = ''
} = {}) => {
  // 1. Si ya viene un valor exacto permitido
  if (tipoIntervencion && SET_TIPOS_INTERVENCION_VALIDOS.has(tipoIntervencion)) {
    return tipoIntervencion
  }

  // 2. Mapeos de variantes léxicas a valores canónicos
  if (typeof tipoIntervencion === 'string' && tipoIntervencion.trim()) {
    const raw = tipoIntervencion.trim().toLowerCase()
    if (raw === 'correctivo' || raw === 'correctiva') return 'Correctiva'
    if (raw === 'preventivo' || raw === 'preventiva') return 'Preventiva'
    if (raw === 'inspeccion' || raw === 'inspección') return 'Inspección'
    if (raw === 'ajuste' || raw === 'ajustes') return 'Ajuste'
    if (raw === 'mejora' || raw === 'mejoras') return 'Mejora'
    if (raw === 'otro' || raw === 'otros') return 'Otro'
  }

  // 3. Si está marcado como falla, la intervención es Correctiva
  if (esFalla) {
    return 'Correctiva'
  }

  // 4. Si no es falla, clasificar según la semántica explícita del trabajo realizado
  const text = (trabajoRealizado || '').toLowerCase()

  // Inspección / revisión sin reparación
  if (/\b(inspecci[oó]n|revisi[oó]n|verificaci[oó]n|chequeo|monitoreo|control de nivel)\b/.test(text)) {
    return 'Inspección'
  }

  // Ajuste / regulación / calibración
  if (/\b(ajuste|ajustar|calibraci[oó]n|regulaci[oó]n|alineaci[oó]n|apriete|reapriete|tensado|posicionamiento|configuraci[oó]n)\b/.test(text)) {
    return 'Ajuste'
  }

  // Trabajo preventivo programado
  if (/\b(preventiv[oa]|mantenimiento peri[oó]dico|cambio de aceite|cambio de filtro|engrase|lubricaci[oó]n|limpieza preventiva|mantenci[oó]n preventiva)\b/.test(text)) {
    return 'Preventiva'
  }

  // Mejora / modificación
  if (/\b(mejora|modificaci[oó]n|instalaci[oó]n de nuevo|fabricaci[oó]n|rediseño|adaptaci[oó]n)\b/.test(text)) {
    return 'Mejora'
  }

  // En caso de duda o trabajo operativo no catalogado
  return 'Otro'
}

/**
 * Generador seguro de UUID v4 con fallback para compatibilidad completa
 */
const generarUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function App() {
  const [activeView, setActiveView] = useState('home')
  
  // Estado de Autenticación
  const [session, setSession] = useState(null)
  
  // Estados para Login
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Estados para la vista Dashboard
  const [dashboardData, setDashboardData] = useState(null)
  const [retirosData, setRetirosData] = useState([])
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [dashboardError, setDashboardError] = useState('')

  // Estados para la lista de inventario
  const [repuestosList, setRepuestosList] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [listError, setListError] = useState('')

  // Estados para el formulario de nuevo repuesto
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [serverError, setServerError] = useState('')

  // Estados para la vista de Retiro de Repuestos
  const [retiroRepuestoId, setRetiroRepuestoId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [retiroCantidad, setRetiroCantidad] = useState('')
  const [retiroObservaciones, setRetiroObservaciones] = useState('')
  const [retiroLoading, setRetiroLoading] = useState(false)
  const [retiroErrors, setRetiroErrors] = useState({})
  const [retiroSuccess, setRetiroSuccess] = useState('')
  const [retiroServerError, setRetiroServerError] = useState('')

  // Estados para el módulo Bitácora
  const [bitacoraList, setBitacoraList] = useState([])
  const [equiposList, setEquiposList] = useState([])
  const [loadingBitacora, setLoadingBitacora] = useState(false)
  const [bitacoraError, setBitacoraError] = useState('')
  const [bitacoraSuccessMessage, setBitacoraSuccessMessage] = useState('')

  // Estados para el módulo de Órdenes de Trabajo (Fuente única: orden_trabajo.estado)
  const [ordenesTrabajoList, setOrdenesTrabajoList] = useState([])
  const [otInitialLoading, setOtInitialLoading] = useState(true)
  const [otBackgroundRefreshing, setOtBackgroundRefreshing] = useState(false)
  const [otStorageMode, setOtStorageMode] = useState('supabase')
  const [otRealtimeStatus, setOtRealtimeStatus] = useState('CONNECTING')
  const hasLoadedInitialOtRef = useRef(false)
  const equiposListRef = useRef(equiposList)
  equiposListRef.current = equiposList

  // Filtros de Bitácora
  const [filterSearch, setFilterSearch] = useState('')
  const [filterEquipo, setFilterEquipo] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [filterTipoIntervencion, setFilterTipoIntervencion] = useState('')
  const [filterTipoFalla, setFilterTipoFalla] = useState('')
  const [filterEsFalla, setFilterEsFalla] = useState('todos') // 'todos' | 'si' | 'no'
  const [filterFechaDesde, setFilterFechaDesde] = useState('')
  const [filterFechaHasta, setFilterFechaHasta] = useState('')

  // Modal / Formulario Nueva / Editar Intervención
  const [isIntervencionModalOpen, setIsIntervencionModalOpen] = useState(false)
  const [editingIntervencionId, setEditingIntervencionId] = useState(null)
  const [intervencionForm, setIntervencionForm] = useState(INITIAL_INTERVENCION_STATE)
  const [intervencionErrors, setIntervencionErrors] = useState({})
  const [intervencionLoading, setIntervencionLoading] = useState(false)
  const [intervencionServerError, setIntervencionServerError] = useState('')

  // Modal Importador Excel y Clasificación Progresiva de Equipos
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importFileName, setImportFileName] = useState('')
  const [importRows, setImportRows] = useState([])
  const [importSummary, setImportSummary] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSubmitting, setImportSubmitting] = useState(false)
  const [importModalTab, setImportModalTab] = useState('filas') // 'filas' | 'clasificacion'
  const [pendingEquiposReview, setPendingEquiposReview] = useState([])
  const [clasifFilterEstado, setClasifFilterEstado] = useState('todos') // 'todos' | 'Pendiente' | 'Aprobado como padre' | 'Aprobado como hijo' | 'Asociado a equipo existente'
  const [clasifSearchText, setClasifSearchText] = useState('')
  const [importActiveTab, setImportActiveTab] = useState('todos') // 'todos' | 'resueltos' | 'pendientes' | 'duplicados' | 'errores'
  const [importCompletedSummary, setImportCompletedSummary] = useState(null)

  // Estados para el módulo Árbol de Activos (Base V1)
  const [selectedActivoId, setSelectedActivoId] = useState('act-m3')
  const [expandedAreas, setExpandedAreas] = useState(['area-plasticos', 'area-soplado', 'area-produccion-jjv'])
  const [expandedEquipos, setExpandedEquipos] = useState([
    'act-inyectora-2',
    'act-inyectora-borche',
    'act-inyectora-preformas-1',
    'act-inyectora-preformas-2',
    'act-m3'
  ])
  const [treeSearch, setTreeSearch] = useState('')
  const [activoDetailTab, setActivoDetailTab] = useState('general')

  // Sub-pestaña de Bitácora y validación de pendientes (Fase de Integración)
  const [bitacoraSubTab, setBitacoraSubTab] = useState('registradas') // 'registradas' | 'pendientes'
  const [pendientesValidacionList, setPendientesValidacionList] = useState([])

  // Catálogo de alias y resoluciones históricas validadas (public.vista_resolucion_equipo)
  const [resolucionEquiposList, setResolucionEquiposList] = useState([])

  // Nodos del árbol maestro desde Supabase (public.vista_arbol_activos)
  const [supabaseArbolNodes, setSupabaseArbolNodes] = useState([])

  // Métricas e historial de fallas en la Ficha del Activo (public.vista_ficha_activo y vista_historial_fallas_activo)
  const [activoFichaMetrics, setActivoFichaMetrics] = useState(null)
  const [activoHistorialFallas, setActivoHistorialFallas] = useState([])
  const [loadingFichaFallas, setLoadingFichaFallas] = useState(false)

  // Historial de intervenciones en la Ficha del Activo (public.bitacora_mantenimiento)
  const [activoHistorialMantenimiento, setActivoHistorialMantenimiento] = useState([])
  const [loadingFichaMantenimiento, setLoadingFichaMantenimiento] = useState(false)
  const [errorFichaMantenimiento, setErrorFichaMantenimiento] = useState(null)
  const lastLoadedMantenimientoEquipoId = useRef(null)

  // Estados para el selector de técnicos en Bitácora (Base V1)
  const [tecnicoSelectValue, setTecnicoSelectValue] = useState('')
  const [isOtroTecnico, setIsOtroTecnico] = useState(false)

  const dropdownRef = useRef(null)

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 1. Detectar y escuchar cambios de sesión en Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session && (activeView === 'nuevo-repuesto' || activeView === 'retiro')) {
        setActiveView('home')
      }
    })

    return () => subscription.unsubscribe()
  }, [activeView])

  // 2. Consultar datos para el Dashboard
  const fetchDashboard = async () => {
    setLoadingDashboard(true)
    setDashboardError('')
    try {
      const { data: kpiData, error: kpiError } = await supabase
        .from('vista_dashboard_inventario')
        .select('*')

      if (kpiError) {
        setDashboardError(`Error al cargar KPIs de inventario: ${kpiError.message}`)
      } else {
        setDashboardData(kpiData && kpiData.length > 0 ? kpiData[0] : null)
      }

      const { data: retiros, error: retirosError } = await supabase
        .from('vista_retiros_mensuales')
        .select('*')

      if (retirosError) {
        setDashboardError((prev) =>
          prev ? `${prev} | Error en retiros: ${retirosError.message}` : `Error en retiros: ${retirosError.message}`
        )
      } else {
        setRetirosData(retiros || [])
      }
    } catch (err) {
      setDashboardError(`Ocurrió un error inesperado: ${err.message || 'Error de conexión'}`)
    } finally {
      setLoadingDashboard(false)
    }
  }

  // 3. Consultar vista_inventario
  const fetchInventario = async () => {
    setLoadingList(true)
    setListError('')
    try {
      const { data, error } = await supabase
        .from('vista_inventario')
        .select('*')

      if (error) {
        setListError(`Error al cargar el inventario: ${error.message}`)
      } else {
        setRepuestosList(data || [])
      }
    } catch (err) {
      setListError(`Ocurrió un error inesperado: ${err.message || 'Error de conexión'}`)
    } finally {
      setLoadingList(false)
    }
  }

  // 3b. Consultar catálogo de equipos autorizados
  const fetchEquipos = async () => {
    try {
      const { data, error } = await supabase
        .from('equipo')
        .select('*')
        .order('nombre', { ascending: true })

      if (!error && data) {
        setEquiposList(data)
      }
    } catch (err) {
      console.error('Error al cargar equipos:', err)
    }
  }

  // 3c. Consultar bitácora de intervenciones
  const fetchBitacora = async () => {
    setLoadingBitacora(true)
    setBitacoraError('')
    try {
      await fetchEquipos()

      const { data, error } = await supabase
        .from('bitacora_mantenimiento')
        .select(`
          *,
          equipo:equipo_id (
            id,
            codigo,
            nombre,
            area,
            activo
          )
        `)
        .order('fecha_hora', { ascending: false })

      if (error) {
        setBitacoraError(`Error al consultar la bitácora: ${error.message}`)
      } else {
        setBitacoraList(data || [])
      }
    } catch (err) {
      setBitacoraError(`Ocurrió un error inesperado: ${err.message || 'Error de conexión'}`)
    } finally {
      setLoadingBitacora(false)
    }
  }

  // 3d. Consultar resolución de nombres históricos y alias validados (public.vista_resolucion_equipo)
  const fetchResolucionEquipos = async () => {
    try {
      const { data, error } = await supabase
        .from('vista_resolucion_equipo')
        .select('*')

      if (!error && data) {
        setResolucionEquiposList(data)
      }
    } catch (err) {
      console.warn('vista_resolucion_equipo no disponible o sin permisos:', err)
    }
  }

  // 3e. Consultar registros de bitácora pendientes de validación (public.bitacora_importacion_pendiente)
  const fetchPendientesValidacion = async () => {
    try {
      const { data, error } = await supabase
        .from('bitacora_importacion_pendiente')
        .select('*')

      if (error) {
        console.error('Error al consultar pendientes:', error.message)
      } else {
        // Ordenar por fecha o fecha_hora más reciente si está disponible
        const sorted = (data || []).sort((a, b) => {
          const tA = new Date(a.fecha || a.fecha_hora || a.created_at || 0).getTime()
          const tB = new Date(b.fecha || b.fecha_hora || b.created_at || 0).getTime()
          return tB - tA
        })
        setPendientesValidacionList(sorted)
      }
    } catch (err) {
      console.error('Error al conectar con pendientes:', err.message || 'Error de conexión')
    }
  }

  // 3f. Consultar estructura del árbol maestro de activos (public.vista_arbol_activos)
  const fetchArbolActivosFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('vista_arbol_activos')
        .select('node_id, parent_node_id, node_type, equipo_id, nombre, codigo, ruta')

      if (!error && data) {
        setSupabaseArbolNodes(data)
      }
    } catch (err) {
      console.warn('vista_arbol_activos no disponible o sin permisos:', err)
    }
  }

  // 3g. Consultar métricas e historial de fallas del activo seleccionado (public.vista_ficha_activo y public.vista_historial_fallas_activo / fallback a bitacora_mantenimiento)
  const fetchFichaActivoData = async (equipoId) => {
    if (!equipoId) {
      setActivoFichaMetrics(null)
      setActivoHistorialFallas([])
      return
    }

    setLoadingFichaFallas(true)

    try {
      // 1. Consultar indicadores del activo (public.vista_ficha_activo)
      let metrics = null
      try {
        const { data: metricsData, error: metricsError } = await supabase
          .from('vista_ficha_activo')
          .select('*')
          .eq('equipo_id', equipoId)
          .maybeSingle()

        if (!metricsError && metricsData) {
          metrics = metricsData
        }
      } catch {
        // Vista opcional
      }

      // 2. Consultar historial de fallas ordenado más reciente primero (public.vista_historial_fallas_activo o fallback)
      let fallas = []
      try {
        const { data: fallasData, error: fallasError } = await supabase
          .from('vista_historial_fallas_activo')
          .select('*')
          .eq('equipo_id', equipoId)

        if (!fallasError && Array.isArray(fallasData) && fallasData.length > 0) {
          fallas = fallasData
        } else {
          // Fallback a bitacora_mantenimiento filtrando estrictamente por equipo_id y es_falla = true
          const { data: bitData, error: bitErr } = await supabase
            .from('bitacora_mantenimiento')
            .select('*')
            .eq('equipo_id', equipoId)
            .eq('es_falla', true)
            .order('fecha_hora', { ascending: false })

          if (!bitErr && Array.isArray(bitData) && bitData.length > 0) {
            fallas = bitData
          }
        }
      } catch {
        // Fallback a bitacoraList local
        fallas = (bitacoraList || []).filter((b) => b.equipo_id === equipoId && b.es_falla)
      }

      // Si aún no hay fallas por API remota, revisar estado local de bitacoraList
      if (fallas.length === 0 && Array.isArray(bitacoraList) && bitacoraList.length > 0) {
        fallas = bitacoraList.filter((b) => b.equipo_id === equipoId && b.es_falla)
      }

      // Ordenar más reciente primero
      const sortedFallas = [...fallas].sort((a, b) => {
        const dA = new Date(a.fecha || a.fecha_hora || a.created_at || 0).getTime()
        const dB = new Date(b.fecha || b.fecha_hora || b.created_at || 0).getTime()
        return dB - dA
      })
      setActivoHistorialFallas(sortedFallas)

      // Si no vino métrica desde la vista, calcularla a partir del historial de fallas
      if (!metrics) {
        const now = Date.now()
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
        const fallas30 = sortedFallas.filter((f) => {
          const t = new Date(f.fecha || f.fecha_hora || f.created_at || 0).getTime()
          return t >= thirtyDaysAgo
        }).length

        metrics = {
          equipo_id: equipoId,
          total_fallas: sortedFallas.length,
          fecha_ultima_falla: sortedFallas.length > 0 ? (sortedFallas[0].fecha || sortedFallas[0].fecha_hora) : null,
          fallas_ultimos_30_dias: fallas30
        }
      }
      setActivoFichaMetrics(metrics)
    } finally {
      setLoadingFichaFallas(false)
    }
  }

  // 3g2. Consultar historial de mantenimiento real del activo seleccionado (public.bitacora_mantenimiento)
  const fetchHistorialMantenimiento = async (equipoId) => {
    if (!equipoId) {
      setActivoHistorialMantenimiento([])
      setLoadingFichaMantenimiento(false)
      setErrorFichaMantenimiento(null)
      return
    }

    setLoadingFichaMantenimiento(true)
    setErrorFichaMantenimiento(null)

    try {
      const { data, error } = await supabase
        .from('bitacora_mantenimiento')
        .select('id, fecha_hora, equipo_id, tecnico, tipo_intervencion, trabajo_realizado, estado_final, es_falla, tipo_falla, falla_motivo, origen, ot_id')
        .eq('equipo_id', equipoId)
        .order('fecha_hora', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error al consultar historial de mantenimiento en bitacora_mantenimiento:', error)
        setErrorFichaMantenimiento('No fue posible cargar el historial de mantenimiento.')
        setActivoHistorialMantenimiento([])
      } else {
        setActivoHistorialMantenimiento(data || [])
      }
    } catch (err) {
      console.error('Excepción al consultar historial de mantenimiento:', err)
      setErrorFichaMantenimiento('No fue posible cargar el historial de mantenimiento.')
      setActivoHistorialMantenimiento([])
    } finally {
      setLoadingFichaMantenimiento(false)
    }
  }

  // 3h. Consultar Órdenes de Trabajo con separación estricta entre carga inicial y refresco silencioso en segundo plano
  const fetchOrdenesTrabajoList = useCallback(async ({ silent = false, equiposOverride = null } = {}) => {
    const isFirstLoad = !hasLoadedInitialOtRef.current && !silent
    if (isFirstLoad) {
      setOtInitialLoading(true)
    } else {
      setOtBackgroundRefreshing(true)
    }

    try {
      const eqCatalog = equiposOverride || equiposListRef.current
      const { data, storageMode } = await fetchOrdenesTrabajo(eqCatalog)
      setOrdenesTrabajoList(data || [])
      setOtStorageMode(storageMode || 'supabase')
      hasLoadedInitialOtRef.current = true
    } catch (err) {
      console.error('Error al cargar Órdenes de Trabajo:', err)
    } finally {
      setOtInitialLoading(false)
      setOtBackgroundRefreshing(false)
    }
  }, [])

  // Suscripción Realtime única al montar el módulo (actualización silenciosa sin activar spinner global)
  useEffect(() => {
    const unsubscribe = subscribeToOrdenesTrabajoRealtime({
      onChange: (eventPayload) => {
        if (eventPayload?.eventType === 'DELETE' && eventPayload?.oldRecord?.id) {
          setOrdenesTrabajoList((prev) =>
            prev.filter((item) => item.id !== eventPayload.oldRecord.id)
          )
          return
        }
        if (
          (eventPayload?.eventType === 'UPDATE' || eventPayload?.eventType === 'INSERT') &&
          eventPayload?.newRecord?.id
        ) {
          setOrdenesTrabajoList((prev) => {
            const exists = prev.some((item) => item.id === eventPayload.newRecord.id)
            if (exists) {
              return prev.map((item) =>
                item.id === eventPayload.newRecord.id
                  ? { ...item, ...eventPayload.newRecord }
                  : item
              )
            }
            return [eventPayload.newRecord, ...prev]
          })
        }
        // Sincronización silenciosa en segundo plano (sin activar initialLoading)
        fetchOrdenesTrabajoList({ silent: true })
      },
      onStatusChange: (status) => {
        setOtRealtimeStatus(status)
      }
    })
    return () => {
      unsubscribe()
    }
  }, [fetchOrdenesTrabajoList])

  // Disparar consultas al cambiar de vista (sin recrearse cuando cambia equiposList u ordenesTrabajoList)
  useEffect(() => {
    const isSilent = hasLoadedInitialOtRef.current
    if (activeView === 'home' || activeView === 'ordenes-trabajo') {
      if (equiposListRef.current.length === 0) {
        fetchEquipos()
      }
      fetchOrdenesTrabajoList({ silent: isSilent })
    } else if (activeView === 'dashboard') {
      fetchBitacora()
      if (equiposListRef.current.length === 0) {
        fetchEquipos()
      }
      fetchOrdenesTrabajoList({ silent: true })
    }
  }, [activeView, fetchOrdenesTrabajoList])

  // Disparar consultas adicionales según la vista activa
  useEffect(() => {
    if (activeView === 'dashboard') {
      fetchBitacora()
      fetchEquipos()
    } else if (activeView === 'dashboard-inventario') {
      fetchDashboard()
    } else if (activeView === 'repuestos' || activeView === 'retiro') {
      fetchInventario()
    } else if (activeView === 'bitacora' || activeView === 'arbol-activos') {
      if (session) {
        fetchBitacora()
        fetchPendientesValidacion()
        fetchResolucionEquipos()
        fetchArbolActivosFromSupabase()
      }
    }
  }, [activeView, session])

  // Cargar metadatos globales al iniciar sesión
  useEffect(() => {
    if (session) {
      fetchResolucionEquipos()
      fetchArbolActivosFromSupabase()
      fetchPendientesValidacion()
    }
  }, [session])

  // Cargar datos de la ficha al cambiar el activo seleccionado
  useEffect(() => {
    if (session && selectedActivoId) {
      // Se busca en el árbol calculado posteriormente
    }
  }, [session, selectedActivoId])

  // 4. Manejo de Inicio de Sesión
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoginError('')

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Por favor ingrese su correo y contraseña.')
      return
    }

    setLoginLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword
      })

      if (error) {
        setLoginError(`Credenciales incorrectas o error de acceso: ${error.message}`)
      } else {
        setLoginEmail('')
        setLoginPassword('')
        setActiveView('home')
      }
    } catch (err) {
      setLoginError(`Ocurrió un error al iniciar sesión: ${err.message || 'Error de red'}`)
    } finally {
      setLoginLoading(false)
    }
  }

  // 5. Manejo de Cierre de Sesión
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setActiveView('home')
  }

  // 6. Manejo del formulario de nuevo repuesto
  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: null }))
    }
    if (successMessage) {
      setSuccessMessage('')
    }
    if (serverError) {
      setServerError('')
    }
    if (isSaved) {
      setIsSaved(false)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.codigo.trim()) {
      newErrors.codigo = 'El código del repuesto es obligatorio.'
    }
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre o descripción es obligatorio.'
    }
    if (!formData.categoria) {
      newErrors.categoria = 'Debe seleccionar una categoría.'
    }
    if (!formData.unidad_medida) {
      newErrors.unidad_medida = 'Debe seleccionar una unidad de medida.'
    }
    if (formData.stock_minimo === '' || formData.stock_minimo === null) {
      newErrors.stock_minimo = 'El stock mínimo es obligatorio.'
    } else if (Number(formData.stock_minimo) < 0) {
      newErrors.stock_minimo = 'El stock mínimo debe ser mayor o igual a 0.'
    }

    if (!formData.criticidad) {
      newErrors.criticidad = 'Debe seleccionar un nivel de criticidad.'
    }
    if (!formData.estado) {
      newErrors.estado = 'Debe seleccionar un estado.'
    }

    if (formData.precio_compra !== '' && formData.precio_compra !== null) {
      if (Number(formData.precio_compra) < 0) {
        newErrors.precio_compra = 'El precio de compra debe ser mayor o igual a 0.'
      }
      if (!formData.moneda_compra) {
        newErrors.moneda_compra = 'Debe seleccionar una moneda para el precio de compra.'
      }
    }

    if (formData.stock_maximo !== '' && formData.stock_maximo !== null) {
      const stockMax = Number(formData.stock_maximo)
      if (stockMax < 0) {
        newErrors.stock_maximo = 'El stock máximo debe ser mayor o igual a 0.'
      } else if (
        formData.stock_minimo !== '' &&
        stockMax < Number(formData.stock_minimo)
      ) {
        newErrors.stock_maximo = 'El stock máximo no puede ser menor que el stock mínimo.'
      }
    }

    if (formData.stock_inicial !== '' && formData.stock_inicial !== null) {
      if (Number(formData.stock_inicial) < 0) {
        newErrors.stock_inicial = 'El stock inicial debe ser mayor o igual a 0.'
      }
    }

    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (loading || isSaved) {
      return
    }

    setSuccessMessage('')
    setServerError('')

    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const tienePrecio = formData.precio_compra !== '' && formData.precio_compra !== null

      const payload = {
        codigo: formData.codigo.trim(),
        nombre: formData.nombre.trim(),
        categoria: formData.categoria,
        fabricante: formData.fabricante.trim() || null,
        numero_parte: formData.numero_parte.trim() || null,
        unidad_medida: formData.unidad_medida,
        precio_compra: tienePrecio ? Number(formData.precio_compra) : null,
        moneda_compra: tienePrecio && formData.moneda_compra ? formData.moneda_compra : null,
        stock_minimo: Number(formData.stock_minimo),
        stock_maximo:
          formData.stock_maximo !== '' && formData.stock_maximo !== null
            ? Number(formData.stock_maximo)
            : null,
        ubicacion_repuesto: formData.ubicacion_repuesto.trim() || null,
        criticidad: formData.criticidad,
        estado: formData.estado
      }

      const { data, error } = await supabase.from('repuesto').insert([payload]).select()

      if (error) {
        setServerError(`Error al guardar el repuesto en Supabase: ${error.message}`)
        return
      }

      const nuevoRepuesto = data && data[0]
      const stockInicialNum =
        formData.stock_inicial !== '' && formData.stock_inicial !== null
          ? Number(formData.stock_inicial)
          : 0

      if (nuevoRepuesto && stockInicialNum > 0) {
        const movimientoPayload = {
          repuesto_id: nuevoRepuesto.id,
          tipo_movimiento: 'Stock Inicial',
          cantidad: stockInicialNum,
          documento_referencia: null,
          usuario_id: null,
          observaciones: 'Carga inicial del repuesto'
        }

        const { error: movError } = await supabase
          .from('movimiento_inventario')
          .insert([movimientoPayload])

        if (movError) {
          setServerError(
            `Repuesto guardado, pero ocurrió un error al registrar el movimiento de stock inicial: ${movError.message}`
          )
          return
        }

        setSuccessMessage('Repuesto y stock inicial registrados exitosamente en Supabase')
      } else {
        setSuccessMessage('Repuesto guardado exitosamente en Supabase')
      }

      setIsSaved(true)
    } catch (err) {
      setServerError(`Ocurrió un error inesperado: ${err.message || 'Error de conexión'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData(INITIAL_FORM_STATE)
    setErrors({})
    setSuccessMessage('')
    setServerError('')
    setIsSaved(false)
    setActiveView('repuestos')
  }

  // 7. Manejo del buscador y formulario de Retiro de Repuestos
  const selectedRetiroRepuesto = repuestosList.find(
    (item) => item.id === retiroRepuestoId || item.codigo === retiroRepuestoId
  )

  // Filtrado de repuestos para el autocompletado en tiempo real (insensible a mayúsculas y acentos/tildes)
  const filteredRepuestos = repuestosList
    .filter((item) => {
      const query = normalizeText(searchQuery)
      if (!query) return true
      const matchCodigo = normalizeText(item.codigo).includes(query)
      const matchNombre = normalizeText(item.nombre || item.repuesto).includes(query)
      const matchFabricante = normalizeText(item.fabricante).includes(query)
      const matchNumeroParte = normalizeText(item.numero_parte).includes(query)
      return matchCodigo || matchNombre || matchFabricante || matchNumeroParte
    })
    .slice(0, 10)

  const handleSelectRepuesto = (item) => {
    setRetiroRepuestoId(item.id || item.codigo)
    setSearchQuery(`[${item.codigo}] ${item.nombre || item.repuesto}`)
    setIsDropdownOpen(false)
    if (retiroErrors.repuesto) {
      setRetiroErrors((prev) => ({ ...prev, repuesto: null }))
    }
    if (retiroSuccess) setRetiroSuccess('')
    if (retiroServerError) setRetiroServerError('')
  }

  const handleClearSelection = () => {
    setRetiroRepuestoId('')
    setSearchQuery('')
    setIsDropdownOpen(true)
    if (retiroSuccess) setRetiroSuccess('')
    if (retiroServerError) setRetiroServerError('')
  }

  const handleRetiroSubmit = async (e) => {
    e.preventDefault()

    if (retiroLoading) return

    setRetiroSuccess('')
    setRetiroServerError('')
    const errorsMap = {}

    if (!retiroRepuestoId || !selectedRetiroRepuesto) {
      errorsMap.repuesto = 'Debe seleccionar un repuesto de la lista.'
    } else {
      const stockDisp = Number(selectedRetiroRepuesto.stock_actual) || 0

      if (stockDisp <= 0) {
        errorsMap.repuesto = 'El repuesto seleccionado no tiene stock disponible para retirar.'
      }

      if (!retiroCantidad || Number(retiroCantidad) <= 0) {
        errorsMap.cantidad = 'La cantidad a retirar debe ser un número mayor a 0.'
      } else if (Number(retiroCantidad) > stockDisp) {
        errorsMap.cantidad = `La cantidad no puede superar el stock actual disponible (${stockDisp} ${selectedRetiroRepuesto.unidad_medida || selectedRetiroRepuesto.unidad || 'UND'}).`
      }
    }

    if (Object.keys(errorsMap).length > 0) {
      setRetiroErrors(errorsMap)
      return
    }

    setRetiroErrors({})
    setRetiroLoading(true)

    try {
      const movimientoPayload = {
        repuesto_id: selectedRetiroRepuesto.id,
        tipo_movimiento: 'Salida',
        cantidad: Number(retiroCantidad),
        documento_referencia: null,
        usuario_id: null,
        observaciones: retiroObservaciones.trim() || null
      }

      const { error } = await supabase
        .from('movimiento_inventario')
        .insert([movimientoPayload])

      if (error) {
        setRetiroServerError(`Error al registrar el retiro en Supabase: ${error.message}`)
      } else {
        setRetiroSuccess('Retiro registrado exitosamente')
        setRetiroCantidad('')
        setRetiroObservaciones('')
        // Actualizar el inventario en pantalla para refrescar el stock_actual
        await fetchInventario()
      }
    } catch (err) {
      setRetiroServerError(`Ocurrió un error inesperado: ${err.message || 'Error de conexión'}`)
    } finally {
      setRetiroLoading(false)
    }
  }

  // ==========================================================================
  // Métodos del Módulo Bitácora
  // ==========================================================================

  // Abrir modal para nueva intervención
  const handleOpenNuevaIntervencion = () => {
    const now = new Date()
    const tzOffset = now.getTimezoneOffset() * 60000
    const localIso = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16)

    setEditingIntervencionId(null)
    setIntervencionForm({
      ...INITIAL_INTERVENCION_STATE,
      fecha_hora: localIso
    })
    setTecnicoSelectValue('')
    setIsOtroTecnico(false)
    setIntervencionErrors({})
    setIntervencionServerError('')
    setIsIntervencionModalOpen(true)
  }

  // Abrir modal para editar intervención existente
  const handleOpenEditarIntervencion = (item) => {
    let localIso = ''
    if (item.fecha_hora) {
      try {
        const d = new Date(item.fecha_hora)
        const tzOffset = d.getTimezoneOffset() * 60000
        localIso = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
      } catch {
        localIso = item.fecha_hora
      }
    }

    const tecName = item.tecnico || ''
    const isCatalog = TECNICOS_BASE.some((t) => t.nombre === tecName)
    if (isCatalog) {
      setTecnicoSelectValue(tecName)
      setIsOtroTecnico(false)
    } else if (tecName) {
      setTecnicoSelectValue('__OTRO__')
      setIsOtroTecnico(true)
    } else {
      setTecnicoSelectValue('')
      setIsOtroTecnico(false)
    }

    setEditingIntervencionId(item.id)
    setIntervencionForm({
      fecha_hora: localIso,
      equipo_id: item.equipo_id || '',
      tecnico: item.tecnico || '',
      es_falla: Boolean(item.es_falla),
      tipo_intervencion: item.tipo_intervencion || 'Correctiva',
      falla_motivo: item.falla_motivo || '',
      trabajo_realizado: item.trabajo_realizado || '',
      estado_final: item.estado_final || 'Operativo',
      area: item.area || item.equipo?.area || '',
      tipo_falla: item.tipo_falla || ''
    })
    setIntervencionErrors({})
    setIntervencionServerError('')
    setIsIntervencionModalOpen(true)
  }

  // Cambio de equipo en el formulario de intervención
  const handleIntervencionEquipoChange = (e) => {
    const eqId = e.target.value
    const selected = equiposList.find((eq) => eq.id === eqId)
    setIntervencionForm((prev) => ({
      ...prev,
      equipo_id: eqId,
      area: selected?.area ? selected.area : prev.area
    }))
    if (intervencionErrors.equipo_id) {
      setIntervencionErrors((prev) => ({ ...prev, equipo_id: null }))
    }
  }

  // Guardar intervención (insert o update)
  const handleIntervencionSubmit = async (e) => {
    e.preventDefault()
    if (intervencionLoading) return

    setIntervencionServerError('')
    const newErrors = {}

    if (!intervencionForm.fecha_hora) {
      newErrors.fecha_hora = 'La fecha y hora son obligatorias.'
    }
    if (!intervencionForm.equipo_id) {
      newErrors.equipo_id = 'Debe seleccionar un equipo autorizado del catálogo.'
    }
    if (!intervencionForm.tecnico.trim()) {
      newErrors.tecnico = 'El nombre del técnico es obligatorio.'
    }
    if (!intervencionForm.trabajo_realizado.trim()) {
      newErrors.trabajo_realizado = 'El trabajo realizado es obligatorio.'
    }
    if (intervencionForm.es_falla && !intervencionForm.tipo_falla) {
      newErrors.tipo_falla = 'Al ser una falla, debe especificar el tipo de falla.'
    }

    if (Object.keys(newErrors).length > 0) {
      setIntervencionErrors(newErrors)
      return
    }

    setIntervencionErrors({})
    setIntervencionLoading(true)

    try {
      const payload = {
        fecha_hora: new Date(intervencionForm.fecha_hora).toISOString(),
        equipo_id: intervencionForm.equipo_id,
        tecnico: intervencionForm.tecnico.trim(),
        es_falla: Boolean(intervencionForm.es_falla),
        tipo_intervencion: intervencionForm.tipo_intervencion || null,
        falla_motivo: intervencionForm.falla_motivo.trim() || null,
        trabajo_realizado: intervencionForm.trabajo_realizado.trim(),
        estado_final: intervencionForm.estado_final || null,
        area: intervencionForm.area.trim() || null,
        tipo_falla: intervencionForm.es_falla ? intervencionForm.tipo_falla : null,
        origen: 'Manual'
      }

      if (editingIntervencionId) {
        // ACTUALIZACIÓN: NO modificar id, created_by, ni created_at
        const { error } = await supabase
          .from('bitacora_mantenimiento')
          .update(payload)
          .eq('id', editingIntervencionId)

        if (error) {
          setIntervencionServerError(`Error al actualizar la intervención: ${error.message}`)
          return
        }
        setBitacoraSuccessMessage('Intervención actualizada exitosamente.')
      } else {
        // NUEVA INSERCIÓN: created_by completado automáticamente por auth.uid()
        const { error } = await supabase
          .from('bitacora_mantenimiento')
          .insert([payload])

        if (error) {
          setIntervencionServerError(`Error al registrar la intervención: ${error.message}`)
          return
        }
        setBitacoraSuccessMessage('Nueva intervención registrada exitosamente en la Bitácora.')
      }

      setIsIntervencionModalOpen(false)
      await fetchBitacora()
    } catch (err) {
      setIntervencionServerError(`Ocurrió un error inesperado: ${err.message || 'Error de red'}`)
    } finally {
      setIntervencionLoading(false)
    }
  }

  // Procesamiento y análisis del archivo Excel para importación con resolución estricta
  const handleExcelFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportFileName(file.name)
    setImportLoading(true)
    setImportError('')
    setImportRows([])
    setPendingEquiposReview([])
    setImportSummary(null)

    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })

      // Precargar listas maestras si no estuvieran aún cargadas
      let currentResList = resolucionEquiposList
      if ((!currentResList || currentResList.length === 0) && session) {
        try {
          const { data: resData } = await supabase.from('vista_resolucion_equipo').select('*')
          if (resData && resData.length > 0) {
            currentResList = resData
            setResolucionEquiposList(resData)
          }
        } catch {
          // ignore
        }
      }

      let currentEquiposList = equiposList
      if ((!currentEquiposList || currentEquiposList.length === 0) && session) {
        try {
          const { data: eqData } = await supabase.from('equipo').select('*')
          if (eqData && eqData.length > 0) {
            currentEquiposList = eqData
            setEquiposList(eqData)
          }
        } catch {
          // ignore
        }
      }

      // 1. Identificar hojas relevantes: Historial de fallas vs Síntesis / Hoja principal (Requirement 7)
      const fallasSheetName = wb.SheetNames.find((s) => normalizarNombre(s).includes('falla'))
      const sintesisSheetName = wb.SheetNames.find((s) => normalizarNombre(s).includes('sintesis'))
      const mainSheetName =
        sintesisSheetName ||
        (fallasSheetName && wb.SheetNames.length === 1
          ? fallasSheetName
          : wb.SheetNames.find((s) => s !== fallasSheetName) || wb.SheetNames[0])

      const mainSheet = wb.Sheets[mainSheetName]
      if (!mainSheet) {
        setImportError('El archivo no contiene ninguna hoja legible.')
        setImportLoading(false)
        return
      }

      // 2. Extraer mapa de fallas si existe una hoja dedicada "Historial fallas"
      const fallasMap = new Map()
      if (fallasSheetName && fallasSheetName !== mainSheetName && wb.Sheets[fallasSheetName]) {
        const fallasRows = XLSX.utils.sheet_to_json(wb.Sheets[fallasSheetName], { header: 1 })
        if (fallasRows.length > 1) {
          // Búsqueda dinámica de la fila de encabezados en Historial fallas (en archivos reales puede preceder un dashboard)
          let fHeaderIndex = -1
          const fCol = {
            fecha: -1,
            tecnico: -1,
            maquina: -1,
            tipo_falla: -1,
            falla_motivo: -1,
            trabajo: -1,
            estado_final: -1
          }

          for (let rIdx = 0; rIdx < Math.min(150, fallasRows.length); rIdx++) {
            const candidateRow = fallasRows[rIdx] || []
            let hasFecha = false
            let hasMaq = false
            const tempCol = { ...fCol }

            candidateRow.forEach((col, idx) => {
              const norm = normalizeText(col)
              if (norm.includes('fecha')) { tempCol.fecha = idx; hasFecha = true }
              else if (norm.includes('tecnico') || norm.includes('informa')) tempCol.tecnico = idx
              else if (norm.includes('maquina') || norm.includes('equipo')) { tempCol.maquina = idx; hasMaq = true }
              else if (norm.includes('tipo')) tempCol.tipo_falla = idx
              else if (norm.includes('motivo') || norm.includes('falla') || norm.includes('causa') || norm.includes('descripcion')) tempCol.falla_motivo = idx
              else if (norm.includes('trabajo') || norm.includes('comentario') || norm.includes('accion')) tempCol.trabajo = idx
              else if (norm.includes('estado')) tempCol.estado_final = idx
            })

            if (hasFecha && hasMaq) {
              fHeaderIndex = rIdx
              Object.assign(fCol, tempCol)
              break
            }
          }

          const startRow = fHeaderIndex !== -1 ? fHeaderIndex + 1 : 1
          for (let j = startRow; j < fallasRows.length; j++) {
            const fRow = fallasRows[j]
            if (!fRow || fRow.every((c) => c === undefined || c === null || c === '')) continue
            const fFecha = fCol.fecha !== -1 ? fRow[fCol.fecha] : fRow[0]
            const fTecnico = normalizarNombre(fCol.tecnico !== -1 ? fRow[fCol.tecnico] : '')
            const fMaq = normalizarNombre(fCol.maquina !== -1 ? fRow[fCol.maquina] : '')
            const parsedFDate = parseExcelDate(fFecha)
            const dateKey = parsedFDate ? parsedFDate.toISOString().slice(0, 10) : String(fFecha || '').trim()
            const fTrabajo = normalizarNombre(fCol.trabajo !== -1 ? fRow[fCol.trabajo] : '')

            const fallasDataObj = {
              es_falla: true,
              tipo_falla: fCol.tipo_falla !== -1 && fRow[fCol.tipo_falla] ? String(fRow[fCol.tipo_falla]).trim() : 'Falla operacional',
              falla_motivo: fCol.falla_motivo !== -1 && fRow[fCol.falla_motivo] ? String(fRow[fCol.falla_motivo]).trim() : null,
              trabajo_realizado: fCol.trabajo !== -1 && fRow[fCol.trabajo] ? String(fRow[fCol.trabajo]).trim() : null,
              estado_final: fCol.estado_final !== -1 && fRow[fCol.estado_final] ? String(fRow[fCol.estado_final]).trim() : 'Operativo'
            }

            if (dateKey && fMaq) {
              if (fTrabajo) {
                fallasMap.set(`${dateKey}|${fMaq}|${fTecnico}|${fTrabajo}`, fallasDataObj)
                fallasMap.set(`${dateKey}|${fMaq}|${fTrabajo}`, fallasDataObj)
              }
              fallasMap.set(`${dateKey}|${fMaq}|${fTecnico}`, fallasDataObj)
              fallasMap.set(`${dateKey}|${fMaq}`, fallasDataObj)
            }
          }
        }
      }

      // 3. Procesar filas de la hoja principal
      const rows = XLSX.utils.sheet_to_json(mainSheet, { header: 1 })
      if (rows.length < 2) {
        setImportError('La hoja seleccionada no contiene filas de datos.')
        setImportLoading(false)
        return
      }

      const headerRow = rows[0] || []
      const colIndices = {
        fecha: -1,
        tecnico: -1,
        maquina: -1,
        area: -1,
        comentario: -1,
        es_falla: -1,
        tipo_intervencion: -1,
        tipo_falla: -1,
        falla_motivo: -1,
        estado_final: -1
      }

      headerRow.forEach((col, idx) => {
        const norm = normalizeText(col)
        if (norm.includes('fecha')) colIndices.fecha = idx
        else if (norm.includes('tecnico') || norm.includes('informa')) colIndices.tecnico = idx
        else if (norm.includes('maquina') || norm.includes('equipo')) colIndices.maquina = idx
        else if (norm.includes('area')) colIndices.area = idx
        else if (norm.includes('comentario') || norm.includes('trabajo')) colIndices.comentario = idx
        else if (norm.includes('es falla') || norm.includes('es_falla')) colIndices.es_falla = idx
        else if (norm.includes('tipo intervencion') || norm.includes('tipo_intervencion')) colIndices.tipo_intervencion = idx
        else if (norm.includes('tipo falla') || norm.includes('tipo_falla')) colIndices.tipo_falla = idx
        else if (norm.includes('motivo') || norm.includes('causa') || norm.includes('falla motivo')) colIndices.falla_motivo = idx
        else if (norm.includes('estado final') || norm.includes('estado_final')) colIndices.estado_final = idx
      })

      if (colIndices.fecha === -1) colIndices.fecha = 0
      if (colIndices.tecnico === -1) colIndices.tecnico = 1
      if (colIndices.maquina === -1) colIndices.maquina = 2
      if (colIndices.area === -1) colIndices.area = 3
      if (colIndices.comentario === -1) colIndices.comentario = 4

      // Aplanar activos oficiales desde la jerarquía aprobada
      const canonicalTreeAssets = []
      JERARQUIA_APROBADA.forEach((areaDef) => {
        (areaDef.equiposPadre || []).forEach((padre) => {
          canonicalTreeAssets.push({
            id: padre.id,
            codigo: padre.codigo || padre.nombre,
            nombre: padre.nombre,
            area: padre.area || areaDef.area,
            esPadre: true
          })
          ;(padre.hijos || []).forEach((hijo) => {
            canonicalTreeAssets.push({
              id: hijo.id,
              codigo: hijo.codigo || hijo.nombre,
              nombre: hijo.nombre,
              area: hijo.area || areaDef.area,
              esHijo: true,
              padreNombre: padre.nombre
            })
          })
        })
      })

      const BASE_ALIAS_FALLBACK = new Map([
        ['extrusora m1', 'M1'],
        ['extrusora m2', 'M2'],
        ['extrusora m3', 'M3'],
        ['extrusora m4', 'M4'],
        ['extrusora m5', 'M5'],
        ['pet 1', 'S1'],
        ['chiller manilla', 'Inyectora Borche'],
        ['chiller inyectora borche', 'Inyectora Borche'],
        ['selladora produccion', 'Selladora de producción'],
        ['selladora de produccion', 'Selladora de producción'],
        ['compresor produccion', 'Compresor'],
        ['embolsadora plasticos', 'Embolsadora M4-M5'],
        ['embolsadora plásticos', 'Embolsadora M4-M5'],
        ['etiquetadora', 'Etiquetadora M4-M5'],
        ['paletizadora pet', 'Paletizadora'],
        ['moledora pet', 'Moledora'],
        ['tester m4', 'Tester M4-M5'],
        ['moledora m4', 'Moledora M4-M5'],
        ['inyectora de tapas', 'Inyectora 2'],
        ['inyectora 2 de tapas/manillas', 'Inyectora 2'],
        ['elevador bodega', 'Elevador Bodega Tradicional'],
        ['porton planta', 'Portón de acceso a planta'],
        ['portón planta', 'Portón de acceso a planta'],
        ['chiller principal', 'Chiller principal'],
        ['chiller secundario', 'Chiller secundario']
      ])

      const findEquipoCanonical = (targetName) => {
        if (!targetName) return null
        const normTarget = normalizeText(targetName)
        const canonicalName = BASE_ALIAS_FALLBACK.get(normTarget) || targetName
        const normSearch = normalizeText(canonicalName)

        // Línea X → JJV Línea X
        if (/^linea\s+\d+/.test(normSearch)) {
          const num = normSearch.replace(/^linea\s+/, '').trim()
          const jjvTarget = `jjv linea ${num}`
          const match = canonicalTreeAssets.find((a) => normalizeText(a.nombre) === jjvTarget || normalizeText(a.codigo) === jjvTarget)
          if (match) {
            const inDb = currentEquiposList.find((eq) => {
              return normalizeText(eq.codigo) === normalizeText(match.codigo) ||
                     normalizeText(eq.nombre) === normalizeText(match.nombre)
            })
            if (inDb) return inDb
            return match
          }
        }

        const dbMatch = currentEquiposList.find((eq) => {
          return normalizeText(eq.codigo) === normSearch || normalizeText(eq.nombre) === normSearch
        })
        if (dbMatch) return dbMatch

        const treeMatch = canonicalTreeAssets.find((a) => {
          return normalizeText(a.codigo) === normSearch || normalizeText(a.nombre) === normSearch
        })
        if (treeMatch) {
          const inDb = currentEquiposList.find((eq) => {
            return normalizeText(eq.codigo) === normalizeText(treeMatch.codigo) ||
                   normalizeText(eq.nombre) === normalizeText(treeMatch.nombre)
          })
          if (inDb) return inDb
          return {
            id: treeMatch.id,
            codigo: treeMatch.codigo,
            nombre: treeMatch.nombre,
            area: treeMatch.area
          }
        }
        return null
      }

      const analyzedRows = []
      const seenHashes = new Set()
      const machinesMap = new Map()

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (!row || row.length === 0 || row.every((c) => c === undefined || c === null || c === '')) {
          continue
        }

        const rawFecha = row[colIndices.fecha]
        const rawTecnico = (row[colIndices.tecnico] || '').toString().trim()
        const rawMaquina = (row[colIndices.maquina] || '').toString().trim()
        const rawArea = (row[colIndices.area] || '').toString().trim()
        const rawComentario = (row[colIndices.comentario] || '').toString().trim()

        const parsedDate = parseExcelDate(rawFecha)
        const dateValid = parsedDate !== null
        const dateKey = parsedDate ? parsedDate.toISOString().slice(0, 10) : String(rawFecha || '').trim()

        // Regla 3: Normalización estricta (trim, espacios únicos, minúsculas, sin fuzzy matching)
        const normMaq = normalizarNombre(rawMaquina)
        const normTec = normalizarNombre(rawTecnico)
        const normComentario = normalizarNombre(rawComentario)

        // Regla 7: Fallas vs Trabajos Realizados
        const isDedicatedFallasSheet = mainSheetName === fallasSheetName
        const matchedFallaFromSheet =
          fallasMap.get(`${dateKey}|${normMaq}|${normTec}|${normComentario}`) ||
          fallasMap.get(`${dateKey}|${normMaq}|${normComentario}`) ||
          fallasMap.get(`${dateKey}|${normMaq}|${normTec}`) ||
          fallasMap.get(`${dateKey}|${normMaq}`)

        let esFalla = false
        let tipoFalla = null
        let fallaMotivo = null
        let estadoFinal = 'Operativo'

        if (matchedFallaFromSheet) {
          esFalla = true
          tipoFalla = matchedFallaFromSheet.tipo_falla || 'Falla operacional'
          fallaMotivo = matchedFallaFromSheet.falla_motivo || rawComentario
          estadoFinal = matchedFallaFromSheet.estado_final || 'Operativo'
        } else if (isDedicatedFallasSheet) {
          esFalla = true
          tipoFalla = colIndices.tipo_falla !== -1 && row[colIndices.tipo_falla] ? String(row[colIndices.tipo_falla]).trim() : 'Falla operacional'
          fallaMotivo = colIndices.falla_motivo !== -1 && row[colIndices.falla_motivo] ? String(row[colIndices.falla_motivo]).trim() : rawComentario
          estadoFinal = colIndices.estado_final !== -1 && row[colIndices.estado_final] ? String(row[colIndices.estado_final]).trim() : 'Operativo'
        } else if (colIndices.es_falla !== -1 && row[colIndices.es_falla] !== undefined && row[colIndices.es_falla] !== null) {
          const v = normalizarNombre(row[colIndices.es_falla])
          esFalla = v === 'si' || v === 'sí' || v === 'true' || v === '1'
          if (esFalla) {
            tipoFalla = colIndices.tipo_falla !== -1 && row[colIndices.tipo_falla] ? String(row[colIndices.tipo_falla]).trim() : 'Falla operacional'
            fallaMotivo = colIndices.falla_motivo !== -1 && row[colIndices.falla_motivo] ? String(row[colIndices.falla_motivo]).trim() : rawComentario
            estadoFinal = colIndices.estado_final !== -1 && row[colIndices.estado_final] ? String(row[colIndices.estado_final]).trim() : 'Operativo'
          }
        }

        let matchedEquipo = null
        let matchedResolucion = null
        let motivoResolucion = ''

        // Regla 3: Resolución mediante public.vista_resolucion_equipo comparando nombre_busqueda
        if (normMaq && Array.isArray(currentResList) && currentResList.length > 0) {
          matchedResolucion = currentResList.find((re) => {
            const reBusqueda = normalizarNombre(re.nombre_busqueda)
            if (reBusqueda && reBusqueda === normMaq) return true
            const reAlias = normalizarNombre(re.alias)
            const reNombreOficial = normalizarNombre(re.nombre_maestro || re.nombre_oficial || re.nombre)
            const reCodigo = normalizarNombre(re.codigo)
            return (
              (reAlias && reAlias === normMaq) ||
              (reNombreOficial && reNombreOficial === normMaq) ||
              (reCodigo && reCodigo === normMaq)
            )
          })

          if (matchedResolucion && matchedResolucion.equipo_id) {
            matchedEquipo = currentEquiposList.find((eq) => eq.id === matchedResolucion.equipo_id) || {
              id: matchedResolucion.equipo_id,
              codigo: matchedResolucion.codigo || matchedResolucion.nombre_maestro || matchedResolucion.nombre_oficial || rawMaquina,
              nombre: matchedResolucion.nombre_maestro || matchedResolucion.nombre_oficial || matchedResolucion.nombre || rawMaquina,
              area: matchedResolucion.area || rawArea
            }
            if (matchedEquipo) motivoResolucion = 'Vista resolución de equipos'
          }
        }

        // Regla 6: Términos ambiguos (Refrigeración, Extrusión, Producción, Cocina, Instalaciones, PET, etc.)
        // NO deben convertirse automáticamente en equipos salvo alias explícito validado
        const esAmbiguo = TERMINOS_AMBIGUOS.has(normMaq)

        // Si no se resolvió por vista y no es ambiguo, buscar coincidencia exacta directa en catálogo/árbol
        if (!matchedEquipo && normMaq && !esAmbiguo) {
          matchedEquipo = findEquipoCanonical(rawMaquina)
          if (matchedEquipo) motivoResolucion = 'Coincidencia exacta directa'
        }

        // Verificar si existe una decisión de clasificación previa aprobada
        const approvedPreset = CLASIFICACIONES_APROBADAS_REGISTRO.find(
          (c) => normalizarNombre(c.nombreOriginal) === normMaq
        )
        if (approvedPreset && !matchedEquipo) {
          matchedEquipo = findEquipoCanonical(approvedPreset.equipoPadre)
          if (matchedEquipo) motivoResolucion = `Preset aprobado: ${approvedPreset.trazabilidad}`
        }

        // REGLAS DE CONTEXTO Y NEGOCIO VALIDADAS EXCLUSIVAMENTE POR EL USUARIO
        if (!matchedEquipo) {
          // Regla 8 y 12: Elevador Bodega → Elevador Bodega Tradicional
          if (normMaq.includes('elevador bodega')) {
            matchedEquipo = findEquipoCanonical('Elevador Bodega Tradicional')
            motivoResolucion = 'Regla 8 / 12: Elevador Bodega Tradicional'
          }
          // Regla 11: Refrigeración con "chiller principal" explícito (Fila 461)
          else if ((normMaq === 'refrigeracion' || normMaq === 'refrigeración') && normComentario.includes('chiller principal')) {
            matchedEquipo = findEquipoCanonical('Chiller principal')
            motivoResolucion = 'Regla 11: Registro de Refrigeración con chiller principal explícito'
          }
          // Regla 5.3: Estanque de refrigeración de Extrusión (relleno refrigeración moldes o hidráulica)
          else if (
            (normMaq === 'refrigeracion' || normMaq === 'refrigeración') &&
            (
              /\b(rellen\w*|nivel|llenado de tk)\b/.test(normComentario) &&
              /\b(chiller|molde\w*|hidr[aá]ulic\w*|refrigeraci[oó]n|ibc)\b/.test(normComentario)
            )
          ) {
            matchedEquipo = findEquipoCanonical('Estanque de refrigeración de Extrusión')
            motivoResolucion = 'Regla 5.3: Relleno de circuito refrigeración moldes Extrusión'
          }
          // Regla 5.4: Bomba refrigeración M4 (instalación de bomba de M1 en M4)
          else if (
            (normMaq === 'refrigeracion' || normMaq === 'refrigeración') &&
            /\bbomba de m1 en m4\b/.test(normComentario)
          ) {
            matchedEquipo = findEquipoCanonical('Bomba refrigeración M4')
            motivoResolucion = 'Regla 5.4: Bomba de refrigeración instalada en M4'
          }
          // Regla 2.2: Bomba sumergible Galpón de Producción
          else if (
            (normMaq === 'produccion' || normMaq === 'producción') &&
            /\bbomba sumergi(da|ble)|noma sumergible\b/.test(normComentario)
          ) {
            matchedEquipo = findEquipoCanonical('Bomba sumergible Galpón de Producción')
            motivoResolucion = 'Regla 2.2: Bomba sumergible Galpón de Producción'
          }
          // Regla 2.1: Estanques acumuladores de producto líquido
          else if (
            (normMaq === 'produccion' || normMaq === 'producción') &&
            /\bestanques? de producci[oó]n\b/.test(normComentario)
          ) {
            matchedEquipo = findEquipoCanonical('Estanques acumuladores de producto líquido')
            motivoResolucion = 'Regla 2.1: Estanques acumuladores de producto líquido'
          }
          // Regla 2.3: Cocina (Iluminación y Tablero eléctrico de Servicios Generales)
          else if (normMaq === 'cocina') {
            if (/\b(iluminaci[oó]n|focos|luces)\b/i.test(normComentario)) {
              matchedEquipo = findEquipoCanonical('Sistema de iluminación Cocina')
              motivoResolucion = 'Servicios Generales: Sistema de iluminación Cocina'
            } else if (/\b(potenci[oó]metro|vdf|tablero)\b/i.test(normComentario)) {
              matchedEquipo = findEquipoCanonical('Tablero eléctrico Cocina')
              motivoResolucion = 'Servicios Generales: Tablero eléctrico Cocina'
            } else {
              matchedEquipo = findEquipoCanonical('Cocina')
              motivoResolucion = 'Regla 2.3: Ubicación técnica Cocina'
            }
          }
          // Regla Etiquetadora: corresponde a Etiquetadora M4-M5 (Plásticos)
          else if (normMaq === 'etiquetadora' || normMaq.includes('etiquetadora')) {
            matchedEquipo = findEquipoCanonical('Etiquetadora M4-M5')
            motivoResolucion = 'Plásticos: Etiquetadora M4-M5'
          }
          // Regla 6.2: Chiller Soplado (relleno de IBC que alimenta chiller de Soplado/PET)
          else if (
            (normMaq === 'pet' || normMaq === 'soplado') &&
            /\bibc\b/.test(normComentario)
          ) {
            matchedEquipo = findEquipoCanonical('Chiller Soplado')
            motivoResolucion = 'Regla 6.2: Suministro de agua Chiller Soplado (IBC)'
          }
          // Regla 7.2: Sistema de iluminación Galpón Soplado (focos/iluminación en PET/Soplado)
          else if (
            (normMaq === 'pet' || normMaq === 'soplado') &&
            /\b(focos|iluminaci[oó]n)\b/.test(normComentario)
          ) {
            matchedEquipo = findEquipoCanonical('Sistema de iluminación Galpón Soplado')
            motivoResolucion = 'Regla 7.2: Sistema de iluminación Galpón Soplado'
          }
          // Regla 7.1: Portón de acceso a planta (portón principal en Instalaciones)
          else if (
            (normMaq === 'instalaciones' || normMaq === 'servicios generales') &&
            /\bport[oó]n\b/.test(normComentario)
          ) {
            matchedEquipo = findEquipoCanonical('Portón de acceso a planta')
            motivoResolucion = 'Regla 7.1: Portón de acceso vehicular a planta'
          }
          // Regla 1: Sensor retirado desde M3 para probar en M5 (activo origen M3)
          else if (
            /\bsensor\b/.test(normComentario) &&
            /\bm3\b/.test(normComentario) &&
            /\bm5\b/.test(normComentario)
          ) {
            matchedEquipo = findEquipoCanonical('M3')
            motivoResolucion = 'Regla 1: Sensor retirado desde activo origen M3 para prueba en M5'
          }
          // Regla 9: Tareas preventivas grupales multi-máquina (se expanden individualmente a cada máquina)
          else if (
            (normMaq === 'plasticos' || normMaq === 'plásticos') &&
            /\brellena grasa en m2, m3, m4 y m5\b/.test(normComentario)
          ) {
            esFalla = false
          }
        }

        // Regla multi-máquina preventiva: cuando una tarea preventiva mencione varias máquinas explícitamente, expandir a cada una
        const isMultiMaquinaPreventiva =
          !esFalla &&
          (normComentario.includes('rellena grasa') ||
           normComentario.includes('engrase') ||
           normComentario.includes('lubric') ||
           normComentario.includes('preventiv')) &&
          /\bm2,\s*m3,\s*m4\s*y\s*m5\b/i.test(normComentario)

        if (isMultiMaquinaPreventiva) {
          const maquinasGrupales = ['M2', 'M3', 'M4', 'M5']
          for (const subMaq of maquinasGrupales) {
            const subMatchedEq = findEquipoCanonical(subMaq)
            const subBatchHash = `${dateKey}|${subMatchedEq?.id || subMaq}|${normTec}|${normalizarNombre(rawComentario)}`
            const subIsBatchDuplicate = seenHashes.has(subBatchHash)
            if (subBatchHash) seenHashes.add(subBatchHash)

            const subIsDuplicateInDb = Boolean(
              subMatchedEq?.id &&
              bitacoraList.some((b) => {
                if (b.equipo_id !== subMatchedEq.id) return false
                if (normalizarNombre(b.tecnico) !== normTec) return false
                if (normalizarNombre(b.trabajo_realizado) !== normalizarNombre(rawComentario)) return false
                if (parsedDate && b.fecha_hora) {
                  const bDate = new Date(b.fecha_hora)
                  return (
                    bDate.getFullYear() === parsedDate.getFullYear() &&
                    bDate.getMonth() === parsedDate.getMonth() &&
                    bDate.getDate() === parsedDate.getDate()
                  )
                }
                return false
              })
            )

            const subIsDuplicate = subIsDuplicateInDb || subIsBatchDuplicate
            const subHasTecnico = rawTecnico.length > 0
            const subEstadoRow = subIsDuplicate ? 'Duplicado' : (dateValid && subHasTecnico && subMatchedEq ? 'Resuelto' : 'Pendiente')

            analyzedRows.push({
              rowNumber: i + 1,
              rawFecha,
              parsedDate,
              tecnico: rawTecnico,
              maquina: subMaq,
              matchedEquipo: subMatchedEq,
              approvedPreset: null,
              area: subMatchedEq?.area || rawArea || 'Plásticos',
              comentario: rawComentario,
              es_falla: false,
              tipo_intervencion: 'Preventiva',
              tipo_falla: null,
              falla_motivo: null,
              estado_final: estadoFinal || 'Operativo',
              estadoRow: subEstadoRow,
              motivoPendiente: subEstadoRow === 'Pendiente' ? 'Expansión grupal preventiva' : null,
              motivoResolucion: `Expansión grupal preventiva a ${subMaq}`,
              issues: subIsDuplicate ? ['Duplicado / ya existente'] : [],
              isValid: subEstadoRow === 'Resuelto',
              isMatched: Boolean(subMatchedEq),
              isDuplicate: subIsDuplicate
            })
          }
          continue
        }

        // Regla 10: Despiche rutinario de acumuladores sin anomalía
        const isDespicheRutinario =
          (TERMINOS_AMBIGUOS.has(normMaq) || !normMaq) &&
          /\b(despich\w*)\b/.test(normComentario) &&
          /\bacumulador(es)?\b/.test(normComentario) &&
          !/\b(anomal[ií]a|fuga|dañad[oa]|obstruid[oa]|rota?|exceso anormal|chiller principal)\b/.test(normComentario)

        if (isDespicheRutinario) {
          esFalla = false
        }

        const hasTecnico = rawTecnico.length > 0
        const isMatched = Boolean(matchedEquipo)

        // Regla 8: Detección estricta de duplicados contra la base de datos (fecha_hora, equipo_id, tecnico, trabajo_realizado)
        const isDuplicateInDb = Boolean(
          matchedEquipo?.id &&
          bitacoraList.some((b) => {
            if (b.equipo_id !== matchedEquipo.id) return false
            if (normalizarNombre(b.tecnico) !== normTec) return false
            if (normalizarNombre(b.trabajo_realizado) !== normalizarNombre(rawComentario)) return false
            if (parsedDate && b.fecha_hora) {
              const bDate = new Date(b.fecha_hora)
              return (
                bDate.getFullYear() === parsedDate.getFullYear() &&
                bDate.getMonth() === parsedDate.getMonth() &&
                bDate.getDate() === parsedDate.getDate()
              )
            }
            return false
          })
        )

        // Detección de duplicados dentro del mismo lote/archivo Excel
        const batchHash = `${dateKey}|${matchedEquipo?.id || normMaq}|${normTec}|${normalizarNombre(rawComentario)}`
        const isBatchDuplicate = seenHashes.has(batchHash)
        if (batchHash) seenHashes.add(batchHash)

        const isDuplicate = isDuplicateInDb || isBatchDuplicate

        // Clasificación de los 5 estados oficiales de importación (Sección 15)
        let estadoRow = 'Pendiente'
        let motivoPendiente = null
        const issues = []

        if (!dateValid) issues.push('Fecha inválida')
        if (!hasTecnico) issues.push('Técnico vacío')

        if (isDespicheRutinario) {
          estadoRow = 'Rutina preventiva / excluida'
          motivoPendiente = 'Rutina preventiva diaria de despiche sin anomalías'
          issues.push('Rutina diaria de despiche (excluida de bitácora)')
        } else if (isDuplicate) {
          estadoRow = 'Duplicado'
          issues.push('Duplicado / ya existente')
        } else if (!dateValid || !hasTecnico) {
          estadoRow = 'Error'
        } else if (isMatched && matchedEquipo) {
          estadoRow = 'Resuelto'
        } else {
          estadoRow = 'Pendiente'
          motivoPendiente = esAmbiguo ? 'Término general o ambiguo no resuelto' : 'Activo no resuelto'
          issues.push(motivoPendiente)
        }

        const isValid = estadoRow === 'Resuelto'

        let tipoIntervencion = normalizarTipoIntervencion({
          esFalla,
          tipoIntervencion: colIndices.tipo_intervencion !== -1 && row[colIndices.tipo_intervencion] ? String(row[colIndices.tipo_intervencion]).trim() : null,
          trabajoRealizado: rawComentario
        })

        // Reglas 9, 10 y 16: Engrase y rutinas preventivas no deben aumentar contador de fallas y deben ser tipo 'Preventiva'
        if (normComentario.includes('rellena grasa') || normComentario.includes('engrase') || isDespicheRutinario) {
          if (!esFalla) {
            tipoIntervencion = 'Preventiva'
          }
        }

        analyzedRows.push({
          rowNumber: i + 1,
          rawFecha,
          parsedDate,
          tecnico: rawTecnico,
          maquina: rawMaquina,
          matchedEquipo,
          approvedPreset,
          area: rawArea,
          comentario: rawComentario,
          es_falla: esFalla,
          tipo_intervencion: tipoIntervencion,
          tipo_falla: tipoFalla,
          falla_motivo: fallaMotivo,
          estado_final: estadoFinal,
          estadoRow,
          motivoPendiente,
          motivoResolucion,
          issues,
          isValid,
          isMatched,
          isDuplicate
        })

        // Agrupación progresiva para revisión del maestro de equipos
        if (rawMaquina) {
          const normKey = normalizarNombre(rawMaquina)
          if (!machinesMap.has(normKey)) {
            let initialAccion = 'pendiente'
            let initialEstado = 'Pendiente'
            let initialPadre = '-'
            let initialHijo = '-'
            let initialEquipoId = ''

            if (approvedPreset) {
              initialAccion = approvedPreset.accion
              initialEstado = approvedPreset.estado
              initialPadre = approvedPreset.equipoPadre
              initialHijo = approvedPreset.equipoHijo
              const parentInDb = equiposList.find(
                (e) =>
                  normalizarNombre(e.codigo) === normalizarNombre(approvedPreset.equipoPadre) ||
                  normalizarNombre(e.nombre) === normalizarNombre(approvedPreset.equipoPadre)
              )
              if (parentInDb) {
                initialEquipoId = parentInDb.id
              }
            } else if (matchedEquipo) {
              initialAccion = 'existente'
              initialEstado = 'Asociado a equipo existente'
              initialPadre = `[${matchedEquipo.codigo}] ${matchedEquipo.nombre}`
              initialHijo = '-'
              initialEquipoId = matchedEquipo.id
            }

            machinesMap.set(normKey, {
              id: `maq-${i}-${Math.random().toString(36).substr(2, 6)}`,
              nombreOriginal: rawMaquina,
              apariciones: 1,
              areas: rawArea ? [rawArea] : [],
              primerRegistro: parsedDate || rawFecha,
              ultimoRegistro: parsedDate || rawFecha,
              primerRegistroTs: parsedDate ? parsedDate.getTime() : 0,
              ultimoRegistroTs: parsedDate ? parsedDate.getTime() : 0,
              accion: initialAccion,
              estado: initialEstado,
              equipoPadreAsignado: initialPadre,
              equipoHijoAsignado: initialHijo,
              equipoAsignadoId: initialEquipoId,
              propuestoNombrePadre: approvedPreset ? approvedPreset.equipoPadre : rawMaquina,
              propuestoNombreHijo: approvedPreset ? approvedPreset.equipoHijo : rawMaquina,
              exactMatch: matchedEquipo || null,
              isApprovedPreset: Boolean(approvedPreset)
            })
          } else {
            const entry = machinesMap.get(normKey)
            entry.apariciones += 1
            if (rawArea && !entry.areas.includes(rawArea)) {
              entry.areas.push(rawArea)
            }
            if (parsedDate) {
              const ts = parsedDate.getTime()
              if (!entry.primerRegistroTs || ts < entry.primerRegistroTs) {
                entry.primerRegistroTs = ts
                entry.primerRegistro = parsedDate
              }
              if (!entry.ultimoRegistroTs || ts > entry.ultimoRegistroTs) {
                entry.ultimoRegistroTs = ts
                entry.ultimoRegistro = parsedDate
              }
            }
          }
        }
      }

      // Conteo oficial de métricas de importación (Sección 15)
      const resueltosCount = analyzedRows.filter((r) => r.estadoRow === 'Resuelto').length
      const pendientesCount = analyzedRows.filter((r) => r.estadoRow === 'Pendiente').length
      const excluidosCount = analyzedRows.filter((r) => r.estadoRow === 'Rutina preventiva / excluida').length
      const duplicatesCount = analyzedRows.filter((r) => r.estadoRow === 'Duplicado').length
      const errorsCount = analyzedRows.filter((r) => r.estadoRow === 'Error').length

      // Ordenar: primero los Pendientes de clasificación, luego por mayor cantidad de apariciones
      const reviewList = Array.from(machinesMap.values()).sort((a, b) => {
        if (a.estado === 'Pendiente' && b.estado !== 'Pendiente') return -1
        if (a.estado !== 'Pendiente' && b.estado === 'Pendiente') return 1
        return b.apariciones - a.apariciones
      })

      setPendingEquiposReview(reviewList)
      setImportRows(analyzedRows)
      setImportModalTab('filas')
      setImportSummary({
        total: analyzedRows.length,
        resueltos: resueltosCount,
        pendientes: pendientesCount,
        excluidos: excluidosCount,
        duplicados: duplicatesCount,
        errores: errorsCount,
        totalMaquinasUnicas: reviewList.length,
        pendientesClasificacion: reviewList.filter((m) => m.estado === 'Pendiente').length,
        aprobadosOAsociados: reviewList.filter((m) => m.estado !== 'Pendiente').length
      })
    } catch (err) {
      setImportError(`Error al procesar el archivo Excel: ${err.message || 'Formato no soportado'}`)
    } finally {
      setImportLoading(false)
    }
  }

  // Actualización reactiva de la clasificación de un equipo encontrado en Excel
  const handleClassificationChange = (nombreOriginal, field, value) => {
    setPendingEquiposReview((prev) =>
      prev.map((item) => {
        if (normalizeText(item.nombreOriginal) !== normalizeText(nombreOriginal)) {
          return item
        }

        const updated = { ...item, [field]: value }

        if (field === 'accion') {
          if (value === 'pendiente') {
            updated.estado = 'Pendiente'
            updated.equipoPadreAsignado = '-'
            updated.equipoHijoAsignado = '-'
            updated.equipoAsignadoId = ''
          } else if (value === 'existente') {
            updated.estado = 'Asociado a equipo existente'
            const targetEq =
              equiposList.find((eq) => eq.id === updated.equipoAsignadoId) ||
              item.exactMatch ||
              equiposList[0]
            if (targetEq) {
              updated.equipoAsignadoId = targetEq.id
              updated.equipoPadreAsignado = `[${targetEq.codigo}] ${targetEq.nombre}`
            } else {
              updated.equipoPadreAsignado = 'Seleccione equipo...'
            }
            updated.equipoHijoAsignado = '-'
          } else if (value === 'nuevo_padre') {
            updated.estado = 'Aprobado como padre'
            const parentName = updated.propuestoNombrePadre || item.nombreOriginal
            updated.equipoPadreAsignado = `🏛️ ${parentName} (Principal)`
            updated.equipoHijoAsignado = '-'
            updated.equipoAsignadoId = ''
          } else if (value === 'nuevo_hijo') {
            updated.estado = 'Aprobado como hijo'
            const targetParent =
              equiposList.find((eq) => eq.id === updated.equipoAsignadoId) ||
              equiposList[0]
            if (targetParent) {
              updated.equipoAsignadoId = targetParent.id
              updated.equipoPadreAsignado = `[${targetParent.codigo}] ${targetParent.nombre}`
            } else {
              updated.equipoPadreAsignado = 'Seleccione equipo padre...'
            }
            const childName = updated.propuestoNombreHijo || item.nombreOriginal
            updated.equipoHijoAsignado = `↳ ${childName}`
          }
        } else if (field === 'equipoAsignadoId') {
          const targetEq = equiposList.find((eq) => eq.id === value)
          if (targetEq) {
            if (updated.accion === 'existente') {
              updated.equipoPadreAsignado = `[${targetEq.codigo}] ${targetEq.nombre}`
              updated.equipoHijoAsignado = '-'
            } else if (updated.accion === 'nuevo_hijo') {
              updated.equipoPadreAsignado = `[${targetEq.codigo}] ${targetEq.nombre}`
              updated.equipoHijoAsignado = `↳ ${updated.propuestoNombreHijo || item.nombreOriginal}`
            }
          }
        } else if (field === 'propuestoNombrePadre') {
          if (updated.accion === 'nuevo_padre') {
            updated.equipoPadreAsignado = `🏛️ ${value || item.nombreOriginal} (Principal)`
          }
        } else if (field === 'propuestoNombreHijo') {
          if (updated.accion === 'nuevo_hijo') {
            updated.equipoHijoAsignado = `↳ ${value || item.nombreOriginal}`
          }
        }

        return updated
      })
    )
  }

  // Confirmar e insertar la importación en Supabase (public.bitacora_mantenimiento y public.bitacora_importacion_pendiente)
  const handleExecuteImport = async () => {
    if (!session) {
      setImportError('Debe iniciar sesión para confirmar la importación en Supabase.')
      return
    }
    if (!importRows || importRows.length === 0) {
      setImportError('No hay registros cargados para importar.')
      return
    }

    setImportSubmitting(true)
    setImportError('')
    const importBatchId = generarUuid()

    try {
      // 1. Filtrar registros resueltos y no duplicados para bitacora_mantenimiento
      const validRowsToInsert = importRows
        .filter((r) => r.estadoRow === 'Resuelto' && r.matchedEquipo?.id)
        .map((r) => {
          const tipoFinal = normalizarTipoIntervencion({
            esFalla: Boolean(r.es_falla),
            tipoIntervencion: r.tipo_intervencion,
            trabajoRealizado: r.comentario
          })

          return {
            fecha_hora: r.parsedDate ? r.parsedDate.toISOString() : new Date().toISOString(),
            equipo_id: r.matchedEquipo.id,
            tecnico: r.tecnico || 'Técnico no especificado',
            es_falla: Boolean(r.es_falla),
            tipo_intervencion: tipoFinal,
            falla_motivo: r.es_falla ? (r.falla_motivo || r.comentario || null) : null,
            trabajo_realizado: r.comentario || 'Mantenimiento registrado mediante importación Excel',
            estado_final: r.estado_final || 'Operativo',
            area: r.area || r.matchedEquipo.area || null,
            tipo_falla: r.es_falla ? (r.tipo_falla || null) : null,
            origen: 'Excel',
            import_batch_id: importBatchId
          }
        })

      // Validación interna y exhaustiva previa de todo el lote (Requerimientos 5 y 8)
      const invalidTypes = []
      validRowsToInsert.forEach((r, idx) => {
        if (!SET_TIPOS_INTERVENCION_VALIDOS.has(r.tipo_intervencion)) {
          invalidTypes.push({ idx: idx + 1, tipo: r.tipo_intervencion, tecnico: r.tecnico })
        }
      })

      if (invalidTypes.length > 0) {
        setImportError(
          `Bloqueo de seguridad: Se detectaron ${invalidTypes.length} filas con tipo_intervencion no admitido por Supabase (${invalidTypes.slice(0, 3).map((x) => `"${x.tipo}"`).join(', ')}). No se envió ninguna petición a Supabase.`
        )
        setImportSubmitting(false)
        return
      }

      // 2. Filtrar registros pendientes (no resueltos o ambiguos) para bitacora_importacion_pendiente
      const pendingRowsToInsert = importRows
        .filter((r) => r.estadoRow === 'Pendiente')
        .map((r) => ({
          import_batch_id: importBatchId,
          fecha_hora: r.parsedDate ? r.parsedDate.toISOString() : new Date().toISOString(),
          tecnico: r.tecnico || 'No especificado',
          nombre_equipo_origen: r.maquina || 'Sin nombre',
          area_origen: r.area || null,
          trabajo_realizado: r.comentario || 'Sin descripción',
          es_falla: Boolean(r.es_falla),
          tipo_falla: r.tipo_falla || null,
          motivo_pendiente: 'Activo no resuelto',
          estado: 'Pendiente'
        }))

      let insertedBitacora = 0
      let insertedPendientes = 0

      if (validRowsToInsert.length > 0) {
        const { data, error: bitErr } = await supabase
          .from('bitacora_mantenimiento')
          .insert(validRowsToInsert)
          .select('id')

        if (bitErr) {
          throw new Error(`Error en bitácora de mantenimiento: ${bitErr.message}`)
        }
        insertedBitacora = data?.length || validRowsToInsert.length
      }

      if (pendingRowsToInsert.length > 0) {
        const { data, error: pendErr } = await supabase
          .from('bitacora_importacion_pendiente')
          .insert(pendingRowsToInsert)
          .select('id')

        if (pendErr) {
          throw new Error(`Error en pendientes de validación: ${pendErr.message}`)
        }
        insertedPendientes = data?.length || pendingRowsToInsert.length
      }

      // Refrescar vistas y listados reactivos
      await fetchBitacora()
      await fetchPendientesValidacion()

      const dupCount = importSummary?.duplicados || 0
      const exclCount = importSummary?.excluidos || 0
      const totalProcesados = importRows.length

      setImportCompletedSummary({
        procesados: totalProcesados,
        asignados: insertedBitacora,
        pendientes: insertedPendientes,
        ignorados: exclCount + dupCount
      })

      if (insertedPendientes > 0) {
        setBitacoraSubTab('pendientes')
        setActiveView('bitacora')
      } else {
        setBitacoraSuccessMessage('Importación completada sin tareas pendientes de validación.')
      }

      setIsImportModalOpen(false)
    } catch (err) {
      // Sincronizar listados si ocurrió inserción parcial
      try {
        await fetchBitacora()
        await fetchPendientesValidacion()
      } catch {
        // Ignorar error secundario de refresco
      }
      setImportError(`Error durante la importación: ${err.message || 'Error de conexión'}`)
    } finally {
      setImportSubmitting(false)
    }
  }

  // Limpiar filtros de la Bitácora
  const handleResetFilters = () => {
    setFilterSearch('')
    setFilterEquipo('')
    setFilterArea('')
    setFilterTipoIntervencion('')
    setFilterTipoFalla('')
    setFilterEsFalla('todos')
    setFilterFechaDesde('')
    setFilterFechaHasta('')
  }

  const hasActiveFilters = Boolean(
    filterSearch ||
    filterEquipo ||
    filterArea ||
    filterTipoIntervencion ||
    filterTipoFalla ||
    filterEsFalla !== 'todos' ||
    filterFechaDesde ||
    filterFechaHasta
  )

  // Filtrado de la tabla de Bitácora
  const filteredBitacora = bitacoraList.filter((item) => {
    if (filterSearch.trim()) {
      const q = normalizeText(filterSearch)
      const eqCodigo = normalizeText(item.equipo?.codigo)
      const eqNombre = normalizeText(item.equipo?.nombre)
      const tecnico = normalizeText(item.tecnico)
      const trabajo = normalizeText(item.trabajo_realizado)
      const falla = normalizeText(item.falla_motivo)
      const area = normalizeText(item.area || item.equipo?.area)
      const match =
        eqCodigo.includes(q) ||
        eqNombre.includes(q) ||
        tecnico.includes(q) ||
        trabajo.includes(q) ||
        falla.includes(q) ||
        area.includes(q)
      if (!match) return false
    }

    if (filterEquipo && item.equipo_id !== filterEquipo) return false

    if (filterArea) {
      const itemArea = item.area || item.equipo?.area || ''
      if (normalizeText(itemArea) !== normalizeText(filterArea)) return false
    }

    if (filterTipoIntervencion && item.tipo_intervencion !== filterTipoIntervencion) return false

    if (filterTipoFalla && item.tipo_falla !== filterTipoFalla) return false

    if (filterEsFalla === 'si' && !item.es_falla) return false
    if (filterEsFalla === 'no' && item.es_falla) return false

    if (filterFechaDesde) {
      const itemDate = new Date(item.fecha_hora)
      const desde = new Date(filterFechaDesde + 'T00:00:00')
      if (itemDate < desde) return false
    }
    if (filterFechaHasta) {
      const itemDate = new Date(item.fecha_hora)
      const hasta = new Date(filterFechaHasta + 'T23:59:59')
      if (itemDate > hasta) return false
    }

    return true
  })

  // Áreas únicas para el selector de filtros
  const distinctAreas = Array.from(
    new Set(
      [
        ...equiposList.map((e) => e.area),
        ...bitacoraList.map((b) => b.area || b.equipo?.area)
      ].filter(Boolean)
    )
  ).sort()

  // Equipos activos para nuevas intervenciones
  const activeEquipos = equiposList.filter((e) => e.activo !== false)

  // Filtro de equipos para la revisión del maestro progresivo en el importador
  const filteredEquiposReview = pendingEquiposReview.filter((item) => {
    if (clasifFilterEstado !== 'todos' && item.estado !== clasifFilterEstado) {
      return false
    }
    if (clasifSearchText.trim()) {
      const q = normalizeText(clasifSearchText)
      const normName = normalizeText(item.nombreOriginal)
      const normArea = normalizeText((item.areas || []).join(' '))
      const normPadre = normalizeText(item.equipoPadreAsignado)
      const normHijo = normalizeText(item.equipoHijoAsignado)
      if (
        !normName.includes(q) &&
        !normArea.includes(q) &&
        !normPadre.includes(q) &&
        !normHijo.includes(q)
      ) {
        return false
      }
    }
    return true
  })

  // Cálculo del valor máximo para escalar las barras del gráfico
  const maxRetiroValor = retirosData.length > 0
    ? Math.max(...retirosData.map((d) => Number(d.valor_retiros) || 0), 1)
    : 1

  // Construcción del árbol jerárquico de activos con datos reales de BD y canon visual
  const fullActivosTree = buildActivosTree(equiposList, supabaseArbolNodes)

  // Filtrado reactivo del árbol de activos según treeSearch
  const filteredActivosTree = fullActivosTree
    .map((area) => {
      if (!treeSearch.trim()) return area

      const q = normalizeText(treeSearch)
      const areaMatch = normalizeText(area.nombre).includes(q)

      const matchingEquipos = area.equipos
        .map((eq) => {
          const eqMatch =
            (eq.codigo && normalizeText(eq.codigo).includes(q)) ||
            (eq.nombre && normalizeText(eq.nombre).includes(q)) ||
            (eq.aliasHistorico && normalizeText(eq.aliasHistorico).includes(q)) ||
            (eq.color && normalizeText(eq.color).includes(q)) ||
            (eq.fabricante && normalizeText(eq.fabricante).includes(q)) ||
            (eq.modelo && normalizeText(eq.modelo).includes(q))

          const matchingHijos = (eq.hijos || []).filter(
            (h) =>
              (h.codigo && normalizeText(h.codigo).includes(q)) ||
              (h.nombre && normalizeText(h.nombre).includes(q)) ||
              (h.aliasHistorico && normalizeText(h.aliasHistorico).includes(q)) ||
              (h.fabricante && normalizeText(h.fabricante).includes(q))
          )

          if (eqMatch || matchingHijos.length > 0 || areaMatch) {
            return {
              ...eq,
              hijos: matchingHijos.length > 0 ? matchingHijos : eq.hijos
            }
          }
          return null
        })
        .filter(Boolean)

      if (areaMatch || matchingEquipos.length > 0) {
        return {
          ...area,
          equipos: matchingEquipos
        }
      }
      return null
    })
    .filter(Boolean)

  const selectedActivo =
    findActivoInTree(fullActivosTree, selectedActivoId) ||
    fullActivosTree[0]?.equipos[0] ||
    null

  // Helper para generar el título principal de la ficha: <CÓDIGO> — <NOMBRE> o <NOMBRE> si no hay código válido
  const getFichaMainTitle = (activo) => {
    if (!activo) return ''
    const nombre = (activo.nombre || '').trim()
    const rawCodigo = (activo.codigo || '').trim()

    const isValidCodigo =
      rawCodigo &&
      rawCodigo !== '—' &&
      rawCodigo.toLowerCase() !== 'null' &&
      rawCodigo.toLowerCase() !== 'undefined' &&
      !rawCodigo.startsWith('act-') &&
      normalizeText(rawCodigo) !== normalizeText(nombre)

    if (isValidCodigo) {
      return `${rawCodigo} — ${nombre}`
    }
    return nombre
  }

  // Resolver UUID real de cualquier activo según orden seguro de 5 pasos
  const resolveTargetEquipoId = useCallback((activo) => {
    if (!activo) return null
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    // 1. activo.equipoId si ya es UUID real
    if (activo.equipoId && uuidRegex.test(activo.equipoId)) {
      return activo.equipoId
    }

    // 2. activo.id si es UUID real
    if (activo.id && uuidRegex.test(activo.id)) {
      return activo.id
    }

    // 2b. padreEquipoId si es un componente hijo vinculado a un equipo con UUID real
    if (activo.padreEquipoId && uuidRegex.test(activo.padreEquipoId)) {
      return activo.padreEquipoId
    }

    const codNorm = normalizeText(activo.codigo || '')
    const nomNorm = normalizeText(activo.nombre || '')

    // 3. Coincidencia en equiposList por codigo
    if (codNorm && Array.isArray(equiposList) && equiposList.length > 0) {
      const matchCod = equiposList.find((e) => e.codigo && normalizeText(e.codigo) === codNorm)
      if (matchCod && uuidRegex.test(matchCod.id)) return matchCod.id
    }

    // 4. Coincidencia por nombre maestro en equiposList
    if (nomNorm && Array.isArray(equiposList) && equiposList.length > 0) {
      const matchNom = equiposList.find((e) => e.nombre && normalizeText(e.nombre) === nomNorm)
      if (matchNom && uuidRegex.test(matchNom.id)) return matchNom.id
    }

    // 5. Aliases / Mapeos oficiales ya existentes cuando corresponda
    // 5a. Coincidencia en resolucionEquiposList (public.vista_resolucion_equipo)
    if (Array.isArray(resolucionEquiposList) && resolucionEquiposList.length > 0) {
      const matchResolucion = resolucionEquiposList.find((r) => {
        const rBusqueda = normalizeText(r.nombre_busqueda || '')
        const rAlias = normalizeText(r.alias || '')
        const rCod = normalizeText(r.codigo || '')
        const rOficial = normalizeText(r.nombre_oficial || '')
        return (
          (codNorm && (rCod === codNorm || rAlias === codNorm || rBusqueda === codNorm)) ||
          (nomNorm && (rOficial === nomNorm || rAlias === nomNorm || rBusqueda === nomNorm))
        )
      })
      if (matchResolucion && uuidRegex.test(matchResolucion.equipo_id)) {
        return matchResolucion.equipo_id
      }
    }

    // 5b. Coincidencia por aliasHistorico si el nodo del árbol lo define
    if (activo.aliasHistorico && Array.isArray(equiposList) && equiposList.length > 0) {
      const aliasNorm = normalizeText(activo.aliasHistorico)
      const matchAlias = equiposList.find(
        (e) =>
          (e.nombre && normalizeText(e.nombre) === aliasNorm) ||
          (e.codigo && normalizeText(e.codigo) === aliasNorm)
      )
      if (matchAlias && uuidRegex.test(matchAlias.id)) return matchAlias.id
    }

    // No inventar UUID ni devolver IDs locales como act-m3, act-m2, etc.
    return null
  }, [equiposList, resolucionEquiposList])

  const targetEquipoId = resolveTargetEquipoId(selectedActivo)

  // Sincronizar indicadores y fallas de la ficha de activo cuando cambia el activo seleccionado
  useEffect(() => {
    if (targetEquipoId) {
      fetchFichaActivoData(targetEquipoId)
    } else {
      setActivoFichaMetrics(null)
      setActivoHistorialFallas([])
    }
  }, [session, targetEquipoId])

  // Sincronizar historial de mantenimiento real de bitacora_mantenimiento cuando cambia el activo seleccionado
  useEffect(() => {
    // Si cambió el activo, limpiar inmediatamente para evitar parpadeos con datos del activo previo
    if (lastLoadedMantenimientoEquipoId.current !== targetEquipoId) {
      setActivoHistorialMantenimiento([])
      setErrorFichaMantenimiento(null)
    }

    if (!targetEquipoId) {
      lastLoadedMantenimientoEquipoId.current = null
      setLoadingFichaMantenimiento(false)
      return
    }

    // Solo consultar si cambió el activo seleccionado
    if (lastLoadedMantenimientoEquipoId.current !== targetEquipoId) {
      lastLoadedMantenimientoEquipoId.current = targetEquipoId
      fetchHistorialMantenimiento(targetEquipoId)
    }
  }, [session, targetEquipoId])

  // Sincronizar si el usuario abre la pestaña 'historial' y no se había consultado
  useEffect(() => {
    if (activoDetailTab === 'historial' && targetEquipoId) {
      if (lastLoadedMantenimientoEquipoId.current !== targetEquipoId) {
        lastLoadedMantenimientoEquipoId.current = targetEquipoId
        fetchHistorialMantenimiento(targetEquipoId)
      }
    }
  }, [activoDetailTab, targetEquipoId])

  const toggleAreaExpand = (areaId) => {
    setExpandedAreas((prev) =>
      prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId]
    )
  }

  const toggleEquipoExpand = (equipoId, e) => {
    if (e) e.stopPropagation()
    setExpandedEquipos((prev) =>
      prev.includes(equipoId) ? prev.filter((id) => id !== equipoId) : [...prev, equipoId]
    )
  }

  // Navegar a Bitácora aplicando el filtro por el equipo seleccionado
  const handleVerBitacoraFromActivo = (activo) => {
    if (!activo) return

    const targetEqId = resolveTargetEquipoId(activo)

    if (targetEqId) {
      setFilterEquipo(targetEqId)
      setFilterSearch('')
    } else {
      setFilterEquipo('')
      setFilterSearch(activo.nombre || activo.codigo || '')
    }

    setBitacoraSuccessMessage('')
    setBitacoraError('')
    setActiveView('bitacora')
  }

  // Manejadores de drill-down para Dashboard de Mantenimiento
  const handleDashboardNavigateToBitacora = ({ area, tecnico, tipoIntervencion, tipoFalla, esFalla }) => {
    if (area) setFilterArea(area)
    if (tecnico) setFilterSearch(tecnico)
    if (tipoIntervencion) setFilterTipoIntervencion(tipoIntervencion)
    if (tipoFalla) setFilterTipoFalla(tipoFalla)
    if (esFalla) setFilterEsFalla(esFalla)
    setBitacoraSubTab('registradas')
    setActiveView('bitacora')
  }

  const handleDashboardNavigateToActivo = ({ equipoId, tab = 'fallas' }) => {
    let targetId = equipoId
    for (const a of fullActivosTree) {
      for (const eq of a.equipos || []) {
        if (eq.id === equipoId || eq.equipoId === equipoId || resolveTargetEquipoId(eq) === equipoId) {
          targetId = eq.id
          break
        }
        for (const h of eq.hijos || []) {
          if (h.id === equipoId || h.equipoId === equipoId || resolveTargetEquipoId(h) === equipoId) {
            targetId = h.id
            break
          }
        }
        if (targetId !== equipoId) break
      }
      if (targetId !== equipoId) break
    }
    setSelectedActivoId(targetId)
    setActivoDetailTab(tab)
    setActiveView('arbol-activos')
  }

  return (
    <div className="app-layout">
      {/* Menú lateral */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">Sistema de Mantenimiento</h2>
        </div>
        
        <nav className="sidebar-nav">
          {/* GRUPO 1: GENERAL */}
          <div className="nav-section">
            <h3 className="nav-section-title">General</h3>
            <ul className="nav-list">
              <li>
                <button
                  type="button"
                  className={`nav-item ${activeView === 'home' ? 'active' : ''}`}
                  onClick={() => setActiveView('home')}
                >
                  <span className="nav-item-icon">🏠</span>
                  <span>Inicio</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveView('dashboard')}
                >
                  <span className="nav-item-icon">📊</span>
                  <span>Dashboard</span>
                </button>
              </li>
            </ul>
          </div>

          {/* GRUPO 2: MANTENIMIENTO */}
          <div className="nav-section">
            <h3 className="nav-section-title">Mantenimiento</h3>
            <ul className="nav-list">
              <li>
                <button
                  type="button"
                  className={`nav-item ${activeView === 'ordenes-trabajo' ? 'active' : ''}`}
                  onClick={() => setActiveView('ordenes-trabajo')}
                >
                  <span className="nav-item-icon">📋</span>
                  <span>Órdenes de Trabajo</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item ${activeView === 'bitacora' ? 'active' : ''}`}
                  onClick={() => {
                    setBitacoraSuccessMessage('')
                    setBitacoraError('')
                    setActiveView('bitacora')
                  }}
                >
                  <span className="nav-item-icon">📓</span>
                  <span>Bitácora</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item ${activeView === 'arbol-activos' ? 'active' : ''}`}
                  onClick={() => setActiveView('arbol-activos')}
                >
                  <span className="nav-item-icon">🌲</span>
                  <span>Árbol de Activos</span>
                </button>
              </li>
            </ul>
          </div>

          {/* GRUPO 3: INVENTARIO */}
          <div className="nav-section">
            <h3 className="nav-section-title">Inventario</h3>
            <ul className="nav-list">
              <li>
                <button
                  type="button"
                  className={`nav-item ${activeView === 'dashboard-inventario' ? 'active' : ''}`}
                  onClick={() => setActiveView('dashboard-inventario')}
                >
                  <span className="nav-item-icon">📦</span>
                  <span>Inventario General</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item ${activeView === 'repuestos' ? 'active' : ''}`}
                  onClick={handleCancel}
                >
                  <span className="nav-item-icon">📦</span>
                  <span>Repuestos</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item ${activeView === 'nuevo-repuesto' ? 'active' : ''}`}
                  onClick={() => {
                    if (session) {
                      setFormData(INITIAL_FORM_STATE)
                      setErrors({})
                      setSuccessMessage('')
                      setServerError('')
                      setIsSaved(false)
                      setActiveView('nuevo-repuesto')
                    } else {
                      setLoginError('Inicie sesión para registrar un nuevo repuesto.')
                      setActiveView('login')
                    }
                  }}
                >
                  <span className="nav-item-icon">➕</span>
                  <span>Nuevo Repuesto</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item ${activeView === 'retiro' ? 'active' : ''}`}
                  onClick={() => {
                    if (session) {
                      setRetiroErrors({})
                      setRetiroSuccess('')
                      setRetiroServerError('')
                      setActiveView('retiro')
                    } else {
                      setLoginError('Inicie sesión para registrar retiros de repuestos.')
                      setActiveView('login')
                    }
                  }}
                >
                  <span className="nav-item-icon">📤</span>
                  <span>Retiro de Repuestos</span>
                </button>
              </li>
            </ul>
          </div>

          {/* GRUPO 4: COMPRAS */}
          <div className="nav-section">
            <h3 className="nav-section-title">Compras</h3>
            <ul className="nav-list">
              <li>
                <button
                  type="button"
                  className={`nav-item ${activeView === 'compras' ? 'active' : ''}`}
                  onClick={() => setActiveView('compras')}
                >
                  <span className="nav-item-icon">🛒</span>
                  <span>Compras</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* Footer del Menú con Estado de Sesión */}
        <div className="sidebar-footer">
          {session ? (
            <>
              <div className="user-badge">
                <span className="user-role">Administrador</span>
                <span className="user-email" title={session.user.email}>
                  {session.user.email}
                </span>
              </div>
              <button
                type="button"
                className="btn-sidebar-auth"
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`btn-sidebar-auth ${activeView === 'login' ? 'btn-sidebar-login' : ''}`}
              onClick={() => {
                setLoginError('')
                setActiveView('login')
              }}
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </aside>

      {/* Área principal */}
      <main className="main-content">
        {/* VISTA 0: Home General */}
        {activeView === 'home' && (
          <>
            <header className="content-header home-header">
              <div className="header-info">
                <h1 className="page-title">Sistema de Gestión de Mantenimiento</h1>
                <p className="page-subtitle">
                  Gestión integral de mantenimiento, activos, repuestos y compras.
                </p>
              </div>
              <div className="home-header-badge">
                <span className="badge-pulse"></span>
                <span>Plataforma Operativa ERP</span>
              </div>
            </header>

            <section className="content-body home-content-body">
              <div className="home-modules-grid">
                {/* 1. ÓRDENES DE TRABAJO */}
                <div
                  className="home-module-card"
                  onClick={() => setActiveView('ordenes-trabajo')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveView('ordenes-trabajo')}
                >
                  <div className="home-card-header">
                    <div className="home-card-icon-wrap icon-ot">
                      <span className="home-card-icon">🛠️</span>
                    </div>
                    <span className="home-card-badge badge-dev">En desarrollo</span>
                  </div>
                  <div className="home-card-body">
                    <h3 className="home-card-title">Órdenes de Trabajo</h3>
                    <p className="home-card-desc">
                      Tablero Kanban móvil y desktop sincronizado con ficha de OT, control de estados en tiempo real y auditoría.
                    </p>
                  </div>
                  <div className="home-card-footer">
                    <span className="home-card-action">
                      Ingresar <span className="arrow">→</span>
                    </span>
                  </div>
                </div>

                {/* 2. ÁRBOL DE ACTIVOS */}
                <div
                  className="home-module-card"
                  onClick={() => setActiveView('arbol-activos')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveView('arbol-activos')}
                >
                  <div className="home-card-header">
                    <div className="home-card-icon-wrap icon-activos">
                      <span className="home-card-icon">🌲</span>
                    </div>
                    <span className="home-card-badge badge-preview">Estructura</span>
                  </div>
                  <div className="home-card-body">
                    <h3 className="home-card-title">Árbol de Activos</h3>
                    <p className="home-card-desc">
                      Visualización jerárquica de equipos, máquinas y componentes de planta.
                    </p>
                  </div>
                  <div className="home-card-footer">
                    <span className="home-card-action">
                      Ingresar <span className="arrow">→</span>
                    </span>
                  </div>
                </div>

                {/* 3. INVENTARIO GENERAL DE REPUESTOS */}
                <div
                  className="home-module-card card-active-module"
                  onClick={() => setActiveView('dashboard')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveView('dashboard')}
                >
                  <div className="home-card-header">
                    <div className="home-card-icon-wrap icon-inventario">
                      <span className="home-card-icon">📦</span>
                    </div>
                    <span className="home-card-badge badge-active">Módulo Activo</span>
                  </div>
                  <div className="home-card-body">
                    <h3 className="home-card-title">Inventario General de Repuestos</h3>
                    <p className="home-card-desc">
                      Stock disponible, valorización, movimientos, retiros y control de repuestos.
                    </p>
                  </div>
                  <div className="home-card-footer">
                    <span className="home-card-action">
                      Ingresar <span className="arrow">→</span>
                    </span>
                  </div>
                </div>

                {/* 4. COMPRAS */}
                <div
                  className="home-module-card"
                  onClick={() => setActiveView('compras')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveView('compras')}
                >
                  <div className="home-card-header">
                    <div className="home-card-icon-wrap icon-compras">
                      <span className="home-card-icon">🛒</span>
                    </div>
                    <span className="home-card-badge badge-dev">En desarrollo</span>
                  </div>
                  <div className="home-card-body">
                    <h3 className="home-card-title">Compras</h3>
                    <p className="home-card-desc">
                      Solicitudes, cotizaciones, órdenes de compra, proveedores y seguimiento de adquisiciones.
                    </p>
                  </div>
                  <div className="home-card-footer">
                    <span className="home-card-action">
                      Ingresar <span className="arrow">→</span>
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* VISTA PLACEHOLDER: Órdenes de Trabajo */}
        {/* VISTA: Órdenes de Trabajo (Tablero Kanban + Ficha Individual Sincronizados) */}
        {activeView === 'ordenes-trabajo' && (
          <section className="content-body" style={{ padding: '0.25rem 0' }}>
            <OrdenesTrabajoView
              ordenesList={ordenesTrabajoList}
              setOrdenesList={setOrdenesTrabajoList}
              equiposList={equiposList}
              session={session}
              storageMode={otStorageMode}
              realtimeStatus={otRealtimeStatus}
              initialLoading={otInitialLoading}
              backgroundRefreshing={otBackgroundRefreshing}
              onRefresh={() => {
                fetchOrdenesTrabajoList({ silent: true })
              }}
              onNavigateToDashboard={() => setActiveView('dashboard')}
              onNavigateToBitacora={() => setActiveView('bitacora')}
              onNavigateHome={() => setActiveView('home')}
            />
          </section>
        )}
        {activeView === 'ordenes-trabajo-legacy' && (
          <>
            <header className="content-header">
              <div className="header-info">
                <h1 className="page-title">Órdenes de Trabajo</h1>
                <p className="page-subtitle">
                  Gestión integral de trabajos correctivos, preventivos, inspecciones y seguimiento de intervenciones.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveView('home')}
              >
                ← Volver al Inicio
              </button>
            </header>

            <section className="content-body">
              <div className="placeholder-container">
                <div className="placeholder-hero-card">
                  <div className="placeholder-icon-badge icon-ot">🛠️</div>
                  <span className="placeholder-status-tag">Módulo en desarrollo</span>
                  <h2 className="placeholder-title">Órdenes de Trabajo</h2>
                  <p className="placeholder-description">
                    Este módulo está en fase de preparación para la gestión técnica de intervenciones operativas, generación programada de órdenes de trabajo preventivas y seguimiento de paradas de planta.
                  </p>

                  <div className="placeholder-feature-grid">
                    <div className="placeholder-feature-box">
                      <div className="feat-icon">📋</div>
                      <h4>OTs Correctivas y Preventivas</h4>
                      <p>Emisión y asignación de trabajos con priorización por criticidad.</p>
                    </div>
                    <div className="placeholder-feature-box">
                      <div className="feat-icon">⏱️</div>
                      <h4>Tiempos e Intervención</h4>
                      <p>Control de MTTR, tiempos de respuesta y horas hombre dedicadas.</p>
                    </div>
                    <div className="placeholder-feature-box">
                      <div className="feat-icon">🔩</div>
                      <h4>Consumo de Repuestos</h4>
                      <p>Vincular repuestos utilizados directamente desde el inventario.</p>
                    </div>
                    <div className="placeholder-feature-box">
                      <div className="feat-icon">✅</div>
                      <h4>Cierre y Conformidad</h4>
                      <p>Validación de trabajos terminados y registro en historial técnico.</p>
                    </div>
                  </div>

                  <div className="placeholder-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setActiveView('bitacora')}
                    >
                      Ir a Bitácora de Mantenimiento
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setActiveView('home')}
                    >
                      Volver al Inicio
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* VISTA: Árbol de Activos */}
        {activeView === 'arbol-activos' && (
          <>
            <header className="content-header">
              <div className="header-info">
                <h1 className="page-title">Árbol de Activos</h1>
                <p className="page-subtitle">
                  Visualización jerárquica de equipos, máquinas y componentes de planta.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveView('home')}
              >
                ← Volver al Inicio
              </button>
            </header>

            <section className="content-body">
              <div className="activos-view-wrapper">
                {/* Banner de regla de negocio y arquitectura */}
                <div className="activos-top-banner">
                  <div className="activos-top-banner-content">
                    <span className="activos-top-banner-icon">🏛️</span>
                    <span>
                      <strong>{PLANTA_NOMBRE} — Base V1 Oficial:</strong> Estructura jerárquica (Área └── Grupo └── Activo └── Subactivo) y relaciones funcionales diferenciadas (refrigeración y equipos compartidos).
                    </span>
                  </div>
                  <span className="activos-top-banner-rule">
                    Base V1 Aprobada
                  </span>
                </div>

                <div className="activos-layout">
                  {/* ZONA IZQUIERDA: ÁRBOL JERÁRQUICO */}
                  <div className="tree-panel">
                    <div className="tree-panel-header">
                      {/* Buscador superior */}
                      <div className="tree-search-wrapper">
                        <span className="tree-search-icon">🔍</span>
                        <input
                          type="text"
                          className="tree-search-input"
                          placeholder="Buscar equipo o componente…"
                          value={treeSearch}
                          onChange={(e) => setTreeSearch(e.target.value)}
                        />
                        {treeSearch && (
                          <button
                            type="button"
                            className="tree-search-clear"
                            onClick={() => setTreeSearch('')}
                            title="Limpiar búsqueda"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Toolbar con estadísticas y botones expandir/contraer */}
                      <div className="tree-toolbar">
                        <span>
                          {filteredActivosTree.reduce(
                            (acc, a) => acc + a.equipos.length,
                            0
                          )}{' '}
                          equipos en catálogo
                        </span>
                        <div className="tree-btn-group">
                          <button
                            type="button"
                            className="btn-tree-toggle"
                            onClick={() => {
                              setExpandedAreas(fullActivosTree.map((a) => a.id))
                              setExpandedEquipos(
                                fullActivosTree.flatMap((a) =>
                                  a.equipos.filter((e) => e.hijos?.length > 0).map((e) => e.id)
                                )
                              )
                            }}
                          >
                            Expandir todo
                          </button>
                          <button
                            type="button"
                            className="btn-tree-toggle"
                            onClick={() => {
                              setExpandedAreas([])
                              setExpandedEquipos([])
                            }}
                          >
                            Contraer
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="tree-panel-body">
                      {filteredActivosTree.length === 0 ? (
                        <div className="state-card" style={{ padding: '1.5rem', margin: 0 }}>
                          <p className="state-desc">No se encontraron equipos coincidentes con "{treeSearch}".</p>
                        </div>
                      ) : (
                        filteredActivosTree.map((area) => {
                          const isAreaOpen = Boolean(treeSearch.trim()) || expandedAreas.includes(area.id)

                          return (
                            <div key={area.id} className="tree-area-block">
                              <button
                                type="button"
                                className="tree-area-header"
                                onClick={() => toggleAreaExpand(area.id)}
                              >
                                <div className="tree-area-info">
                                  <span className="tree-arrow">
                                    {isAreaOpen ? '▼' : '▶'}
                                  </span>
                                  <span>{area.icono}</span>
                                  <span className="tree-area-title">{area.nombre}</span>
                                </div>
                                <span className="tree-area-badge">
                                  {area.equipos.length}
                                </span>
                              </button>

                              {isAreaOpen && (
                                <div className="tree-equipos-container">
                                  {area.equipos.map((equipo, eqIdx) => {
                                    const prevEquipo = area.equipos[eqIdx - 1]
                                    const isNewGroup = equipo.grupo && (!prevEquipo || prevEquipo.grupo !== equipo.grupo)
                                    const hasChildren = equipo.hijos && equipo.hijos.length > 0
                                    const isEquipoOpen = Boolean(treeSearch.trim()) || expandedEquipos.includes(equipo.id)
                                    const isSelected = selectedActivo?.id === equipo.id
                                    const estadoInfo = ESTADOS_ACTIVO[equipo.estado?.toUpperCase()] || ESTADOS_ACTIVO.OPERATIVO

                                    return (
                                      <div key={equipo.id} className="tree-equipo-wrapper">
                                        {isNewGroup && (
                                          <div className="tree-group-header">
                                            <span className="tree-group-tag">
                                              {equipo.grupo.includes('Extrusión') ? '⚡' : '📁'} {equipo.grupo}
                                            </span>
                                          </div>
                                        )}
                                        <div
                                          className={`tree-equipo-row ${isSelected ? 'selected' : ''}`}
                                          onClick={() => setSelectedActivoId(equipo.id)}
                                        >
                                          <div className="tree-equipo-main">
                                            {hasChildren ? (
                                              <span
                                                className="tree-arrow"
                                                onClick={(e) => toggleEquipoExpand(equipo.id, e)}
                                                title={isEquipoOpen ? 'Contraer sub-componentes' : 'Expandir sub-componentes'}
                                              >
                                                {isEquipoOpen ? '▼' : '▶'}
                                              </span>
                                            ) : (
                                              <span className="tree-arrow" style={{ opacity: 0.3 }}>•</span>
                                            )}
                                            <span
                                              className="tree-equipo-name"
                                              title={equipo.color ? `${equipo.nombre} — ${equipo.color}` : equipo.nombre}
                                            >
                                              {equipo.color ? `${equipo.nombre} — ${equipo.color}` : equipo.nombre}
                                            </span>
                                          </div>

                                          <div className="tree-equipo-extra">
                                            {hasChildren && (
                                              <span className="tree-has-children-badge" title="Equipo padre con equipo hijo">
                                                {equipo.hijos.length} hijo
                                              </span>
                                            )}
                                            <span
                                              className={`dot-indicator ${estadoInfo.dotClass}`}
                                              title={`Estado: ${estadoInfo.label}`}
                                            >
                                              ●
                                            </span>
                                          </div>
                                        </div>

                                        {/* Hijos / Componentes */}
                                        {hasChildren && isEquipoOpen && (
                                          <div className="tree-hijos-container">
                                            {equipo.hijos.map((hijo) => {
                                              const isHijoSelected = selectedActivo?.id === hijo.id
                                              const hijoEstado = ESTADOS_ACTIVO[hijo.estado?.toUpperCase()] || ESTADOS_ACTIVO.OPERATIVO

                                              return (
                                                <div
                                                  key={hijo.id}
                                                  className={`tree-hijo-row ${isHijoSelected ? 'selected' : ''}`}
                                                  onClick={() => setSelectedActivoId(hijo.id)}
                                                >
                                                  <div className="tree-hijo-main">
                                                    <span>⚙️</span>
                                                    <span className="tree-hijo-name" title={hijo.nombre}>{hijo.nombre}</span>
                                                    <span className="tree-hijo-badge">Equipo hijo</span>
                                                  </div>
                                                  <span
                                                    className={`dot-indicator ${hijoEstado.dotClass}`}
                                                    title={`Estado: ${hijoEstado.label}`}
                                                  >
                                                    ●
                                                  </span>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* ZONA DERECHA: FICHA DEL ACTIVO SELECCIONADO */}
                  <div className="ficha-panel">
                    {selectedActivo ? (
                      <>
                        <div className="ficha-header">
                          <div className="ficha-title-wrap">
                            <div className="ficha-badges-row">
                              <span className={`ficha-tipo-badge ${selectedActivo.tipo === 'hijo' ? 'tipo-hijo' : 'tipo-padre'}`}>
                                {selectedActivo.tipo === 'hijo' ? '⚙️ Equipo Hijo' : '🏛️ Equipo Padre'}
                              </span>
                              <span className="ficha-estado-pill">
                                <span className={`dot-indicator ${ESTADOS_ACTIVO[selectedActivo.estado?.toUpperCase()]?.dotClass || 'dot-operativo'}`}>
                                  ●
                                </span>
                                {ESTADOS_ACTIVO[selectedActivo.estado?.toUpperCase()]?.label || 'Operativo'}
                              </span>
                            </div>
                            <h2 className="ficha-title">
                              {getFichaMainTitle(selectedActivo)}
                            </h2>
                            <span className="ficha-area-label">
                              <strong>{PLANTA_NOMBRE}</strong> • Área: <strong>{selectedActivo.area}</strong>
                              {selectedActivo.grupo ? <> • <strong>{selectedActivo.grupo}</strong></> : null}
                              {selectedActivo.ubicacion ? <> • {selectedActivo.ubicacion}</> : null}
                            </span>
                          </div>
                        </div>

                        {/* Barra de acciones */}
                        <div className="ficha-actions-bar">
                          <div className="ficha-actions-left">
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => handleVerBitacoraFromActivo(selectedActivo)}
                              title="Ver bitácora técnica e historial de intervenciones"
                            >
                              <span>📓</span> Ver Bitácora
                            </button>
                          </div>
                          <div className="ficha-actions-right">
                            <button
                              type="button"
                              className="btn-secondary btn-disabled-feature"
                              disabled={true}
                              title="Próximamente: creación jerárquica de activos en fase posterior"
                            >
                              <span>➕</span> + Nuevo activo <span className="btn-tag-soon">Próximamente</span>
                            </button>
                            <button
                              type="button"
                              className="btn-secondary btn-disabled-feature"
                              disabled={true}
                              title="Próximamente: edición técnica del activo"
                            >
                              <span>✏️</span> Editar activo <span className="btn-tag-soon">Próximamente</span>
                            </button>
                          </div>
                        </div>

                        {/* Pestañas de navegación de la Ficha */}
                        <div className="ficha-tabs-nav">
                          <button
                            type="button"
                            className={`ficha-tab-btn ${activoDetailTab === 'general' ? 'active' : ''}`}
                            onClick={() => setActivoDetailTab('general')}
                          >
                            <span>📋</span> Información General
                          </button>
                          <button
                            type="button"
                            className={`ficha-tab-btn ${activoDetailTab === 'historial' ? 'active' : ''}`}
                            onClick={() => setActivoDetailTab('historial')}
                          >
                            <span>🕒</span> Historial de Mantenimiento
                          </button>
                          <button
                            type="button"
                            className={`ficha-tab-btn ${activoDetailTab === 'fallas' ? 'active' : ''}`}
                            onClick={() => setActivoDetailTab('fallas')}
                          >
                            <span>⚠️</span> Historial de Fallas
                          </button>
                          <button
                            type="button"
                            className={`ficha-tab-btn ${activoDetailTab === 'repuestos' ? 'active' : ''}`}
                            onClick={() => setActivoDetailTab('repuestos')}
                          >
                            <span>📦</span> Repuestos Asociados
                          </button>
                          <button
                            type="button"
                            className={`ficha-tab-btn ${activoDetailTab === 'documentacion' ? 'active' : ''}`}
                            onClick={() => setActivoDetailTab('documentacion')}
                          >
                            <span>📄</span> Documentación
                          </button>
                        </div>

                        {/* Cuerpo de la Pestaña Activa */}
                        <div className="ficha-tab-body">
                          {/* TAB 1: INFORMACIÓN GENERAL */}
                          {activoDetailTab === 'general' && (
                            <>
                              <div className="ficha-info-grid">
                                <div className="ficha-info-item">
                                  <span className="ficha-info-label">Código</span>
                                  <span className="ficha-info-value" style={{ fontFamily: 'monospace' }}>
                                    {selectedActivo.codigo || '— (Sin código asignado)'}
                                  </span>
                                </div>
                                <div className="ficha-info-item">
                                  <span className="ficha-info-label">Nombre del Activo</span>
                                  <span className="ficha-info-value">{selectedActivo.nombre}</span>
                                </div>
                                <div className="ficha-info-item">
                                  <span className="ficha-info-label">Área</span>
                                  <span className="ficha-info-value">{selectedActivo.area}</span>
                                </div>
                                <div className="ficha-info-item">
                                  <span className="ficha-info-label">Estado</span>
                                  <span className="ficha-info-value">
                                    <span className={`dot-indicator ${ESTADOS_ACTIVO[selectedActivo.estado?.toUpperCase()]?.dotClass || 'dot-operativo'}`}>
                                      ●{' '}
                                    </span>
                                    {ESTADOS_ACTIVO[selectedActivo.estado?.toUpperCase()]?.label || 'Operativo'}
                                  </span>
                                </div>
                                <div className="ficha-info-item">
                                  <span className="ficha-info-label">Criticidad</span>
                                  <span className="ficha-info-value">
                                    <span
                                      className={
                                        selectedActivo.criticidad?.toLowerCase().includes('alta')
                                          ? 'badge-criticidad-alta'
                                          : selectedActivo.criticidad?.toLowerCase().includes('baja')
                                          ? 'badge-criticidad-baja'
                                          : 'badge-criticidad-media'
                                      }
                                    >
                                      {selectedActivo.criticidad || 'Media'}
                                    </span>
                                  </span>
                                </div>
                                <div className="ficha-info-item">
                                  <span className="ficha-info-label">Tipo de Activo</span>
                                  <span className="ficha-info-value">
                                    {selectedActivo.tipo === 'hijo' ? 'Equipo hijo / Componente' : 'Equipo padre / Máquina'}
                                  </span>
                                </div>
                                <div className="ficha-info-item">
                                  <span className="ficha-info-label">Fabricante</span>
                                  <span className="ficha-info-value">{selectedActivo.fabricante || 'Sin registrar'}</span>
                                </div>
                                <div className="ficha-info-item">
                                  <span className="ficha-info-label">Modelo</span>
                                  <span className="ficha-info-value">{selectedActivo.modelo || 'Estándar'}</span>
                                </div>
                                <div className="ficha-info-item">
                                  <span className="ficha-info-label">Número de Serie</span>
                                  <span className="ficha-info-value" style={{ fontFamily: 'monospace' }}>
                                    {selectedActivo.numeroSerie || 'SN-0000'}
                                  </span>
                                </div>
                                <div className="ficha-info-item">
                                  <span className="ficha-info-label">Ubicación en Planta</span>
                                  <span className="ficha-info-value">{selectedActivo.ubicacion}</span>
                                </div>
                                {selectedActivo.color && (
                                  <div className="ficha-info-item">
                                    <span className="ficha-info-label">Color</span>
                                    <span className="ficha-info-value" style={{ fontWeight: 600 }}>{selectedActivo.color}</span>
                                  </div>
                                )}
                              </div>

                              {/* Tarjeta de Formatos y Moldes (Inyectoras de Preformas y Extrusión M1 a M5) */}
                              {(selectedActivo.formatoActual !== undefined ||
                                selectedActivo.formatosCompatibles ||
                                selectedActivo.formatoFijo) && (
                                <div className="ficha-formatos-card">
                                  <div className="ficha-formatos-header">
                                    <span className="ficha-formatos-title">
                                      <span>📐</span> Especificación de Formatos y Moldes
                                    </span>
                                    <span className="tree-badge-rule">Control de Producción</span>
                                  </div>

                                  <div className="ficha-formatos-grid">
                                    {selectedActivo.formatoFijo && (
                                      <div className="ficha-formato-item">
                                        <span className="ficha-formato-label">Formato Fijo de Operación</span>
                                        <span className="badge-formato-fijo">{selectedActivo.formatoFijo}</span>
                                      </div>
                                    )}

                                    {selectedActivo.formatoActual !== undefined && (
                                      <div className="ficha-formato-item">
                                        <span className="ficha-formato-label">Formato / Molde Actual Instalado</span>
                                        {selectedActivo.formatoActual ? (
                                          <span className="badge-formato-actual">{selectedActivo.formatoActual}</span>
                                        ) : (
                                          <span className="badge-formato-pendiente">⚠️ No confirmado / Pendiente de registrar</span>
                                        )}
                                      </div>
                                    )}

                                    {selectedActivo.formatosCompatibles && selectedActivo.formatosCompatibles.length > 0 && (
                                      <div className="ficha-formato-item" style={{ gridColumn: '1 / -1' }}>
                                        <span className="ficha-formato-label">
                                          Formatos / Moldes Compatibles ({selectedActivo.formatosCompatibles.length})
                                        </span>
                                        <div className="formatos-chips-wrap">
                                          {selectedActivo.formatosCompatibles.map((fmt) => (
                                            <span
                                              key={fmt}
                                              className={`chip-formato ${selectedActivo.formatoActual === fmt ? 'chip-formato-active' : ''}`}
                                            >
                                              {fmt} {selectedActivo.formatoActual === fmt ? '✓ (En uso)' : ''}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {selectedActivo.notasFormato && (
                                    <p className="ficha-formato-nota">
                                      ℹ️ {selectedActivo.notasFormato}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Tarjeta de Relaciones Funcionales y Servicios Compartidos (Refrigeración y Equipos Compartidos) */}
                              {selectedActivo.relacionesFuncionales && (
                                <div className="ficha-relacion-funcional-card">
                                  <div className="ficha-relacion-funcional-header">
                                    <span className="ficha-relacion-funcional-title">
                                      <span>🔄</span> Relación Funcional y Servicios Compartidos
                                    </span>
                                    <span className="badge-relacion-funcional">Relación Funcional (No Jerárquica)</span>
                                  </div>
                                  <p className="ficha-relacion-funcional-intro">
                                    Diferenciado de la jerarquía estructural: los servicios compartidos vinculan dinámicamente el suministro de frío y equipos compartidos entre activos.
                                  </p>

                                  {selectedActivo.relacionesFuncionales.refrigeraA && (
                                    <div className="ficha-funcional-row">
                                      <span className="ficha-funcional-label">❄️ Refrigera a los activos:</span>
                                      <div className="ficha-funcional-chips">
                                        {selectedActivo.relacionesFuncionales.refrigeraA.map((eqNom) => (
                                          <span key={eqNom} className="chip-funcional-target">
                                            {eqNom}
                                          </span>
                                        ))}
                                      </div>
                                      {selectedActivo.relacionesFuncionales.tipoServicio && (
                                        <span className="ficha-funcional-desc">
                                          {selectedActivo.relacionesFuncionales.tipoServicio}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {selectedActivo.relacionesFuncionales.refrigeradoPor && (
                                    <div className="ficha-funcional-row">
                                      <span className="ficha-funcional-label">❄️ Circuito de refrigeración asignado:</span>
                                      <div className="ficha-funcional-chips">
                                        {selectedActivo.relacionesFuncionales.refrigeradoPor.map((chillerNom) => (
                                          <span key={chillerNom} className="chip-funcional-chiller">
                                            {chillerNom}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {selectedActivo.relacionesFuncionales.servicioA && (
                                    <div className="ficha-funcional-row">
                                      <span className="ficha-funcional-label">🤝 Presta servicio compartido a:</span>
                                      <div className="ficha-funcional-chips">
                                        {selectedActivo.relacionesFuncionales.servicioA.map((eqNom) => (
                                          <span key={eqNom} className="chip-funcional-target">
                                            {eqNom}
                                          </span>
                                        ))}
                                      </div>
                                      {selectedActivo.relacionesFuncionales.tipoServicio && (
                                        <span className="ficha-funcional-desc">
                                          {selectedActivo.relacionesFuncionales.tipoServicio}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {selectedActivo.relacionesFuncionales.equiposCompartidos && (
                                    <div className="ficha-funcional-row">
                                      <span className="ficha-funcional-label">🤝 Equipos compartidos físicamente:</span>
                                      <div className="ficha-funcional-chips">
                                        {selectedActivo.relacionesFuncionales.equiposCompartidos.map((comp) => (
                                          <span key={comp.nombre} className="chip-funcional-shared" title={`Compartido con ${comp.con}`}>
                                            {comp.nombre} <small style={{ opacity: 0.8 }}>(con {comp.con})</small>
                                          </span>
                                        ))}
                                      </div>
                                      <span className="ficha-funcional-desc">
                                        Físicamente compartidos entre M4 y M5 (no duplicados como hijos individuales).
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Relación Jerárquica: Si es hijo, mostrar su padre */}
                              {selectedActivo.tipo === 'hijo' && (
                                <div className="ficha-relacion-card">
                                  <div className="ficha-relacion-header">
                                    <span className="ficha-relacion-title">
                                      <span>🏛️</span> Relación Jerárquica Aprobada
                                    </span>
                                    <span className="tree-badge-rule">Estructura Aprobada</span>
                                  </div>
                                  <div className="ficha-relacion-detalle" style={{ margin: '0.4rem 0' }}>
                                    <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}>
                                      <strong>Padre:</strong> {selectedActivo.padreNombre}
                                    </p>
                                    <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}>
                                      <strong>Hijo:</strong> {selectedActivo.nombre}
                                    </p>
                                  </div>
                                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Este equipo hijo está vinculado formalmente al equipo padre <strong>{selectedActivo.padreNombre}</strong> sin código asignado.
                                  </p>
                                  <button
                                    type="button"
                                    className="ficha-relacion-pill"
                                    onClick={() => setSelectedActivoId(selectedActivo.padreId)}
                                    title="Ir a la ficha del equipo padre"
                                  >
                                    <span>🏛️</span>
                                    <strong>Padre: {selectedActivo.padreNombre}</strong>
                                    <span className="ficha-relacion-action">Ver equipo padre →</span>
                                  </button>
                                </div>
                              )}

                              {/* Relación Jerárquica: Si tiene hijos, mostrarlos */}
                              {selectedActivo.hijos && selectedActivo.hijos.length > 0 && (
                                <div className="ficha-relacion-card">
                                  <div className="ficha-relacion-header">
                                    <span className="ficha-relacion-title">
                                      <span>⚙️</span> Equipos Hijos Aprobados ({selectedActivo.hijos.length})
                                    </span>
                                    <span className="tree-badge-rule">Estructura Aprobada</span>
                                  </div>
                                  <div className="ficha-relacion-detalle" style={{ margin: '0.4rem 0' }}>
                                    <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}>
                                      <strong>Padre:</strong> {selectedActivo.nombre}
                                    </p>
                                    {selectedActivo.hijos.map((hijo) => (
                                      <p key={hijo.id} style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}>
                                        <strong>Hijo:</strong> {hijo.nombre}
                                      </p>
                                    ))}
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                    {selectedActivo.hijos.map((hijo) => (
                                      <button
                                        key={hijo.id}
                                        type="button"
                                        className="ficha-relacion-pill"
                                        onClick={() => setSelectedActivoId(hijo.id)}
                                        title={`Ver ficha técnica de ${hijo.nombre}`}
                                      >
                                        <span>⚙️</span>
                                        <strong>Hijo: {hijo.nombre}</strong>
                                        {hijo.codigo && (
                                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({hijo.codigo})</span>
                                        )}
                                        <span className="ficha-relacion-action">Ver equipo hijo →</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* TAB 2: HISTORIAL DE MANTENIMIENTO */}
                          {activoDetailTab === 'historial' && (
                            <div className="ficha-placeholder-card">
                              <div className="ficha-placeholder-header">
                                <div>
                                  <h3 className="ficha-placeholder-title">Registro Histórico de Intervenciones</h3>
                                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                                    Intervenciones registradas en <code>public.bitacora_mantenimiento</code> asociadas a este activo
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="btn-primary"
                                  onClick={() => handleVerBitacoraFromActivo(selectedActivo)}
                                >
                                  Ver en Bitácora con Filtro →
                                </button>
                              </div>

                              {loadingFichaMantenimiento ? (
                                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                  <span className="spinner" style={{ margin: '0 auto 0.75rem' }}></span>
                                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>
                                    Cargando historial de mantenimiento...
                                  </p>
                                </div>
                              ) : errorFichaMantenimiento ? (
                                <div className="empty-state-callout" style={{ marginTop: '1rem', borderLeft: '4px solid #ef4444' }}>
                                  <p className="empty-state-text" style={{ margin: 0, fontWeight: 500, color: '#dc2626' }}>
                                    {errorFichaMantenimiento}
                                  </p>
                                </div>
                              ) : activoHistorialMantenimiento.length === 0 ? (
                                <div className="empty-state-callout" style={{ marginTop: '1rem' }}>
                                  <p className="empty-state-text" style={{ margin: 0, fontWeight: 500 }}>
                                    No existen intervenciones de mantenimiento asociadas a este activo.
                                  </p>
                                </div>
                              ) : (
                                <div style={{ overflowX: 'auto', marginTop: '1rem', width: '100%' }}>
                                  <table className="ficha-intervenciones-table">
                                    <thead>
                                      <tr>
                                        <th style={{ width: '120px' }}>Fecha</th>
                                        <th style={{ width: '140px' }}>Tipo</th>
                                        <th style={{ width: '160px' }}>Técnico</th>
                                        <th>Detalle del trabajo</th>
                                        <th style={{ width: '130px' }}>Estado</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {activoHistorialMantenimiento.map((item, idx) => {
                                        const displayFecha = formatIntervencionFecha(item.fecha_hora)
                                        const tipoBadgeClass = getTipoIntervencionBadgeClass(item.tipo_intervencion)
                                        const estadoNorm = (item.estado_final || '').toLowerCase().replace(/\s+/g, '')
                                        let estadoClase = 'badge-estado-operativo'
                                        let dotColor = '#10b981'
                                        if (estadoNorm.includes('temporal')) {
                                          estadoClase = 'badge-estado-temporal'
                                          dotColor = '#d97706'
                                        } else if (estadoNorm.includes('pendiente')) {
                                          estadoClase = 'badge-estado-pendiente'
                                          dotColor = '#2563eb'
                                        } else if (estadoNorm.includes('fuera') || estadoNorm.includes('servicio')) {
                                          estadoClase = 'badge-estado-fueraservicio'
                                          dotColor = '#dc2626'
                                        }

                                        return (
                                          <tr key={item.id || idx}>
                                            <td style={{ whiteSpace: 'nowrap' }}>{displayFecha}</td>
                                            <td>
                                              <div>
                                                <span className={`badge ${tipoBadgeClass}`}>
                                                  {item.tipo_intervencion || 'Otro'}
                                                </span>
                                                {item.es_falla && (
                                                  <div>
                                                    <span className="badge-tag-falla-subtle" title={item.tipo_falla || 'Falla'}>
                                                      ⚠ Falla
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                            <td>
                                              <strong>{item.tecnico || '—'}</strong>
                                            </td>
                                            <td style={{ lineHeight: '1.45', wordBreak: 'break-word' }}>
                                              {item.trabajo_realizado || '—'}
                                            </td>
                                            <td>
                                              <span
                                                className={`badge ${estadoClase}`}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                              >
                                                <span
                                                  style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    backgroundColor: dotColor,
                                                    display: 'inline-block',
                                                    flexShrink: 0
                                                  }}
                                                />
                                                {item.estado_final || 'Operativo'}
                                              </span>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {/* TAB 3: HISTORIAL DE FALLAS */}
                          {activoDetailTab === 'fallas' && (
                            <div className="ficha-placeholder-card">
                              <div className="ficha-placeholder-header">
                                <div>
                                  <h3 className="ficha-placeholder-title">Historial de Fallas</h3>
                                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                                    Trazabilidad relacional estricta: <code>bitacora_mantenimiento.equipo_id → equipo.id</code>
                                  </p>
                                </div>
                                <span className="tree-badge-rule">Supabase Confiabilidad</span>
                              </div>

                              {/* INDICADORES DEL HISTORIAL (public.vista_ficha_activo) */}
                              <div className="ficha-metrics-grid">
                                <div className="ficha-metric-card">
                                  <span className="ficha-metric-val" style={{ color: '#ef4444' }}>
                                    {activoFichaMetrics?.total_fallas !== undefined && activoFichaMetrics?.total_fallas !== null
                                      ? activoFichaMetrics.total_fallas
                                      : activoHistorialFallas.length}
                                  </span>
                                  <span className="ficha-metric-lbl">Total de Fallas</span>
                                </div>
                                <div className="ficha-metric-card">
                                  <span className="ficha-metric-val" style={{ color: '#2563eb', fontSize: '1.05rem' }}>
                                    {activoFichaMetrics?.fecha_ultima_falla
                                      ? new Date(activoFichaMetrics.fecha_ultima_falla).toLocaleDateString('es-CL')
                                      : activoHistorialFallas.length > 0 && (activoHistorialFallas[0].fecha || activoHistorialFallas[0].fecha_hora)
                                      ? new Date(activoHistorialFallas[0].fecha || activoHistorialFallas[0].fecha_hora).toLocaleDateString('es-CL')
                                      : '—'}
                                  </span>
                                  <span className="ficha-metric-lbl">Fecha Última Falla</span>
                                </div>
                                <div className="ficha-metric-card">
                                  <span className="ficha-metric-val" style={{ color: '#f59e0b' }}>
                                    {activoFichaMetrics?.fallas_ultimos_30_dias !== undefined && activoFichaMetrics?.fallas_ultimos_30_dias !== null
                                      ? activoFichaMetrics.fallas_ultimos_30_dias
                                      : '0'}
                                  </span>
                                  <span className="ficha-metric-lbl">Fallas Últimos 30 Días</span>
                                </div>
                              </div>

                              {/* TABLA HISTORIAL DE FALLAS (public.vista_historial_fallas_activo) */}
                              {loadingFichaFallas ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                  <span className="spinner"></span>
                                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Consultando historial de fallas en Supabase...</p>
                                </div>
                              ) : activoHistorialFallas.length === 0 ? (
                                <div className="empty-state-callout">
                                  <p className="empty-state-text" style={{ margin: 0, fontWeight: 500 }}>
                                    Este activo aún no tiene fallas registradas.
                                  </p>
                                </div>
                              ) : (
                                <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                                  <table className="ficha-fallas-table">
                                    <thead>
                                      <tr>
                                        <th>Fecha</th>
                                        <th>Técnico</th>
                                        <th>Tipo de falla</th>
                                        <th>Motivo / descripción</th>
                                        <th>Trabajo realizado</th>
                                        <th>Estado final</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {activoHistorialFallas.map((item, idx) => {
                                        const rawFecha = item.fecha || item.fecha_hora || item.created_at
                                        const displayFecha = rawFecha
                                          ? new Date(rawFecha).toLocaleDateString('es-CL')
                                          : '—'
                                        const tecnicoVal = item.tecnico || item.nombre_tecnico || '—'
                                        const tipoFallaVal = item.tipo_falla || item.tipo_intervencion || 'Falla'
                                        const motivoVal = item.motivo || item.descripcion || item.falla_motivo || item.motivo_falla || '—'
                                        const trabajoVal = item.trabajo_realizado || item.detalle || '—'
                                        const estadoFinalVal = item.estado_final || item.estado || '—'

                                        return (
                                          <tr key={item.id || idx}>
                                            <td style={{ whiteSpace: 'nowrap' }}>{displayFecha}</td>
                                            <td><strong>{tecnicoVal}</strong></td>
                                            <td>
                                              <span className="badge-tag-fallas">{tipoFallaVal}</span>
                                            </td>
                                            <td style={{ maxWidth: '240px', lineHeight: 1.4 }}>{motivoVal}</td>
                                            <td style={{ maxWidth: '280px', lineHeight: 1.4 }}>{trabajoVal}</td>
                                            <td>
                                              <span className="badge-tag tag-matched">{estadoFinalVal}</span>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {/* TAB 4: REPUESTOS ASOCIADOS */}
                          {activoDetailTab === 'repuestos' && (
                            <div className="ficha-placeholder-card">
                              <div className="ficha-placeholder-header">
                                <h3 className="ficha-placeholder-title">Repuestos Asociados</h3>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={() => setActiveView('repuestos')}
                                >
                                  Ir al Catálogo de Repuestos →
                                </button>
                              </div>
                              <div className="empty-state-callout" style={{ marginTop: '1rem' }}>
                                <p className="empty-state-text" style={{ margin: 0, fontWeight: 500 }}>
                                  No existen repuestos asociados a este activo.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* TAB 5: DOCUMENTACIÓN */}
                          {activoDetailTab === 'documentacion' && (
                            <div className="ficha-placeholder-card">
                              <div className="ficha-placeholder-header">
                                <h3 className="ficha-placeholder-title">Documentación Técnica del Activo</h3>
                                <span className="btn-tag-soon">Modo Lectura</span>
                              </div>
                              <div className="ficha-doc-list">
                                <div className="ficha-doc-item">
                                  <div className="ficha-doc-name">
                                    <span>📕</span>
                                    <span>Manual_Operacion_Mantenimiento_{selectedActivo.codigo || selectedActivo.nombre}.pdf</span>
                                  </div>
                                  <span className="ficha-doc-size">18.4 MB • PDF</span>
                                </div>
                                <div className="ficha-doc-item">
                                  <div className="ficha-doc-name">
                                    <span>📐</span>
                                    <span>Esquema_Tecnico_{selectedActivo.codigo || selectedActivo.nombre}.pdf</span>
                                  </div>
                                  <span className="ficha-doc-size">8.2 MB • PDF</span>
                                </div>
                                <div className="ficha-doc-item">
                                  <div className="ficha-doc-name">
                                    <span>🛡️</span>
                                    <span>Certificado_Puesta_en_Marcha_Garantia.pdf</span>
                                  </div>
                                  <span className="ficha-doc-size">1.5 MB • PDF</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="state-card" style={{ padding: '3rem' }}>
                        <h3 className="state-title">Seleccione un activo</h3>
                        <p className="state-desc">Seleccione un equipo o componente en el árbol jerárquico de la izquierda para ver su ficha completa.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* VISTA PLACEHOLDER: Compras */}
        {activeView === 'compras' && (
          <>
            <header className="content-header">
              <div className="header-info">
                <h1 className="page-title">Compras</h1>
                <p className="page-subtitle">
                  Solicitudes, cotizaciones, órdenes de compra, proveedores y seguimiento de adquisiciones.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveView('home')}
              >
                ← Volver al Inicio
              </button>
            </header>

            <section className="content-body">
              <div className="placeholder-container">
                <div className="placeholder-hero-card">
                  <div className="placeholder-icon-badge icon-compras">🛒</div>
                  <span className="placeholder-status-tag">Módulo en desarrollo</span>
                  <h2 className="placeholder-title">Gestión de Compras y Proveedores</h2>
                  <p className="placeholder-description">
                    Este módulo centralizará el ciclo de adquisiciones para repuestos críticos, insumos operativos y servicios externos de mantenimiento, con trazabilidad de compras y recepción en bodega.
                  </p>

                  <div className="placeholder-feature-grid">
                    <div className="placeholder-feature-box">
                      <div className="feat-icon">📑</div>
                      <h4>Solicitudes de Compra (SC)</h4>
                      <p>Generación de requerimientos cuando el inventario cae bajo el stock mínimo.</p>
                    </div>
                    <div className="placeholder-feature-box">
                      <div className="feat-icon">🏷️</div>
                      <h4>Cotizaciones y Proveedores</h4>
                      <p>Comparación de precios, tiempos de entrega y catálogo de proveedores evaluados.</p>
                    </div>
                    <div className="placeholder-feature-box">
                      <div className="feat-icon">💳</div>
                      <h4>Órdenes de Compra (OC)</h4>
                      <p>Emisión formal de OCs y aprobación según umbrales de presupuesto.</p>
                    </div>
                    <div className="placeholder-feature-box">
                      <div className="feat-icon">📦</div>
                      <h4>Recepción en Bodega</h4>
                      <p>Ingreso automático al inventario con actualización de stock valorizado.</p>
                    </div>
                  </div>

                  <div className="placeholder-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setActiveView('dashboard')}
                    >
                      Ver Inventario General
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setActiveView('home')}
                    >
                      Volver al Inicio
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* VISTA 1: Dashboard de Mantenimiento (Estilo Fracttal) */}
        {activeView === 'dashboard' && (
          <section className="content-body" style={{ padding: '0.25rem 0' }}>
            <DashboardMantenimiento
              bitacoraList={bitacoraList}
              ordenesTrabajoList={ordenesTrabajoList}
              onNavigateToOrdenesTrabajo={() => setActiveView('ordenes-trabajo')}
              equiposList={equiposList}
              session={session}
              loading={loadingBitacora}
              onRefreshData={() => {
                fetchBitacora()
                fetchEquipos()
              }}
              onNavigateToBitacora={handleDashboardNavigateToBitacora}
              onNavigateToActivo={handleDashboardNavigateToActivo}
            />
          </section>
        )}

        {/* VISTA 1b: Dashboard de Inventario */}
        {activeView === 'dashboard-inventario' && (
          <>
            <header className="content-header">
              <div className="header-info">
                <h1 className="page-title">Dashboard de Inventario</h1>
                <p className="page-subtitle">Indicadores clave y consumo mensual de repuestos.</p>
              </div>
            </header>

            <section className="content-body">
              {loadingDashboard && (
                <div className="state-card">
                  <h3 className="state-title">Cargando dashboard...</h3>
                  <p className="state-desc">Consultando indicadores en Supabase.</p>
                </div>
              )}

              {dashboardError && (
                <div className="alert-error" role="alert">
                  <span>⚠</span>
                  <span>{dashboardError}</span>
                </div>
              )}

              {!loadingDashboard && !dashboardError && (
                <>
                  {/* Tarjetas KPI */}
                  <div className="kpi-grid">
                    <div className="kpi-card">
                      <div className="kpi-header">
                        <span className="kpi-title">Valor Total del Inventario</span>
                        <span className="kpi-icon">💰</span>
                      </div>
                      <div className="kpi-value">
                        {formatCLP(dashboardData?.valor_total_inventario)}
                      </div>
                      <div className="kpi-footer">
                        <span>Valorización total en bodega</span>
                      </div>
                    </div>

                    <div className="kpi-card">
                      <div className="kpi-header">
                        <span className="kpi-title">Cantidad de Repuestos</span>
                        <span className="kpi-icon">📦</span>
                      </div>
                      <div className="kpi-value">
                        {dashboardData?.cantidad_repuestos ?? 0}
                      </div>
                      <div className="kpi-footer">
                        <span>Ítems únicos en catálogo</span>
                      </div>
                    </div>

                    <div className="kpi-card">
                      <div className="kpi-header">
                        <span className="kpi-title">Repuestos Bajo Mínimo</span>
                        <span className="kpi-icon">⚠️</span>
                      </div>
                      <div className={`kpi-value ${(dashboardData?.repuestos_bajo_minimo || 0) > 0 ? 'text-warning' : ''}`}>
                        {dashboardData?.repuestos_bajo_minimo ?? 0}
                      </div>
                      <div className="kpi-footer">
                        {(dashboardData?.repuestos_bajo_minimo || 0) > 0 ? (
                          <span className="kpi-alert-badge">Requiere reorden de compra</span>
                        ) : (
                          <span className="kpi-ok-badge">Niveles de stock óptimos</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Gráfico Mensual de Retiros */}
                  <div className="chart-card">
                    <div className="chart-header">
                      <h2 className="chart-title">Retiros Mensuales Valorizados</h2>
                      <p className="chart-subtitle">Histórico mensual de repuestos consumidos en mantenimiento (CLP).</p>
                    </div>

                    <div className="chart-body">
                      {retirosData.length === 0 ? (
                        <div className="state-card" style={{ margin: '0 auto', maxWidth: '100%' }}>
                          <h3 className="state-title">No hay retiros registrados</h3>
                          <p className="state-desc">Aún no se han generado movimientos de salida en el período.</p>
                        </div>
                      ) : (
                        <div className="bar-chart-container">
                          {retirosData.map((item, idx) => {
                            const valor = Number(item.valor_retiros) || 0
                            const alturaPorcentaje = Math.max((valor / maxRetiroValor) * 100, 4)

                            return (
                              <div key={item.mes || idx} className="bar-column-wrapper">
                                <div className="bar-track">
                                  <div
                                    className="bar-fill"
                                    style={{ height: `${alturaPorcentaje}%` }}
                                    title={`${item.mes}: ${formatCLP(valor)}`}
                                  >
                                    <span className="bar-tooltip">{formatCLP(valor)}</span>
                                  </div>
                                </div>
                                <span className="bar-amount-label">{formatCLP(valor)}</span>
                                <span className="bar-month-label">{item.mes}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </section>
          </>
        )}

        {/* VISTA 2: Lista de Repuestos */}
        {activeView === 'repuestos' && (
          <>
            <header className="content-header">
              <div className="header-info">
                <h1 className="page-title">Repuestos</h1>
                <p className="page-subtitle">Gestión del maestro de repuestos de mantenimiento.</p>
              </div>
              
              {session && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setFormData(INITIAL_FORM_STATE)
                    setErrors({})
                    setSuccessMessage('')
                    setServerError('')
                    setIsSaved(false)
                    setActiveView('nuevo-repuesto')
                  }}
                >
                  + Nuevo Repuesto
                </button>
              )}
            </header>

            <section className="content-body">
              {loadingList && (
                <div className="state-card">
                  <h3 className="state-title">Cargando inventario...</h3>
                  <p className="state-desc">Consultando registros en Supabase.</p>
                </div>
              )}

              {listError && (
                <div className="alert-error" role="alert">
                  <span>⚠</span>
                  <span>{listError}</span>
                </div>
              )}

              {!loadingList && !listError && repuestosList.length === 0 && (
                <div className="state-card">
                  <h3 className="state-title">No hay repuestos registrados</h3>
                  <p className="state-desc">
                    {session
                      ? 'Comience registrando uno nuevo con el botón superior.'
                      : 'El catálogo de repuestos se encuentra vacío actualmente.'}
                  </p>
                </div>
              )}

              {!loadingList && !listError && repuestosList.length > 0 && (
                <div className="table-card">
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Repuesto</th>
                          <th>Categoría</th>
                          <th className="text-right">Stock actual</th>
                          <th className="text-right">Stock mínimo</th>
                          <th className="text-right">Stock máximo</th>
                          <th className="text-center">Unidad</th>
                          <th className="text-center">Criticidad</th>
                          <th className="text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {repuestosList.map((item, index) => {
                          const criticidadClase = `badge-criticidad-${(item.criticidad || '').toLowerCase()}`
                          const estadoClase = `badge-estado-${(item.estado || '').toLowerCase()}`

                          return (
                            <tr key={item.id || item.codigo || index}>
                              <td className="font-mono">{item.codigo}</td>
                              <td><strong>{item.nombre || item.repuesto}</strong></td>
                              <td>{item.categoria}</td>
                              <td className="text-right font-mono">
                                <strong>{item.stock_actual ?? 0}</strong>
                              </td>
                              <td className="text-right font-mono">
                                {item.stock_minimo ?? 0}
                              </td>
                              <td className="text-right font-mono">
                                {item.stock_maximo !== null && item.stock_maximo !== undefined
                                  ? item.stock_maximo
                                  : '-'}
                              </td>
                              <td className="text-center">{item.unidad_medida || item.unidad || '-'}</td>
                              <td className="text-center">
                                <span className={`badge ${criticidadClase}`}>
                                  {item.criticidad}
                                </span>
                              </td>
                              <td className="text-center">
                                <span className={`badge ${estadoClase}`}>
                                  {item.estado}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {/* VISTA 3: Retiro de Repuestos (Buscador con Autocompletado) */}
        {activeView === 'retiro' && session && (
          <>
            <header className="content-header">
              <div className="header-info">
                <h1 className="page-title">Retiro de Repuestos</h1>
                <p className="page-subtitle">Registro de salida directa de inventario de repuestos.</p>
              </div>
            </header>

            <section className="content-body">
              <div className="form-card form-card-wide">
                <form onSubmit={handleRetiroSubmit} noValidate>
                  <div className="form-content">
                    
                    {/* Mensaje de éxito */}
                    {retiroSuccess && (
                      <div className="alert-success" role="status">
                        <span>✓</span>
                        <span>{retiroSuccess}</span>
                      </div>
                    )}

                    {/* Mensaje de error de servidor */}
                    {retiroServerError && (
                      <div className="alert-error" role="alert">
                        <span>⚠</span>
                        <span>{retiroServerError}</span>
                      </div>
                    )}

                    {/* Buscador de repuesto con autocompletado */}
                    <div className="form-section">
                      <h3 className="form-section-title">Selección de repuesto</h3>
                      <div className="form-grid single-col">
                        <div className="form-group" ref={dropdownRef}>
                          <label className="form-label" htmlFor="search_repuesto">
                            Buscar repuesto a retirar <span className="required-mark">*</span>
                          </label>
                          <div className="autocomplete-container">
                            <div className="autocomplete-input-wrapper">
                              <input
                                type="text"
                                id="search_repuesto"
                                className={`form-input ${retiroErrors.repuesto ? 'input-error' : ''}`}
                                placeholder="Buscar por código, nombre, fabricante o número de parte..."
                                value={searchQuery}
                                onChange={(e) => {
                                  setSearchQuery(e.target.value)
                                  setIsDropdownOpen(true)
                                  if (retiroRepuestoId && e.target.value !== `[${selectedRetiroRepuesto?.codigo}] ${selectedRetiroRepuesto?.nombre || selectedRetiroRepuesto?.repuesto}`) {
                                    setRetiroRepuestoId('')
                                  }
                                  if (retiroErrors.repuesto) {
                                    setRetiroErrors((prev) => ({ ...prev, repuesto: null }))
                                  }
                                  if (retiroSuccess) setRetiroSuccess('')
                                  if (retiroServerError) setRetiroServerError('')
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                                disabled={retiroLoading}
                                autoComplete="off"
                              />
                              {searchQuery && (
                                <button
                                  type="button"
                                  className="autocomplete-clear-btn"
                                  onClick={handleClearSelection}
                                  title="Limpiar búsqueda"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {/* Menú desplegable con únicamente [Código] Nombre del repuesto */}
                            {isDropdownOpen && (
                              <div className="autocomplete-dropdown">
                                {filteredRepuestos.length === 0 ? (
                                  <div className="autocomplete-no-results">
                                    No se encontraron repuestos
                                  </div>
                                ) : (
                                  filteredRepuestos.map((item) => (
                                    <div
                                      key={item.id || item.codigo}
                                      className="autocomplete-item"
                                      onClick={() => handleSelectRepuesto(item)}
                                    >
                                      <span className="autocomplete-cell-code">[{item.codigo}]</span>
                                      <span className="autocomplete-cell-name">{item.nombre || item.repuesto}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                          {retiroErrors.repuesto && (
                            <span className="error-message">{retiroErrors.repuesto}</span>
                          )}
                        </div>

                        {/* Ficha técnica completa del repuesto seleccionado */}
                        {selectedRetiroRepuesto && (
                          <div className="repuesto-info-box">
                            <div className="repuesto-info-item">
                              <span className="repuesto-info-label">Código</span>
                              <span className="repuesto-info-value font-mono">{selectedRetiroRepuesto.codigo}</span>
                            </div>
                            <div className="repuesto-info-item">
                              <span className="repuesto-info-label">Nombre del repuesto</span>
                              <span className="repuesto-info-value">{selectedRetiroRepuesto.nombre || selectedRetiroRepuesto.repuesto}</span>
                            </div>
                            <div className="repuesto-info-item">
                              <span className="repuesto-info-label">Stock disponible</span>
                              <span className={`repuesto-stock-highlight ${(selectedRetiroRepuesto.stock_actual ?? 0) <= 0 ? 'repuesto-stock-zero' : ''}`}>
                                {selectedRetiroRepuesto.stock_actual ?? 0} {selectedRetiroRepuesto.unidad_medida || selectedRetiroRepuesto.unidad || 'UND'}
                                {(selectedRetiroRepuesto.stock_actual ?? 0) <= 0 && ' (Sin stock)'}
                              </span>
                            </div>
                            <div className="repuesto-info-item">
                              <span className="repuesto-info-label">Fabricante</span>
                              <span className="repuesto-info-value">{selectedRetiroRepuesto.fabricante || 'No especificado'}</span>
                            </div>
                            <div className="repuesto-info-item">
                              <span className="repuesto-info-label">Número de parte</span>
                              <span className="repuesto-info-value">{selectedRetiroRepuesto.numero_parte || 'No especificado'}</span>
                            </div>
                            <div className="repuesto-info-item">
                              <span className="repuesto-info-label">Ubicación en bodega</span>
                              <span className="repuesto-info-value">{selectedRetiroRepuesto.ubicacion_repuesto || 'No asignada'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Datos del retiro */}
                    <div className="form-section">
                      <h3 className="form-section-title">Datos del retiro</h3>
                      <div className="form-grid single-col">
                        <div className="form-group">
                          <label className="form-label" htmlFor="retiro_cantidad">
                            Cantidad a retirar <span className="required-mark">*</span>
                          </label>
                          <input
                            type="number"
                            id="retiro_cantidad"
                            className={`form-input ${retiroErrors.cantidad ? 'input-error' : ''}`}
                            min="1"
                            step="any"
                            placeholder="Ej. 2"
                            value={retiroCantidad}
                            onChange={(e) => {
                              setRetiroCantidad(e.target.value)
                              if (retiroErrors.cantidad) {
                                setRetiroErrors((prev) => ({ ...prev, cantidad: null }))
                              }
                              if (retiroSuccess) setRetiroSuccess('')
                              if (retiroServerError) setRetiroServerError('')
                            }}
                            disabled={retiroLoading}
                          />
                          {retiroErrors.cantidad && (
                            <span className="error-message">{retiroErrors.cantidad}</span>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="retiro_observaciones">
                            Observaciones / Motivo del retiro
                          </label>
                          <textarea
                            id="retiro_observaciones"
                            className="form-textarea"
                            placeholder="Ej. Cambio de repuesto por desgaste en mantenimiento preventivo (opcional)"
                            value={retiroObservaciones}
                            onChange={(e) => setRetiroObservaciones(e.target.value)}
                            disabled={retiroLoading}
                          />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Acciones */}
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setActiveView('repuestos')}
                      disabled={retiroLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={retiroLoading}
                    >
                      {retiroLoading ? 'Registrando retiro...' : 'Registrar Retiro'}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </>
        )}

        {/* VISTA 4: Inicio de Sesión */}
        {activeView === 'login' && (
          <>
            <header className="content-header">
              <div className="header-info">
                <h1 className="page-title">Iniciar Sesión</h1>
                <p className="page-subtitle">Acceso de administrador para gestión de mantenimiento.</p>
              </div>
            </header>

            <section className="content-body">
              <div className="form-card login-card">
                <form onSubmit={handleLoginSubmit} noValidate>
                  <div className="form-content">
                    {loginError && (
                      <div className="alert-error" role="alert">
                        <span>⚠</span>
                        <span>{loginError}</span>
                      </div>
                    )}

                    <div className="form-section">
                      <div className="form-grid single-col">
                        <div className="form-group">
                          <label className="form-label" htmlFor="login_email">
                            Correo electrónico
                          </label>
                          <input
                            type="email"
                            id="login_email"
                            className="form-input"
                            placeholder="admin@empresa.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            disabled={loginLoading}
                            autoFocus
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="login_password">
                            Contraseña
                          </label>
                          <input
                            type="password"
                            id="login_password"
                            className="form-input"
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            disabled={loginLoading}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setActiveView('home')}
                      disabled={loginLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={loginLoading}
                    >
                      {loginLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </>
        )}

        {/* VISTA 5: Formulario Nuevo Repuesto */}
        {activeView === 'nuevo-repuesto' && session && (
          <>
            <header className="content-header">
              <div className="header-info">
                <h1 className="page-title">Nuevo Repuesto</h1>
                <p className="page-subtitle">Ingrese los datos para registrar un nuevo repuesto en el sistema.</p>
              </div>
            </header>

            <section className="content-body">
              <div className="form-card">
                <form onSubmit={handleSubmit} noValidate>
                  <div className="form-content">
                    
                    {/* Mensaje de éxito */}
                    {successMessage && (
                      <div className="alert-success" role="status">
                        <span>✓</span>
                        <span>{successMessage}</span>
                      </div>
                    )}

                    {/* Mensaje de error de servidor */}
                    {serverError && (
                      <div className="alert-error" role="alert">
                        <span>⚠</span>
                        <span>{serverError}</span>
                      </div>
                    )}

                    {/* Sección 1: Datos del repuesto */}
                    <div className="form-section">
                      <h3 className="form-section-title">Datos del repuesto</h3>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label" htmlFor="codigo">
                            Código <span className="required-mark">*</span>
                          </label>
                          <input
                            type="text"
                            id="codigo"
                            className={`form-input ${errors.codigo ? 'input-error' : ''}`}
                            placeholder="Ej. REP-MEC-001"
                            value={formData.codigo}
                            onChange={handleInputChange}
                            disabled={loading || isSaved}
                          />
                          {errors.codigo && <span className="error-message">{errors.codigo}</span>}
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="nombre">
                            Nombre <span className="required-mark">*</span>
                          </label>
                          <input
                            type="text"
                            id="nombre"
                            className={`form-input ${errors.nombre ? 'input-error' : ''}`}
                            placeholder="Ej. Rodamiento 6204-2RSH"
                            value={formData.nombre}
                            onChange={handleInputChange}
                            disabled={loading || isSaved}
                          />
                          {errors.nombre && <span className="error-message">{errors.nombre}</span>}
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="categoria">
                            Categoría <span className="required-mark">*</span>
                          </label>
                          <select
                            id="categoria"
                            className={`form-select ${errors.categoria ? 'input-error' : ''}`}
                            value={formData.categoria}
                            onChange={handleInputChange}
                            disabled={loading || isSaved}
                          >
                            <option value="Mecánica">Mecánica</option>
                            <option value="Eléctrica">Eléctrica</option>
                            <option value="Hidráulica">Hidráulica</option>
                            <option value="Neumática">Neumática</option>
                            <option value="Filtros">Filtros</option>
                            <option value="Lubricantes">Lubricantes</option>
                            <option value="Instrumentación">Instrumentación</option>
                          </select>
                          {errors.categoria && <span className="error-message">{errors.categoria}</span>}
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="fabricante">
                            Fabricante
                          </label>
                          <input
                            type="text"
                            id="fabricante"
                            className="form-input"
                            placeholder="Ej. SKF"
                            value={formData.fabricante}
                            onChange={handleInputChange}
                            disabled={loading || isSaved}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="numero_parte">
                            Número de parte
                          </label>
                          <input
                            type="text"
                            id="numero_parte"
                            className="form-input"
                            placeholder="Ej. 6204-2RSH/C3"
                            value={formData.numero_parte}
                            onChange={handleInputChange}
                            disabled={loading || isSaved}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="unidad_medida">
                            Unidad de medida <span className="required-mark">*</span>
                          </label>
                          <select
                            id="unidad_medida"
                            className={`form-select ${errors.unidad_medida ? 'input-error' : ''}`}
                            value={formData.unidad_medida}
                            onChange={handleInputChange}
                            disabled={loading || isSaved}
                          >
                            <option value="UND">UND</option>
                            <option value="MTR">MTR</option>
                            <option value="LTR">LTR</option>
                            <option value="KG">KG</option>
                            <option value="JGO">JGO</option>
                          </select>
                          {errors.unidad_medida && <span className="error-message">{errors.unidad_medida}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Sección 2: Datos de compra */}
                    <div className="form-section">
                      <h3 className="form-section-title">Datos de compra</h3>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label" htmlFor="precio_compra">
                            Precio de compra
                          </label>
                          <input
                            type="number"
                            id="precio_compra"
                            className={`form-input ${errors.precio_compra ? 'input-error' : ''}`}
                            min="0"
                            step="any"
                            placeholder="Ej. 14500 (opcional)"
                            value={formData.precio_compra}
                            onChange={handleInputChange}
                            disabled={loading || isSaved}
                          />
                          {errors.precio_compra && <span className="error-message">{errors.precio_compra}</span>}
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="moneda_compra">
                            Moneda de compra {formData.precio_compra !== '' && <span className="required-mark">*</span>}
                          </label>
                          <select
                            id="moneda_compra"
                            className={`form-select ${errors.moneda_compra ? 'input-error' : ''}`}
                            value={formData.moneda_compra}
                            onChange={handleInputChange}
                            disabled={loading || isSaved}
                          >
                            <option value="CLP">CLP</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                          </select>
                          {errors.moneda_compra && <span className="error-message">{errors.moneda_compra}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Sección 3: Control de inventario */}
                    <div className="form-section">
                      <h3 className="form-section-title">Control de inventario</h3>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label" htmlFor="stock_minimo">
                            Stock mínimo <span className="required-mark">*</span>
                          </label>
                          <input
                            type="number"
                            id="stock_minimo"
                            className={`form-input ${errors.stock_minimo ? 'input-error' : ''}`}
                            min="0"
                            placeholder="Ej. 5"
                            value={formData.stock_minimo}
                            onChange={handleInputChange}
                            disabled={loading || isSaved}
                          />
                          {errors.stock_minimo && <span className="error-message">{errors.stock_minimo}</span>}
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="stock_maximo">
                            Stock máximo
                          </label>
                          <input
                            type="number"
                            id="stock_maximo"
                            className={`form-input ${errors.stock_maximo ? 'input-error' : ''}`}
                            min="0"
                            placeholder="Ej. 20"
                            value={formData.stock_maximo}
                            onChange={handleInputChange}
                            disabled={loading || isSaved}
                          />
                          {errors.stock_maximo && <span className="error-message">{errors.stock_maximo}</span>}
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="ubicacion_repuesto">
                            Ubicación del repuesto
                          </label>
                          <input
                            type="text"
                            id="ubicacion_repuesto"
                            className="form-input"
                            placeholder="Ej. Estante A - Gaveta 3"
                            value={formData.ubicacion_repuesto}
                            onChange={handleInputChange}
                            disabled={loading || isSaved}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="criticidad">
                            Criticidad <span className="required-mark">*</span>
                          </label>
                          <select
                            id="criticidad"
                            className={`form-select ${errors.criticidad ? 'input-error' : ''}`}
                            value={formData.criticidad}
                            onChange={handleInputChange}
                            disabled={loading || isSaved}
                          >
                            <option value="Alta">Alta</option>
                            <option value="Media">Media</option>
                            <option value="Baja">Baja</option>
                          </select>
                          {errors.criticidad && <span className="error-message">{errors.criticidad}</span>}
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="estado">
                            Estado <span className="required-mark">*</span>
                          </label>
                          <select
                            id="estado"
                            className={`form-select ${errors.estado ? 'input-error' : ''}`}
                            value={formData.estado}
                            onChange={handleInputChange}
                            disabled={loading || isSaved}
                          >
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                            <option value="Obsoleto">Obsoleto</option>
                            <option value="Descontinuado">Descontinuado</option>
                          </select>
                          {errors.estado && <span className="error-message">{errors.estado}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Sección 4: Carga inicial */}
                    <div className="form-section">
                      <h3 className="form-section-title">Carga inicial</h3>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label" htmlFor="stock_inicial">
                            Stock inicial
                          </label>
                          <input
                            type="number"
                            id="stock_inicial"
                            className={`form-input ${errors.stock_inicial ? 'input-error' : ''}`}
                            min="0"
                            placeholder="Ej. 10 (opcional)"
                            value={formData.stock_inicial}
                            onChange={handleInputChange}
                            disabled={loading || isSaved}
                          />
                          {errors.stock_inicial && <span className="error-message">{errors.stock_inicial}</span>}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Acciones */}
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCancel}
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={loading || isSaved}
                    >
                      {loading ? 'Guardando...' : isSaved ? 'Guardado ✓' : 'Guardar Repuesto'}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </>
        )}
        {/* VISTA 6: Bitácora de Mantenimiento */}
        {activeView === 'bitacora' && (
          <>
            <header className="content-header">
              <div className="header-info">
                <h1 className="page-title">Bitácora de Mantenimiento</h1>
                <p className="page-subtitle">Historial de intervenciones técnicas, reparaciones y fallas operacionales.</p>
              </div>

              {session && (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setImportRows([])
                      setImportSummary(null)
                      setImportFileName('')
                      setImportError('')
                      setImportActiveTab('todos')
                      setIsImportModalOpen(true)
                    }}
                  >
                    📊 Importar Excel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleOpenNuevaIntervencion}
                  >
                    + Nueva intervención
                  </button>
                </div>
              )}
            </header>

            <section className="content-body">
              {/* Mensajes de notificación */}
              {bitacoraSuccessMessage && (
                <div className="alert-success" role="status">
                  <span>✓</span>
                  <span>{bitacoraSuccessMessage}</span>
                  <button
                    type="button"
                    onClick={() => setBitacoraSuccessMessage('')}
                    style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {bitacoraError && (
                <div className="alert-error" role="alert">
                  <span>⚠</span>
                  <span>{bitacoraError}</span>
                </div>
              )}

              {/* Si no hay sesión iniciada, mostrar bloqueo seguro */}
              {!session ? (
                <div className="state-card">
                  <h3 className="state-title">Acceso protegido</h3>
                  <p className="state-desc" style={{ marginBottom: '1.5rem' }}>
                    Debe iniciar sesión como administrador o técnico para consultar y registrar intervenciones en la Bitácora de Mantenimiento.
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setLoginError('')
                      setActiveView('login')
                    }}
                  >
                    Iniciar sesión
                  </button>
                </div>
              ) : (
                <>
                  {/* Navegación entre Intervenciones Registradas y Pendientes de Validación */}
                  <div className="bitacora-subtabs-nav">
                    <button
                      type="button"
                      className={`bitacora-subtab-btn ${bitacoraSubTab === 'registradas' ? 'active' : ''}`}
                      onClick={() => setBitacoraSubTab('registradas')}
                    >
                      <span>📋</span> Intervenciones Registradas
                    </button>
                    <button
                      type="button"
                      className={`bitacora-subtab-btn ${bitacoraSubTab === 'pendientes' ? 'active' : ''}`}
                      onClick={() => {
                        setBitacoraSubTab('pendientes')
                        fetchPendientesValidacion()
                      }}
                    >
                      <span>⏳</span> Validar importaciones
                      {pendientesValidacionList.filter(p => (p.estado || 'Pendiente') === 'Pendiente').length > 0 && (
                        <span className="badge-pendientes-count">
                          {pendientesValidacionList.filter(p => (p.estado || 'Pendiente') === 'Pendiente').length}
                        </span>
                      )}
                    </button>
                  </div>

                  {bitacoraSubTab === 'registradas' && (
                    <>
                      {/* Tarjeta de Filtros */}
                      <div className="filters-card">
                    <div className="filters-header">
                      <span className="filters-title">
                        <span>🔍</span> Filtros y Búsqueda
                      </span>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          className="btn-reset-filters"
                          onClick={handleResetFilters}
                        >
                          ✕ Limpiar filtros
                        </button>
                      )}
                    </div>

                    <div className="filters-grid">
                      <div className="filter-item">
                        <label className="filter-label" htmlFor="filter_search">Búsqueda libre</label>
                        <input
                          type="text"
                          id="filter_search"
                          className="filter-input"
                          placeholder="Buscar por técnico, equipo, motivo o trabajo..."
                          value={filterSearch}
                          onChange={(e) => setFilterSearch(e.target.value)}
                        />
                      </div>

                      <div className="filter-item">
                        <label className="filter-label" htmlFor="filter_equipo">Equipo</label>
                        <select
                          id="filter_equipo"
                          className="filter-select"
                          value={filterEquipo}
                          onChange={(e) => setFilterEquipo(e.target.value)}
                        >
                          <option value="">Todos los equipos</option>
                          {equiposList.map((eq) => (
                            <option key={eq.id} value={eq.id}>
                              [{eq.codigo}] {eq.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="filter-item">
                        <label className="filter-label" htmlFor="filter_area">Área</label>
                        <select
                          id="filter_area"
                          className="filter-select"
                          value={filterArea}
                          onChange={(e) => setFilterArea(e.target.value)}
                        >
                          <option value="">Todas las áreas</option>
                          {distinctAreas.map((ar) => (
                            <option key={ar} value={ar}>
                              {ar}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="filter-item">
                        <label className="filter-label" htmlFor="filter_intervencion">Tipo intervención</label>
                        <select
                          id="filter_intervencion"
                          className="filter-select"
                          value={filterTipoIntervencion}
                          onChange={(e) => setFilterTipoIntervencion(e.target.value)}
                        >
                          <option value="">Todos los tipos</option>
                          <option value="Correctiva">Correctiva</option>
                          <option value="Preventiva">Preventiva</option>
                          <option value="Inspección">Inspección</option>
                          <option value="Ajuste">Ajuste</option>
                          <option value="Mejora">Mejora</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>

                      <div className="filter-item">
                        <label className="filter-label" htmlFor="filter_tipo_falla">Tipo de falla</label>
                        <select
                          id="filter_tipo_falla"
                          className="filter-select"
                          value={filterTipoFalla}
                          onChange={(e) => setFilterTipoFalla(e.target.value)}
                        >
                          <option value="">Todas las fallas</option>
                          <option value="Mecánica">Mecánica</option>
                          <option value="Eléctrica / Control">Eléctrica / Control</option>
                          <option value="Neumática">Neumática</option>
                          <option value="Hidráulica / Refrigeración">Hidráulica / Refrigeración</option>
                          <option value="Ajuste / Otros">Ajuste / Otros</option>
                        </select>
                      </div>

                      <div className="filter-item">
                        <label className="filter-label" htmlFor="filter_es_falla">¿Es falla?</label>
                        <select
                          id="filter_es_falla"
                          className="filter-select"
                          value={filterEsFalla}
                          onChange={(e) => setFilterEsFalla(e.target.value)}
                        >
                          <option value="todos">Todos los registros</option>
                          <option value="si">Solo Fallas (es_falla = Sí)</option>
                          <option value="no">Sin Falla (Intervenciones)</option>
                        </select>
                      </div>

                      <div className="filter-item">
                        <label className="filter-label" htmlFor="filter_desde">Fecha Desde</label>
                        <input
                          type="date"
                          id="filter_desde"
                          className="filter-input"
                          value={filterFechaDesde}
                          onChange={(e) => setFilterFechaDesde(e.target.value)}
                        />
                      </div>

                      <div className="filter-item">
                        <label className="filter-label" htmlFor="filter_hasta">Fecha Hasta</label>
                        <input
                          type="date"
                          id="filter_hasta"
                          className="filter-input"
                          value={filterFechaHasta}
                          onChange={(e) => setFilterFechaHasta(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Estado de carga */}
                  {loadingBitacora && (
                    <div className="state-card">
                      <h3 className="state-title">Cargando bitácora...</h3>
                      <p className="state-desc">Consultando intervenciones en Supabase.</p>
                    </div>
                  )}

                  {/* Estado vacío general */}
                  {!loadingBitacora && bitacoraList.length === 0 && (
                    <div className="state-card">
                      <h3 className="state-title">No hay intervenciones registradas</h3>
                      <p className="state-desc" style={{ marginBottom: '1.25rem' }}>
                        La bitácora de mantenimiento se encuentra vacía actualmente.
                      </p>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleOpenNuevaIntervencion}
                      >
                        + Registrar primera intervención
                      </button>
                    </div>
                  )}

                  {/* Estado sin coincidencias de filtro */}
                  {!loadingBitacora && bitacoraList.length > 0 && filteredBitacora.length === 0 && (
                    <div className="state-card">
                      <h3 className="state-title">Sin resultados</h3>
                      <p className="state-desc" style={{ marginBottom: '1.25rem' }}>
                        No se encontraron intervenciones que coincidan con los filtros aplicados.
                      </p>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleResetFilters}
                      >
                        Restablecer filtros
                      </button>
                    </div>
                  )}

                  {/* Tabla de Intervenciones */}
                  {!loadingBitacora && filteredBitacora.length > 0 && (
                    <div className="table-card">
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Fecha / Hora</th>
                              <th>Técnico</th>
                              <th>Equipo</th>
                              <th>Área</th>
                              <th>Tipo</th>
                              <th>¿Falla?</th>
                              <th>Falla / motivo</th>
                              <th>Trabajo realizado</th>
                              <th>Estado final</th>
                              <th>Tipo falla</th>
                              <th className="text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredBitacora.map((item) => {
                              const estadoNorm = (item.estado_final || '').toLowerCase().replace(/\s+/g, '')
                              let estadoClase = 'badge-estado-operativo'
                              if (estadoNorm.includes('temporal')) estadoClase = 'badge-estado-temporal'
                              else if (estadoNorm.includes('pendiente')) estadoClase = 'badge-estado-pendiente'
                              else if (estadoNorm.includes('fuera') || estadoNorm.includes('servicio')) estadoClase = 'badge-estado-fueraservicio'

                              return (
                                <tr key={item.id}>
                                  <td className="font-mono" style={{ whiteSpace: 'nowrap' }}>
                                    {formatDateTime(item.fecha_hora)}
                                  </td>
                                  <td>
                                    <strong>{item.tecnico}</strong>
                                  </td>
                                  <td>
                                    {item.equipo ? (
                                      <div>
                                        <span className="font-mono" style={{ color: 'var(--primary-color)', marginRight: '0.4rem' }}>
                                          [{item.equipo.codigo}]
                                        </span>
                                        <span>{item.equipo.nombre}</span>
                                      </div>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                                    )}
                                  </td>
                                  <td>{item.area || item.equipo?.area || '-'}</td>
                                  <td>
                                    <span className="badge badge-intervencion">
                                      {item.tipo_intervencion || 'Otro'}
                                    </span>
                                  </td>
                                  <td>
                                    {item.es_falla ? (
                                      <span className="badge badge-falla-si">
                                        ⚠ Falla
                                      </span>
                                    ) : (
                                      <span className="badge badge-falla-no">
                                        Intervención
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ maxWidth: '200px' }}>
                                    {item.falla_motivo || '-'}
                                  </td>
                                  <td style={{ maxWidth: '320px', lineHeight: 1.4 }}>
                                    {item.trabajo_realizado}
                                  </td>
                                  <td>
                                    <span className={`badge ${estadoClase}`}>
                                      {item.estado_final || 'Operativo'}
                                    </span>
                                  </td>
                                  <td>
                                    {item.tipo_falla ? (
                                      <span className="font-mono" style={{ fontSize: '0.8rem' }}>
                                        {item.tipo_falla}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td className="text-center">
                                    <button
                                      type="button"
                                      className="btn-action-edit"
                                      onClick={() => handleOpenEditarIntervencion(item)}
                                      title="Editar intervención"
                                    >
                                      ✏ Editar
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* VISTA PENDIENTES DE VALIDACIÓN (public.bitacora_importacion_pendiente) */}
              {bitacoraSubTab === 'pendientes' && (
                <ValidacionPendientesView
                  pendientesList={pendientesValidacionList}
                  equiposList={equiposList}
                  session={session}
                  onRefresh={async () => {
                    await fetchPendientesValidacion()
                    await fetchBitacora()
                  }}
                  onSuccessMessage={(msg) => setBitacoraSuccessMessage(msg)}
                  onErrorMessage={(msg) => setBitacoraError(msg)}
                />
              )}
            </>
          )}
        </section>
          </>
        )}

        {/* MODAL 1: Nueva / Editar Intervención */}
        {isIntervencionModalOpen && (
          <div className="modal-overlay" onClick={() => !intervencionLoading && setIsIntervencionModalOpen(false)}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  {editingIntervencionId ? 'Editar Intervención' : 'Nueva Intervención de Mantenimiento'}
                </h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => !intervencionLoading && setIsIntervencionModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleIntervencionSubmit} noValidate>
                <div className="modal-body">
                  {intervencionServerError && (
                    <div className="alert-error" role="alert">
                      <span>⚠</span>
                      <span>{intervencionServerError}</span>
                    </div>
                  )}

                  {/* Advertencia si no hay equipos activos */}
                  {activeEquipos.length === 0 && (
                    <div className="alert-error" role="alert">
                      <span>⚠</span>
                      <span>Equipo no registrado. Solicite su creación al administrador.</span>
                    </div>
                  )}

                  <div className="form-grid">
                    {/* Fecha y Hora */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="intervencion_fecha">
                        Fecha y hora <span className="required-mark">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        id="intervencion_fecha"
                        className={`form-input ${intervencionErrors.fecha_hora ? 'input-error' : ''}`}
                        value={intervencionForm.fecha_hora}
                        onChange={(e) => {
                          setIntervencionForm((prev) => ({ ...prev, fecha_hora: e.target.value }))
                          if (intervencionErrors.fecha_hora) {
                            setIntervencionErrors((prev) => ({ ...prev, fecha_hora: null }))
                          }
                        }}
                        disabled={intervencionLoading}
                      />
                      {intervencionErrors.fecha_hora && (
                        <span className="error-message">{intervencionErrors.fecha_hora}</span>
                      )}
                    </div>

                    {/* Selector de Equipo del Maestro */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="intervencion_equipo">
                        Equipo <span className="required-mark">*</span>
                      </label>
                      <select
                        id="intervencion_equipo"
                        className={`form-select ${intervencionErrors.equipo_id ? 'input-error' : ''}`}
                        value={intervencionForm.equipo_id}
                        onChange={handleIntervencionEquipoChange}
                        disabled={intervencionLoading || activeEquipos.length === 0}
                      >
                        <option value="">-- Seleccione un equipo autorizado --</option>
                        {equiposList
                          .filter((eq) => eq.activo !== false || eq.id === intervencionForm.equipo_id)
                          .map((eq) => (
                            <option key={eq.id} value={eq.id}>
                              [{eq.codigo}] {eq.nombre} {eq.area ? `(${eq.area})` : ''} {eq.activo === false ? '(Inactivo)' : ''}
                            </option>
                          ))}
                      </select>
                      {intervencionErrors.equipo_id && (
                        <span className="error-message">{intervencionErrors.equipo_id}</span>
                      )}
                    </div>

                    {/* Técnico */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="intervencion_tecnico_select">
                        Técnico responsable <span className="required-mark">*</span>
                      </label>
                      <select
                        id="intervencion_tecnico_select"
                        className={`form-input ${intervencionErrors.tecnico && !isOtroTecnico ? 'input-error' : ''}`}
                        value={tecnicoSelectValue}
                        onChange={(e) => {
                          const val = e.target.value
                          setTecnicoSelectValue(val)
                          if (val === '__OTRO__') {
                            setIsOtroTecnico(true)
                            setIntervencionForm((prev) => ({ ...prev, tecnico: '' }))
                          } else if (val === '') {
                            setIsOtroTecnico(false)
                            setIntervencionForm((prev) => ({ ...prev, tecnico: '' }))
                          } else {
                            setIsOtroTecnico(false)
                            setIntervencionForm((prev) => ({ ...prev, tecnico: val }))
                          }
                          if (intervencionErrors.tecnico) {
                            setIntervencionErrors((prev) => ({ ...prev, tecnico: null }))
                          }
                        }}
                        disabled={intervencionLoading}
                      >
                        <option value="">-- Seleccionar técnico del catálogo oficial --</option>
                        {TECNICOS_BASE.filter((t) => t.activo).map((t) => (
                          <option key={t.id} value={t.nombre}>
                            {t.nombre}
                          </option>
                        ))}
                        <option value="__OTRO__">Otro / Pendiente de registrar</option>
                      </select>

                      {/* Campo condicional para técnico manual cuando se elige Otro */}
                      {isOtroTecnico && (
                        <div className="form-subgroup-otro-tecnico">
                          <label className="form-sublabel" htmlFor="intervencion_tecnico_otro">
                            Nombre del técnico (Otro / Pendiente de registrar) <span className="required-mark">*</span>
                          </label>
                          <input
                            type="text"
                            id="intervencion_tecnico_otro"
                            className={`form-input ${intervencionErrors.tecnico ? 'input-error' : ''}`}
                            placeholder="Escriba nombre y apellido del técnico..."
                            value={intervencionForm.tecnico}
                            onChange={(e) => {
                              setIntervencionForm((prev) => ({ ...prev, tecnico: e.target.value }))
                              if (intervencionErrors.tecnico) {
                                setIntervencionErrors((prev) => ({ ...prev, tecnico: null }))
                              }
                            }}
                            disabled={intervencionLoading}
                            autoFocus
                          />
                          <span style={{ fontSize: '0.8rem', color: '#b45309' }}>
                            ⚠️ Técnico no perteneciente al catálogo oficial BASE V1. Se registrará de forma manual para trazabilidad.
                          </span>
                        </div>
                      )}

                      {intervencionErrors.tecnico && (
                        <span className="error-message">{intervencionErrors.tecnico}</span>
                      )}
                    </div>

                    {/* Área */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="intervencion_area">
                        Área de planta
                      </label>
                      <input
                        type="text"
                        id="intervencion_area"
                        list="lista_areas_sugeridas"
                        className="form-input"
                        placeholder="Ej. Plásticos / Producción"
                        value={intervencionForm.area}
                        onChange={(e) =>
                          setIntervencionForm((prev) => ({ ...prev, area: e.target.value }))
                        }
                        disabled={intervencionLoading}
                      />
                      <datalist id="lista_areas_sugeridas">
                        <option value="Plásticos" />
                        <option value="Producción" />
                      </datalist>
                    </div>

                    {/* Tipo de intervención */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="intervencion_tipo">
                        Tipo de intervención
                      </label>
                      <select
                        id="intervencion_tipo"
                        className="form-select"
                        value={intervencionForm.tipo_intervencion}
                        onChange={(e) =>
                          setIntervencionForm((prev) => ({
                            ...prev,
                            tipo_intervencion: e.target.value
                          }))
                        }
                        disabled={intervencionLoading}
                      >
                        <option value="Correctiva">Correctiva</option>
                        <option value="Preventiva">Preventiva</option>
                        <option value="Inspección">Inspección</option>
                        <option value="Ajuste">Ajuste</option>
                        <option value="Mejora">Mejora</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>

                    {/* Estado final */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="intervencion_estado_final">
                        Estado final del equipo
                      </label>
                      <select
                        id="intervencion_estado_final"
                        className="form-select"
                        value={intervencionForm.estado_final}
                        onChange={(e) =>
                          setIntervencionForm((prev) => ({
                            ...prev,
                            estado_final: e.target.value
                          }))
                        }
                        disabled={intervencionLoading}
                      >
                        <option value="Operativo">Operativo</option>
                        <option value="Operativo temporal">Operativo temporal</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Fuera de servicio">Fuera de servicio</option>
                      </select>
                    </div>

                    {/* Casilla Es Falla (Ocupa ambas columnas) */}
                    <div className="form-group full-width">
                      <div
                        className={`falla-toggle-box ${intervencionForm.es_falla ? 'is-falla' : ''}`}
                        onClick={() => {
                          const nextVal = !intervencionForm.es_falla
                          setIntervencionForm((prev) => ({
                            ...prev,
                            es_falla: nextVal,
                            tipo_falla: nextVal ? prev.tipo_falla || 'Mecánica' : ''
                          }))
                        }}
                      >
                        <div className="falla-toggle-info">
                          <span className="falla-toggle-title">
                            {intervencionForm.es_falla
                              ? '⚠️ Esta intervención corresponde a una FALLA operada'
                              : '🔧 Intervención rutinaria / No representa falla'}
                          </span>
                          <span className="falla-toggle-desc">
                            {intervencionForm.es_falla
                              ? 'Se computará en las métricas de confiabilidad y cálculo de indicadores de fallas.'
                              : 'Ajustes, lubricación, mejoras o inspecciones planificadas no computan como falla de máquina.'}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          className="falla-checkbox"
                          checked={intervencionForm.es_falla}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setIntervencionForm((prev) => ({
                              ...prev,
                              es_falla: checked,
                              tipo_falla: checked ? prev.tipo_falla || 'Mecánica' : ''
                            }))
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {/* Tipo de Falla (Obligatorio si es_falla = true) */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="intervencion_tipo_falla">
                        Tipo de falla {intervencionForm.es_falla && <span className="required-mark">*</span>}
                      </label>
                      <select
                        id="intervencion_tipo_falla"
                        className={`form-select ${intervencionErrors.tipo_falla ? 'input-error' : ''}`}
                        value={intervencionForm.tipo_falla}
                        onChange={(e) => {
                          setIntervencionForm((prev) => ({ ...prev, tipo_falla: e.target.value }))
                          if (intervencionErrors.tipo_falla) {
                            setIntervencionErrors((prev) => ({ ...prev, tipo_falla: null }))
                          }
                        }}
                        disabled={intervencionLoading || !intervencionForm.es_falla}
                      >
                        <option value="">
                          {intervencionForm.es_falla
                            ? '-- Seleccione tipo de falla --'
                            : '(No aplica / Solo para fallas)'}
                        </option>
                        <option value="Mecánica">Mecánica</option>
                        <option value="Eléctrica / Control">Eléctrica / Control</option>
                        <option value="Neumática">Neumática</option>
                        <option value="Hidráulica / Refrigeración">Hidráulica / Refrigeración</option>
                        <option value="Ajuste / Otros">Ajuste / Otros</option>
                      </select>
                      {intervencionErrors.tipo_falla && (
                        <span className="error-message">{intervencionErrors.tipo_falla}</span>
                      )}
                    </div>

                    {/* Motivo o síntoma de la falla */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="intervencion_motivo">
                        Falla / motivo
                      </label>
                      <input
                        type="text"
                        id="intervencion_motivo"
                        className="form-input"
                        placeholder="Ej. Fuga en manguera de alta presión, sensor cortado..."
                        value={intervencionForm.falla_motivo}
                        onChange={(e) =>
                          setIntervencionForm((prev) => ({ ...prev, falla_motivo: e.target.value }))
                        }
                        disabled={intervencionLoading}
                      />
                    </div>

                    {/* Trabajo Realizado (Mandatorio) */}
                    <div className="form-group full-width">
                      <label className="form-label" htmlFor="intervencion_trabajo">
                        Trabajo realizado <span className="required-mark">*</span>
                      </label>
                      <textarea
                        id="intervencion_trabajo"
                        className={`form-textarea ${intervencionErrors.trabajo_realizado ? 'input-error' : ''}`}
                        placeholder="Describa el trabajo técnico ejecutado en detalle, ajustes realizados, pruebas efectuadas..."
                        rows={3}
                        value={intervencionForm.trabajo_realizado}
                        onChange={(e) => {
                          setIntervencionForm((prev) => ({ ...prev, trabajo_realizado: e.target.value }))
                          if (intervencionErrors.trabajo_realizado) {
                            setIntervencionErrors((prev) => ({ ...prev, trabajo_realizado: null }))
                          }
                        }}
                        disabled={intervencionLoading}
                      />
                      {intervencionErrors.trabajo_realizado && (
                        <span className="error-message">{intervencionErrors.trabajo_realizado}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsIntervencionModalOpen(false)}
                    disabled={intervencionLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={intervencionLoading || activeEquipos.length === 0}
                  >
                    {intervencionLoading
                      ? 'Guardando...'
                      : editingIntervencionId
                      ? 'Guardar Cambios'
                      : 'Registrar Intervención'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Importar Excel (Construcción Progresiva del Maestro de Equipos) */}
        {isImportModalOpen && (
          <div className="modal-overlay" onClick={() => !importLoading && setIsImportModalOpen(false)}>
            <div className="modal-container modal-wide modal-extra-wide" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">📊 Importar Bitácora — Construcción Progresiva del Maestro</h2>
                  <p className="modal-subtitle">
                    Revisión y clasificación de equipos encontrados en el archivo Excel antes de autorizar su incorporación.
                  </p>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => !importLoading && setIsImportModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                {/* Panel de Decisiones Jerárquicas Aprobadas */}
                <div className="approved-decisions-panel">
                  <div className="approved-panel-header">
                    <div className="approved-panel-title">
                      <span className="panel-icon">🌲</span>
                      <strong>Decisión de Clasificación Registrada</strong>
                      <span className="badge-count-pill">1 estructura aprobada</span>
                    </div>
                    <span className="panel-badge-status">En espera de nuevas clasificaciones antes de aplicar a BD</span>
                  </div>

                  <div className="approved-cards-grid">
                    {CLASIFICACIONES_APROBADAS_REGISTRO.map((dec, idx) => (
                      <div key={idx} className="approved-decision-card">
                        <div className="decision-tree-render">
                          <div className="tree-node tree-parent">{dec.equipoPadre}</div>
                          <div className="tree-branch">└── <span className="tree-node tree-child">{dec.equipoHijo}</span></div>
                        </div>
                        <div className="decision-details">
                          <div className="detail-row">
                            <span className="detail-label">Nombre original en Bitácora:</span>
                            <code className="detail-orig">{dec.nombreOriginal}</code>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Trazabilidad hacia relación ERP:</span>
                            <span className="detail-trace">{dec.nombreOriginal} → <strong>{dec.equipoPadre} &gt; {dec.equipoHijo}</strong></span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Estado:</span>
                            <span className="badge-tag-state badge-state-hijo">↳ {dec.estado}</span>
                            <span className="detail-status-note">
                              (Pendiente de creación en BD • No modifica histórico)
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Zona de Selección de Archivo */}
                <label className="import-dropzone">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    style={{ display: 'none' }}
                    onChange={handleExcelFileSelect}
                    disabled={importLoading}
                  />
                  <span className="import-dropzone-icon">📁</span>
                  <span className="import-dropzone-title">
                    {importFileName ? `Archivo cargado: ${importFileName}` : 'Haga clic para seleccionar el archivo Excel (.xlsx)'}
                  </span>
                  <span className="import-dropzone-desc">
                    Lectura automática de hoja "Síntesis" (Columnas: Fecha, Técnico, Máquina, Área, Comentario).
                  </span>
                </label>

                {importLoading && (
                  <div className="state-card" style={{ padding: '2rem', margin: 0, maxWidth: '100%' }}>
                    <h3 className="state-title">Analizando archivo Excel y agrupando equipos...</h3>
                    <p className="state-desc">Identificando máquinas únicas y comparando contra el maestro de equipos autorizados.</p>
                  </div>
                )}

                {importError && (
                  <div className="alert-error" role="alert" style={{ margin: 0 }}>
                    <span>⚠</span>
                    <span>{importError}</span>
                  </div>
                )}

                {/* Resumen Estadístico y Diagnóstico */}
                {importSummary && (
                  <>
                    <div className="import-stats-grid">
                      <div className="import-stat-card">
                        <span className="import-stat-label">Registros procesados</span>
                        <span className="import-stat-num">{importSummary.total}</span>
                      </div>

                      <div className="import-stat-card stat-valid">
                        <span className="import-stat-label">Resueltos automáticamente</span>
                        <span className="import-stat-num" style={{ color: '#10b981' }}>{importSummary.resueltos}</span>
                      </div>

                      <div className="import-stat-card stat-warning">
                        <span className="import-stat-label">Pendientes de validación</span>
                        <span className="import-stat-num" style={{ color: '#f59e0b' }}>{importSummary.pendientes}</span>
                      </div>

                      <div className="import-stat-card stat-excluido">
                        <span className="import-stat-label">Rutinas excluidas</span>
                        <span className="import-stat-num" style={{ color: '#4f46e5' }}>{importSummary.excluidos || 0}</span>
                      </div>

                      <div className="import-stat-card stat-muted">
                        <span className="import-stat-label">Duplicados omitidos</span>
                        <span className="import-stat-num" style={{ color: '#64748b' }}>{importSummary.duplicados}</span>
                      </div>

                      <div className="import-stat-card stat-invalid">
                        <span className="import-stat-label">Errores</span>
                        <span className="import-stat-num" style={{ color: '#ef4444' }}>{importSummary.errores}</span>
                      </div>
                    </div>

                    {/* Guía Conceptual de Jerarquía Padre / Hijo */}
                    <div className="hierarchy-guide-card">
                      <div className="hierarchy-guide-tree">
                        <div className="tree-node tree-parent">EQUIPO PADRE</div>
                        <div className="tree-branch">└── <span className="tree-node tree-child">EQUIPO HIJO</span></div>
                      </div>
                      <div className="hierarchy-guide-text">
                        <strong>Regla de negocio:</strong> El maestro de equipos se construye progresivamente a partir de los registros reales de la Bitácora.
                        No se crean ni relacionan equipos automáticamente. Los 50 registros actuales se conservan intactos. Todo nombre nuevo requiere confirmación manual del administrador.
                      </div>
                    </div>

                    {/* Pestañas Principales del Modal */}
                    <div className="modal-inner-tabs">
                      <button
                        type="button"
                        className={`inner-tab-btn ${importModalTab === 'clasificacion' ? 'active' : ''}`}
                        onClick={() => setImportModalTab('clasificacion')}
                      >
                        <span>📋 1. Clasificación Progresiva de Equipos</span>
                        <span className="inner-tab-badge">
                          {pendingEquiposReview.filter((m) => m.estado === 'Pendiente').length} pendientes / {pendingEquiposReview.length} encontrados
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`inner-tab-btn ${importModalTab === 'filas' ? 'active' : ''}`}
                        onClick={() => setImportModalTab('filas')}
                      >
                        <span>📄 2. Vista Previa de Filas Excel</span>
                        <span className="inner-tab-badge">{importRows.length} filas</span>
                      </button>
                    </div>

                    {/* CONTENIDO PESTAÑA 1: CLASIFICACIÓN PROGRESIVA DE EQUIPOS */}
                    {importModalTab === 'clasificacion' && (
                      <div className="clasificacion-tab-content">
                        {/* Filtros de la tabla de clasificación */}
                        <div className="clasif-toolbar">
                          <div className="clasif-chips">
                            <button
                              type="button"
                              className={`clasif-chip ${clasifFilterEstado === 'todos' ? 'active' : ''}`}
                              onClick={() => setClasifFilterEstado('todos')}
                            >
                              Todos ({pendingEquiposReview.length})
                            </button>
                            <button
                              type="button"
                              className={`clasif-chip chip-pending ${clasifFilterEstado === 'Pendiente' ? 'active' : ''}`}
                              onClick={() => setClasifFilterEstado('Pendiente')}
                            >
                              ⏳ Pendientes ({pendingEquiposReview.filter((m) => m.estado === 'Pendiente').length})
                            </button>
                            <button
                              type="button"
                              className={`clasif-chip chip-padre ${clasifFilterEstado === 'Aprobado como padre' ? 'active' : ''}`}
                              onClick={() => setClasifFilterEstado('Aprobado como padre')}
                            >
                              🏛️ Aprobados como Padre ({pendingEquiposReview.filter((m) => m.estado === 'Aprobado como padre').length})
                            </button>
                            <button
                              type="button"
                              className={`clasif-chip chip-hijo ${clasifFilterEstado === 'Aprobado como hijo' ? 'active' : ''}`}
                              onClick={() => setClasifFilterEstado('Aprobado como hijo')}
                            >
                              ↳ Aprobados como Hijo ({pendingEquiposReview.filter((m) => m.estado === 'Aprobado como hijo').length})
                            </button>
                            <button
                              type="button"
                              className={`clasif-chip chip-asociado ${clasifFilterEstado === 'Asociado a equipo existente' ? 'active' : ''}`}
                              onClick={() => setClasifFilterEstado('Asociado a equipo existente')}
                            >
                              ✓ Asociados a Existente ({pendingEquiposReview.filter((m) => m.estado === 'Asociado a equipo existente').length})
                            </button>
                          </div>

                          <div className="clasif-search-box">
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Buscar máquina o área..."
                              value={clasifSearchText}
                              onChange={(e) => setClasifSearchText(e.target.value)}
                            />
                            {clasifSearchText && (
                              <button
                                type="button"
                                className="clasif-search-clear"
                                onClick={() => setClasifSearchText('')}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Tabla de Clasificación de Equipos uno a uno */}
                        <div className="preview-table-container">
                          <table className="preview-table">
                            <thead>
                              <tr>
                                <th>Nombre encontrado en Bitácora</th>
                                <th>Apariciones</th>
                                <th>Área</th>
                                <th>Primer registro</th>
                                <th>Último registro</th>
                                <th style={{ minWidth: '280px' }}>Futura Acción (Preparación Visual)</th>
                                <th>Equipo padre asignado</th>
                                <th>Equipo hijo asignado</th>
                                <th>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredEquiposReview.length === 0 ? (
                                <tr>
                                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    No se encontraron equipos para el filtro seleccionado.
                                  </td>
                                </tr>
                              ) : (
                                filteredEquiposReview.map((item) => {
                                  const isPending = item.estado === 'Pendiente'
                                  return (
                                    <tr key={item.id} className={isPending ? 'row-clasif-pendiente' : ''}>
                                      {/* 1. Nombre encontrado en Bitácora */}
                                      <td>
                                        <div className="maq-original-cell">
                                          <div className="maq-orig-header">
                                            <span className="badge-origin-excel">Excel</span>
                                            <strong className="maq-original-name">{item.nombreOriginal}</strong>
                                          </div>
                                          {item.estado === 'Aprobado como hijo' && item.equipoPadreAsignado !== '-' && (
                                            <div className="tree-visual-box" title="Estructura jerárquica aprobada">
                                              <div className="tree-node tree-parent">{item.equipoPadreAsignado}</div>
                                              <div className="tree-branch">└── <span className="tree-node tree-child">{item.equipoHijoAsignado}</span></div>
                                            </div>
                                          )}
                                        </div>
                                      </td>

                                      {/* 2. Cantidad de apariciones */}
                                      <td>
                                        <span className="badge-apariciones">
                                          {item.apariciones} {item.apariciones === 1 ? 'evento' : 'eventos'}
                                        </span>
                                      </td>

                                      {/* 3. Área */}
                                      <td>
                                        <div className="maq-areas-cell">
                                          {item.areas && item.areas.length > 0 ? (
                                            item.areas.map((a, idx) => (
                                              <span key={idx} className="badge-area-pill">{a}</span>
                                            ))
                                          ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                                          )}
                                        </div>
                                      </td>

                                      {/* 4. Primer registro */}
                                      <td className="font-mono" style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                        {formatDateOnly(item.primerRegistro)}
                                      </td>

                                      {/* 5. Último registro */}
                                      <td className="font-mono" style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                        {formatDateOnly(item.ultimoRegistro)}
                                      </td>

                                      {/* Acción / Configuración interactiva */}
                                      <td>
                                        <div className="action-config-box">
                                          <select
                                            className="form-select action-select"
                                            value={item.accion}
                                            onChange={(e) => handleClassificationChange(item.nombreOriginal, 'accion', e.target.value)}
                                          >
                                            <option value="pendiente">Mantener pendiente</option>
                                            <option value="existente">Asignar a equipo existente</option>
                                            <option value="nuevo_padre">Definir como nuevo equipo padre</option>
                                            <option value="nuevo_hijo">Definir como nuevo equipo hijo de padre existente</option>
                                          </select>

                                          {/* Subcontroles según la acción seleccionada */}
                                          {item.accion === 'existente' && (
                                            <select
                                              className="form-select action-subselect"
                                              value={item.equipoAsignadoId}
                                              onChange={(e) => handleClassificationChange(item.nombreOriginal, 'equipoAsignadoId', e.target.value)}
                                            >
                                              <option value="" disabled>Seleccione equipo existente del maestro...</option>
                                              {equiposList.map((eq) => (
                                                <option key={eq.id} value={eq.id}>
                                                  [{eq.codigo}] {eq.nombre} {eq.area ? `(${eq.area})` : ''}
                                                </option>
                                              ))}
                                            </select>
                                          )}

                                          {item.accion === 'nuevo_padre' && (
                                            <div className="action-subgroup">
                                              <label className="action-label">Nombre propuesto para Equipo Padre:</label>
                                              <input
                                                type="text"
                                                className="form-input action-subinput"
                                                value={item.propuestoNombrePadre}
                                                placeholder="Nombre equipo padre"
                                                onChange={(e) => handleClassificationChange(item.nombreOriginal, 'propuestoNombrePadre', e.target.value)}
                                              />
                                            </div>
                                          )}

                                          {item.accion === 'nuevo_hijo' && (
                                            <div className="action-subgroup">
                                              <label className="action-label">Equipo Padre existente:</label>
                                              <select
                                                className="form-select action-subselect"
                                                value={item.equipoAsignadoId}
                                                onChange={(e) => handleClassificationChange(item.nombreOriginal, 'equipoAsignadoId', e.target.value)}
                                              >
                                                <option value="" disabled>Seleccione equipo padre...</option>
                                                {equiposList.map((eq) => (
                                                  <option key={eq.id} value={eq.id}>
                                                    [{eq.codigo}] {eq.nombre}
                                                  </option>
                                                ))}
                                              </select>

                                              <label className="action-label" style={{ marginTop: '0.25rem' }}>
                                                Nombre del Sub-equipo / Componente Hijo:
                                              </label>
                                              <input
                                                type="text"
                                                className="form-input action-subinput"
                                                value={item.propuestoNombreHijo}
                                                placeholder="Ej: Molde 12, Extractor, Sensor..."
                                                onChange={(e) => handleClassificationChange(item.nombreOriginal, 'propuestoNombreHijo', e.target.value)}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </td>

                                      {/* 6. Equipo padre asignado */}
                                      <td>
                                        <span className={item.equipoPadreAsignado !== '-' ? 'font-semibold' : 'text-muted'}>
                                          {item.equipoPadreAsignado}
                                        </span>
                                      </td>

                                      {/* 7. Equipo hijo asignado */}
                                      <td>
                                        <span className={item.equipoHijoAsignado !== '-' ? 'font-semibold' : 'text-muted'}>
                                          {item.equipoHijoAsignado}
                                        </span>
                                      </td>

                                      {/* 8. Estado */}
                                      <td>
                                        {item.estado === 'Pendiente' && (
                                          <span className="badge-tag-state badge-state-pending">
                                            ⏳ Pendiente
                                          </span>
                                        )}
                                        {item.estado === 'Aprobado como padre' && (
                                          <span className="badge-tag-state badge-state-padre">
                                            🏛️ Aprobado como padre
                                          </span>
                                        )}
                                        {item.estado === 'Aprobado como hijo' && (
                                          <span className="badge-tag-state badge-state-hijo">
                                            ↳ Aprobado como hijo
                                          </span>
                                        )}
                                        {item.estado === 'Asociado a equipo existente' && (
                                          <span className="badge-tag-state badge-state-asociado">
                                            ✓ Asociado a equipo existente
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
                      </div>
                    )}

                    {/* CONTENIDO PESTAÑA 2: VISTA PREVIA DE FILAS EXCEL */}
                    {importModalTab === 'filas' && (
                      <div className="filas-tab-content">
                        {/* Subpestañas de filtrado de filas */}
                        <div className="import-tabs">
                          <button
                            type="button"
                            className={`import-tab ${importActiveTab === 'todos' ? 'active' : ''}`}
                            onClick={() => setImportActiveTab('todos')}
                          >
                            Todos ({importRows.length})
                          </button>
                          <button
                            type="button"
                            className={`import-tab ${importActiveTab === 'resueltos' ? 'active' : ''}`}
                            onClick={() => setImportActiveTab('resueltos')}
                          >
                            Resueltos ({importSummary.resueltos})
                          </button>
                          <button
                            type="button"
                            className={`import-tab ${importActiveTab === 'pendientes' ? 'active' : ''}`}
                            onClick={() => setImportActiveTab('pendientes')}
                          >
                            Pendientes ({importSummary.pendientes})
                          </button>
                          <button
                            type="button"
                            className={`import-tab ${importActiveTab === 'excluidos' ? 'active' : ''}`}
                            onClick={() => setImportActiveTab('excluidos')}
                          >
                            Rutina preventiva / excluida ({importSummary.excluidos || 0})
                          </button>
                          <button
                            type="button"
                            className={`import-tab ${importActiveTab === 'duplicados' ? 'active' : ''}`}
                            onClick={() => setImportActiveTab('duplicados')}
                          >
                            Duplicados ({importSummary.duplicados})
                          </button>
                          {importSummary.errores > 0 && (
                            <button
                              type="button"
                              className={`import-tab ${importActiveTab === 'errores' ? 'active' : ''}`}
                              onClick={() => setImportActiveTab('errores')}
                            >
                              Errores ({importSummary.errores})
                            </button>
                          )}
                        </div>

                        {/* Tabla previa de importación con trazabilidad */}
                        <div className="preview-table-container">
                          <table className="preview-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Fecha</th>
                                <th>Técnico</th>
                                <th>Nombre original (Excel)</th>
                                <th>Activo resuelto</th>
                                <th>Tipo</th>
                                <th>Trabajo realizado</th>
                                <th>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importRows
                                .filter((row) => {
                                  if (importActiveTab === 'resueltos') return row.estadoRow === 'Resuelto'
                                  if (importActiveTab === 'pendientes') return row.estadoRow === 'Pendiente'
                                  if (importActiveTab === 'excluidos') return row.estadoRow === 'Rutina preventiva / excluida'
                                  if (importActiveTab === 'duplicados') return row.estadoRow === 'Duplicado'
                                  if (importActiveTab === 'errores') return row.estadoRow === 'Error'
                                  return true
                                })
                                .map((row) => {
                                  const isResuelto = row.estadoRow === 'Resuelto'
                                  const isPendiente = row.estadoRow === 'Pendiente'
                                  const isExcluido = row.estadoRow === 'Rutina preventiva / excluida'
                                  const isDuplicado = row.estadoRow === 'Duplicado'
                                  const isError = row.estadoRow === 'Error'

                                  return (
                                    <tr
                                      key={row.rowNumber}
                                      className={isError ? 'row-has-error' : isDuplicado ? 'row-has-warning' : isExcluido ? 'row-has-excluido' : ''}
                                    >
                                      <td className="font-mono">{row.rowNumber}</td>
                                      <td className="font-mono" style={{ whiteSpace: 'nowrap' }}>
                                        {row.parsedDate ? formatDateTime(row.parsedDate) : String(row.rawFecha)}
                                      </td>
                                      <td>{row.tecnico || <span style={{ color: '#ef4444' }}>Vacío</span>}</td>
                                      <td>
                                        <span className="trace-name-original" style={{ fontWeight: 600 }}>
                                          {row.maquina}
                                        </span>
                                      </td>
                                      <td>
                                        {row.matchedEquipo ? (
                                          <span className="badge-tag-state badge-state-asociado">
                                            ✓ [{row.matchedEquipo.codigo}] {row.matchedEquipo.nombre}
                                          </span>
                                        ) : isExcluido ? (
                                          <span className="badge-tag-state badge-state-muted" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5' }}>
                                            🛡️ Sin activo (Rutina)
                                          </span>
                                        ) : isPendiente ? (
                                          <span className="badge-tag-state badge-state-pending">
                                            ⏳ Pendiente de validación
                                          </span>
                                        ) : (
                                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                                        )}
                                      </td>
                                      <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                                          <span className={`badge-tag-tipo badge-tag-tipo-${(row.tipo_intervencion || 'otro').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>
                                            {row.tipo_intervencion || 'Otro'}
                                          </span>
                                          {row.es_falla && (
                                            <span className="badge-tag-fallas" style={{ fontSize: '0.75rem' }}>
                                              ⚠️ Falla {row.tipo_falla ? `(${row.tipo_falla})` : ''}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td style={{ maxWidth: '320px', lineHeight: 1.35 }}>
                                        {row.comentario}
                                      </td>
                                      <td>
                                        {isResuelto && (
                                          <span className="badge-tag-estado-resuelto">✓ Resuelto</span>
                                        )}
                                        {isPendiente && (
                                          <span className="badge-tag-estado-pendiente" title={row.motivoPendiente || 'Activo no resuelto'}>
                                            ⏳ Pendiente
                                          </span>
                                        )}
                                        {isExcluido && (
                                          <span className="badge-tag-estado-excluido" title={row.motivoPendiente || 'Rutina preventiva diaria de despiche sin anomalías'}>
                                            🛡️ Rutina excluida
                                          </span>
                                        )}
                                        {isDuplicado && (
                                          <span className="badge-tag-estado-duplicado" title="Duplicado / ya existente en Bitácora">
                                            ⚠️ Duplicado
                                          </span>
                                        )}
                                        {isError && (
                                          <span className="badge-tag-estado-error" title={row.issues.join(', ')}>
                                            ✕ Error
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="modal-footer">
                <div className="modal-footer-notice">
                  <span className="notice-icon">🛡️</span>
                  <span>
                    <strong>Control de Calidad:</strong> Los registros resueltos se vincularán directamente a <code>public.bitacora_mantenimiento</code> ({importSummary?.resueltos || 0}) y los no resueltos o ambiguos a <code>public.bitacora_importacion_pendiente</code> ({importSummary?.pendientes || 0}).
                  </span>
                </div>
                <div className="modal-footer-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsImportModalOpen(false)}
                    disabled={importSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={importSubmitting || importLoading || !importRows || importRows.length === 0}
                    onClick={handleExecuteImport}
                  >
                    {importSubmitting
                      ? 'Importando registros...'
                      : `Confirmar importación (${importSummary?.resueltos || 0} resueltos, ${importSummary?.pendientes || 0} pendientes)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL RESUMEN FINAL DE LA IMPORTACIÓN */}
        {importCompletedSummary && (
          <div className="modal-overlay" onClick={() => setImportCompletedSummary(null)}>
            <div className="modal-container" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">🎉 Importación completada</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setImportCompletedSummary(null)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body" style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  El archivo de bitácora fue procesado y conciliado con la base de datos de Aguacol:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Registros procesados</span>
                    <strong style={{ fontSize: '1.4rem', color: '#0f172a' }}>{importCompletedSummary.procesados}</strong>
                  </div>
                  <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Asignados automáticamente</span>
                    <strong style={{ fontSize: '1.4rem', color: '#16a34a' }}>{importCompletedSummary.asignados}</strong>
                  </div>
                  <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                    <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Pendientes de validación</span>
                    <strong style={{ fontSize: '1.4rem', color: '#b45309' }}>{importCompletedSummary.pendientes}</strong>
                  </div>
                  <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Ignorados / Excluidos</span>
                    <strong style={{ fontSize: '1.4rem', color: '#475569' }}>{importCompletedSummary.ignorados}</strong>
                  </div>
                </div>
                {importCompletedSummary.pendientes > 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#b45309', background: '#fffbeb', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #fef3c7', margin: 0, lineHeight: 1.45 }}>
                    ⚠️ <strong>Acción requerida:</strong> Se detectaron {importCompletedSummary.pendientes} tareas sin activo identificado. La pestaña <em>Validar importaciones</em> se ha abierto automáticamente para su resolución.
                  </p>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: '#16a34a', background: '#f0fdf4', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #bbf7d0', margin: 0, lineHeight: 1.45 }}>
                    ✓ <strong>Importación completada sin tareas pendientes de validación.</strong> Todas las tareas se asociaron a sus activos oficiales.
                  </p>
                )}
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 1.5rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setImportCompletedSummary(null)}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
