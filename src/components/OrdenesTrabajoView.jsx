import Icon from './Icon'
import { useState, useEffect, useMemo, useRef } from 'react'
import { TECNICOS_BASE } from '../config/tecnicos'
import { parseTecnicos } from '../lib/tecnicos'
import {
  ESTADOS_OT,
  ORIGENES_OT,
  PRIORIDADES_OT,
  formatCodigoOt,
  resolveOtEquipoDisplay,
  createOrdenTrabajo,
  changeOtStatus,
  updateOrdenTrabajoDetails,
  fetchOtHistorialEstados,
  formatDuracionTrabajo,
  formatMinutosLegible,
  fetchRepuestosDeOt,
  consumirRepuestoEnOt
} from '../services/ordenesTrabajoService'

const formatFechaHoraCL = (val) => {
  if (!val) return '—'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${mins}`
  } catch {
    return String(val)
  }
}

const ESTADO_META = {
  'Pendiente': {
    label: 'Pendiente',
    upperLabel: 'PENDIENTE',
    colTitle: 'PENDIENTES',
    shortTitle: 'Pendientes',
    emptyText: 'No hay órdenes pendientes',
    badgeClass: 'ot-badge-pendiente',
    columnClass: 'ot-col-pendiente',
    cardClass: 'ot-card-pendiente'
  },
  'En curso': {
    label: 'En curso',
    upperLabel: 'EN CURSO',
    colTitle: 'EN CURSO',
    shortTitle: 'En curso',
    emptyText: 'No hay órdenes en curso',
    badgeClass: 'ot-badge-encurso',
    columnClass: 'ot-col-encurso',
    cardClass: 'ot-card-encurso'
  },
  'Finalizada': {
    label: 'Finalizada',
    upperLabel: 'FINALIZADA',
    colTitle: 'FINALIZADAS',
    shortTitle: 'Finalizadas',
    emptyText: 'No hay órdenes finalizadas',
    badgeClass: 'ot-badge-finalizada',
    columnClass: 'ot-col-finalizada',
    cardClass: 'ot-card-finalizada'
  }
}

export default function OrdenesTrabajoView({
  ordenesList = [],
  setOrdenesList = () => {},
  equiposList = [],
  repuestosList = [],
  onInventarioChange = () => {},
  session = null,
  initialLoading = false,
  onNavigateToDashboard = () => {}
}) {
  // Solo el administrador puede crear o cambiar OT (la base lo exige igual).
  const readOnly = session?.user?.role !== 'mant_admin'
  // Pestaña activa en vista móvil
  const [mobileActiveTab, setMobileActiveTab] = useState('Pendiente')
  const touchStartXRef = useRef(null)

  // Estado local de actualización por tarjeta individual (evita usar spinner global)
  const [updatingOtId, setUpdatingOtId] = useState(null)

  // Filtros del tablero Kanban
  const [searchQuery, setSearchQuery] = useState('')
  const [filterEquipoId, setFilterEquipoId] = useState('')
  const [filterTecnico, setFilterTecnico] = useState('')
  const [filterOrigen, setFilterOrigen] = useState('')

  // Estado de Drag & Drop
  const [draggedOtId, setDraggedOtId] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)

  // Notificaciones visuales breves (Toast)
  const [toastMessage, setToastMessage] = useState(null)
  const toastTimerRef = useRef(null)

  const showToast = (text, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToastMessage({ text, type })
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  // Ficha Individual de OT seleccionada (leída directamente desde ordenesList)
  const [selectedOtId, setSelectedOtId] = useState(null)
  const selectedOt = useMemo(
    () => ordenesList.find((o) => o.id === selectedOtId) || null,
    [ordenesList, selectedOtId]
  )

  // Campos editables dentro de la Ficha Individual
  const [fichaSolucion, setFichaSolucion] = useState('')
  const [fichaTrabajoPendiente, setFichaTrabajoPendiente] = useState('')
  const [fichaTecnico, setFichaTecnico] = useState('')
  const [fichaTrabajo, setFichaTrabajo] = useState('')
  const [fichaPrioridad, setFichaPrioridad] = useState('Media')
  const [fichaValidationError, setFichaValidationError] = useState('')
  const [fichaSaving, setFichaSaving] = useState(false)
  const [fichaPendingFinalizarMode, setFichaPendingFinalizarMode] = useState(false)
  const [fichaHistorial, setFichaHistorial] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const fichaSolucionInputRef = useRef(null)

  // Modal de Código QR Planta
  const [isQrPlantModalOpen, setIsQrPlantModalOpen] = useState(false)

  // Estado de repuestos consumidos en la OT seleccionada
  const [fichaRepuestosList, setFichaRepuestosList] = useState([])
  const [loadingRepuestos, setLoadingRepuestos] = useState(false)
  const [fichaCondicionLinea, setFichaCondicionLinea] = useState('')
  const [fichaUtilizoRepuestos, setFichaUtilizoRepuestos] = useState('no')
  const [fichaTiempoHoras, setFichaTiempoHoras] = useState('')
  const [fichaTiempoMinutos, setFichaTiempoMinutos] = useState('')
  const [repuestoSearchQuery, setRepuestoSearchQuery] = useState('')
  const [selectedRepuestoId, setSelectedRepuestoId] = useState('')
  const [consumoCantidad, setConsumoCantidad] = useState('')
  const [consumoError, setConsumoError] = useState('')
  const [consumoSubmitting, setConsumoSubmitting] = useState(false)

  // Condición de línea, tiempo detenido y repuestos en Modal Finalizar
  const [finalizarCondicionLinea, setFinalizarCondicionLinea] = useState('')
  const [finalizarUtilizoRepuestos, setFinalizarUtilizoRepuestos] = useState('no')
  const [finalizarTiempoHoras, setFinalizarTiempoHoras] = useState('')
  const [finalizarTiempoMinutos, setFinalizarTiempoMinutos] = useState('')


  // Sincronizar campos del formulario de la Ficha cuando cambia la OT seleccionada o sus datos
  useEffect(() => {
    if (selectedOt) {
      setFichaSolucion(selectedOt.solucion_definitiva || '')
      setFichaTrabajoPendiente(selectedOt.trabajo_pendiente || '')
      setFichaTecnico(selectedOt.tecnico || '')
      setFichaTrabajo(selectedOt.trabajo || '')
      setFichaPrioridad(selectedOt.prioridad || 'Media')
      setFichaCondicionLinea(selectedOt.condicion_linea || '')
      setFichaUtilizoRepuestos(selectedOt.utilizo_repuestos ? 'si' : 'no')
      if (selectedOt.tiempo_detencion_minutos !== undefined && selectedOt.tiempo_detencion_minutos !== null) {
        const tot = Number(selectedOt.tiempo_detencion_minutos) || 0
        setFichaTiempoHoras(tot >= 60 ? String(Math.floor(tot / 60)) : '')
        setFichaTiempoMinutos(tot > 0 ? String(tot % 60) : '')
      } else {
        setFichaTiempoHoras('')
        setFichaTiempoMinutos('')
      }
      setRepuestoSearchQuery('')
      setSelectedRepuestoId('')
      setConsumoCantidad('')
      setConsumoError('')
      setFichaValidationError('')
      setFichaPendingFinalizarMode(false)

      setLoadingHistorial(true)
      fetchOtHistorialEstados(selectedOt.id)
        .then((hist) => setFichaHistorial(hist || []))
        .finally(() => setLoadingHistorial(false))

      setLoadingRepuestos(true)
      fetchRepuestosDeOt(selectedOt.id)
        .then((reps) => {
          setFichaRepuestosList(reps || [])
          if (reps && reps.length > 0) {
            setFichaUtilizoRepuestos('si')
          }
        })
        .finally(() => setLoadingRepuestos(false))
    } else {
      setFichaHistorial([])
    }
  }, [selectedOt?.id, selectedOt?.estado, selectedOt?.updated_at])


  // Modal de Cierre / Finalizar OT
  const [finalizarModalOt, setFinalizarModalOt] = useState(null)
  const [finalizarSolucion, setFinalizarSolucion] = useState('')
  const [finalizarTrabajoPendiente, setFinalizarTrabajoPendiente] = useState('')
  const [finalizarTecnico, setFinalizarTecnico] = useState('')
  const [finalizarError, setFinalizarError] = useState('')
  const [finalizarSubmitting, setFinalizarSubmitting] = useState(false)

  // Modal de Confirmación para Reabrir (Finalizada -> En curso) o Devolver a Pendiente (En curso -> Pendiente)
  const [confirmTransitionModal, setConfirmTransitionModal] = useState(null)

  // Modal para Crear Nueva OT
  const [isNuevaOtModalOpen, setIsNuevaOtModalOpen] = useState(false)
  const [nuevaOtForm, setNuevaOtForm] = useState({
    equipo_id: '',
    ubicacion: '',
    trabajo: '',
    tecnico: 'Maximiliano Badilla',
    origen: 'Manual',
    prioridad: 'Media',
    tipo_intervencion: 'Correctiva',
    es_falla: true,
    tipo_falla: 'Mecánica',
    condicion_linea: 'Línea produciendo',
    tiempo_detencion_horas: '',
    tiempo_detencion_minutos: ''
  })
  const [nuevaOtError, setNuevaOtError] = useState('')
  const [nuevaOtSubmitting, setNuevaOtSubmitting] = useState(false)

  // Catálogo de técnicos disponibles
  const tecnicosCatalogo = useMemo(() => {
    const set = new Set(TECNICOS_BASE.map((t) => t.nombre))
    ordenesList.forEach((ot) => {
      parseTecnicos(ot.tecnico).forEach((t) => set.add(t))
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))
  }, [ordenesList])

  // Filtrado de OTs en el tablero
  const filteredOrdenes = useMemo(() => {
    return ordenesList.filter((ot) => {
      if (filterEquipoId && ot.equipo_id !== filterEquipoId) return false
      if (filterOrigen && ot.origen !== filterOrigen) return false
      if (filterTecnico) {
        const tecs = parseTecnicos(ot.tecnico)
        const matchTec =
          tecs.some((t) => t.toLowerCase() === filterTecnico.toLowerCase()) ||
          (ot.tecnico || '').toLowerCase().includes(filterTecnico.toLowerCase())
        if (!matchTec) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const { equipoNombre, ubicacionDisplay } = resolveOtEquipoDisplay(ot, equiposList)
        const cod = formatCodigoOt(ot).toLowerCase()
        const trab = (ot.trabajo || '').toLowerCase()
        const tec = (ot.tecnico || '').toLowerCase()
        const sol = (ot.solucion_definitiva || '').toLowerCase()
        if (
          !cod.includes(q) &&
          !equipoNombre.toLowerCase().includes(q) &&
          !ubicacionDisplay.toLowerCase().includes(q) &&
          !trab.includes(q) &&
          !tec.includes(q) &&
          !sol.includes(q)
        ) {
          return false
        }
      }
      return true
    })
  }, [ordenesList, filterEquipoId, filterOrigen, filterTecnico, searchQuery, equiposList])

  // Agrupación directa por estado
  const columnsMap = useMemo(() => {
    const pendientes = []
    const enCurso = []
    const finalizadas = []

    filteredOrdenes.forEach((ot) => {
      if (ot.estado === 'Pendiente') pendientes.push(ot)
      else if (ot.estado === 'En curso') enCurso.push(ot)
      else if (ot.estado === 'Finalizada') finalizadas.push(ot)
    })

    return {
      'Pendiente': pendientes,
      'En curso': enCurso,
      'Finalizada': finalizadas
    }
  }, [filteredOrdenes])

  // Indicadores KPI superiores
  const liveCounts = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0)

    let pendientes = 0
    let enCurso = 0
    let finalizadasTotal = 0
    let finalizadasMesActual = 0

    ordenesList.forEach((ot) => {
      if (ot.estado === 'Pendiente') pendientes++
      else if (ot.estado === 'En curso') enCurso++
      else if (ot.estado === 'Finalizada') {
        finalizadasTotal++
        if (ot.fecha_finalizacion) {
          const fFin = new Date(ot.fecha_finalizacion)
          if (fFin >= startOfMonth && fFin < endOfMonth) {
            finalizadasMesActual++
          }
        }
      }
    })

    return { pendientes, enCurso, finalizadasTotal, finalizadasMesActual }
  }, [ordenesList])

  // Ejecución de cambio de estado con Optimistic UI y reversión automática ante error
  const executeStatusChangeWithOptimisticUi = async (ot, newStatus, extraPayload = {}) => {
    if (!ot) return false
    const codigo = formatCodigoOt(ot)

    if (newStatus === 'Finalizada') {
      const candidateSol =
        extraPayload.solucion_definitiva !== undefined
          ? String(extraPayload.solucion_definitiva || '').trim()
          : String(ot.solucion_definitiva || '').trim()

      if (!candidateSol) {
        showToast('No es posible finalizar una OT sin registrar la solución definitiva.', 'error')
        return false
      }
    }

    const previousListSnapshot = [...ordenesList]
    const nowIso = new Date().toISOString()

    const optimisticRecord = {
      ...ot,
      estado: newStatus,
      updated_at: nowIso
    }

    if (newStatus === 'En curso') {
      optimisticRecord.fecha_inicio = ot.fecha_inicio || nowIso
      optimisticRecord.fecha_hora_inicio_trabajo = ot.fecha_hora_inicio_trabajo || ot.fecha_inicio || nowIso
      optimisticRecord.fecha_finalizacion = null
      optimisticRecord.fecha_hora_fin_trabajo = null
    } else if (newStatus === 'Finalizada') {
      optimisticRecord.fecha_inicio = ot.fecha_inicio || nowIso
      optimisticRecord.fecha_hora_inicio_trabajo = ot.fecha_hora_inicio_trabajo || ot.fecha_inicio || nowIso
      optimisticRecord.fecha_finalizacion = nowIso
      optimisticRecord.fecha_hora_fin_trabajo = nowIso
      if (extraPayload.condicion_linea !== undefined) {
        optimisticRecord.condicion_linea = extraPayload.condicion_linea
      }
      if (extraPayload.utilizo_repuestos !== undefined) {
        optimisticRecord.utilizo_repuestos = Boolean(extraPayload.utilizo_repuestos)
      }
      if (extraPayload.solucion_definitiva !== undefined) {
        optimisticRecord.solucion_definitiva = String(extraPayload.solucion_definitiva).trim()
      }
      if (extraPayload.trabajo_pendiente !== undefined) {
        optimisticRecord.trabajo_pendiente = String(extraPayload.trabajo_pendiente).trim() || null
      }
      if (extraPayload.tecnico !== undefined && String(extraPayload.tecnico).trim()) {
        optimisticRecord.tecnico = String(extraPayload.tecnico).trim()
      }
    } else if (newStatus === 'Pendiente') {
      optimisticRecord.fecha_finalizacion = null
    }

    setOrdenesList((prev) =>
      prev.map((item) => (item.id === ot.id ? optimisticRecord : item))
    )
    setUpdatingOtId(ot.id)

    try {
      const updatedRecord = await changeOtStatus(
        ot.id,
        newStatus,
        extraPayload,
        session,
        equiposList
      )

      setOrdenesList((prev) =>
        prev.map((item) => (item.id === ot.id ? updatedRecord : item))
      )

      if (selectedOtId === ot.id) {
        fetchOtHistorialEstados(ot.id).then((hist) => setFichaHistorial(hist || []))
      }

      if (newStatus === 'En curso' && ot.estado === 'Pendiente') {
        showToast(`${codigo} iniciada`, 'success')
      } else if (newStatus === 'Finalizada') {
        showToast(`${codigo} finalizada correctamente`, 'success')
      } else if (newStatus === 'En curso' && ot.estado === 'Finalizada') {
        showToast(`${codigo} reabierta y en curso`, 'info')
      } else if (newStatus === 'Pendiente') {
        showToast(`${codigo} devuelta a Pendiente`, 'info')
      }

      return true
    } catch (err) {
      setOrdenesList(previousListSnapshot)
      const isSolucionErr = err.message && err.message.toLowerCase().includes('solución definitiva')
      showToast(
        isSolucionErr ? err.message : 'No fue posible actualizar la OT.',
        'error'
      )
      return false
    } finally {
      setUpdatingOtId((prev) => (prev === ot.id ? null : prev))
    }
  }

  // Punto de entrada unificado para cualquier solicitud de cambio de estado
  const handleInitiateStatusChange = (ot, targetStatus, source = 'kanban') => {
    if (readOnly) return
    if (!ot || !targetStatus) return
    if (ot.estado === targetStatus) return

    // Pendiente -> En curso
    if (ot.estado === 'Pendiente' && targetStatus === 'En curso') {
      const tec = (ot.tecnico || '').trim()
      if (!tec || tec === 'Sin asignar' || tec === 'Por asignar') {
        showToast('Debe asignar un mecánico antes de iniciar el trabajo.', 'error')
        setSelectedOtId(ot.id)
        return
      }
      executeStatusChangeWithOptimisticUi(ot, 'En curso', {
        fecha_hora_inicio_trabajo: new Date().toISOString(),
        comentario: `Trabajo iniciado por ${tec}`
      })
      showToast(`Trabajo iniciado en ${formatCodigoOt(ot)}. Se registró automáticamente la hora de inicio.`, 'success')
      return
    }

    // Hacia Finalizada
    if (targetStatus === 'Finalizada') {
      if (source === 'ficha') {
        const trimmedSol = (fichaSolucion || '').trim()
        if (!trimmedSol) {
          setFichaPendingFinalizarMode(true)
          setFichaValidationError(
            'Debe ingresar la Solución definitiva para poder finalizar la OT.'
          )
          setTimeout(() => {
            fichaSolucionInputRef.current?.focus()
          }, 50)
          return
        }
      }

      setFinalizarModalOt(ot)
      setFinalizarSolucion(
        source === 'ficha' && fichaSolucion.trim()
          ? fichaSolucion
          : ot.solucion_definitiva || ''
      )
      setFinalizarTrabajoPendiente(
        source === 'ficha' ? fichaTrabajoPendiente : ot.trabajo_pendiente || ''
      )
      setFinalizarTecnico(
        source === 'ficha' && fichaTecnico.trim() ? fichaTecnico : ot.tecnico || ''
      )
      const condL = source === 'ficha' && fichaCondicionLinea ? fichaCondicionLinea : ot.condicion_linea || ''
      setFinalizarCondicionLinea(condL)
      setFinalizarUtilizoRepuestos(
        source === 'ficha' ? fichaUtilizoRepuestos : (ot.utilizo_repuestos ? 'si' : 'no')
      )

      if (source === 'ficha' && (fichaTiempoHoras || fichaTiempoMinutos)) {
        setFinalizarTiempoHoras(fichaTiempoHoras)
        setFinalizarTiempoMinutos(fichaTiempoMinutos)
      } else if (ot.tiempo_detencion_minutos > 0) {
        setFinalizarTiempoHoras(String(Math.floor(ot.tiempo_detencion_minutos / 60) || ''))
        setFinalizarTiempoMinutos(String(ot.tiempo_detencion_minutos % 60 || ''))
      } else if (condL === 'Línea detenida' && (ot.fecha_hora_inicio_trabajo || ot.fecha_inicio)) {
        const elMins = Math.max(0, Math.round((Date.now() - new Date(ot.fecha_hora_inicio_trabajo || ot.fecha_inicio).getTime()) / 60000))
        setFinalizarTiempoHoras(elMins >= 60 ? String(Math.floor(elMins / 60)) : '')
        setFinalizarTiempoMinutos(elMins > 0 ? String(elMins % 60) : '')
      } else {
        setFinalizarTiempoHoras('')
        setFinalizarTiempoMinutos('')
      }
      setFinalizarError('')
      return
    }

    // Finalizada -> En curso (Reabrir)
    if (ot.estado === 'Finalizada' && targetStatus === 'En curso') {
      setConfirmTransitionModal({
        ot,
        targetStatus: 'En curso',
        title: `¿Desea reabrir la ${formatCodigoOt(ot)}?`,
        description:
          'La orden volverá al estado "En curso" y se conservarán la solución definitiva y el trabajo pendiente registrados previamente como parte del historial.',
        confirmLabel: 'Sí, reabrir OT',
        comentario: 'Reapertura de OT para revisión adicional',
        submitting: false
      })
      return
    }

    // En curso -> Pendiente
    if (targetStatus === 'Pendiente') {
      setConfirmTransitionModal({
        ot,
        targetStatus: 'Pendiente',
        title: `¿Desea mover la ${formatCodigoOt(ot)} a Pendiente?`,
        description:
          'El estado cambiará a "Pendiente" conservando el registro de la fecha en que fue iniciada.',
        confirmLabel: 'Confirmar paso a Pendiente',
        comentario: 'OT devuelta a estado Pendiente',
        submitting: false
      })
    }
  }

  // Confirmar cierre desde el Modal Finalizar OT
  const handleConfirmFinalizarModal = async (e) => {
    e.preventDefault()
    if (!finalizarModalOt || finalizarSubmitting) return

    const trimmedTecnico = (finalizarTecnico || '').trim()
    if (!trimmedTecnico || trimmedTecnico === 'Sin asignar' || trimmedTecnico === 'Por asignar') {
      setFinalizarError('Debe indicar el mecánico asignado antes de finalizar.')
      return
    }

    if (!finalizarCondicionLinea) {
      setFinalizarError('Debe seleccionar obligatoriamente la condición de la línea (Línea detenida o Línea produciendo).')
      return
    }

    const trimmedSolucion = (finalizarSolucion || '').trim()
    if (!trimmedSolucion) {
      setFinalizarError('La Solución definitiva es obligatoria para poder finalizar la OT.')
      return
    }

    let totalMinutosDetencion = null
    if (finalizarCondicionLinea === 'Línea detenida') {
      const h = parseInt(finalizarTiempoHoras, 10) || 0
      const m = parseInt(finalizarTiempoMinutos, 10) || 0
      totalMinutosDetencion = Math.max(0, h * 60 + m)
    }

    setFinalizarError('')
    setFinalizarSubmitting(true)
    const targetOt = finalizarModalOt
    setFinalizarModalOt(null)

    const nowIso = new Date().toISOString()
    await executeStatusChangeWithOptimisticUi(targetOt, 'Finalizada', {
      solucion_definitiva: trimmedSolucion,
      trabajo_pendiente: (finalizarTrabajoPendiente || '').trim() || null,
      tecnico: trimmedTecnico,
      condicion_linea: finalizarCondicionLinea,
      tiempo_detencion_minutos: totalMinutosDetencion,
      utilizo_repuestos: finalizarUtilizoRepuestos === 'si',
      fecha_hora_fin_trabajo: nowIso,
      comentario: `OT finalizada. Condición: ${finalizarCondicionLinea}${totalMinutosDetencion > 0 ? ` (${formatMinutosLegible(totalMinutosDetencion)} detenida)` : ''}. Solución: ${trimmedSolucion}`
    })

    const durText = totalMinutosDetencion > 0
      ? `Tiempo línea detenida: ${formatMinutosLegible(totalMinutosDetencion)}`
      : `Duración registrada: ${formatDuracionTrabajo(targetOt.fecha_hora_inicio_trabajo || targetOt.fecha_inicio, nowIso)}`
    showToast(`OT ${formatCodigoOt(targetOt)} finalizada. ${durText}`, 'success')

    setFinalizarSubmitting(false)
  }

  // Confirmar Reabrir OT o volver a Pendiente
  const handleConfirmTransitionModalSubmit = async () => {
    if (!confirmTransitionModal || confirmTransitionModal.submitting) return
    const { ot, targetStatus, comentario } = confirmTransitionModal
    setConfirmTransitionModal((prev) => ({ ...prev, submitting: true }))
    setConfirmTransitionModal(null)

    await executeStatusChangeWithOptimisticUi(ot, targetStatus, {
      comentario: comentario || `${ot.estado} → ${targetStatus}`
    })
  }

  // Consumir repuesto desde la Ficha de la OT
  const handleConsumirRepuestoFicha = async (e) => {
    e.preventDefault()
    if (!selectedOt || consumoSubmitting) return

    if (!selectedRepuestoId) {
      setConsumoError('Debe buscar y seleccionar un repuesto del inventario.')
      return
    }

    const matchedRep = repuestosList.find((r) => r.id === selectedRepuestoId || r.codigo === selectedRepuestoId)
    if (!matchedRep) {
      setConsumoError('El repuesto seleccionado no es válido.')
      return
    }

    const cantNum = Number(consumoCantidad)
    if (isNaN(cantNum) || cantNum <= 0) {
      setConsumoError('Ingrese una cantidad mayor a 0.')
      return
    }

    const stockDisp = Number(matchedRep.stock_actual ?? matchedRep.stock ?? 0)
    if (cantNum > stockDisp) {
      setConsumoError(`Stock insuficiente. Stock actual disponible: ${stockDisp} ${matchedRep.unidad_medida || 'UND'}.`)
      return
    }

    setConsumoSubmitting(true)
    setConsumoError('')

    try {
      await consumirRepuestoEnOt({
        otId: selectedOt.id,
        repuestoId: matchedRep.id,
        cantidad: cantNum,
        tecnico: fichaTecnico || selectedOt.tecnico
      })

      showToast(`Se registró el consumo de ${cantNum} ${matchedRep.unidad_medida || 'UND'} de ${matchedRep.nombre || matchedRep.repuesto}.`, 'success')
      setConsumoCantidad('')
      setSelectedRepuestoId('')
      setRepuestoSearchQuery('')
      setFichaUtilizoRepuestos('si')

      // Recargar repuestos de la OT e inventario global
      const updatedReps = await fetchRepuestosDeOt(selectedOt.id)
      setFichaRepuestosList(updatedReps || [])
      if (typeof onInventarioChange === 'function') {
        onInventarioChange()
      }
    } catch (err) {
      setConsumoError(err.message || 'Error al registrar consumo del repuesto.')
    } finally {
      setConsumoSubmitting(false)
    }
  }

  // Guardar datos o finalizar desde la Ficha Individual
  const handleSaveFichaChanges = async (e, forceFinalizar = false) => {
    if (readOnly) { if (e && e.preventDefault) e.preventDefault(); return }
    if (e) e.preventDefault()
    if (!selectedOt || fichaSaving) return

    setFichaValidationError('')

    const shouldFinalize = forceFinalizar || fichaPendingFinalizarMode
    if (shouldFinalize || selectedOt.estado === 'Finalizada') {
      if (!(fichaSolucion || '').trim()) {
        setFichaValidationError(
          'No es posible finalizar ni guardar una OT Finalizada con la Solución definitiva vacía.'
        )
        fichaSolucionInputRef.current?.focus()
        return
      }
    }

    setFichaSaving(true)
    try {
      if (shouldFinalize && selectedOt.estado !== 'Finalizada') {
        const trimmedTec = (fichaTecnico || '').trim()
        if (!trimmedTec || trimmedTec === 'Sin asignar' || trimmedTec === 'Por asignar') {
          setFichaValidationError('Debe asignar un mecánico antes de finalizar el trabajo.')
          return
        }
        if (!fichaCondicionLinea) {
          setFichaValidationError('Debe seleccionar obligatoriamente la condición de la línea (Línea detenida o Línea produciendo).')
          return
        }
        if (fichaUtilizoRepuestos === 'si' && fichaRepuestosList.length === 0) {
          setFichaValidationError('Indicó que se utilizaron repuestos. Debe registrar al menos un repuesto consumido a continuación.')
          return
        }
        let totalFichaMinutos = null
        if (fichaCondicionLinea === 'Línea detenida') {
          const h = parseInt(fichaTiempoHoras, 10) || 0
          const m = parseInt(fichaTiempoMinutos, 10) || 0
          totalFichaMinutos = Math.max(0, h * 60 + m)
        }
        const nowFinIso = new Date().toISOString()
        const ok = await executeStatusChangeWithOptimisticUi(selectedOt, 'Finalizada', {
          solucion_definitiva: fichaSolucion.trim(),
          trabajo_pendiente: (fichaTrabajoPendiente || '').trim() || null,
          tecnico: trimmedTec,
          condicion_linea: fichaCondicionLinea,
          tiempo_detencion_minutos: totalFichaMinutos,
          utilizo_repuestos: fichaUtilizoRepuestos === 'si',
          fecha_hora_fin_trabajo: nowFinIso,
          comentario: `Finalizada desde Ficha. Condición: ${fichaCondicionLinea}${totalFichaMinutos > 0 ? ` (${formatMinutosLegible(totalFichaMinutos)} detenida)` : ''}. Solución: ${fichaSolucion.trim()}`
        })
        if (ok) {
          setFichaPendingFinalizarMode(false)
          const dur = totalFichaMinutos > 0
            ? `Tiempo línea detenida: ${formatMinutosLegible(totalFichaMinutos)}`
            : `Duración total: ${formatDuracionTrabajo(selectedOt.fecha_hora_inicio_trabajo || selectedOt.fecha_inicio, nowFinIso)}`
          showToast(`OT ${formatCodigoOt(selectedOt)} finalizada. ${dur}`, 'success')
        }
      } else {
        let totalFichaMinutos = null
        if (fichaCondicionLinea === 'Línea detenida') {
          const h = parseInt(fichaTiempoHoras, 10) || 0
          const m = parseInt(fichaTiempoMinutos, 10) || 0
          totalFichaMinutos = Math.max(0, h * 60 + m)
        }
        const updated = await updateOrdenTrabajoDetails(
          selectedOt.id,
          {
            trabajo: fichaTrabajo,
            tecnico: fichaTecnico,
            prioridad: fichaPrioridad,
            solucion_definitiva: fichaSolucion,
            trabajo_pendiente: fichaTrabajoPendiente,
            condicion_linea: fichaCondicionLinea || null,
            tiempo_detencion_minutos: totalFichaMinutos,
            utilizo_repuestos: fichaUtilizoRepuestos === 'si'
          },
          session,
          equiposList
        )
        setOrdenesList((prev) =>
          prev.map((item) => (item.id === selectedOt.id ? updated : item))
        )
        showToast(`Cambios guardados en ${formatCodigoOt(selectedOt)}`, 'success')
      }
    } catch (err) {
      setFichaValidationError(err.message || 'No fue posible actualizar la OT.')
    } finally {
      setFichaSaving(false)
    }
  }

  // Crear nueva OT
  const handleCreateNuevaOtSubmit = async (e) => {
    e.preventDefault()
    if (nuevaOtSubmitting) return

    if (!nuevaOtForm.trabajo.trim()) {
      setNuevaOtError('Debe ingresar la descripción del trabajo o problema.')
      return
    }

    setNuevaOtError('')
    setNuevaOtSubmitting(true)

    try {
      let totalMinutos = null
      if (nuevaOtForm.condicion_linea === 'Línea detenida') {
        const h = parseInt(nuevaOtForm.tiempo_detencion_horas, 10) || 0
        const m = parseInt(nuevaOtForm.tiempo_detencion_minutos, 10) || 0
        totalMinutos = Math.max(0, h * 60 + m)
      }
      const created = await createOrdenTrabajo(
        {
          ...nuevaOtForm,
          tiempo_detencion_minutos: totalMinutos
        },
        equiposList,
        session
      )
      setOrdenesList((prev) => {
        if (prev.some((x) => x.id === created.id)) return prev
        return [created, ...prev]
      })
      setIsNuevaOtModalOpen(false)
      setNuevaOtForm({
        equipo_id: '',
        ubicacion: '',
        trabajo: '',
        tecnico: 'Maximiliano Badilla',
        origen: 'Manual',
        prioridad: 'Media',
        tipo_intervencion: 'Correctiva',
        es_falla: true,
        tipo_falla: 'Mecánica',
        condicion_linea: 'Línea produciendo',
        tiempo_detencion_horas: '',
        tiempo_detencion_minutos: ''
      })
      setMobileActiveTab('Pendiente')
      showToast(`${formatCodigoOt(created)} creada en Pendientes`, 'success')
    } catch (err) {
      setNuevaOtError(err.message || 'Error al crear la Orden de Trabajo.')
    } finally {
      setNuevaOtSubmitting(false)
    }
  }

  // Manejadores de Drag & Drop
  const handleDragStart = (e, ot) => {
    if (readOnly) { e.preventDefault(); return }
    setDraggedOtId(ot.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', ot.id)
  }

  const handleDragOverColumn = (e, estadoCol) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverColumn !== estadoCol) {
      setDragOverColumn(estadoCol)
    }
  }

  const handleDropOnColumn = (e, targetEstado) => {
    e.preventDefault()
    const droppedId = e.dataTransfer.getData('text/plain') || draggedOtId
    setDragOverColumn(null)
    setDraggedOtId(null)

    if (!droppedId) return
    const ot = ordenesList.find((item) => item.id === droppedId)
    if (!ot || ot.estado === targetEstado) return

    setMobileActiveTab(targetEstado)
    handleInitiateStatusChange(ot, targetEstado, 'drag')
  }

  const handleDragEnd = () => {
    setDraggedOtId(null)
    setDragOverColumn(null)
  }

  // Soporte táctil de swipe horizontal entre pestañas en móvil
  const handleTouchStartBoard = (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX
    }
  }

  const handleTouchEndBoard = (e) => {
    if (touchStartXRef.current === null || !e.changedTouches || e.changedTouches.length === 0) {
      return
    }
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current
    touchStartXRef.current = null
    if (Math.abs(deltaX) < 70) return

    const currentIndex = ESTADOS_OT.indexOf(mobileActiveTab)
    if (deltaX < -70 && currentIndex < ESTADOS_OT.length - 1) {
      setMobileActiveTab(ESTADOS_OT[currentIndex + 1])
    } else if (deltaX > 70 && currentIndex > 0) {
      setMobileActiveTab(ESTADOS_OT[currentIndex - 1])
    }
  }

  // Helper para agregar/quitar técnico en selector rápido del modal
  const toggleTecnicoInString = (currentStr, tecNombre) => {
    const list = parseTecnicos(currentStr)
    const exists = list.some((t) => t.toLowerCase() === tecNombre.toLowerCase())
    if (exists) {
      const next = list.filter((t) => t.toLowerCase() !== tecNombre.toLowerCase())
      return next.join(' / ')
    }
    return [...list, tecNombre].join(' / ')
  }

  // Renderizado de cada Tarjeta OT (Estética limpia tipo Fracttal)
  const renderOtCard = (ot) => {
    const codigo = formatCodigoOt(ot)
    const { equipoNombre, ubicacionDisplay } = resolveOtEquipoDisplay(ot, equiposList)
    const meta = ESTADO_META[ot.estado] || ESTADO_META['Pendiente']
    const isDragging = draggedOtId === ot.id
    const isUpdatingCard = updatingOtId === ot.id
    const origenLabel = ot.origen || 'Manual'

    return (
      <article
        key={ot.id}
        data-testid={`ot-card-${codigo}`}
        data-ot-id={ot.id}
        data-ot-estado={ot.estado}
        className={`ot-kanban-card ${meta.cardClass} ${isDragging ? 'is-dragging' : ''} ${
          isUpdatingCard ? 'is-updating-card' : ''
        }`}
        draggable={!isUpdatingCard && !readOnly}
        onDragStart={(e) => handleDragStart(e, ot)}
        onDragEnd={handleDragEnd}
        onClick={() => setSelectedOtId(ot.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setSelectedOtId(ot.id)
          }
        }}
      >
        {/* Cabecera: Número OT + Badge de Estado */}
        <div className="ot-card-header-row">
          <span className="ot-card-number">{codigo}</span>
          <span className={`ot-status-badge ${meta.badgeClass}`}>
            {isUpdatingCard ? 'Actualizando...' : meta.label}
          </span>
        </div>

        {/* Equipo y Ubicación */}
        <div className="ot-card-asset-info">
          <h4 className="ot-card-equipo">{equipoNombre}</h4>
          <span className="ot-card-ubicacion">{ubicacionDisplay}</span>
        </div>

        {/* Descripción breve del trabajo */}
        <p className="ot-card-trabajo">{ot.trabajo}</p>

        {/* Solicitante si proviene de Solicitud QR */}
        {ot.solicitante_nombre && (
          <div className="ot-card-solicitante-row">
            <span>👤 Solicitante:</span>
            <strong className="ot-card-solicitante-name">
              {ot.solicitante_nombre} ({ot.solicitante_area || ot.area || 'Planta'})
            </strong>
          </div>
        )}

        {/* Condición de línea si está definida */}
        {ot.condicion_linea && (
          <div>
            <span
              className={`ot-condicion-badge ${
                ot.condicion_linea === 'Línea detenida' ? 'detenida' : 'produciendo'
              }`}
            >
              {ot.condicion_linea === 'Línea detenida' ? '🛑 Línea detenida' : '⚡ Línea produciendo'}
            </span>
          </div>
        )}

        {/* Tiempo detenido / Duración de trabajo */}
        {ot.tiempo_detencion_minutos > 0 ? (
          <div>
            <span className="ot-card-duracion-badge ot-badge-detencion">
              🛑 Detenida: {formatMinutosLegible(ot.tiempo_detencion_minutos)}
            </span>
          </div>
        ) : (
          ot.estado === 'Finalizada' &&
          (ot.fecha_hora_inicio_trabajo || ot.fecha_inicio) &&
          (ot.fecha_hora_fin_trabajo || ot.fecha_finalizacion) && (
            <div>
              <span className="ot-card-duracion-badge">
                ⏱️ {formatDuracionTrabajo(
                  ot.fecha_hora_inicio_trabajo || ot.fecha_inicio,
                  ot.fecha_hora_fin_trabajo || ot.fecha_finalizacion
                )}
              </span>
            </div>
          )
        )}

        {/* Indicador de repuestos utilizados */}
        {ot.utilizo_repuestos && (
          <div style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 600 }}>
            ⚙️ Con repuestos de inventario
          </div>
        )}

        {/* Solución resumida si está finalizada */}
        {ot.estado === 'Finalizada' && ot.solucion_definitiva && (
          <div className="ot-card-solucion-box">
            <strong>Solución:</strong> {ot.solucion_definitiva}
          </div>
        )}

        {/* Técnico(s) */}
        <div className="ot-card-tecnico-row">
          <span className="ot-card-tecnico-name">{ot.tecnico || 'Sin asignar'}</span>
        </div>

        {/* Fecha y Origen */}
        <div className="ot-card-meta-footer">
          <span className="ot-card-date">{formatFechaHoraCL(ot.fecha_reporte)}</span>
          <span
            className={`ot-card-origin-badge origin-${origenLabel
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')}`}
          >
            {origenLabel}
          </span>
        </div>

        {/* Acciones de la tarjeta */}
        <div
          className="ot-card-actions-row"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {ot.estado === 'Pendiente' && (
            <button
              type="button"
              className="ot-card-btn ot-card-btn-iniciar"
              data-testid={`btn-iniciar-${codigo}`}
              disabled={isUpdatingCard}
              onClick={() => handleInitiateStatusChange(ot, 'En curso', 'button')}
            >
              {isUpdatingCard ? 'Actualizando...' : 'Iniciar'}
            </button>
          )}

          {ot.estado === 'En curso' && (
            <button
              type="button"
              className="ot-card-btn ot-card-btn-finalizar"
              data-testid={`btn-finalizar-${codigo}`}
              disabled={isUpdatingCard}
              onClick={() => handleInitiateStatusChange(ot, 'Finalizada', 'button')}
            >
              {isUpdatingCard ? 'Actualizando...' : 'Finalizar'}
            </button>
          )}

          {ot.estado === 'Finalizada' && (
            <button
              type="button"
              className="ot-card-btn ot-card-btn-reabrir"
              data-testid={`btn-reabrir-${codigo}`}
              disabled={isUpdatingCard}
              onClick={() => handleInitiateStatusChange(ot, 'En curso', 'button')}
            >
              {isUpdatingCard ? 'Actualizando...' : 'Reabrir'}
            </button>
          )}

          <button
            type="button"
            className="ot-card-btn ot-card-btn-ver"
            data-testid={`btn-ficha-${codigo}`}
            onClick={() => setSelectedOtId(ot.id)}
          >
            Ver OT
          </button>
        </div>
      </article>
    )
  }

  return (
    <div className="ot-module-wrapper">
      {/* 1. CABECERA ESTABLE SIN SPINNER DE PARPADEO (#3 y #5) */}
      <header className="ot-clean-header">
        <div className="ot-clean-header-left">
          <h1 className="ot-clean-title">Órdenes de Trabajo</h1>
          <p className="ot-clean-subtitle">
            Gestión y seguimiento de trabajos de mantenimiento
          </p>
        </div>

        <div className="ot-clean-header-actions">
          <button
            type="button"
            className="btn-secondary"
            data-testid="btn-qr-planta"
            onClick={() => setIsQrPlantModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>📱</span> Código QR Planta
          </button>
          <button
            type="button"
            className="btn-secondary ot-btn-header-dash"
            onClick={onNavigateToDashboard}
          >
            Ver Dashboard
          </button>
          {!readOnly && (<button
            type="button"
            className="btn-primary ot-btn-header-new"
            data-testid="btn-nueva-ot"
            onClick={() => {
              setNuevaOtError('')
              setIsNuevaOtModalOpen(true)
            }}
          >
            + Nueva OT
          </button>)}
        </div>
      </header>

      {/* NOTIFICACIÓN VISUAL FLOTANTE (Toast) */}
      {toastMessage && (
        <div
          data-testid="ot-toast-banner"
          className={`ot-toast-alert ot-toast-${toastMessage.type}`}
          role="status"
        >
          <span className="ot-toast-text">{toastMessage.text}</span>
          <button
            type="button"
            className="ot-toast-close"
            onClick={() => setToastMessage(null)}
            aria-label="Cerrar aviso"
          >
            <Icon n="x" />
          </button>
        </div>
      )}

      {/* 2. 4 TARJETAS KPI SUPERIORES EN UNA SOLA FILA DESKTOP (#4) */}
      <div className="ot-kpi-cards-grid" data-testid="ot-metrics-strip">
        <div
          className="ot-kpi-card kpi-card-pendiente"
          onClick={() => setMobileActiveTab('Pendiente')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setMobileActiveTab('Pendiente')}
        >
          <span className="ot-kpi-number" data-testid="metric-pendientes-count">
            {liveCounts.pendientes}
          </span>
          <span className="ot-kpi-label">OT Pendientes</span>
        </div>

        <div
          className="ot-kpi-card kpi-card-encurso"
          onClick={() => setMobileActiveTab('En curso')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setMobileActiveTab('En curso')}
        >
          <span className="ot-kpi-number" data-testid="metric-encurso-count">
            {liveCounts.enCurso}
          </span>
          <span className="ot-kpi-label">OT En curso</span>
        </div>

        <div
          className="ot-kpi-card kpi-card-finalizada"
          onClick={() => setMobileActiveTab('Finalizada')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setMobileActiveTab('Finalizada')}
        >
          <span className="ot-kpi-number" data-testid="metric-finalizadas-count">
            {liveCounts.finalizadasTotal}
          </span>
          <span className="ot-kpi-label">Finalizadas</span>
        </div>

        <div className="ot-kpi-card kpi-card-cerradas-mes">
          <span className="ot-kpi-number" data-testid="metric-finalizadas-mes-count">
            {liveCounts.finalizadasMesActual}
          </span>
          <span className="ot-kpi-label">Cerradas mes</span>
        </div>
      </div>

      {/* 3. FILTROS EN UNA SOLA BARRA HORIZONTAL (#5) */}
      <div className="ot-compact-filters-bar">
        <div className="ot-filter-input-wrap">
          <input
            type="text"
            className="ot-filter-search-input"
            placeholder="Buscar OT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar OT"
          />
        </div>

        <select
          className="ot-filter-select-item"
          value={filterEquipoId}
          onChange={(e) => setFilterEquipoId(e.target.value)}
          aria-label="Equipo"
        >
          <option value="">Equipo</option>
          {equiposList.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.nombre}
            </option>
          ))}
        </select>

        <select
          className="ot-filter-select-item"
          value={filterTecnico}
          onChange={(e) => setFilterTecnico(e.target.value)}
          aria-label="Técnico"
        >
          <option value="">Técnico</option>
          {tecnicosCatalogo.map((tec) => (
            <option key={tec} value={tec}>
              {tec}
            </option>
          ))}
        </select>

        <select
          className="ot-filter-select-item"
          value={filterOrigen}
          onChange={(e) => setFilterOrigen(e.target.value)}
          aria-label="Origen"
        >
          <option value="">Origen</option>
          {ORIGENES_OT.map((orig) => (
            <option key={orig} value={orig}>
              {orig}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="ot-filter-clear-btn"
          onClick={() => {
            setSearchQuery('')
            setFilterEquipoId('')
            setFilterTecnico('')
            setFilterOrigen('')
          }}
          disabled={!searchQuery && !filterEquipoId && !filterTecnico && !filterOrigen}
        >
          Limpiar
        </button>
      </div>

      {/* 4. PESTAÑAS PARA MÓVIL (#10) */}
      <div className="ot-mobile-tabs-bar" role="tablist" aria-label="Estados de Órdenes de Trabajo">
        {ESTADOS_OT.map((estadoKey) => {
          const meta = ESTADO_META[estadoKey]
          const count = columnsMap[estadoKey]?.length || 0
          const isActive = mobileActiveTab === estadoKey
          const isDragTarget = dragOverColumn === estadoKey
          return (
            <button
              key={estadoKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={`mobile-tab-${estadoKey}`}
              className={`ot-mobile-tab-btn ${isActive ? 'active' : ''} ${
                isDragTarget ? 'drag-over' : ''
              } tab-${estadoKey.toLowerCase().replace(/\s+/g, '')}`}
              onClick={() => setMobileActiveTab(estadoKey)}
              onDragOver={(e) => handleDragOverColumn(e, estadoKey)}
              onDrop={(e) => handleDropOnColumn(e, estadoKey)}
            >
              <span className="ot-mobile-tab-title">{meta.shortTitle}</span>
              <span className="ot-mobile-tab-count">{count}</span>
            </button>
          )
        })}
      </div>

      {/* 5. CARGA INICIAL ÚNICA O TABLERO KANBAN PRINCIPAL DE 3 COLUMNAS (#2, #6, #9, #12, #15) */}
      {initialLoading && ordenesList.length === 0 ? (
        <div className="ot-initial-loading-box" data-testid="ot-initial-loading">
          <span className="ot-initial-spinner" aria-hidden="true" />
          <p className="ot-initial-loading-text">Cargando órdenes...</p>
        </div>
      ) : (
        <div
          className="ot-kanban-board"
          onTouchStart={handleTouchStartBoard}
          onTouchEnd={handleTouchEndBoard}
        >
          {ESTADOS_OT.map((estadoKey) => {
            const meta = ESTADO_META[estadoKey]
            const cards = columnsMap[estadoKey] || []
            const isMobileVisible = mobileActiveTab === estadoKey
            const isDragTarget = dragOverColumn === estadoKey
            const draggedOtObj = draggedOtId
              ? ordenesList.find((o) => o.id === draggedOtId)
              : null
            const showDropCue =
              isDragTarget && (!draggedOtObj || draggedOtObj.estado !== estadoKey)

            return (
              <div
                key={estadoKey}
                data-testid={`kanban-col-${estadoKey}`}
                data-column-estado={estadoKey}
                className={`ot-kanban-column ${meta.columnClass} ${
                  isMobileVisible ? 'mobile-active-col' : 'mobile-hidden-col'
                } ${showDropCue ? 'is-drag-over' : ''}`}
                onDragOver={(e) => handleDragOverColumn(e, estadoKey)}
                onDragLeave={() => {
                  if (dragOverColumn === estadoKey) setDragOverColumn(null)
                }}
                onDrop={(e) => handleDropOnColumn(e, estadoKey)}
              >
                <div className="ot-kanban-col-header">
                  <h3 className="ot-kanban-col-title">
                    {meta.colTitle}{' '}
                    <span className="ot-kanban-col-count" data-testid={`col-count-${estadoKey}`}>
                      ({cards.length})
                    </span>
                  </h3>
                </div>

                {showDropCue && (
                  <div className="ot-kanban-drop-indicator">
                    Mover a {meta.label}
                  </div>
                )}

                <div className="ot-kanban-col-body">
                  {cards.length === 0 ? (
                    <div className="ot-kanban-empty-state">
                      <p>{meta.emptyText}</p>
                    </div>
                  ) : (
                    cards.map((ot) => renderOtCard(ot))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ==========================================================================
          MODAL 1: FICHA INDIVIDUAL DE ORDEN DE TRABAJO (#14)
         ========================================================================== */}
      {selectedOt && (
        <div
          className="modal-overlay"
          onClick={() => !fichaSaving && setSelectedOtId(null)}
        >
          <div
            className="modal-container modal-wide ot-ficha-modal"
            data-testid="ot-ficha-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const codigo = formatCodigoOt(selectedOt)
              const { equipoNombre, ubicacionDisplay } = resolveOtEquipoDisplay(
                selectedOt,
                equiposList
              )
              const meta = ESTADO_META[selectedOt.estado] || ESTADO_META['Pendiente']

              return (
                <>
                  <div className="modal-header ot-ficha-header">
                    <div>
                      <div className="ot-ficha-badges-row">
                        <span className="ot-ficha-code" data-testid="ficha-codigo-ot">
                          {codigo}
                        </span>
                        <span
                          className={`ot-status-badge ${meta.badgeClass}`}
                          data-testid="ficha-estado-badge"
                        >
                          {meta.label}
                        </span>
                        <span className="ot-ficha-origin-tag">
                          Origen: <strong>{selectedOt.origen || 'Manual'}</strong>
                        </span>
                        {selectedOt.solicitante_nombre && (
                          <span className="ot-ficha-origin-tag" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                            Solicitante: <strong>{selectedOt.solicitante_nombre} ({selectedOt.solicitante_area || selectedOt.area || 'Planta'})</strong>
                          </span>
                        )}
                        {selectedOt.tiempo_detencion_minutos > 0 ? (
                          <span className="ot-card-duracion-badge ot-badge-detencion">
                            🛑 Línea detenida: {formatMinutosLegible(selectedOt.tiempo_detencion_minutos)}
                          </span>
                        ) : (
                          selectedOt.estado === 'Finalizada' &&
                          (selectedOt.fecha_hora_inicio_trabajo || selectedOt.fecha_inicio) &&
                          (selectedOt.fecha_hora_fin_trabajo || selectedOt.fecha_finalizacion) && (
                            <span className="ot-card-duracion-badge">
                              ⏱️ Duración: {formatDuracionTrabajo(
                                selectedOt.fecha_hora_inicio_trabajo || selectedOt.fecha_inicio,
                                selectedOt.fecha_hora_fin_trabajo || selectedOt.fecha_finalizacion
                              )}
                            </span>
                          )
                        )}
                      </div>
                      <h2 className="modal-title" style={{ marginTop: '0.35rem' }}>
                        {equipoNombre} — <span style={{ fontWeight: 500 }}>{ubicacionDisplay}</span>
                      </h2>
                    </div>

                    <button
                      type="button"
                      className="modal-close-btn"
                      data-testid="btn-cerrar-ficha"
                      onClick={() => setSelectedOtId(null)}
                    >
                      <Icon n="x" />
                    </button>
                  </div>

                  <div className="modal-body ot-ficha-body">
                    {/* Selector de Estado y acciones rápidas */}
                    <div className="ot-ficha-status-bar">
                      <div className="ot-ficha-status-selector-group">
                        <label
                          htmlFor="ficha-estado-select"
                          className="ot-ficha-status-label"
                        >
                          Estado
                        </label>
                        <select
                          id="ficha-estado-select"
                          data-testid="ficha-estado-select"
                          className={`form-select ot-ficha-status-select select-${selectedOt.estado
                            .toLowerCase()
                            .replace(/\s+/g, '')}`}
                          value={fichaPendingFinalizarMode ? 'Finalizada' : selectedOt.estado}
                          onChange={(e) => {
                            const nextSt = e.target.value
                            if (nextSt === selectedOt.estado) {
                              setFichaPendingFinalizarMode(false)
                              setFichaValidationError('')
                              return
                            }
                            if (nextSt === 'Finalizada') {
                              if ((fichaSolucion || '').trim()) {
                                executeStatusChangeWithOptimisticUi(selectedOt, 'Finalizada', {
                                  solucion_definitiva: fichaSolucion.trim(),
                                  trabajo_pendiente: (fichaTrabajoPendiente || '').trim() || null,
                                  tecnico: (fichaTecnico || '').trim() || selectedOt.tecnico,
                                  comentario: `Finalizada desde Ficha de OT. Solución: ${fichaSolucion.trim()}`
                                })
                              } else {
                                setFichaPendingFinalizarMode(true)
                                setFichaValidationError(
                                  'Para finalizar la OT es obligatorio ingresar la Solución definitiva a continuación.'
                                )
                                setTimeout(() => {
                                  fichaSolucionInputRef.current?.focus()
                                }, 50)
                              }
                            } else {
                              setFichaPendingFinalizarMode(false)
                              handleInitiateStatusChange(selectedOt, nextSt, 'ficha')
                            }
                          }}
                        >
                          {ESTADOS_OT.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="ot-ficha-quick-actions">
                        {selectedOt.estado === 'Pendiente' && (
                          <button
                            type="button"
                            className="ot-card-btn ot-card-btn-iniciar"
                            data-testid="ficha-btn-iniciar"
                            onClick={() =>
                              handleInitiateStatusChange(selectedOt, 'En curso', 'ficha')
                            }
                          >
                            Iniciar OT
                          </button>
                        )}
                        {selectedOt.estado === 'En curso' && (
                          <>
                            <button
                              type="button"
                              className="ot-card-btn ot-card-btn-finalizar"
                              data-testid="ficha-btn-finalizar"
                              onClick={() => {
                                if ((fichaSolucion || '').trim()) {
                                  handleSaveFichaChanges(null, true)
                                } else {
                                  setFichaPendingFinalizarMode(true)
                                  setFichaValidationError(
                                    'No es posible finalizar la OT sin ingresar una solución definitiva.'
                                  )
                                  fichaSolucionInputRef.current?.focus()
                                }
                              }}
                            >
                              Finalizar OT
                            </button>
                            <button
                              type="button"
                              className="ot-card-btn ot-card-btn-ver"
                              onClick={() =>
                                handleInitiateStatusChange(selectedOt, 'Pendiente', 'ficha')
                              }
                            >
                              Mover a Pendiente
                            </button>
                          </>
                        )}
                        {selectedOt.estado === 'Finalizada' && (
                          <button
                            type="button"
                            className="ot-card-btn ot-card-btn-reabrir"
                            data-testid="ficha-btn-reabrir"
                            onClick={() =>
                              handleInitiateStatusChange(selectedOt, 'En curso', 'ficha')
                            }
                          >
                            Reabrir OT
                          </button>
                        )}
                      </div>
                    </div>

                    {fichaValidationError && (
                      <div
                        className="alert-error"
                        data-testid="ficha-validation-error"
                        role="alert"
                        style={{ marginBottom: '0.85rem' }}
                      >
                        <span><Icon n="warn" /></span>
                        <span>{fichaValidationError}</span>
                      </div>
                    )}

                    {/* Fechas de la OT */}
                    <div className="ot-ficha-dates-strip">
                      <div className="ot-ficha-date-item">
                        <span className="ot-date-lbl">Fecha de reporte</span>
                        <strong className="ot-date-val">
                          {formatFechaHoraCL(selectedOt.fecha_reporte)}
                        </strong>
                      </div>
                      <div className="ot-ficha-date-item">
                        <span className="ot-date-lbl">Fecha de inicio</span>
                        <strong
                          className="ot-date-val"
                          data-testid="ficha-fecha-inicio"
                        >
                          {selectedOt.fecha_inicio
                            ? formatFechaHoraCL(selectedOt.fecha_inicio)
                            : 'Sin iniciar'}
                        </strong>
                      </div>
                      <div className="ot-ficha-date-item">
                        <span className="ot-date-lbl">Fecha de finalización</span>
                        <strong
                          className="ot-date-val"
                          data-testid="ficha-fecha-finalizacion"
                        >
                          {selectedOt.fecha_finalizacion
                            ? formatFechaHoraCL(selectedOt.fecha_finalizacion)
                            : 'En atención'}
                        </strong>
                      </div>
                      <div className="ot-ficha-date-item">
                        <span className="ot-date-lbl">
                          {selectedOt.tiempo_detencion_minutos > 0
                            ? 'Tiempo línea detenida'
                            : 'Duración calculada'}
                        </span>
                        <strong className="ot-date-val">
                          {selectedOt.tiempo_detencion_minutos > 0
                            ? `🛑 ${formatMinutosLegible(selectedOt.tiempo_detencion_minutos)}`
                            : formatDuracionTrabajo(
                                selectedOt.fecha_hora_inicio_trabajo || selectedOt.fecha_inicio,
                                selectedOt.fecha_hora_fin_trabajo || selectedOt.fecha_finalizacion
                              )}
                        </strong>
                      </div>
                    </div>

                    {/* Formulario de detalle de la OT */}
                    <form onSubmit={(e) => handleSaveFichaChanges(e, false)} noValidate>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Equipo</label>
                          <input
                            type="text"
                            className="form-input"
                            value={`${equipoNombre} (${ubicacionDisplay})`}
                            disabled
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="ficha-prioridad">
                            Prioridad
                          </label>
                          <select
                            id="ficha-prioridad"
                            className="form-select"
                            value={fichaPrioridad}
                            onChange={(e) => setFichaPrioridad(e.target.value)}
                          >
                            {PRIORIDADES_OT.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group full-width">
                          <label className="form-label" htmlFor="ficha-tecnico-input">
                            Técnico(s) asignado(s)
                          </label>
                          <input
                            id="ficha-tecnico-input"
                            data-testid="ficha-tecnico-input"
                            type="text"
                            className="form-input"
                            value={fichaTecnico}
                            onChange={(e) => setFichaTecnico(e.target.value)}
                            placeholder="Ej. Maximiliano Badilla / Leonel Carreño"
                          />
                          <div className="ot-tecnicos-chips-row" style={{ marginTop: '0.4rem' }}>
                            {TECNICOS_BASE.map((t) => {
                              const active = parseTecnicos(fichaTecnico).some(
                                (x) => x.toLowerCase() === t.nombre.toLowerCase()
                              )
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  className={`ot-tec-chip ${active ? 'selected' : ''}`}
                                  onClick={() =>
                                    setFichaTecnico(toggleTecnicoInString(fichaTecnico, t.nombre))
                                  }
                                >
                                  {active ? <Icon n="check" /> : '+ '}
                                  {t.nombre}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="form-group full-width">
                          <label className="form-label" htmlFor="ficha-trabajo-input">
                            Trabajo solicitado / Problema reportado
                          </label>
                          <textarea
                            id="ficha-trabajo-input"
                            className="form-textarea"
                            rows={2}
                            value={fichaTrabajo}
                            onChange={(e) => setFichaTrabajo(e.target.value)}
                          />
                        </div>

                        {/* Condición de la línea durante el trabajo */}
                        <div className="form-group full-width">
                          <label className="form-label">
                            Condición de la línea durante el trabajo <span className="required-mark">*</span>
                          </label>
                          <div className="ot-condicion-options-row">
                            <label
                              className={`ot-condicion-opt-card ${
                                fichaCondicionLinea === 'Línea detenida' ? 'selected-detenida' : ''
                              }`}
                            >
                              <input
                                type="radio"
                                name="ficha_condicion_linea"
                                value="Línea detenida"
                                checked={fichaCondicionLinea === 'Línea detenida'}
                                onChange={(e) => setFichaCondicionLinea(e.target.value)}
                              />
                              <div>
                                <div className="ot-condicion-opt-title">🛑 Línea detenida</div>
                                <div className="ot-condicion-opt-subtitle">
                                  La línea estuvo paralizada (suma a indisponibilidad productiva)
                                </div>
                              </div>
                            </label>

                            <label
                              className={`ot-condicion-opt-card ${
                                fichaCondicionLinea === 'Línea produciendo' ? 'selected-produciendo' : ''
                              }`}
                            >
                              <input
                                type="radio"
                                name="ficha_condicion_linea"
                                value="Línea produciendo"
                                checked={fichaCondicionLinea === 'Línea produciendo'}
                                onChange={(e) => setFichaCondicionLinea(e.target.value)}
                              />
                              <div>
                                <div className="ot-condicion-opt-title">⚡ Línea produciendo</div>
                                <div className="ot-condicion-opt-subtitle">
                                  Trabajo en marcha (no genera indisponibilidad productiva)
                                </div>
                              </div>
                            </label>
                          </div>

                          {fichaCondicionLinea === 'Línea detenida' && (
                            <div className="ot-tiempo-detencion-box">
                              <div className="ot-tiempo-detencion-header">
                                <span className="ot-tiempo-detencion-icon">⏱️</span>
                                <div>
                                  <label className="form-label" style={{ marginBottom: 0 }}>
                                    Tiempo que estuvo detenida la línea <span className="required-mark">*</span>
                                  </label>
                                  <span className="ot-tiempo-detencion-sub">
                                    Indique las horas y minutos reales que la línea estuvo parada
                                  </span>
                                </div>
                              </div>
                              <div className="ot-tiempo-inputs-row">
                                <div className="ot-tiempo-input-group">
                                  <input
                                    type="number"
                                    min="0"
                                    max="999"
                                    className="form-input ot-tiempo-input"
                                    placeholder="0"
                                    value={fichaTiempoHoras}
                                    onChange={(e) => setFichaTiempoHoras(e.target.value)}
                                  />
                                  <span className="ot-tiempo-unit">hrs</span>
                                </div>
                                <div className="ot-tiempo-input-group">
                                  <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    className="form-input ot-tiempo-input"
                                    placeholder="0"
                                    value={fichaTiempoMinutos}
                                    onChange={(e) => setFichaTiempoMinutos(e.target.value)}
                                  />
                                  <span className="ot-tiempo-unit">min</span>
                                </div>
                                {(Number(fichaTiempoHoras) > 0 || Number(fichaTiempoMinutos) > 0) && (
                                  <span className="ot-tiempo-total-badge">
                                    Total: {formatMinutosLegible((Number(fichaTiempoHoras) || 0) * 60 + (Number(fichaTiempoMinutos) || 0))} perdidos
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SECCIÓN DE REPUESTOS (#10) */}
                        <div className="form-group full-width">
                          <div className="ot-repuestos-section">
                            <div className="ot-repuestos-title-row">
                              <h4 className="ot-repuestos-title">
                                <span>⚙️</span> Control de repuestos de inventario
                              </h4>
                            </div>

                            <div className="ot-repuestos-question-box">
                              <span className="ot-repuestos-q-label">¿Se utilizaron repuestos en este trabajo?</span>
                              <div className="ot-repuestos-q-options">
                                <label className="ot-repuestos-q-opt">
                                  <input
                                    type="radio"
                                    name="ficha_utilizo_repuestos"
                                    value="no"
                                    checked={fichaUtilizoRepuestos === 'no'}
                                    onChange={(e) => setFichaUtilizoRepuestos(e.target.value)}
                                  />
                                  <span>No</span>
                                </label>
                                <label className="ot-repuestos-q-opt">
                                  <input
                                    type="radio"
                                    name="ficha_utilizo_repuestos"
                                    value="si"
                                    checked={fichaUtilizoRepuestos === 'si'}
                                    onChange={(e) => setFichaUtilizoRepuestos(e.target.value)}
                                  />
                                  <span>Sí</span>
                                </label>
                              </div>
                            </div>

                            {fichaUtilizoRepuestos === 'si' && (
                              <div>
                                <div className="ot-repuestos-form-add">
                                  <div>
                                    <label className="form-label" style={{ fontSize: '0.78rem' }}>
                                      Buscar repuesto en catálogo
                                    </label>
                                    <input
                                      type="text"
                                      className="form-input"
                                      placeholder="Buscar por código o nombre..."
                                      value={repuestoSearchQuery}
                                      onChange={(e) => {
                                        setRepuestoSearchQuery(e.target.value)
                                        setSelectedRepuestoId('')
                                        setConsumoError('')
                                      }}
                                    />
                                    {repuestoSearchQuery.trim() && !selectedRepuestoId && (
                                      <div
                                        style={{
                                          maxHeight: '150px',
                                          overflowY: 'auto',
                                          background: 'rgba(15, 23, 42, 0.95)',
                                          border: '1px solid var(--line)',
                                          borderRadius: '6px',
                                          marginTop: '0.25rem',
                                          zIndex: 10
                                        }}
                                      >
                                        {repuestosList
                                          .filter((r) => {
                                            const q = repuestoSearchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                                            const n = (r.nombre || r.repuesto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                                            const c = (r.codigo || '').toLowerCase()
                                            return n.includes(q) || c.includes(q)
                                          })
                                          .slice(0, 10)
                                          .map((item) => (
                                            <div
                                              key={item.id}
                                              onClick={() => {
                                                setSelectedRepuestoId(item.id)
                                                setRepuestoSearchQuery(`[${item.codigo}] ${item.nombre || item.repuesto}`)
                                              }}
                                              style={{
                                                padding: '0.4rem 0.6rem',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                fontSize: '0.82rem'
                                              }}
                                            >
                                              <strong>[{item.codigo}]</strong> {item.nombre || item.repuesto}{' '}
                                              <span style={{ color: '#38bdf8' }}>
                                                (Stock: {item.stock_actual ?? item.stock ?? 0} {item.unidad_medida || 'UND'})
                                              </span>
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <label className="form-label" style={{ fontSize: '0.78rem' }}>
                                      Cantidad
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      className="form-input"
                                      placeholder="Ej. 1"
                                      value={consumoCantidad}
                                      onChange={(e) => setConsumoCantidad(e.target.value)}
                                    />
                                  </div>

                                  <div>
                                    <button
                                      type="button"
                                      className="btn-primary"
                                      style={{ padding: '0.65rem 0.9rem', fontSize: '0.85rem' }}
                                      disabled={consumoSubmitting || !selectedRepuestoId || !consumoCantidad}
                                      onClick={handleConsumirRepuestoFicha}
                                    >
                                      {consumoSubmitting ? 'Registrando...' : '+ Consumir'}
                                    </button>
                                  </div>
                                </div>

                                {consumoError && (
                                  <div className="alert-error" style={{ marginBottom: '0.6rem', fontSize: '0.8rem' }}>
                                    <span>⚠️</span> <span>{consumoError}</span>
                                  </div>
                                )}

                                <div className="ot-repuestos-table-wrap">
                                  {loadingRepuestos ? (
                                    <p className="ot-repuestos-empty">Cargando repuestos consumidos...</p>
                                  ) : fichaRepuestosList.length === 0 ? (
                                    <p className="ot-repuestos-empty">No se han registrado repuestos aún para esta OT.</p>
                                  ) : (
                                    <table className="ot-repuestos-table">
                                      <thead>
                                        <tr>
                                          <th>Código</th>
                                          <th>Repuesto</th>
                                          <th>Cantidad</th>
                                          <th>Precio Compra</th>
                                          <th>Total</th>
                                          <th>Registrado por</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {fichaRepuestosList.map((cr) => {
                                          const repNom = cr.repuesto?.nombre || 'Repuesto'
                                          const repCod = cr.repuesto?.codigo || '—'
                                          const pUnit = Number(cr.precio_unitario || cr.repuesto?.precio_compra || 0)
                                          const cant = Number(cr.cantidad || 0)
                                          return (
                                            <tr key={cr.id}>
                                              <td><code>{repCod}</code></td>
                                              <td>{repNom}</td>
                                              <td><strong>{cant} {cr.repuesto?.unidad_medida || 'UND'}</strong></td>
                                              <td>${pUnit.toLocaleString('es-CL')}</td>
                                              <td>${(cant * pUnit).toLocaleString('es-CL')}</td>
                                              <td>{cr.registrado_por || 'Técnico'}</td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="form-group full-width">
                          <label className="form-label" htmlFor="ficha-solucion-input">
                            Solución definitiva{' '}
                            {(selectedOt.estado === 'Finalizada' || fichaPendingFinalizarMode) && (
                              <span className="required-mark">*</span>
                            )}
                          </label>
                          <textarea
                            id="ficha-solucion-input"
                            ref={fichaSolucionInputRef}
                            data-testid="ficha-solucion-input"
                            className={`form-textarea ${
                              fichaValidationError ? 'input-error' : ''
                            }`}
                            rows={3}
                            placeholder="Describa la reparación o solución definitiva ejecutada sobre el equipo..."
                            value={fichaSolucion}
                            onChange={(e) => {
                              setFichaSolucion(e.target.value)
                              if (fichaValidationError && e.target.value.trim()) {
                                setFichaValidationError('')
                              }
                            }}
                          />
                        </div>

                        <div className="form-group full-width">
                          <label className="form-label" htmlFor="ficha-pendiente-input">
                            Trabajo pendiente (Opcional)
                          </label>
                          <textarea
                            id="ficha-pendiente-input"
                            data-testid="ficha-pendiente-input"
                            className="form-textarea"
                            rows={2}
                            placeholder="Opcional: indique si queda algún seguimiento o tarea pendiente..."
                            value={fichaTrabajoPendiente}
                            onChange={(e) => setFichaTrabajoPendiente(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="ot-ficha-save-row">
                        {fichaPendingFinalizarMode ? (
                          <>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => {
                                setFichaPendingFinalizarMode(false)
                                setFichaValidationError('')
                              }}
                            >
                              Cancelar cierre
                            </button>
                            <button
                              type="button"
                              data-testid="ficha-confirmar-finalizar-btn"
                              className="btn-primary"
                              disabled={fichaSaving}
                              onClick={(e) => handleSaveFichaChanges(e, true)}
                            >
                              {fichaSaving ? 'Finalizando...' : 'Confirmar y Finalizar OT'}
                            </button>
                          </>
                        ) : (
                          <button
                            type="submit"
                            data-testid="ficha-guardar-btn"
                            className="btn-primary"
                            disabled={fichaSaving}
                          >
                            {fichaSaving ? 'Guardando...' : 'Guardar cambios'}
                          </button>
                        )}
                      </div>
                    </form>

                    {/* Historial de cambios de estado */}
                    <div className="ot-ficha-audit-section">
                      <h3 className="ot-ficha-audit-title">
                        Historial de cambios de estado
                      </h3>
                      {loadingHistorial ? (
                        <p className="ot-audit-empty">Cargando historial...</p>
                      ) : fichaHistorial.length === 0 ? (
                        <p className="ot-audit-empty">
                          Sin cambios de estado registrados previamente.
                        </p>
                      ) : (
                        <div className="ot-audit-timeline" data-testid="ficha-historial-list">
                          {fichaHistorial.map((h) => (
                            <div key={h.id} className="ot-audit-item">
                              <div className="ot-audit-item-top">
                                <span className="ot-audit-date">
                                  {formatFechaHoraCL(h.fecha_hora)}
                                </span>
                                <span className="ot-audit-user">
                                  {h.usuario_nombre || 'Usuario'}
                                </span>
                              </div>
                              <div className="ot-audit-transition">
                                <strong>
                                  {h.estado_anterior ? `${h.estado_anterior} → ` : 'Creación → '}
                                  {h.estado_nuevo}
                                </strong>
                                {h.comentario && (
                                  <span className="ot-audit-comment"> • {h.comentario}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 2: FINALIZAR OT
         ========================================================================== */}
      {finalizarModalOt && (
        <div
          className="modal-overlay"
          onClick={() => !finalizarSubmitting && setFinalizarModalOt(null)}
        >
          <div
            className="modal-container ot-modal-card"
            data-testid="modal-finalizar-ot"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const codigo = formatCodigoOt(finalizarModalOt)
              const { equipoNombre, ubicacionDisplay } = resolveOtEquipoDisplay(
                finalizarModalOt,
                equiposList
              )

              return (
                <>
                  <div className="modal-header">
                    <div>
                      <h2 className="modal-title">Finalizar {codigo}</h2>
                    </div>
                    <button
                      type="button"
                      className="modal-close-btn"
                      onClick={() => !finalizarSubmitting && setFinalizarModalOt(null)}
                    >
                      <Icon n="x" />
                    </button>
                  </div>

                  <form onSubmit={handleConfirmFinalizarModal} noValidate>
                    <div className="modal-body">
                      <div className="ot-modal-summary-box">
                        <div className="ot-summary-grid-2">
                          <div>
                            <span className="ot-summary-lbl">OT</span>
                            <strong className="ot-summary-val">{codigo}</strong>
                          </div>
                          <div>
                            <span className="ot-summary-lbl">Equipo</span>
                            <strong className="ot-summary-val">
                              {equipoNombre} ({ubicacionDisplay})
                            </strong>
                          </div>
                        </div>
                        <div>
                          <span className="ot-summary-lbl">Trabajo</span>
                          <p className="ot-summary-trabajo-text">{finalizarModalOt.trabajo}</p>
                        </div>
                      </div>

                      {finalizarError && (
                        <div
                          className="alert-error"
                          data-testid="modal-finalizar-error"
                          role="alert"
                          style={{ marginBottom: '0.85rem' }}
                        >
                          <span><Icon n="warn" /></span>
                          <span>{finalizarError}</span>
                        </div>
                      )}

                      {/* Condición de la línea (obligatorio) */}
                      <div className="form-group">
                        <label className="form-label">
                          Condición de la línea <span className="required-mark">*</span>
                        </label>
                        <div className="ot-condicion-options-row">
                          <label
                            className={`ot-condicion-opt-card ${
                              finalizarCondicionLinea === 'Línea detenida' ? 'selected-detenida' : ''
                            }`}
                          >
                            <input
                              type="radio"
                              name="finalizar_condicion_linea"
                              value="Línea detenida"
                              checked={finalizarCondicionLinea === 'Línea detenida'}
                              onChange={(e) => setFinalizarCondicionLinea(e.target.value)}
                            />
                            <div>
                              <div className="ot-condicion-opt-title">🛑 Línea detenida</div>
                              <div className="ot-condicion-opt-subtitle">Parada productiva</div>
                            </div>
                          </label>

                          <label
                            className={`ot-condicion-opt-card ${
                              finalizarCondicionLinea === 'Línea produciendo' ? 'selected-produciendo' : ''
                            }`}
                          >
                            <input
                              type="radio"
                              name="finalizar_condicion_linea"
                              value="Línea produciendo"
                              checked={finalizarCondicionLinea === 'Línea produciendo'}
                              onChange={(e) => setFinalizarCondicionLinea(e.target.value)}
                            />
                            <div>
                              <div className="ot-condicion-opt-title">⚡ Línea produciendo</div>
                              <div className="ot-condicion-opt-subtitle">Equipo en marcha</div>
                            </div>
                          </label>
                        </div>

                        {finalizarCondicionLinea === 'Línea detenida' && (
                          <div className="ot-tiempo-detencion-box">
                            <div className="ot-tiempo-detencion-header">
                              <span className="ot-tiempo-detencion-icon">⏱️</span>
                              <div>
                                <label className="form-label" style={{ marginBottom: 0 }}>
                                  Tiempo que estuvo detenida la línea <span className="required-mark">*</span>
                                </label>
                                <span className="ot-tiempo-detencion-sub">
                                  Indique las horas y minutos reales que la línea estuvo parada
                                </span>
                              </div>
                            </div>
                            <div className="ot-tiempo-inputs-row">
                              <div className="ot-tiempo-input-group">
                                <input
                                  type="number"
                                  min="0"
                                  max="999"
                                  className="form-input ot-tiempo-input"
                                  placeholder="0"
                                  value={finalizarTiempoHoras}
                                  onChange={(e) => setFinalizarTiempoHoras(e.target.value)}
                                />
                                <span className="ot-tiempo-unit">hrs</span>
                              </div>
                              <div className="ot-tiempo-input-group">
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  className="form-input ot-tiempo-input"
                                  placeholder="0"
                                  value={finalizarTiempoMinutos}
                                  onChange={(e) => setFinalizarTiempoMinutos(e.target.value)}
                                />
                                <span className="ot-tiempo-unit">min</span>
                              </div>
                              {(Number(finalizarTiempoHoras) > 0 || Number(finalizarTiempoMinutos) > 0) && (
                                <span className="ot-tiempo-total-badge">
                                  Total: {formatMinutosLegible((Number(finalizarTiempoHoras) || 0) * 60 + (Number(finalizarTiempoMinutos) || 0))} perdidos
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Repuestos utilizados */}
                      <div className="form-group">
                        <label className="form-label">¿Se utilizaron repuestos?</label>
                        <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.25rem' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="finalizar_repuestos"
                              value="no"
                              checked={finalizarUtilizoRepuestos === 'no'}
                              onChange={(e) => setFinalizarUtilizoRepuestos(e.target.value)}
                            />
                            <span>No</span>
                          </label>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="finalizar_repuestos"
                              value="si"
                              checked={finalizarUtilizoRepuestos === 'si'}
                              onChange={(e) => setFinalizarUtilizoRepuestos(e.target.value)}
                            />
                            <span>Sí</span>
                          </label>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="modal-solucion-definitiva">
                          Solución definitiva <span className="required-mark">*</span>
                        </label>
                        <textarea
                          id="modal-solucion-definitiva"
                          data-testid="modal-solucion-input"
                          className={`form-textarea ${finalizarError ? 'input-error' : ''}`}
                          rows={3}
                          placeholder="Describa la solución definitiva aplicada..."
                          value={finalizarSolucion}
                          onChange={(e) => {
                            setFinalizarSolucion(e.target.value)
                            if (finalizarError && e.target.value.trim()) {
                              setFinalizarError('')
                            }
                          }}
                          autoFocus
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="modal-trabajo-pendiente">
                          Trabajo pendiente <span style={{ color: 'var(--text-muted)' }}>(Opcional)</span>
                        </label>
                        <textarea
                          id="modal-trabajo-pendiente"
                          data-testid="modal-pendiente-input"
                          className="form-textarea"
                          rows={2}
                          placeholder="Si queda alguna tarea pendiente para próximo mantenimiento, regístrela aquí..."
                          value={finalizarTrabajoPendiente}
                          onChange={(e) => setFinalizarTrabajoPendiente(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="modal-tecnico-input">
                          Técnico(s)
                        </label>
                        <input
                          id="modal-tecnico-input"
                          data-testid="modal-tecnico-input"
                          type="text"
                          className="form-input"
                          value={finalizarTecnico}
                          onChange={(e) => setFinalizarTecnico(e.target.value)}
                          placeholder="Nombre del técnico o técnicos separados por /"
                        />
                        <div className="ot-tecnicos-chips-row" style={{ marginTop: '0.4rem' }}>
                          {TECNICOS_BASE.map((t) => {
                            const active = parseTecnicos(finalizarTecnico).some(
                              (x) => x.toLowerCase() === t.nombre.toLowerCase()
                            )
                            return (
                              <button
                                key={t.id}
                                type="button"
                                className={`ot-tec-chip ${active ? 'selected' : ''}`}
                                onClick={() =>
                                  setFinalizarTecnico(
                                    toggleTecnicoInString(finalizarTecnico, t.nombre)
                                  )
                                }
                              >
                                {active ? <Icon n="check" /> : '+ '}
                                {t.nombre}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setFinalizarModalOt(null)}
                        disabled={finalizarSubmitting}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        data-testid="btn-confirmar-finalizar-ot"
                        className="btn-primary"
                        disabled={finalizarSubmitting}
                      >
                        {finalizarSubmitting ? 'Finalizando...' : 'Finalizar OT'}
                      </button>
                    </div>
                  </form>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 3: CONFIRMACIÓN REABRIR OT O VOLVER A PENDIENTE
         ========================================================================== */}
      {confirmTransitionModal && (
        <div
          className="modal-overlay"
          onClick={() => setConfirmTransitionModal(null)}
        >
          <div
            className="modal-container"
            data-testid="modal-confirm-transition"
            style={{ maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title" data-testid="confirm-transition-title">
                {confirmTransitionModal.title}
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setConfirmTransitionModal(null)}
              >
                <Icon n="x" />
              </button>
            </div>
            <div className="modal-body">
              <p className="ot-confirm-detail">
                {confirmTransitionModal.description}
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="confirm-transition-comment">
                  Motivo / Comentario (Opcional)
                </label>
                <input
                  id="confirm-transition-comment"
                  type="text"
                  className="form-input"
                  value={confirmTransitionModal.comentario}
                  onChange={(e) =>
                    setConfirmTransitionModal((prev) => ({
                      ...prev,
                      comentario: e.target.value
                    }))
                  }
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmTransitionModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                data-testid="btn-confirm-transition-ok"
                className="btn-primary"
                onClick={handleConfirmTransitionModalSubmit}
              >
                {confirmTransitionModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 4: CREAR NUEVA ORDEN DE TRABAJO
         ========================================================================== */}
      {isNuevaOtModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => !nuevaOtSubmitting && setIsNuevaOtModalOpen(false)}
        >
          <div
            className="modal-container"
            data-testid="modal-nueva-ot"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Nueva Orden de Trabajo</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => !nuevaOtSubmitting && setIsNuevaOtModalOpen(false)}
              >
                <Icon n="x" />
              </button>
            </div>

            <form onSubmit={handleCreateNuevaOtSubmit} noValidate>
              <div className="modal-body">
                {nuevaOtError && (
                  <div className="alert-error" role="alert" style={{ marginBottom: '0.85rem' }}>
                    <span><Icon n="warn" /></span>
                    <span>{nuevaOtError}</span>
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="nueva-ot-equipo">
                      Equipo
                    </label>
                    <select
                      id="nueva-ot-equipo"
                      data-testid="nueva-ot-equipo"
                      className="form-select"
                      value={nuevaOtForm.equipo_id}
                      onChange={(e) => {
                        const eqId = e.target.value
                        const eq = equiposList.find((x) => x.id === eqId)
                        setNuevaOtForm((prev) => ({
                          ...prev,
                          equipo_id: eqId,
                          ubicacion: eq?.ubicacion || eq?.area || prev.ubicacion
                        }))
                      }}
                    >
                      <option value="">Seleccione equipo...</option>
                      {equiposList.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.nombre} {eq.area ? `(${eq.area})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="nueva-ot-ubicacion">
                      Ubicación / Sector
                    </label>
                    <input
                      id="nueva-ot-ubicacion"
                      data-testid="nueva-ot-ubicacion"
                      type="text"
                      className="form-input"
                      placeholder="Ej. Extrusión, Soplado, Inyección..."
                      value={nuevaOtForm.ubicacion}
                      onChange={(e) =>
                        setNuevaOtForm((prev) => ({ ...prev, ubicacion: e.target.value }))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="nueva-ot-origen">
                      Origen del reporte
                    </label>
                    <select
                      id="nueva-ot-origen"
                      data-testid="nueva-ot-origen"
                      className="form-select"
                      value={nuevaOtForm.origen}
                      onChange={(e) =>
                        setNuevaOtForm((prev) => ({ ...prev, origen: e.target.value }))
                      }
                    >
                      {ORIGENES_OT.map((orig) => (
                        <option key={orig} value={orig}>
                          {orig}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="nueva-ot-prioridad">
                      Prioridad
                    </label>
                    <select
                      id="nueva-ot-prioridad"
                      className="form-select"
                      value={nuevaOtForm.prioridad}
                      onChange={(e) =>
                        setNuevaOtForm((prev) => ({ ...prev, prioridad: e.target.value }))
                      }
                    >
                      {PRIORIDADES_OT.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label" htmlFor="nueva-ot-tecnico">
                      Técnico(s) asignado(s)
                    </label>
                    <input
                      id="nueva-ot-tecnico"
                      data-testid="nueva-ot-tecnico"
                      type="text"
                      className="form-input"
                      value={nuevaOtForm.tecnico}
                      onChange={(e) =>
                        setNuevaOtForm((prev) => ({ ...prev, tecnico: e.target.value }))
                      }
                    />
                    <div className="ot-tecnicos-chips-row" style={{ marginTop: '0.4rem' }}>
                      {TECNICOS_BASE.map((t) => {
                        const active = parseTecnicos(nuevaOtForm.tecnico).some(
                          (x) => x.toLowerCase() === t.nombre.toLowerCase()
                        )
                        return (
                          <button
                            key={t.id}
                            type="button"
                            className={`ot-tec-chip ${active ? 'selected' : ''}`}
                            onClick={() =>
                              setNuevaOtForm((prev) => ({
                                ...prev,
                                tecnico: toggleTecnicoInString(prev.tecnico, t.nombre)
                              }))
                            }
                          >
                            {active ? <Icon n="check" /> : '+ '}
                            {t.nombre}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label" htmlFor="nueva-ot-trabajo">
                      Trabajo / Problema reportado <span className="required-mark">*</span>
                    </label>
                    <textarea
                      id="nueva-ot-trabajo"
                      data-testid="nueva-ot-trabajo"
                      className="form-textarea"
                      rows={3}
                      placeholder="Describa la falla o trabajo requerido..."
                      value={nuevaOtForm.trabajo}
                      onChange={(e) =>
                        setNuevaOtForm((prev) => ({ ...prev, trabajo: e.target.value }))
                      }
                    />
                  </div>

                  {/* Condición de la línea */}
                  <div className="form-group full-width">
                    <label className="form-label">
                      Condición de la línea
                    </label>
                    <div className="ot-condicion-options-row">
                      <label
                        className={`ot-condicion-opt-card ${
                          nuevaOtForm.condicion_linea === 'Línea produciendo' ? 'selected-produciendo' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="nueva_ot_condicion"
                          value="Línea produciendo"
                          checked={nuevaOtForm.condicion_linea === 'Línea produciendo'}
                          onChange={(e) =>
                            setNuevaOtForm((prev) => ({ ...prev, condicion_linea: e.target.value }))
                          }
                        />
                        <div>
                          <div className="ot-condicion-opt-title">⚡ Línea produciendo</div>
                          <div className="ot-condicion-opt-subtitle">Equipo en marcha</div>
                        </div>
                      </label>

                      <label
                        className={`ot-condicion-opt-card ${
                          nuevaOtForm.condicion_linea === 'Línea detenida' ? 'selected-detenida' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="nueva_ot_condicion"
                          value="Línea detenida"
                          checked={nuevaOtForm.condicion_linea === 'Línea detenida'}
                          onChange={(e) =>
                            setNuevaOtForm((prev) => ({ ...prev, condicion_linea: e.target.value }))
                          }
                        />
                        <div>
                          <div className="ot-condicion-opt-title">🛑 Línea detenida</div>
                          <div className="ot-condicion-opt-subtitle">Parada productiva</div>
                        </div>
                      </label>
                    </div>

                    {nuevaOtForm.condicion_linea === 'Línea detenida' && (
                      <div className="ot-tiempo-detencion-box">
                        <div className="ot-tiempo-detencion-header">
                          <span className="ot-tiempo-detencion-icon">⏱️</span>
                          <div>
                            <label className="form-label" style={{ marginBottom: 0 }}>
                              Tiempo que estuvo detenida la línea (Opcional)
                            </label>
                            <span className="ot-tiempo-detencion-sub">
                              Indique las horas y minutos perdidos si ya se conocen
                            </span>
                          </div>
                        </div>
                        <div className="ot-tiempo-inputs-row">
                          <div className="ot-tiempo-input-group">
                            <input
                              type="number"
                              min="0"
                              max="999"
                              className="form-input ot-tiempo-input"
                              placeholder="0"
                              value={nuevaOtForm.tiempo_detencion_horas}
                              onChange={(e) =>
                                setNuevaOtForm((prev) => ({ ...prev, tiempo_detencion_horas: e.target.value }))
                              }
                            />
                            <span className="ot-tiempo-unit">hrs</span>
                          </div>
                          <div className="ot-tiempo-input-group">
                            <input
                              type="number"
                              min="0"
                              max="59"
                              className="form-input ot-tiempo-input"
                              placeholder="0"
                              value={nuevaOtForm.tiempo_detencion_minutos}
                              onChange={(e) =>
                                setNuevaOtForm((prev) => ({ ...prev, tiempo_detencion_minutos: e.target.value }))
                              }
                            />
                            <span className="ot-tiempo-unit">min</span>
                          </div>
                          {(Number(nuevaOtForm.tiempo_detencion_horas) > 0 || Number(nuevaOtForm.tiempo_detencion_minutos) > 0) && (
                            <span className="ot-tiempo-total-badge">
                              Total: {formatMinutosLegible((Number(nuevaOtForm.tiempo_detencion_horas) || 0) * 60 + (Number(nuevaOtForm.tiempo_detencion_minutos) || 0))} perdidos
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsNuevaOtModalOpen(false)}
                  disabled={nuevaOtSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  data-testid="btn-crear-ot-submit"
                  className="btn-primary"
                  disabled={nuevaOtSubmitting}
                >
                  {nuevaOtSubmitting ? 'Creando OT...' : 'Crear OT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 4: CÓDIGO QR FÍSICO PARA PLANTA (#13)
         ========================================================================== */}
      {isQrPlantModalOpen && (
        <div className="modal-overlay" onClick={() => setIsQrPlantModalOpen(false)}>
          <div
            className="modal-container"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Código QR Físico — Planta AGUACOL</h2>
                <p className="modal-subtitle">
                  Para imprimir e instalar en tableros, líneas de producción y accesos
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsQrPlantModalOpen(false)}
              >
                <Icon n="x" />
              </button>
            </div>

            <div className="modal-body">
              <div className="qr-modal-preview-box">
                <img
                  src="/assets/qr/qr-solicitud-mantenimiento.svg"
                  alt="QR Solicitud Mantenimiento Aguacol"
                  className="qr-modal-img"
                />
                <div style={{ marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                  Escanea para reportar fallas y solicitudes
                </div>
                <div className="qr-modal-url">
                  https://mantenimiento.aguacol.cl/solicitud-mantenimiento
                </div>
              </div>

              <div className="qr-modal-actions-grid">
                <a
                  href="/assets/qr/qr-solicitud-mantenimiento.png"
                  download="qr-aguacol-mantenimiento-1200px.png"
                  className="btn-primary"
                  style={{ textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <span>⬇️</span> PNG Alta Resolución
                </a>
                <a
                  href="/assets/qr/qr-solicitud-mantenimiento.svg"
                  download="qr-aguacol-mantenimiento.svg"
                  className="btn-secondary"
                  style={{ textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <span>⬇️</span> Formato Vector SVG
                </a>
                <a
                  href="/assets/qr/afiche-solicitud-qr-planta.svg"
                  download="afiche-solicitud-mantenimiento-planta.svg"
                  className="btn-secondary"
                  style={{ textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', gridColumn: '1 / -1' }}
                >
                  <span>📄</span> Descargar Afiche Completo Imprimible (SVG)
                </a>
                <a
                  href="/solicitud-mantenimiento"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ textAlign: 'center', textDecoration: 'none', gridColumn: '1 / -1' }}
                >
                  🔗 Abrir formulario en nueva pestaña
                </a>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsQrPlantModalOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
