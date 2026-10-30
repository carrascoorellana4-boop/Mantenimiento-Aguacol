import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'

// Términos estrictamente prohibidos para ser usados como alias por ser genéricos
const TERMINOS_GENERICOS_PROHIBIDOS = new Set([
  'produccion',
  'producción',
  'extrusion',
  'extrusión',
  'refrigeracion',
  'refrigeración',
  'plasticos',
  'plásticos',
  'pet',
  'cocina',
  'soplado',
  'instalaciones',
  'servicios generales',
  'bodega',
  'bodega tradicional',
  'planta',
  'galpon',
  'galpón'
])

export default function ValidacionPendientesView({
  pendientesList = [],
  equiposList = [],
  session = null,
  onRefresh = async () => {},
  onSuccessMessage = () => {},
  onErrorMessage = () => {}
}) {
  // Estados de filtros internos
  const [filterEstado, setFilterEstado] = useState('Pendiente') // 'Pendiente' | 'Resuelto' | 'Ignorado' | 'Todos'
  const [filterTecnico, setFilterTecnico] = useState('')
  const [filterBatch, setFilterBatch] = useState('')
  const [searchText, setSearchText] = useState('')

  // Selección individual en edición
  const [selectedEquiposMap, setSelectedEquiposMap] = useState({})
  const [saveAliasMap, setSaveAliasMap] = useState({})
  const [loadingRowId, setLoadingRowId] = useState(null)

  // Selección masiva
  const [selectedRowIds, setSelectedRowIds] = useState([])
  const [batchTargetEquipoId, setBatchTargetEquipoId] = useState('')
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)

  // Modal para ignorar registro
  const [ignoreModalItem, setIgnoreModalItem] = useState(null)
  const [ignoreReason, setIgnoreReason] = useState('Rutina operativa')
  const [ignoreCustomReason, setIgnoreCustomReason] = useState('')
  const [ignoreLoading, setIgnoreLoading] = useState(false)

  // Mapa de equipos para acceso O(1)
  const equiposMap = useMemo(() => {
    const map = new Map()
    equiposList.forEach((eq) => map.set(eq.id, eq))
    return map
  }, [equiposList])

  // Catálogo de técnicos y batches disponibles en la lista de pendientes
  const { tecnicosDisponibles, batchesDisponibles } = useMemo(() => {
    const tecs = new Set()
    const batches = new Set()
    pendientesList.forEach((p) => {
      if (p.tecnico && p.tecnico.trim()) tecs.add(p.tecnico.trim())
      if (p.import_batch_id) batches.add(p.import_batch_id)
    })
    return {
      tecnicosDisponibles: Array.from(tecs).sort(),
      batchesDisponibles: Array.from(batches)
    }
  }, [pendientesList])

  // Detector inteligente de sugerencias/candidatos en el texto
  const detectCandidates = (text = '', rawMaq = '') => {
    const combined = `${text} ${rawMaq}`.toLowerCase()
    const candidates = []

    // Reglas de sugerencias frecuentes
    if (combined.includes('transpaleta') || combined.includes('traspaleta')) {
      const t1 = equiposList.find((e) => e.nombre.toLowerCase().includes('traspaleta 1') || e.codigo.includes('TRASP-01'))
      const t2 = equiposList.find((e) => e.nombre.toLowerCase().includes('traspaleta 2') || e.codigo.includes('TRASP-02'))
      if (t1) candidates.push(t1)
      if (t2) candidates.push(t2)
    }
    if (combined.includes('m1')) {
      const eq = equiposList.find((e) => e.nombre === 'M1' || e.codigo.endsWith('-M01'))
      if (eq && !candidates.some(c => c.id === eq.id)) candidates.push(eq)
    }
    if (combined.includes('m2')) {
      const eq = equiposList.find((e) => e.nombre === 'M2' || e.codigo.endsWith('-M02'))
      if (eq && !candidates.some(c => c.id === eq.id)) candidates.push(eq)
    }
    if (combined.includes('m3')) {
      const eq = equiposList.find((e) => e.nombre === 'M3' || e.codigo.endsWith('-M03'))
      if (eq && !candidates.some(c => c.id === eq.id)) candidates.push(eq)
    }
    if (combined.includes('m4')) {
      const eq = equiposList.find((e) => e.nombre === 'M4' || e.codigo.endsWith('-M04'))
      if (eq && !candidates.some(c => c.id === eq.id)) candidates.push(eq)
    }
    if (combined.includes('m5')) {
      const eq = equiposList.find((e) => e.nombre === 'M5' || e.codigo.endsWith('-M05'))
      if (eq && !candidates.some(c => c.id === eq.id)) candidates.push(eq)
    }
    if (combined.includes('s1') || combined.includes('pet 1')) {
      const eq = equiposList.find((e) => e.nombre === 'S1' || e.codigo.endsWith('-S01'))
      if (eq && !candidates.some(c => c.id === eq.id)) candidates.push(eq)
    }
    if (combined.includes('s2') || combined.includes('pet 2')) {
      const eq = equiposList.find((e) => e.nombre === 'S2' || e.codigo.endsWith('-S02'))
      if (eq && !candidates.some(c => c.id === eq.id)) candidates.push(eq)
    }
    if (combined.includes('chiller')) {
      equiposList.filter((e) => e.nombre.toLowerCase().includes('chiller')).forEach((eq) => {
        if (!candidates.some(c => c.id === eq.id)) candidates.push(eq)
      })
    }
    if (combined.includes('inyectora')) {
      equiposList.filter((e) => e.nombre.toLowerCase().includes('inyectora')).forEach((eq) => {
        if (!candidates.some(c => c.id === eq.id)) candidates.push(eq)
      })
    }
    if (combined.includes('cocina')) {
      equiposList.filter((e) => e.nombre.toLowerCase().includes('cocina')).forEach((eq) => {
        if (!candidates.some(c => c.id === eq.id)) candidates.push(eq)
      })
    }

    return candidates.slice(0, 3)
  }

  // Filtrado de pendientes
  const filteredList = useMemo(() => {
    return pendientesList.filter((item) => {
      // Estado
      if (filterEstado !== 'Todos') {
        const itemEstado = item.estado || 'Pendiente'
        if (itemEstado.toLowerCase() !== filterEstado.toLowerCase()) return false
      }

      // Técnico
      if (filterTecnico && item.tecnico) {
        if (item.tecnico.toLowerCase() !== filterTecnico.toLowerCase()) return false
      }

      // Batch
      if (filterBatch && item.import_batch_id !== filterBatch) return false

      // Búsqueda de texto
      if (searchText) {
        const s = searchText.toLowerCase()
        const matchDesc = (item.trabajo_realizado || item.comentario || '').toLowerCase().includes(s)
        const matchMaq = (item.nombre_equipo_origen || item.maquina || '').toLowerCase().includes(s)
        const matchTec = (item.tecnico || '').toLowerCase().includes(s)
        if (!matchDesc && !matchMaq && !matchTec) return false
      }

      return true
    })
  }, [pendientesList, filterEstado, filterTecnico, filterBatch, searchText])

  // Contadores por estado
  const countsByState = useMemo(() => {
    let pCount = 0
    let rCount = 0
    let iCount = 0
    pendientesList.forEach((item) => {
      const st = (item.estado || 'Pendiente').toLowerCase()
      if (st === 'pendiente') pCount++
      else if (st === 'resuelto') rCount++
      else if (st === 'ignorado') iCount++
    })
    return { pendientes: pCount, resueltos: rCount, ignorados: iCount, total: pendientesList.length }
  }, [pendientesList])

  // Manejo de selección individual de equipo
  const handleSelectEquipoForRow = (rowId, equipoId) => {
    setSelectedEquiposMap((prev) => ({ ...prev, [rowId]: equipoId }))
  }

  // Manejo de checkbox de alias
  const handleToggleAliasForRow = (rowId) => {
    setSaveAliasMap((prev) => ({ ...prev, [rowId]: !prev[rowId] }))
  }

  // Selección masiva: toggle individual
  const handleToggleSelectRow = (rowId) => {
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    )
  }

  // Selección masiva: toggle all
  const handleToggleSelectAll = () => {
    const pendingIds = filteredList
      .filter((item) => (item.estado || 'Pendiente') === 'Pendiente')
      .map((item) => item.id)

    if (selectedRowIds.length === pendingIds.length) {
      setSelectedRowIds([])
    } else {
      setSelectedRowIds(pendingIds)
    }
  }

  // =========================================================================
  // 1. VALIDAR REGISTRO INDIVIDUAL (Transacción lógica completa)
  // =========================================================================
  const handleValidateSingle = async (item) => {
    const targetEquipoId = selectedEquiposMap[item.id]
    if (!targetEquipoId) {
      onErrorMessage('Por favor seleccione un activo oficial antes de validar.')
      return
    }

    const targetEquipo = equiposMap.get(targetEquipoId)
    if (!targetEquipo) {
      onErrorMessage('El equipo seleccionado no existe en el catálogo maestro.')
      return
    }

    const shouldSaveAlias = Boolean(saveAliasMap[item.id])
    const rawAliasText = (item.nombre_equipo_origen || item.maquina || '').trim()

    // Regla de seguridad en Alias: verificar que no sea término genérico
    if (shouldSaveAlias && rawAliasText) {
      const normAlias = rawAliasText.toLowerCase()
      if (TERMINOS_GENERICOS_PROHIBIDOS.has(normAlias)) {
        onErrorMessage(`"${rawAliasText}" es un término demasiado genérico para utilizarse como alias de un activo. Desmarque la casilla de alias o use un término específico.`)
        return
      }
    }

    setLoadingRowId(item.id)

    try {
      // 1. Crear el registro en public.bitacora_mantenimiento
      const fechaHoraFinal = item.fecha_hora || item.fecha || new Date().toISOString()
      const trabajoRealizadoFinal = item.trabajo_realizado || item.comentario || 'Mantenimiento validado'
      const userId = session?.user?.id || null

      const newIntervencion = {
        fecha_hora: fechaHoraFinal,
        equipo_id: targetEquipoId,
        tecnico: item.tecnico || 'Técnico no especificado',
        es_falla: Boolean(item.es_falla),
        tipo_intervencion: item.tipo_intervencion || (item.es_falla ? 'Correctiva' : 'Preventiva'),
        falla_motivo: item.es_falla ? (item.falla_motivo || trabajoRealizadoFinal) : null,
        trabajo_realizado: trabajoRealizadoFinal,
        estado_final: item.estado_final || 'Operativo',
        area: item.area_origen || targetEquipo.area || null,
        tipo_falla: item.tipo_falla || (item.es_falla ? 'Mecánica' : null),
        origen: 'Validación de importación',
        import_batch_id: item.import_batch_id || null,
        created_by: userId
      }

      const { error: insertErr } = await supabase
        .from('bitacora_mantenimiento')
        .insert([newIntervencion])

      if (insertErr) {
        throw new Error(`Error al registrar en bitacora_mantenimiento: ${insertErr.message}`)
      }

      // 2. Actualizar registro en public.bitacora_importacion_pendiente (conservar para auditoría)
      const { error: updateErr } = await supabase
        .from('bitacora_importacion_pendiente')
        .update({
          estado: 'Resuelto',
          equipo_id_resuelto: targetEquipoId,
          motivo_pendiente: `Resuelto a ${targetEquipo.nombre} [${targetEquipo.codigo}]`,
          resolved_at: new Date().toISOString(),
          resolved_by: userId
        })
        .eq('id', item.id)

      if (updateErr) {
        console.warn('Advertencia al actualizar bitacora_importacion_pendiente:', updateErr)
      }

      // 3. Crear alias si el usuario lo confirmó y pasó validación de seguridad
      if (shouldSaveAlias && rawAliasText) {
        try {
          await supabase
            .from('equipo_alias')
            .insert([{ equipo_id: targetEquipoId, alias: rawAliasText }])
        } catch (aliasErr) {
          console.warn('No se pudo guardar alias (posible duplicado):', aliasErr)
        }
      }

      onSuccessMessage(`Registro validado exitosamente y asignado a ${targetEquipo.nombre}.`)
      setSelectedRowIds((prev) => prev.filter((id) => id !== item.id))
      await onRefresh()
    } catch (err) {
      onErrorMessage(err.message || 'Error inesperado durante la validación.')
    } finally {
      setLoadingRowId(null)
    }
  }

  // =========================================================================
  // 2. IGNORAR REGISTRO (Para rutinas operativas u otros no mantenimientos)
  // =========================================================================
  const handleOpenIgnoreModal = (item) => {
    setIgnoreModalItem(item)
    setIgnoreReason('Rutina operativa')
    setIgnoreCustomReason('')
  }

  const handleConfirmIgnore = async () => {
    if (!ignoreModalItem) return
    const finalReason = ignoreReason === 'Otro' ? (ignoreCustomReason.trim() || 'Otro') : ignoreReason

    setIgnoreLoading(true)
    try {
      const userId = session?.user?.id || null
      const { error } = await supabase
        .from('bitacora_importacion_pendiente')
        .update({
          estado: 'Ignorado',
          motivo_pendiente: `Ignorado: ${finalReason}`,
          motivo_ignorado: finalReason,
          resolved_at: new Date().toISOString(),
          resolved_by: userId
        })
        .eq('id', ignoreModalItem.id)

      if (error) throw new Error(error.message)

      onSuccessMessage(`Registro marcado como Ignorado (${finalReason}). No se incluyó en Bitácora.`)
      setIgnoreModalItem(null)
      setSelectedRowIds((prev) => prev.filter((id) => id !== ignoreModalItem.id))
      await onRefresh()
    } catch (err) {
      onErrorMessage(`Error al ignorar registro: ${err.message}`)
    } finally {
      setIgnoreLoading(false)
    }
  }

  // =========================================================================
  // 3. VALIDACIÓN MASIVA
  // =========================================================================
  const handleExecuteBatchValidation = async () => {
    if (!batchTargetEquipoId) {
      onErrorMessage('Por favor seleccione el activo para la validación masiva.')
      return
    }
    const targetEquipo = equiposMap.get(batchTargetEquipoId)
    if (!targetEquipo) {
      onErrorMessage('Equipo seleccionado no válido.')
      return
    }

    const itemsToProcess = pendientesList.filter((p) => selectedRowIds.includes(p.id))
    if (itemsToProcess.length === 0) return

    setBatchLoading(true)
    try {
      const userId = session?.user?.id || null

      // Preparar lote de inserción para bitacora_mantenimiento
      const bitacoraInserts = itemsToProcess.map((item) => {
        const fechaHoraFinal = item.fecha_hora || item.fecha || new Date().toISOString()
        const trabajoRealizadoFinal = item.trabajo_realizado || item.comentario || 'Mantenimiento validado masivamente'
        return {
          fecha_hora: fechaHoraFinal,
          equipo_id: batchTargetEquipoId,
          tecnico: item.tecnico || 'Técnico no especificado',
          es_falla: Boolean(item.es_falla),
          tipo_intervencion: item.tipo_intervencion || (item.es_falla ? 'Correctiva' : 'Preventiva'),
          falla_motivo: item.es_falla ? (item.falla_motivo || trabajoRealizadoFinal) : null,
          trabajo_realizado: trabajoRealizadoFinal,
          estado_final: item.estado_final || 'Operativo',
          area: item.area_origen || targetEquipo.area || null,
          tipo_falla: item.tipo_falla || (item.es_falla ? 'Mecánica' : null),
          origen: 'Validación de importación masiva',
          import_batch_id: item.import_batch_id || null,
          created_by: userId
        }
      })

      const { error: insertErr } = await supabase
        .from('bitacora_mantenimiento')
        .insert(bitacoraInserts)

      if (insertErr) throw new Error(`Error en bitácora: ${insertErr.message}`)

      // Actualizar los registros en bitacora_importacion_pendiente
      const { error: updateErr } = await supabase
        .from('bitacora_importacion_pendiente')
        .update({
          estado: 'Resuelto',
          equipo_id_resuelto: batchTargetEquipoId,
          motivo_pendiente: `Validado en lote hacia ${targetEquipo.nombre}`,
          resolved_at: new Date().toISOString(),
          resolved_by: userId
        })
        .in('id', selectedRowIds)

      if (updateErr) console.warn('Error al actualizar pendientes masivos:', updateErr)

      onSuccessMessage(`Se asignaron y validaron exitosamente ${selectedRowIds.length} registros a ${targetEquipo.nombre}.`)
      setSelectedRowIds([])
      setIsBatchConfirmOpen(false)
      setBatchTargetEquipoId('')
      await onRefresh()
    } catch (err) {
      onErrorMessage(`Error en validación masiva: ${err.message}`)
    } finally {
      setBatchLoading(false)
    }
  }

  return (
    <div className="validacion-pendientes-component">
      {/* 1. CABECERA Y BANNER INFORMATIVO */}
      <div className="validacion-header-card">
        <div className="validacion-header-top">
          <div className="validacion-header-titles">
            <h2 className="validacion-title">Validar tareas sin activo identificado</h2>
            <p className="validacion-subtitle">
              Estas tareas no pudieron asociarse automáticamente a un activo durante la importación. Seleccione el activo real correspondiente o ignore si no corresponde a una intervención.
            </p>
          </div>
          <div className="validacion-badge-counter">
            <span className="badge-count-num">{countsByState.pendientes}</span>
            <span className="badge-count-label">Pendientes de validación</span>
          </div>
        </div>

        {/* Barra de pestañas y filtros por estado */}
        <div className="validacion-state-tabs">
          <button
            type="button"
            className={`validacion-tab-btn ${filterEstado === 'Pendiente' ? 'active' : ''}`}
            onClick={() => setFilterEstado('Pendiente')}
          >
            ⏳ Pendientes ({countsByState.pendientes})
          </button>
          <button
            type="button"
            className={`validacion-tab-btn ${filterEstado === 'Resuelto' ? 'active' : ''}`}
            onClick={() => setFilterEstado('Resuelto')}
          >
            ✓ Resueltos ({countsByState.resueltos})
          </button>
          <button
            type="button"
            className={`validacion-tab-btn ${filterEstado === 'Ignorado' ? 'active' : ''}`}
            onClick={() => setFilterEstado('Ignorado')}
          >
            🚫 Ignorados ({countsByState.ignorados})
          </button>
          <button
            type="button"
            className={`validacion-tab-btn ${filterEstado === 'Todos' ? 'active' : ''}`}
            onClick={() => setFilterEstado('Todos')}
          >
            Todos ({countsByState.total})
          </button>
        </div>

        {/* Filtros secundarios */}
        <div className="validacion-subfilters-row">
          <div className="val-filter-group">
            <label className="val-filter-label">Buscar en descripción</label>
            <input
              type="text"
              className="val-search-input"
              placeholder="Escriba palabra clave..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="val-filter-group">
            <label className="val-filter-label">Técnico</label>
            <select
              className="val-select-input"
              value={filterTecnico}
              onChange={(e) => setFilterTecnico(e.target.value)}
            >
              <option value="">Todos los técnicos</option>
              {tecnicosDisponibles.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {batchesDisponibles.length > 1 && (
            <div className="val-filter-group">
              <label className="val-filter-label">Lote de importación</label>
              <select
                className="val-select-input"
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
              >
                <option value="">Todos los lotes</option>
                {batchesDisponibles.map((b, idx) => (
                  <option key={b} value={b}>
                    Lote {idx + 1} ({b.substring(0, 8)}...)
                  </option>
                ))}
              </select>
            </div>
          )}

          {(filterTecnico || filterBatch || searchText) && (
            <button
              type="button"
              className="val-btn-clear"
              onClick={() => {
                setFilterTecnico('')
                setFilterBatch('')
                setSearchText('')
              }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* 2. BARRA DE ACCIÓN MASIVA (Sticky si hay filas seleccionadas) */}
      {selectedRowIds.length > 0 && (
        <div className="validacion-batch-bar">
          <div className="batch-info">
            <span className="batch-count-badge">{selectedRowIds.length}</span>
            <span>registros seleccionados para validación grupal</span>
          </div>
          <div className="batch-actions">
            <label className="batch-label">Asignar activo:</label>
            <select
              className="batch-select"
              value={batchTargetEquipoId}
              onChange={(e) => setBatchTargetEquipoId(e.target.value)}
            >
              <option value="">Seleccione equipo destino...</option>
              {equiposList.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nombre} [{eq.codigo}]
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn-primary"
              disabled={!batchTargetEquipoId || batchLoading}
              onClick={() => setIsBatchConfirmOpen(true)}
            >
              Validar seleccionados
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSelectedRowIds([])}
            >
              Cancelar selección
            </button>
          </div>
        </div>
      )}

      {/* 3. TABLA DE REGISTROS PENDIENTES */}
      <div className="table-card validacion-table-card">
        <div className="table-responsive">
          <table className="data-table validacion-table">
            <thead>
              <tr>
                {filterEstado === 'Pendiente' && (
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={
                        selectedRowIds.length > 0 &&
                        selectedRowIds.length === filteredList.filter((x) => (x.estado || 'Pendiente') === 'Pendiente').length
                      }
                      onChange={handleToggleSelectAll}
                      title="Seleccionar todos los registros pendientes visibles"
                    />
                  </th>
                )}
                <th>Fecha</th>
                <th>Técnico</th>
                <th>Área / contexto</th>
                <th>Descripción original (Verbatim)</th>
                <th>Equipo detectado</th>
                <th>Confianza</th>
                <th style={{ minWidth: '220px' }}>Seleccionar activo</th>
                <th className="text-center" style={{ minWidth: '160px' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={filterEstado === 'Pendiente' ? 9 : 8} className="text-center" style={{ padding: '3rem' }}>
                    <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>✓</span>
                    <strong>No hay registros en esta vista</strong>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
                      {filterEstado === 'Pendiente'
                        ? 'Importación completada sin tareas pendientes de validación.'
                        : 'No se encontraron registros que coincidan con los filtros aplicados.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const rawFecha = item.fecha_hora || item.fecha
                  const displayFecha = rawFecha
                    ? new Date(rawFecha).toLocaleDateString('es-CL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })
                    : '—'

                  const nombreEncontrado = item.nombre_equipo_origen || item.maquina || 'No identificado'
                  const areaOriginal = item.area_origen || item.area || '—'
                  const trabajoOriginal = item.trabajo_realizado || item.comentario || '—'
                  const estado = item.estado || 'Pendiente'
                  const isResolved = estado === 'Resuelto'
                  const isIgnored = estado === 'Ignorado'
                  const isSelected = selectedRowIds.includes(item.id)
                  const candidates = !isResolved && !isIgnored ? detectCandidates(trabajoOriginal, nombreEncontrado) : []
                  const currentSelectedEqId = selectedEquiposMap[item.id] || item.equipo_id_resuelto || ''
                  const shouldSaveAlias = Boolean(saveAliasMap[item.id])
                  const isLoadingThis = loadingRowId === item.id

                  return (
                    <tr
                      key={item.id}
                      className={`${isSelected ? 'tr-selected' : ''} ${isResolved ? 'tr-resolved' : ''} ${isIgnored ? 'tr-ignored' : ''}`}
                    >
                      {filterEstado === 'Pendiente' && (
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(item.id)}
                          />
                        </td>
                      )}
                      <td className="font-mono" style={{ whiteSpace: 'nowrap' }}>
                        {displayFecha}
                      </td>
                      <td>
                        <strong>{item.tecnico || '—'}</strong>
                      </td>
                      <td>
                        <span className="val-area-tag">{areaOriginal}</span>
                      </td>
                      <td className="val-desc-cell">
                        <div className="val-original-text">
                          "{trabajoOriginal}"
                        </div>
                      </td>
                      <td>
                        <div className="val-detected-box">
                          <span className="badge-tag tag-unmatched">
                            {nombreEncontrado}
                          </span>
                          {/* Candidatos sugeridos clicables */}
                          {candidates.length > 0 && !isResolved && !isIgnored && (
                            <div className="val-candidates-wrapper">
                              <span className="val-candidates-label">Sugeridos:</span>
                              <div className="val-candidates-chips">
                                {candidates.map((cand) => (
                                  <button
                                    key={cand.id}
                                    type="button"
                                    className={`val-candidate-chip ${currentSelectedEqId === cand.id ? 'active' : ''}`}
                                    onClick={() => handleSelectEquipoForRow(item.id, cand.id)}
                                    title={`Asignar rápidamente a ${cand.nombre} [${cand.codigo}]`}
                                  >
                                    + {cand.nombre}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {isResolved ? (
                          <span className="val-badge-confidence val-conf-resuelto">✓ Resuelto</span>
                        ) : isIgnored ? (
                          <span className="val-badge-confidence val-conf-ignorado">🚫 Ignorado</span>
                        ) : candidates.length > 0 ? (
                          <span className="val-badge-confidence val-conf-candidato">Candidatos</span>
                        ) : (
                          <span className="val-badge-confidence val-conf-ambiguo">Ambiguo</span>
                        )}
                      </td>
                      <td>
                        {isResolved ? (
                          <div className="val-resolved-asset-info">
                            <span className="font-bold text-primary-link">
                              {equiposMap.get(item.equipo_id_resuelto)?.nombre || 'Activo asignado'}
                            </span>
                            <span className="text-muted font-mono" style={{ fontSize: '0.8rem', display: 'block' }}>
                              [{equiposMap.get(item.equipo_id_resuelto)?.codigo || '—'}]
                            </span>
                          </div>
                        ) : isIgnored ? (
                          <span className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
                            Motivo: {item.motivo_ignorado || item.motivo_pendiente || 'Rutina operativa'}
                          </span>
                        ) : (
                          <div className="val-selector-wrapper">
                            <select
                              className="val-equipo-select"
                              value={currentSelectedEqId}
                              onChange={(e) => handleSelectEquipoForRow(item.id, e.target.value)}
                            >
                              <option value="">Seleccionar activo oficial...</option>
                              {equiposList.map((eq) => (
                                <option key={eq.id} value={eq.id}>
                                  {eq.nombre} [{eq.codigo}]
                                </option>
                              ))}
                            </select>

                            {/* Checkbox para aprender alias */}
                            {nombreEncontrado && nombreEncontrado !== 'No identificado' && (
                              <label className="val-alias-checkbox-label" title="Guardar este nombre histórico como alias permanente para que próximas importaciones lo resuelvan automáticamente">
                                <input
                                  type="checkbox"
                                  checked={shouldSaveAlias}
                                  onChange={() => handleToggleAliasForRow(item.id)}
                                />
                                <span>Guardar "{nombreEncontrado}" como alias</span>
                              </label>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        {isResolved ? (
                          <span className="val-status-done" title={item.resolved_at ? `Resuelto el ${new Date(item.resolved_at).toLocaleString('es-CL')}` : ''}>
                            ✓ Incorporado
                          </span>
                        ) : isIgnored ? (
                          <span className="val-status-ignored">Omitido</span>
                        ) : (
                          <div className="val-actions-group">
                            <button
                              type="button"
                              className="btn-action-validate"
                              disabled={!currentSelectedEqId || isLoadingThis}
                              onClick={() => handleValidateSingle(item)}
                              title="Validar e incorporar a bitácora de mantenimiento"
                            >
                              {isLoadingThis ? 'Validando...' : 'Validar'}
                            </button>
                            <button
                              type="button"
                              className="btn-action-ignore"
                              onClick={() => handleOpenIgnoreModal(item)}
                              title="Ignorar fila (no es mantenimiento o es rutina operativa)"
                            >
                              Ignorar
                            </button>
                          </div>
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

      {/* 4. MODAL DE CONFIRMACIÓN PARA VALIDACIÓN MASIVA */}
      {isBatchConfirmOpen && (
        <div className="modal-overlay" onClick={() => !batchLoading && setIsBatchConfirmOpen(false)}>
          <div className="modal-container val-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Confirmar asignación masiva</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => !batchLoading && setIsBatchConfirmOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '1rem', lineHeight: 1.5 }}>
                Se asignarán <strong>{selectedRowIds.length}</strong> registros de bitácora al equipo:
              </p>
              <div className="val-target-asset-callout">
                <strong>{equiposMap.get(batchTargetEquipoId)?.nombre}</strong>
                <span className="font-mono" style={{ color: 'var(--primary-color)' }}>
                  [{equiposMap.get(batchTargetEquipoId)?.codigo}]
                </span>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                  Área: {equiposMap.get(batchTargetEquipoId)?.area}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                Cada registro conservará su fecha, técnico y descripción histórica original para auditoría completa.
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={batchLoading}
                onClick={() => setIsBatchConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={batchLoading}
                onClick={handleExecuteBatchValidation}
              >
                {batchLoading ? 'Validando...' : `Confirmar y asignar ${selectedRowIds.length} tareas`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL PARA IGNORAR REGISTRO */}
      {ignoreModalItem && (
        <div className="modal-overlay" onClick={() => !ignoreLoading && setIgnoreModalItem(null)}>
          <div className="modal-container val-ignore-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Ignorar registro de bitácora</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => !ignoreLoading && setIgnoreModalItem(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>
                Al ignorar este registro, <strong>NO</strong> se creará ninguna intervención en la Bitácora de Mantenimiento y no afectará el historial de ningún activo.
              </p>
              <div className="val-ignore-text-preview">
                <strong>Descripción original:</strong>
                <p>"{ignoreModalItem.trabajo_realizado || ignoreModalItem.comentario}"</p>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Motivo para ignorar:</label>
                <select
                  className="form-select"
                  value={ignoreReason}
                  onChange={(e) => setIgnoreReason(e.target.value)}
                >
                  <option value="Rutina operativa">Rutina operativa (ej: despiche diario sin averías)</option>
                  <option value="No corresponde a mantenimiento">No corresponde a mantenimiento</option>
                  <option value="Duplicado">Duplicado</option>
                  <option value="Otro">Otro motivo</option>
                </select>
              </div>

              {ignoreReason === 'Otro' && (
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="form-label">Especifique motivo:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Detalle el motivo..."
                    value={ignoreCustomReason}
                    onChange={(e) => setIgnoreCustomReason(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={ignoreLoading}
                onClick={() => setIgnoreModalItem(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger"
                disabled={ignoreLoading}
                onClick={handleConfirmIgnore}
              >
                {ignoreLoading ? 'Guardando...' : 'Ignorar registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
