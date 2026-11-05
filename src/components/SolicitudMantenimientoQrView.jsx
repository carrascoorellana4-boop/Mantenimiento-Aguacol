import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './SolicitudMantenimientoQrView.css'

const AREAS = [
  {
    id: 'Producción JJV',
    title: 'Producción JJV',
    desc: 'Líneas 1 a 9, envasado, hornos y servicios JJV',
    icon: '🏭',
    lineas: [
      'Línea 1',
      'Línea 2',
      'Línea 3',
      'Línea 4',
      'Línea 5',
      'Línea 6',
      'Línea 7',
      'Línea 8',
      'Línea 9',
      'Horno de cloro',
      'Selladora de cloro',
      'Desmineralizador',
      'Compresor JJV',
      'Otro sector JJV'
    ]
  },
  {
    id: 'Plásticos',
    title: 'Plásticos',
    desc: 'Extrusión (M1-M5), Inyección y Soplado / PET (S1-S2)',
    icon: '⚙️',
    lineas: [
      'Extrusora M1',
      'Extrusora M2',
      'Extrusora M3',
      'Extrusora M4',
      'Extrusora M5',
      'Inyectora de Preformas 1',
      'Inyectora de Preformas 2',
      'Inyectora BORCHE',
      'Inyectora 2',
      'Sopladora S1',
      'Sopladora S2',
      'Molino / Mezclado',
      'Compresor Alta Presión',
      'Otro sector Plásticos'
    ]
  },
  {
    id: 'Otro',
    title: 'Otro',
    desc: 'Servicios generales, bodega, calderas u otras áreas',
    icon: '📦',
    lineas: [
      'Servicios Generales',
      'Bodega',
      'Caldera',
      'Planta de Tratamiento / Riles',
      'Taller Mecánico',
      'Otro'
    ]
  }
]

export default function SolicitudMantenimientoQrView() {
  const [step, setStep] = useState(1) // 1: Seleccionar área, 2: Formulario, 3: Éxito
  const [selectedArea, setSelectedArea] = useState('')
  const [nombre, setNombre] = useState('')
  const [linea, setLinea] = useState('')
  const [lineaOtroTexto, setLineaOtroTexto] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [createdOt, setCreatedOt] = useState(null)

  const activeAreaObj = AREAS.find((a) => a.id === selectedArea) || null

  const handleSelectArea = (areaId) => {
    setSelectedArea(areaId)
    setLinea('')
    setLineaOtroTexto('')
    setErrors({})
    setServerError('')
    setStep(2)
  }

  const handleBackToStep1 = () => {
    setStep(1)
    setErrors({})
    setServerError('')
  }

  const validateForm = () => {
    const errs = {}
    if (!nombre.trim() || nombre.trim().length < 2) {
      errs.nombre = 'Ingresa tu nombre completo (mínimo 2 letras).'
    }
    if (!linea) {
      errs.linea = 'Debes seleccionar la línea o sector del problema.'
    } else if (linea === 'Otro' || linea.startsWith('Otro sector')) {
      if (!lineaOtroTexto.trim()) {
        errs.lineaOtroTexto = 'Especifica cuál es el sector o equipo.'
      }
    }
    if (!descripcion.trim() || descripcion.trim().length < 5) {
      errs.descripcion = 'Describe brevemente el problema o requerimiento (mínimo 5 caracteres).'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    if (!validateForm()) return

    setLoading(true)
    const lineaFinal =
      (linea === 'Otro' || linea.startsWith('Otro sector')) && lineaOtroTexto.trim()
        ? `${linea}: ${lineaOtroTexto.trim()}`
        : linea

    const payload = {
      area: selectedArea,
      solicitante: nombre.trim(),
      linea: lineaFinal,
      descripcion: descripcion.trim()
    }

    try {
      // 1. Intentar endpoint backend público /api/solicitudes
      let result = null
      let ok = false

      try {
        const resp = await fetch('/api/solicitudes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (resp.ok) {
          result = await resp.json()
          ok = true
        }
      } catch {
        // Fallback si no está el proxy web local en desarrollo
      }

      // 2. Si no respondió /api/solicitudes, llamar a la función RPC de Supabase directamente
      if (!ok) {
        const { data, error } = await supabase.rpc('crear_solicitud_mantenimiento_qr', {
          p_area: payload.area,
          p_solicitante: payload.solicitante,
          p_linea: payload.linea,
          p_descripcion: payload.descripcion
        })

        if (error) {
          throw new Error(error.message || 'Error al procesar solicitud con el servidor.')
        }
        result = data
        ok = true
      }

      setCreatedOt(result)
      setStep(3)
    } catch (err) {
      setServerError(
        err.message || 'No fue posible registrar tu solicitud. Intenta nuevamente o avisa a tu supervisor.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep(1)
    setSelectedArea('')
    setNombre('')
    setLinea('')
    setLineaOtroTexto('')
    setDescripcion('')
    setErrors({})
    setServerError('')
    setCreatedOt(null)
  }

  return (
    <div className="qr-solicitud-wrapper">
      <header className="qr-header-branding">
        <span className="qr-brand-badge">AGUACOL • MANTENIMIENTO</span>
        <h1 className="qr-header-title">Solicitud de Mantenimiento</h1>
        <p className="qr-header-subtitle">Levantamiento rápido de fallas y trabajos en planta</p>
      </header>

      <main className="qr-card-container">
        {/* ====================================================================
            PANTALLA 1: SELECCIÓN DE ÁREA DEL SOLICITANTE
           ==================================================================== */}
        {step === 1 && (
          <div>
            <h2 className="qr-step-title">¿A qué área perteneces?</h2>
            <p className="qr-step-instruction">Toca tu área de trabajo para continuar</p>

            <div className="qr-areas-grid">
              {AREAS.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  className="qr-area-btn"
                  onClick={() => handleSelectArea(area.id)}
                >
                  <div className="qr-area-icon-wrap" aria-hidden="true">
                    <span>{area.icon}</span>
                  </div>
                  <div className="qr-area-btn-content">
                    <span className="qr-area-btn-title">{area.title}</span>
                    <span className="qr-area-btn-desc">{area.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ====================================================================
            PANTALLA 2: FORMULARIO DE LEVANTAMIENTO
           ==================================================================== */}
        {step === 2 && (
          <div>
            <div className="qr-form-header-bar">
              <button
                type="button"
                className="qr-back-btn"
                onClick={handleBackToStep1}
                disabled={loading}
              >
                ← Cambiar área
              </button>
              <span className="qr-selected-area-pill">
                Área: <strong>{selectedArea}</strong>
              </span>
            </div>

            {serverError && (
              <div className="qr-server-error" role="alert">
                <span>⚠️</span>
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Nombre del trabajador */}
              <div className="qr-form-group">
                <label className="qr-form-label" htmlFor="qr-input-nombre">
                  Nombre del trabajador <span className="req">*</span>
                </label>
                <input
                  id="qr-input-nombre"
                  type="text"
                  className={`qr-input ${errors.nombre ? 'is-invalid' : ''}`}
                  placeholder="Ej. Juan Pérez"
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value)
                    if (errors.nombre) setErrors((prev) => ({ ...prev, nombre: null }))
                  }}
                  disabled={loading}
                  autoComplete="name"
                  autoFocus
                />
                {errors.nombre && <span className="qr-field-error">{errors.nombre}</span>}
              </div>

              {/* Línea / Sector según área */}
              <div className="qr-form-group">
                <label className="qr-form-label" htmlFor="qr-select-linea">
                  Línea / Sector de trabajo <span className="req">*</span>
                </label>
                <select
                  id="qr-select-linea"
                  className={`qr-select ${errors.linea ? 'is-invalid' : ''}`}
                  value={linea}
                  onChange={(e) => {
                    setLinea(e.target.value)
                    if (errors.linea) setErrors((prev) => ({ ...prev, linea: null }))
                  }}
                  disabled={loading}
                >
                  <option value="">-- Selecciona línea o máquina --</option>
                  {activeAreaObj?.lineas.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                {errors.linea && <span className="qr-field-error">{errors.linea}</span>}
              </div>

              {/* Campo complementario si eligió "Otro" o "Otro sector" */}
              {(linea === 'Otro' || linea.startsWith('Otro sector')) && (
                <div className="qr-form-group">
                  <label className="qr-form-label" htmlFor="qr-input-linea-otro">
                    Especificar sector / equipo <span className="req">*</span>
                  </label>
                  <input
                    id="qr-input-linea-otro"
                    type="text"
                    className={`qr-input ${errors.lineaOtroTexto ? 'is-invalid' : ''}`}
                    placeholder="Ej. Cinta transportadora posterior, compresor auxiliar..."
                    value={lineaOtroTexto}
                    onChange={(e) => {
                      setLineaOtroTexto(e.target.value)
                      if (errors.lineaOtroTexto) setErrors((prev) => ({ ...prev, lineaOtroTexto: null }))
                    }}
                    disabled={loading}
                  />
                  {errors.lineaOtroTexto && (
                    <span className="qr-field-error">{errors.lineaOtroTexto}</span>
                  )}
                </div>
              )}

              {/* Descripción del levantamiento */}
              <div className="qr-form-group">
                <label className="qr-form-label" htmlFor="qr-input-descripcion">
                  Describe el problema o trabajo requerido <span className="req">*</span>
                </label>
                <textarea
                  id="qr-input-descripcion"
                  className={`qr-textarea ${errors.descripcion ? 'is-invalid' : ''}`}
                  rows={4}
                  placeholder="Explica qué ocurrió: ruido extraño, fuga, equipo no enciende, atasco de material, etc."
                  value={descripcion}
                  onChange={(e) => {
                    setDescripcion(e.target.value)
                    if (errors.descripcion) setErrors((prev) => ({ ...prev, descripcion: null }))
                  }}
                  disabled={loading}
                />
                {errors.descripcion && (
                  <span className="qr-field-error">{errors.descripcion}</span>
                )}
                <span className="qr-helper-text">
                  Entre más detalles proporciones, más rápido responderá el equipo de mecánicos.
                </span>
              </div>

              {/* Botón de Enviar */}
              <button
                type="submit"
                className="qr-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="qr-spinner" aria-hidden="true" />
                    <span>Enviando solicitud...</span>
                  </>
                ) : (
                  'Enviar solicitud de mantenimiento'
                )}
              </button>
            </form>
          </div>
        )}

        {/* ====================================================================
            PANTALLA 3: SOLICITUD ENVIADA CORRECTAMENTE
           ==================================================================== */}
        {step === 3 && (
          <div className="qr-success-card">
            <div className="qr-success-icon-wrap" aria-hidden="true">
              ✓
            </div>
            <h2 className="qr-success-title">Solicitud enviada correctamente</h2>
            <p className="qr-success-lead">
              El equipo de Mantenimiento ha recibido tu reporte y fue ingresado al sistema.
            </p>

            <div className="qr-folio-display-box">
              <span className="qr-folio-label">Número de Orden de Trabajo</span>
              <div className="qr-folio-number">
                {createdOt?.codigo_ot || (createdOt?.numero_ot ? `OT N° ${createdOt.numero_ot}` : 'OT GENERADA')}
              </div>
            </div>

            <div className="qr-success-details">
              <div><strong>Solicitante:</strong> {nombre}</div>
              <div><strong>Área:</strong> {selectedArea}</div>
              <div>
                <strong>Ubicación:</strong>{' '}
                {(linea === 'Otro' || linea.startsWith('Otro sector')) && lineaOtroTexto.trim()
                  ? `${linea}: ${lineaOtroTexto.trim()}`
                  : linea}
              </div>
              <div><strong>Estado:</strong> Pendiente de asignación técnica</div>
            </div>

            <button
              type="button"
              className="qr-reset-btn"
              onClick={handleReset}
            >
              Crear otra solicitud
            </button>
          </div>
        )}
      </main>

      <footer className="qr-footer-credit">
        Sistema de Mantenimiento AGUACOL • Acceso directo en planta
      </footer>
    </div>
  )
}
