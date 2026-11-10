import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Icon from './Icon'
import './SolicitudMantenimientoQrView.css'

const AREAS_CATALOGO = [
  {
    id: 'Producción JJV',
    nombre: 'Producción JJV',
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
      'Galpón Cloro',
      'Tratamiento de Agua',
      'Otro sector JJV'
    ]
  },
  {
    id: 'Plásticos / Extrusión',
    nombre: 'Plásticos / Extrusión',
    lineas: [
      'Extrusora M1',
      'Extrusora M2',
      'Extrusora M3',
      'Extrusora M4',
      'Extrusora M5',
      'Molino / Mezclado',
      'Otro sector Extrusión'
    ]
  },
  {
    id: 'Plásticos / Inyección',
    nombre: 'Plásticos / Inyección',
    lineas: [
      'Inyectora de preformas 1',
      'Inyectora de preformas 2',
      'Inyectora BORCHE',
      'Inyectora 2 (Tapas/Manillas)',
      'Otro sector Inyección'
    ]
  },
  {
    id: 'Soplado',
    nombre: 'Soplado',
    lineas: [
      'Sopladora S1 (PET Auto 5LT)',
      'Sopladora S2 (PET Auto Botella)',
      'Compresor Alta Presión',
      'Otro sector Soplado'
    ]
  },
  {
    id: 'Servicios Generales',
    nombre: 'Servicios Generales',
    lineas: [
      'Sistema Eléctrico Galpón Producción',
      'Sala de Compresores',
      'Caldera',
      'Planta de Tratamiento / Riles',
      'Taller Mecánico',
      'Otro sector Servicios'
    ]
  },
  {
    id: 'Otro',
    nombre: 'Otro',
    lineas: [
      'Bodega',
      'Oficinas / Casino',
      'Otro sector'
    ]
  }
]

export default function SolicitudMantenimientoQrView({ onBackToApp = null }) {
  const [area, setArea] = useState('Producción JJV')
  const [nombre, setNombre] = useState('')
  const [linea, setLinea] = useState('')
  const [equipo, setEquipo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [lineaDetenida, setLineaDetenida] = useState('no') // 'si' | 'no'

  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoBase64, setFotoBase64] = useState(null)

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [createdOt, setCreatedOt] = useState(null)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')

  const fileInputRef = useRef(null)

  // Obtener las líneas disponibles según el área seleccionada
  const activeAreaObj = AREAS_CATALOGO.find((a) => a.id === area) || AREAS_CATALOGO[0]

  // Si cambia el área, resetear la línea seleccionada si ya no pertenece
  useEffect(() => {
    if (activeAreaObj && !activeAreaObj.lineas.includes(linea)) {
      setLinea('')
    }
  }, [area])

  // Compresión automática de imágenes vía canvas para envío ultrarrápido
  const compressImage = (file, callback) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = (e) => {
      img.onload = () => {
        const maxDim = 1200
        let w = img.width
        let h = img.height
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          } else {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        callback(dataUrl)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 15 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, foto: 'La foto no debe superar los 15 MB.' }))
      return
    }

    setFotoFile(file)
    const previewUrl = URL.createObjectURL(file)
    setFotoPreview(previewUrl)

    compressImage(file, (compressedBase64) => {
      setFotoBase64(compressedBase64)
    })

    if (errors.foto) {
      setErrors((prev) => ({ ...prev, foto: null }))
    }
  }

  const handleRemoveFoto = () => {
    if (fotoPreview) {
      URL.revokeObjectURL(fotoPreview)
    }
    setFotoFile(null)
    setFotoPreview(null)
    setFotoBase64(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validateForm = () => {
    const errs = {}
    if (!area) errs.area = 'Selecciona el área de la planta.'
    if (!nombre.trim() || nombre.trim().length < 2) {
      errs.nombre = 'Ingresa tu nombre completo (mínimo 2 letras).'
    }
    if (!linea) {
      errs.linea = 'Selecciona la línea o sector del problema.'
    }
    if (!descripcion.trim() || descripcion.trim().length < 4) {
      errs.descripcion = 'Describe brevemente el problema o trabajo requerido (mínimo 4 caracteres).'
    }
    if (!lineaDetenida) {
      errs.lineaDetenida = 'Indica si la línea está detenida o no.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    if (!validateForm()) return

    setLoading(true)

    const payload = {
      area,
      solicitante: nombre.trim(),
      linea,
      equipo: equipo.trim(),
      descripcion: descripcion.trim(),
      linea_detenida: lineaDetenida === 'si',
      foto_base64: fotoBase64 || null
    }

    try {
      // Llamada directa y oficial al RPC de Supabase / PostgREST
      const { data, error } = await supabase.rpc('crear_solicitud_mantenimiento_qr', {
        p_area: payload.area,
        p_solicitante: payload.solicitante,
        p_linea: payload.linea,
        p_descripcion: payload.descripcion,
        p_equipo: payload.equipo || null,
        p_linea_detenida: payload.linea_detenida,
        p_foto_url: payload.foto_base64 || null
      })

      if (error) {
        throw new Error(error.message || 'Error al procesar la solicitud con el servidor.')
      }

      setCreatedOt(data)
      setSubmitted(true)
    } catch (err) {
      console.error('Error al enviar solicitud de mantenimiento:', err)
      setServerError(
        err.message || 'No fue posible registrar tu solicitud. Intenta nuevamente o avisa a tu supervisor.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSubmitted(false)
    setCreatedOt(null)
    setNombre('')
    setLinea('')
    setEquipo('')
    setDescripcion('')
    setLineaDetenida('no')
    handleRemoveFoto()
    setErrors({})
    setServerError('')
  }

  return (
    <div className="solicitud-page-wrapper">
      <div className="solicitud-card-window">
        {/* Cabecera de la ventana */}
        <header className="solicitud-window-header">
          {onBackToApp && (
            <button
              type="button"
              className="solicitud-back-link"
              onClick={onBackToApp}
              title="Volver al panel principal"
            >
              <Icon n="left" />
              <span>Volver a la intranet</span>
            </button>
          )}
          <div className="solicitud-brand-badge">
            <span className="solicitud-brand-dot"></span>
            <span>AGUACOL • PLANTA PRODUCTIVA</span>
          </div>
          <h1 className="solicitud-main-title">SOLICITUD DE MANTENIMIENTO</h1>
          <p className="solicitud-subtitle">
            Ingreso directo de fallas, requerimientos y paradas operacionales
          </p>
        </header>

        {/* PANTALLA DE ÉXITO */}
        {submitted ? (
          <div className="solicitud-success-box">
            <div className={`solicitud-success-icon-wrap ${createdOt?.ya_existia ? 'icon-existing' : ''}`}>
              <Icon n={createdOt?.ya_existia ? 'check' : 'check'} size="2.5rem" />
            </div>
            <h2 className="solicitud-success-heading">
              {createdOt?.ya_existia ? 'Solicitud Ya Registrada en Sistema' : '¡Solicitud Ingresada Exitosamente!'}
            </h2>
            <p className="solicitud-success-subtext">
              {createdOt?.ya_existia
                ? 'Ya existía una solicitud idéntica en estado activo. Se mantuvo la orden existente para evitar duplicidad de trabajo.'
                : 'El equipo de mantenimiento ha recibido tu reporte en tiempo real y fue registrado en el sistema.'}
            </p>

            <div className="solicitud-folio-card">
              <span className="solicitud-folio-label">
                {createdOt?.ya_existia ? 'Orden de Trabajo Activa en Curso' : 'Orden de Trabajo Generada'}
              </span>
              <div className="solicitud-folio-code">
                {createdOt?.codigo_ot || (createdOt?.numero_ot ? `OT N° ${createdOt.numero_ot}` : 'OT GENERADA')}
              </div>
              <span className="solicitud-folio-status">
                <span className="status-dot"></span> Estado: Pendiente de Atención
                {createdOt?.ya_existia && (
                  <span style={{ color: '#38bdf8', marginLeft: '0.5rem', fontWeight: 700 }}>
                    • Sin duplicar
                  </span>
                )}
              </span>
            </div>

            <div className="solicitud-summary-list">
              <div className="summary-item">
                <span className="summary-label">Solicitante:</span>
                <span className="summary-val">{nombre}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Área:</span>
                <span className="summary-val">{area}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Línea / Sector:</span>
                <span className="summary-val">{linea}</span>
              </div>
              {equipo && (
                <div className="summary-item">
                  <span className="summary-label">Equipo:</span>
                  <span className="summary-val">{equipo}</span>
                </div>
              )}
              <div className="summary-item">
                <span className="summary-label">¿Línea detenida?:</span>
                <span className={`summary-val ${lineaDetenida === 'si' ? 'text-red' : 'text-green'}`}>
                  {lineaDetenida === 'si' ? 'Sí (Prioridad Alta • Línea Detenida)' : 'No (Línea produciendo)'}
                </span>
              </div>
              {fotoPreview && (
                <div className="summary-item">
                  <span className="summary-label">Fotografía:</span>
                  <span className="summary-val">Adjunta ✓</span>
                </div>
              )}
            </div>

            <button
              type="button"
              className="solicitud-submit-btn"
              onClick={handleReset}
              style={{ marginTop: '1.5rem' }}
            >
              <Icon n="plus" />
              <span>Ingresar otra solicitud</span>
            </button>
          </div>
        ) : (
          /* FORMULARIO ESTILO SOLICITADO */
          <form className="solicitud-form" onSubmit={handleSubmit} noValidate>
            {serverError && (
              <div className="solicitud-alert-box error" role="alert">
                <Icon n="warn" />
                <span>{serverError}</span>
              </div>
            )}

            {/* 1. Área * */}
            <div className="solicitud-field-group">
              <label className="solicitud-label" htmlFor="sol-area">
                Área <span className="req">*</span>
              </label>
              <div className="solicitud-select-wrap">
                <select
                  id="sol-area"
                  className={`solicitud-select ${errors.area ? 'is-invalid' : ''}`}
                  value={area}
                  onChange={(e) => {
                    setArea(e.target.value)
                    if (errors.area) setErrors((prev) => ({ ...prev, area: null }))
                  }}
                  disabled={loading}
                >
                  {AREAS_CATALOGO.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
              {errors.area && <span className="solicitud-error-text">{errors.area}</span>}
            </div>

            {/* 2. Nombre * */}
            <div className="solicitud-field-group">
              <label className="solicitud-label" htmlFor="sol-nombre">
                Nombre <span className="req">*</span>
              </label>
              <input
                id="sol-nombre"
                type="text"
                className={`solicitud-input ${errors.nombre ? 'is-invalid' : ''}`}
                placeholder="Nombre y apellido de quien reporta"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value)
                  if (errors.nombre) setErrors((prev) => ({ ...prev, nombre: null }))
                }}
                disabled={loading}
                autoComplete="name"
              />
              {errors.nombre && <span className="solicitud-error-text">{errors.nombre}</span>}
            </div>

            {/* 3. Línea / Sector * */}
            <div className="solicitud-field-group">
              <label className="solicitud-label" htmlFor="sol-linea">
                Línea / Sector <span className="req">*</span>
              </label>
              <div className="solicitud-select-wrap">
                <select
                  id="sol-linea"
                  className={`solicitud-select ${errors.linea ? 'is-invalid' : ''}`}
                  value={linea}
                  onChange={(e) => {
                    setLinea(e.target.value)
                    if (errors.linea) setErrors((prev) => ({ ...prev, linea: null }))
                  }}
                  disabled={loading}
                >
                  <option value="">-- Seleccionar Línea / Sector --</option>
                  {activeAreaObj?.lineas.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              {errors.linea && <span className="solicitud-error-text">{errors.linea}</span>}
            </div>

            {/* 4. Equipo */}
            <div className="solicitud-field-group">
              <label className="solicitud-label" htmlFor="sol-equipo">
                Equipo <span className="optional-tag">(Opcional)</span>
              </label>
              <input
                id="sol-equipo"
                type="text"
                className="solicitud-input"
                placeholder="Ej: Horno, Selladora, Bomba 2, Cinta transportadora..."
                value={equipo}
                onChange={(e) => setEquipo(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* 5. Descripción del problema * */}
            <div className="solicitud-field-group">
              <label className="solicitud-label" htmlFor="sol-descripcion">
                Descripción del problema <span className="req">*</span>
              </label>
              <textarea
                id="sol-descripcion"
                className={`solicitud-textarea ${errors.descripcion ? 'is-invalid' : ''}`}
                rows={4}
                placeholder="Indica qué ocurre: ruido anormal, fuga de agua/aceite, atasco de material, motor no enciende, etc."
                value={descripcion}
                onChange={(e) => {
                  setDescripcion(e.target.value)
                  if (errors.descripcion) setErrors((prev) => ({ ...prev, descripcion: null }))
                }}
                disabled={loading}
              />
              {errors.descripcion && (
                <span className="solicitud-error-text">{errors.descripcion}</span>
              )}
            </div>

            {/* 6. ¿La línea está detenida? * */}
            <div className="solicitud-field-group">
              <label className="solicitud-label">
                ¿La línea está detenida? <span className="req">*</span>
              </label>
              <div className="solicitud-radios-row">
                <label className={`solicitud-radio-card ${lineaDetenida === 'si' ? 'selected-danger' : ''}`}>
                  <input
                    type="radio"
                    name="linea_detenida"
                    value="si"
                    checked={lineaDetenida === 'si'}
                    onChange={() => setLineaDetenida('si')}
                    disabled={loading}
                  />
                  <span className="radio-indicator"></span>
                  <div className="radio-text">
                    <span className="radio-title">Sí</span>
                    <span className="radio-desc">Máquina o línea parada por falla</span>
                  </div>
                </label>

                <label className={`solicitud-radio-card ${lineaDetenida === 'no' ? 'selected-normal' : ''}`}>
                  <input
                    type="radio"
                    name="linea_detenida"
                    value="no"
                    checked={lineaDetenida === 'no'}
                    onChange={() => setLineaDetenida('no')}
                    disabled={loading}
                  />
                  <span className="radio-indicator"></span>
                  <div className="radio-text">
                    <span className="radio-title">No</span>
                    <span className="radio-desc">Sigue en marcha o aviso preventivo</span>
                  </div>
                </label>
              </div>
              {errors.lineaDetenida && (
                <span className="solicitud-error-text">{errors.lineaDetenida}</span>
              )}
            </div>

            {/* 7. Foto */}
            <div className="solicitud-field-group">
              <label className="solicitud-label">Foto <span className="optional-tag">(Opcional)</span></label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFotoChange}
                disabled={loading}
              />

              {!fotoPreview ? (
                <button
                  type="button"
                  className="solicitud-btn-foto"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <Icon n="camera" />
                  <span>+ Agregar foto</span>
                </button>
              ) : (
                <div className="solicitud-foto-preview-wrap">
                  <div className="foto-thumbnail-box">
                    <img src={fotoPreview} alt="Foto adjunta de solicitud" className="foto-thumbnail" />
                    <div className="foto-info">
                      <span className="foto-name">{fotoFile?.name || 'Fotografía capturada'}</span>
                      <span className="foto-size">
                        {fotoFile ? `${(fotoFile.size / 1024).toFixed(0)} KB` : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="solicitud-btn-quitar-foto"
                    onClick={handleRemoveFoto}
                    disabled={loading}
                    title="Eliminar esta foto"
                  >
                    <Icon n="x" />
                    <span>Quitar</span>
                  </button>
                </div>
              )}
              {errors.foto && <span className="solicitud-error-text">{errors.foto}</span>}
            </div>

            {/* 8. Botón ENVIAR SOLICITUD */}
            <div className="solicitud-submit-wrap">
              <button
                type="submit"
                className="solicitud-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="solicitud-spinner" aria-hidden="true" />
                    <span>Enviando solicitud...</span>
                  </>
                ) : (
                  <>
                    <Icon n="check" />
                    <span>ENVIAR SOLICITUD</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <footer className="solicitud-window-footer">
          <span>Sistema de Mantenimiento AGUACOL</span>
          <span>•</span>
          <span>mantenimiento.aguacol.cl</span>
        </footer>
      </div>
    </div>
  )
}
