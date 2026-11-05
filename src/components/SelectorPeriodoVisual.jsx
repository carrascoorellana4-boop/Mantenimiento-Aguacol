import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import './SelectorPeriodoVisual.css'

const MESES = [
  { num: 1, label: 'Ene', full: 'Enero' },
  { num: 2, label: 'Feb', full: 'Febrero' },
  { num: 3, label: 'Mar', full: 'Marzo' },
  { num: 4, label: 'Abr', full: 'Abril' },
  { num: 5, label: 'May', full: 'Mayo' },
  { num: 6, label: 'Jun', full: 'Junio' },
  { num: 7, label: 'Jul', full: 'Julio' },
  { num: 8, label: 'Ago', full: 'Agosto' },
  { num: 9, label: 'Sep', full: 'Septiembre' },
  { num: 10, label: 'Oct', full: 'Octubre' },
  { num: 11, label: 'Nov', full: 'Noviembre' },
  { num: 12, label: 'Dic', full: 'Diciembre' }
]

const TRIMESTRES = [
  { id: 1, label: '01', mesInicio: 1, mesFin: 3 },
  { id: 2, label: '02', mesInicio: 4, mesFin: 6 },
  { id: 3, label: '03', mesInicio: 7, mesFin: 9 },
  { id: 4, label: '04', mesInicio: 10, mesFin: 12 }
]

/**
 * Calcula la cantidad de días en un mes específico de un año.
 */
function getDiasEnMes(ano, mes) {
  return new Date(ano, mes, 0).getDate()
}

/**
 * SelectorPeriodoVisual
 * Componente visual réplica exacta para selección interactiva de período:
 * - Fila 1: AÑO (Años disponibles + Trimestres 01, 02, 03, 04)
 * - Fila 2: MES (Meses Ene..Dic con selección simple o arrastre de rango)
 * - Fila 3: DÍAS (Días 1..31 con selección simple, arrastre y activación total)
 */
export default function SelectorPeriodoVisual({
  availableYears = [2024, 2025, 2026],
  value = null, // { fechaDesde, fechaHasta, isAll }
  onChange = () => {},
  allowAll = true,
  className = ''
}) {
  const currentNow = useMemo(() => new Date(), [])
  const defaultYear = currentNow.getFullYear()
  const defaultMonth = currentNow.getMonth() + 1

  // Estado interno del selector
  const [selectedAno, setSelectedAno] = useState(() => {
    if (value?.fechaDesde) {
      const y = parseInt(value.fechaDesde.slice(0, 4), 10)
      if (!isNaN(y)) return y
    }
    return defaultYear
  })

  const [mesRango, setMesRango] = useState(() => {
    if (value?.fechaDesde && value?.fechaHasta) {
      const m1 = parseInt(value.fechaDesde.slice(5, 7), 10)
      const m2 = parseInt(value.fechaHasta.slice(5, 7), 10)
      if (!isNaN(m1) && !isNaN(m2)) return [m1, m2]
    }
    return [defaultMonth, defaultMonth]
  })

  const [diaRango, setDiaRango] = useState(() => {
    if (value?.fechaDesde && value?.fechaHasta) {
      const d1 = parseInt(value.fechaDesde.slice(8, 10), 10)
      const d2 = parseInt(value.fechaHasta.slice(8, 10), 10)
      if (!isNaN(d1) && !isNaN(d2)) return [d1, d2]
    }
    const maxD = getDiasEnMes(defaultYear, defaultMonth)
    return [1, maxD]
  })

  const [isAllSelected, setIsAllSelected] = useState(() => Boolean(value?.isAll))

  // Estados de arrastre (drag)
  const [draggingMes, setDraggingMes] = useState(false)
  const dragMesStartRef = useRef(null)

  const [draggingDia, setDraggingDia] = useState(false)
  const dragDiaStartRef = useRef(null)

  // Cantidad máxima de días para la visualización
  const totalDiasDisponibles = useMemo(() => {
    if (mesRango[0] === mesRango[1]) {
      return getDiasEnMes(selectedAno, mesRango[0])
    }
    return 31
  }, [selectedAno, mesRango])

  // Lista de años normalizada
  const yearsList = useMemo(() => {
    const set = new Set(availableYears)
    set.add(2024)
    set.add(2025)
    set.add(2026)
    set.add(defaultYear)
    return Array.from(set).sort((a, b) => a - b)
  }, [availableYears, defaultYear])

  // Notificar cambio al padre
  const emitChange = useCallback(
    (ano, [mDesde, mHasta], [dDesde, dHasta], isAll = false) => {
      if (isAll) {
        onChange({
          fechaDesde: '',
          fechaHasta: '',
          ano,
          mesDesde: null,
          mesHasta: null,
          diaDesde: null,
          diaHasta: null,
          isAll: true,
          label: 'Todo el historial'
        })
        return
      }

      // Asegurar días válidos
      const maxFin = getDiasEnMes(ano, mHasta)
      const safeFinDia = Math.min(dHasta, maxFin)
      const maxIni = getDiasEnMes(ano, mDesde)
      const safeIniDia = Math.min(dDesde, maxIni)

      const fDesdeStr = `${ano}-${String(mDesde).padStart(2, '0')}-${String(safeIniDia).padStart(2, '0')}`
      const fHastaStr = `${ano}-${String(mHasta).padStart(2, '0')}-${String(safeFinDia).padStart(2, '0')}`

      let label = ''
      if (mDesde === mHasta) {
        const nomMes = MESES[mDesde - 1].full
        if (safeIniDia === 1 && safeFinDia >= maxFin) {
          label = `${nomMes} ${ano}`
        } else if (safeIniDia === safeFinDia) {
          label = `${safeIniDia} de ${nomMes} ${ano}`
        } else {
          label = `${safeIniDia} al ${safeFinDia} de ${nomMes} ${ano}`
        }
      } else {
        const m1 = MESES[mDesde - 1].label
        const m2 = MESES[mHasta - 1].label
        label = `${safeIniDia} ${m1} - ${safeFinDia} ${m2} ${ano}`
      }

      onChange({
        fechaDesde: fDesdeStr,
        fechaHasta: fHastaStr,
        ano,
        mesDesde: mDesde,
        mesHasta: mHasta,
        diaDesde: safeIniDia,
        diaHasta: safeFinDia,
        isAll: false,
        label
      })
    },
    [onChange]
  )

  // Sincronizar si value externo cambia
  useEffect(() => {
    if (!value) return
    if (value.isAll !== undefined) {
      setIsAllSelected(Boolean(value.isAll))
    }
    if (value.fechaDesde && value.fechaHasta) {
      const y = parseInt(value.fechaDesde.slice(0, 4), 10)
      const m1 = parseInt(value.fechaDesde.slice(5, 7), 10)
      const d1 = parseInt(value.fechaDesde.slice(8, 10), 10)
      const m2 = parseInt(value.fechaHasta.slice(5, 7), 10)
      const d2 = parseInt(value.fechaHasta.slice(8, 10), 10)
      if (!isNaN(y)) setSelectedAno(y)
      if (!isNaN(m1) && !isNaN(m2)) setMesRango([m1, m2])
      if (!isNaN(d1) && !isNaN(d2)) setDiaRango([d1, d2])
    }
  }, [value])

  // --- MANEJADORES DE AÑO ---
  const handleSelectAno = (yr) => {
    setSelectedAno(yr)
    setIsAllSelected(false)
    // Mantener meses y días, pero validar max días
    const maxD = getDiasEnMes(yr, mesRango[1])
    const newDiaRango = [Math.min(diaRango[0], maxD), Math.min(diaRango[1], maxD)]
    setDiaRango(newDiaRango)
    emitChange(yr, mesRango, newDiaRango, false)
  }

  // --- MANEJADORES DE TRIMESTRE ---
  const handleSelectTrimestre = (q) => {
    setIsAllSelected(false)
    const newMesRango = [q.mesInicio, q.mesFin]
    const maxD = getDiasEnMes(selectedAno, q.mesFin)
    const newDiaRango = [1, maxD]
    setMesRango(newMesRango)
    setDiaRango(newDiaRango)
    emitChange(selectedAno, newMesRango, newDiaRango, false)
  }

  // Verificar si un trimestre está actualmente seleccionado
  const isTrimestreActive = (q) => {
    if (isAllSelected) return false
    return mesRango[0] === q.mesInicio && mesRango[1] === q.mesFin
  }

  // --- MANEJADORES DE MES ---
  const handleMesPointerDown = (mNum) => {
    setIsAllSelected(false)
    setDraggingMes(true)
    dragMesStartRef.current = mNum
    const newMesRango = [mNum, mNum]
    const maxD = getDiasEnMes(selectedAno, mNum)
    const newDiaRango = [1, maxD]
    setMesRango(newMesRango)
    setDiaRango(newDiaRango)
  }

  const handleMesPointerEnter = (mNum) => {
    if (!draggingMes || dragMesStartRef.current === null) return
    const ini = Math.min(dragMesStartRef.current, mNum)
    const fin = Math.max(dragMesStartRef.current, mNum)
    setMesRango([ini, fin])
    const maxD = getDiasEnMes(selectedAno, fin)
    setDiaRango([1, maxD])
  }

  const handleMesPointerUp = () => {
    if (draggingMes) {
      setDraggingMes(false)
      dragMesStartRef.current = null
      emitChange(selectedAno, mesRango, diaRango, false)
    }
  }

  // Click directo en mes (cuando no se arrastra)
  const handleMesClick = (mNum) => {
    setIsAllSelected(false)
    const newMesRango = [mNum, mNum]
    const maxD = getDiasEnMes(selectedAno, mNum)
    const newDiaRango = [1, maxD]
    setMesRango(newMesRango)
    setDiaRango(newDiaRango)
    emitChange(selectedAno, newMesRango, newDiaRango, false)
  }

  const isMesActive = (mNum) => {
    if (isAllSelected) return false
    return mNum >= mesRango[0] && mNum <= mesRango[1]
  }

  // --- MANEJADORES DE DÍAS ---
  const handleDiaPointerDown = (dNum) => {
    setIsAllSelected(false)
    setDraggingDia(true)
    dragDiaStartRef.current = dNum
    setDiaRango([dNum, dNum])
  }

  const handleDiaPointerEnter = (dNum) => {
    if (!draggingDia || dragDiaStartRef.current === null) return
    const ini = Math.min(dragDiaStartRef.current, dNum)
    const fin = Math.max(dragDiaStartRef.current, dNum)
    setDiaRango([ini, fin])
  }

  const handleDiaPointerUp = () => {
    if (draggingDia) {
      setDraggingDia(false)
      dragDiaStartRef.current = null
      emitChange(selectedAno, mesRango, diaRango, false)
    }
  }

  const handleDiaClick = (dNum) => {
    setIsAllSelected(false)
    // Si ya es el único día seleccionado, restaurar a todo el mes
    const maxD = mesRango[0] === mesRango[1] ? getDiasEnMes(selectedAno, mesRango[0]) : 31
    if (diaRango[0] === dNum && diaRango[1] === dNum) {
      const newDiaRango = [1, maxD]
      setDiaRango(newDiaRango)
      emitChange(selectedAno, mesRango, newDiaRango, false)
    } else {
      const newDiaRango = [dNum, dNum]
      setDiaRango(newDiaRango)
      emitChange(selectedAno, mesRango, newDiaRango, false)
    }
  }

  const isDiaActive = (dNum) => {
    if (isAllSelected) return false
    return dNum >= diaRango[0] && dNum <= diaRango[1]
  }

  // Manejador global de fin de arrastre
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (draggingMes) {
        setDraggingMes(false)
        dragMesStartRef.current = null
        emitChange(selectedAno, mesRango, diaRango, false)
      }
      if (draggingDia) {
        setDraggingDia(false)
        dragDiaStartRef.current = null
        emitChange(selectedAno, mesRango, diaRango, false)
      }
    }
    window.addEventListener('pointerup', handleGlobalMouseUp)
    return () => window.removeEventListener('pointerup', handleGlobalMouseUp)
  }, [draggingMes, draggingDia, selectedAno, mesRango, diaRango, emitChange])

  // Seleccionar todo el historial
  const handleSelectAll = () => {
    setIsAllSelected(true)
    emitChange(selectedAno, mesRango, diaRango, true)
  }

  // Texto amigable de resumen en la barra de título
  const headerSummaryText = useMemo(() => {
    if (isAllSelected) return 'Mostrando todo el historial disponible'
    if (mesRango[0] === mesRango[1]) {
      const mNom = MESES[mesRango[0] - 1].full
      const maxD = getDiasEnMes(selectedAno, mesRango[0])
      if (diaRango[0] === 1 && diaRango[1] >= maxD) {
        return `${mNom} ${selectedAno} (Mes completo)`
      }
      if (diaRango[0] === diaRango[1]) {
        return `${diaRango[0]} de ${mNom} ${selectedAno}`
      }
      return `Días ${diaRango[0]} al ${diaRango[1]} de ${mNom} ${selectedAno}`
    }
    return `${diaRango[0]} ${MESES[mesRango[0] - 1].label} - ${diaRango[1]} ${MESES[mesRango[1] - 1].label} ${selectedAno}`
  }, [isAllSelected, selectedAno, mesRango, diaRango])

  return (
    <div className={`selector-periodo-card ${className}`}>
      {/* CABECERA: Título azul marino exacto como en el diseño */}
      <div className="selector-periodo-header">
        <div className="selector-periodo-title-group">
          <span className="selector-periodo-title">Periodo</span>
          <span className="selector-periodo-summary">{headerSummaryText}</span>
        </div>
        {allowAll && (
          <button
            type="button"
            className={`selector-periodo-all-btn ${isAllSelected ? 'active' : ''}`}
            onClick={handleSelectAll}
            title="Ver todos los datos sin restricción de fecha"
          >
            Todo el Historial
          </button>
        )}
      </div>

      {/* CUERPO: 3 Filas horizontales */}
      <div className="selector-periodo-body">
        {/* FILA 1: AÑO */}
        <div className="selector-row">
          <div className="selector-label-col">
            <span className="selector-main-label">AÑO</span>
          </div>
          <div className="selector-controls-col">
            <div className="selector-pills-group">
              {yearsList.map((yr) => {
                const isActive = !isAllSelected && selectedAno === yr
                return (
                  <button
                    key={yr}
                    type="button"
                    className={`selector-pill year-pill ${isActive ? 'pill-active' : ''}`}
                    onClick={() => handleSelectAno(yr)}
                  >
                    {yr}
                  </button>
                )
              })}
            </div>

            {/* Separador sutil hacia los trimestres */}
            <div className="selector-pills-group quarters-group">
              {TRIMESTRES.map((q) => {
                const isActive = isTrimestreActive(q)
                return (
                  <button
                    key={q.id}
                    type="button"
                    className={`selector-pill quarter-pill ${isActive ? 'pill-active' : ''}`}
                    onClick={() => handleSelectTrimestre(q)}
                    title={`Trimestre ${q.id} (${MESES[q.mesInicio - 1].label} - ${MESES[q.mesFin - 1].label})`}
                  >
                    {q.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* FILA 2: MES */}
        <div className="selector-row">
          <div className="selector-label-col">
            <span className="selector-main-label">MES</span>
            <span className="selector-sub-label">arrastre</span>
          </div>
          <div className="selector-controls-col">
            <div className="selector-pills-group months-group">
              {MESES.map((m) => {
                const isActive = isMesActive(m.num)
                return (
                  <button
                    key={m.num}
                    type="button"
                    className={`selector-pill month-pill ${isActive ? 'pill-active' : ''}`}
                    onPointerDown={() => handleMesPointerDown(m.num)}
                    onPointerEnter={() => handleMesPointerEnter(m.num)}
                    onPointerUp={handleMesPointerUp}
                    onClick={() => handleMesClick(m.num)}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* FILA 3: DÍAS */}
        <div className="selector-row">
          <div className="selector-label-col">
            <span className="selector-main-label">DÍAS</span>
            <span className="selector-sub-label">arrastre para elegir rango</span>
          </div>
          <div className="selector-controls-col">
            <div className="selector-pills-group days-group">
              {Array.from({ length: totalDiasDisponibles }, (_, i) => i + 1).map((d) => {
                const isActive = isDiaActive(d)
                return (
                  <button
                    key={d}
                    type="button"
                    className={`selector-pill day-pill ${isActive ? 'pill-active' : ''}`}
                    onPointerDown={() => handleDiaPointerDown(d)}
                    onPointerEnter={() => handleDiaPointerEnter(d)}
                    onPointerUp={handleDiaPointerUp}
                    onClick={() => handleDiaClick(d)}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
