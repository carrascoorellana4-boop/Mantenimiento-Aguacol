import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
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

// Formateador de moneda para pesos chilenos (CLP)
const formatCLP = (val) => {
  const num = Number(val) || 0
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(num)
}

// Función para normalizar texto eliminando tildes/acentos y pasando a minúsculas
const normalizeText = (text) =>
  (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

function App() {
  const [activeView, setActiveView] = useState('dashboard')
  
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
        setActiveView('repuestos')
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

  // Disparar consultas según la vista activa
  useEffect(() => {
    if (activeView === 'dashboard') {
      fetchDashboard()
    } else if (activeView === 'repuestos' || activeView === 'retiro') {
      fetchInventario()
    }
  }, [activeView])

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword
      })

      if (error) {
        setLoginError(`Credenciales incorrectas o error de acceso: ${error.message}`)
      } else {
        setLoginEmail('')
        setLoginPassword('')
        setActiveView('dashboard')
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
    setActiveView('dashboard')
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

  // Cálculo del valor máximo para escalar las barras del gráfico
  const maxRetiroValor = retirosData.length > 0
    ? Math.max(...retirosData.map((d) => Number(d.valor_retiros) || 0), 1)
    : 1

  return (
    <div className="app-layout">
      {/* Menú lateral */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">Sistema de Mantenimiento</h2>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-section">
            <h3 className="nav-section-title">General</h3>
            <ul className="nav-list">
              <li>
                <button
                  type="button"
                  className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveView('dashboard')}
                >
                  Dashboard
                </button>
              </li>
            </ul>
          </div>

          <div className="nav-section">
            <h3 className="nav-section-title">Inventario</h3>
            <ul className="nav-list">
              <li>
                <button
                  type="button"
                  className={`nav-item ${activeView === 'repuestos' || activeView === 'nuevo-repuesto' ? 'active' : ''}`}
                  onClick={handleCancel}
                >
                  Repuestos
                </button>
              </li>
              {session && (
                <li>
                  <button
                    type="button"
                    className={`nav-item ${activeView === 'retiro' ? 'active' : ''}`}
                    onClick={() => {
                      setRetiroErrors({})
                      setRetiroSuccess('')
                      setRetiroServerError('')
                      setActiveView('retiro')
                    }}
                  >
                    Retiro de Repuestos
                  </button>
                </li>
              )}
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
        
        {/* VISTA 1: Dashboard de Inventario */}
        {activeView === 'dashboard' && (
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
                      onClick={() => setActiveView('dashboard')}
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
      </main>
    </div>
  )
}

export default App
