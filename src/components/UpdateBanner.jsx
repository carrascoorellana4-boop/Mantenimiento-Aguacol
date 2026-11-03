import { useEffect, useState } from 'react'
import { RefreshCw, WifiOff, X } from 'lucide-react'

// Avisa cuando se publica una versión nueva (el hash del script principal cambia) o cuando el servidor no responde.
const RE = /assets\/index-[\w-]+\.js/
const cargado = () => {
  const s = [...document.scripts].find((x) => RE.test(x.src))
  return s ? s.src.match(RE)[0] : null
}
const CADA_MS = 45000

export default function UpdateBanner() {
  const [nueva, setNueva] = useState(false)
  const [caido, setCaido] = useState(false)
  const [oculto, setOculto] = useState(false)

  useEffect(() => {
    const actual = cargado()
    let fallos = 0
    const revisar = async () => {
      try {
        const r = await fetch(`/index.html?_=${Date.now()}`, { cache: 'no-store' })
        if (!r.ok) throw new Error(String(r.status))
        const hash = ((await r.text()).match(RE) || [])[0]
        fallos = 0
        setCaido(false)
        if (actual && hash && hash !== actual) setNueva(true)
      } catch {
        fallos += 1
        if (fallos >= 2) setCaido(true)
      }
    }
    const id = setInterval(revisar, CADA_MS)
    const alVolver = () => { if (document.visibilityState === 'visible') revisar() }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('online', revisar)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', alVolver); window.removeEventListener('online', revisar) }
  }, [])

  if (caido) {
    return (
      <div className="upd-banner upd-warn" role="status" key="caido">
        <WifiOff size={16} strokeWidth={2} /> <span>Sin conexión con el servidor. Reintentando…</span>
      </div>
    )
  }
  if (!nueva || oculto) return null
  return (
    <div className="upd-banner" role="status" key="nueva">
      <RefreshCw size={16} strokeWidth={2} className="upd-spin" />
      <span>Hay una actualización disponible.</span>
      <button type="button" className="upd-btn" onClick={() => window.location.reload()}>Recargar</button>
      <button type="button" className="upd-x" onClick={() => setOculto(true)} aria-label="Cerrar aviso"><X size={15} strokeWidth={2.2} /></button>
    </div>
  )
}
