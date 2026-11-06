import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, ArrowLeft, Activity, Tablet } from 'lucide-react'
import Icon from './Icon'
import './LoginView.css'

// Engranajes reales: mismo paso circular (PASO) en los tres, así el radio primitivo sale de los dientes (r = N·paso / 2π).
// Se tocan sobre la línea de centros, sus velocidades son inversas a los dientes (ω1·N1 = ω2·N2) y giran en sentidos
// opuestos; la fase inicial deja un diente de uno frente a un hueco del otro. Todo gira con la misma línea de tiempo SMIL.
const PASO = 50
const ALTO = 20
const rPrimitivo = (n) => (n * PASO) / (2 * Math.PI)
const rad = (g) => (g * Math.PI) / 180
const mod = (a, m) => ((a % m) + m) % m

function gearPath(teeth, rOut, rIn) {
  const pts = []
  const step = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i += 1) {
    const a = i * step
    const w = step * 0.22
    const f = step * 0.12
    const p = (ang, r) => `${(Math.cos(ang) * r).toFixed(2)},${(Math.sin(ang) * r).toFixed(2)}`
    pts.push(p(a - w, rIn), p(a - f, rOut), p(a + f, rOut), p(a + w, rIn))
  }
  return `M${pts.join('L')}Z`
}

const T = { a: 18, b: 10, c: 12 }
const CENTRO_A = { x: -90, y: 20 }
const PERIODO_A = 40 // segundos por vuelta del engranaje grande
// Posición y fase de un engranaje que engrana con A en la dirección theta (grados, sentido horario con y hacia abajo).
function acoplado(n, theta) {
  const d = rPrimitivo(T.a) + rPrimitivo(n)
  return {
    x: CENTRO_A.x + d * Math.cos(rad(theta)),
    y: CENTRO_A.y + d * Math.sin(rad(theta)),
    fase: mod(theta + 180 - 180 / n, 360 / n),
  }
}
const GEARS = [
  { id: 'a', n: T.a, x: CENTRO_A.x, y: CENTRO_A.y, fase: 0, dir: 1, dur: PERIODO_A, hubs: 4 },
  { id: 'b', n: T.b, ...acoplado(T.b, -40), dir: -1, dur: (PERIODO_A * T.b) / T.a, hubs: 3 },
  { id: 'c', n: T.c, ...acoplado(T.c, 20), dir: -1, dur: (PERIODO_A * T.c) / T.a, hubs: 3 },
]

function Gear({ g, lit, onCenter }) {
  const r = rPrimitivo(g.n)
  const rOut = r + ALTO / 2 - 1
  const rIn = r - ALTO / 2 - 1
  const hole = r * 0.2
  return (
    <g transform={`translate(${g.x.toFixed(2)},${g.y.toFixed(2)})`}>
      <g>
        <animateTransform attributeName="transform" type="rotate" from={`${g.fase} 0 0`} to={`${g.fase + 360 * g.dir} 0 0`} dur={`${g.dur}s`} repeatCount="indefinite" />
        <path d={gearPath(g.n, rOut, rIn)} className="lg-gear-body" />
        <circle r={r * 0.55} className="lg-gear-well" />
        {Array.from({ length: g.hubs }, (_, i) => {
          const a = (i * Math.PI * 2) / g.hubs
          return <circle key={i} cx={Math.cos(a) * r * 0.36} cy={Math.sin(a) * r * 0.36} r={r * 0.09} className="lg-gear-dot" />
        })}
      </g>
      <circle r={hole} className={`lg-gear-axle ${lit ? 'lit' : ''}`} />
      <circle r={hole + 10} className="lg-hit" onClick={() => onCenter(g.id)} />
    </g>
  )
}

// Señal de vibración de un equipo en monitoreo: la línea se dibuja y se desplaza sin parar.
const HUEVO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1'
const SIGNAL = 'M0,40 L30,40 L38,40 L44,18 L52,62 L60,26 L66,40 L110,40 L118,40 L124,10 L134,70 L142,22 L148,40 L200,40'

export default function LoginView({ email, setEmail, password, setPassword, loading, error, onSubmit, onBack }) {
  const [show, setShow] = useState(false)
  const [lit, setLit] = useState([])
  const svgRef = useRef(null)
  const timer = useRef(null)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) svgRef.current?.pauseAnimations?.()
    return () => clearTimeout(timer.current)
  }, [])

  // Huevo de pascua: tocar los tres centros (en cualquier orden, sin pausas largas) abre el enlace.
  const alTocarCentro = (id) => {
    clearTimeout(timer.current)
    const nuevo = lit.includes(id) ? lit : [...lit, id]
    if (nuevo.length === GEARS.length) {
      setLit([])
      window.open(HUEVO, '_blank', 'noopener')
      return
    }
    setLit(nuevo)
    timer.current = setTimeout(() => setLit([]), 6000)
  }

  return (
    <div className="lg-root">
      <div className="lg-aurora" aria-hidden="true">
        <span className="lg-blob lg-b1" />
        <span className="lg-blob lg-b2" />
        <span className="lg-blob lg-b3" />
        <span className="lg-grid" />
      </div>

      <section className="lg-stage" aria-hidden="true">
        <svg ref={svgRef} viewBox="-260 -240 520 480" className="lg-gears" role="presentation">
          {GEARS.map((g) => <Gear key={g.id} g={g} lit={lit.includes(g.id)} onCenter={alTocarCentro} />)}
        </svg>

        <div className="lg-chip lg-chip-a"><span className="lg-led" />Sistema operativo</div>
        <div className="lg-chip lg-chip-b">
          <Activity size={15} strokeWidth={2} />
          <svg viewBox="0 0 200 80" className="lg-signal"><path d={SIGNAL} /></svg>
        </div>
        <div className="lg-chip lg-chip-c"><Icon n="shield" />Trazabilidad por equipo</div>
      </section>

      <main className="lg-panel">
        <div className="lg-card">
          <div className="lg-brand">
            <img src="/Mantenimiento.ico" alt="" className="lg-mark" />
            <div>
              <p className="lg-brand-name">AGUACOL</p>
              <p className="lg-brand-sub">Gestión de Mantenimiento</p>
            </div>
          </div>

          <h1 className="lg-title">Bienvenido de vuelta</h1>
          <p className="lg-lead">Ingresa para registrar intervenciones, órdenes de trabajo y repuestos.</p>

          <form onSubmit={onSubmit} noValidate className="lg-form">
            {error && (
              <div className="lg-error" role="alert" key={error}>
                <Icon n="warn" /> <span>{error}</span>
              </div>
            )}

            {/* Acceso Rápido para Operadores en Tablet */}
            <div className="lg-operadores-shortcuts">
              <span className="lg-shortcuts-label"><Tablet size={13} /> Acceso rápido Operador (Tablet):</span>
              <div className="lg-shortcuts-pills">
                <button
                  type="button"
                  className="lg-shortcut-pill"
                  onClick={() => setEmail('operador.extrusion@aguacol.cl')}
                  title="Cargar usuario de Operador Extrusión"
                >
                  Extrusión
                </button>
                <button
                  type="button"
                  className="lg-shortcut-pill"
                  onClick={() => setEmail('operador.soplado@aguacol.cl')}
                  title="Cargar usuario de Operador Soplado"
                >
                  Soplado
                </button>
                <button
                  type="button"
                  className="lg-shortcut-pill"
                  onClick={() => setEmail('operador.inyeccion@aguacol.cl')}
                  title="Cargar usuario de Operador Inyección"
                >
                  Inyección
                </button>
              </div>
            </div>

            <label className="lg-field">
              <span className="lg-label">Usuario</span>
              <span className="lg-input-wrap">
                <Mail size={17} strokeWidth={1.9} className="lg-input-ico" />
                <input type="text" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" placeholder="nombre@aguacol.cl" value={email}
                  onChange={(e) => setEmail(e.target.value)} disabled={loading} autoFocus />
              </span>
            </label>

            <label className="lg-field">
              <span className="lg-label">Contraseña</span>
              <span className="lg-input-wrap">
                <Lock size={17} strokeWidth={1.9} className="lg-input-ico" />
                <input type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Tu contraseña" value={password}
                  onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                <button type="button" className="lg-eye" onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {show ? <EyeOff size={17} strokeWidth={1.9} /> : <Eye size={17} strokeWidth={1.9} />}
                </button>
              </span>
            </label>

            <button type="submit" className="lg-submit" disabled={loading}>
              {loading ? <><Loader2 size={18} className="lg-spinner" /> Verificando acceso</> : <>Ingresar <ArrowRight size={18} strokeWidth={2.2} /></>}
            </button>

            {onBack && (
            <button type="button" className="lg-back" onClick={onBack} disabled={loading}>
              <ArrowLeft size={15} strokeWidth={2} /> Volver sin iniciar sesión
            </button>
            )}
          </form>
        </div>
      </main>
    </div>
  )
}
