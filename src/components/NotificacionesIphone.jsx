import { useEffect, useState } from 'react'

const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
const asU8 = (base64url) => {
  const b64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64 + '='.repeat((4 - b64.length % 4) % 4))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

export default function NotificacionesIphone({ session }) {
  const [config, setConfig] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

  const api = async (route, options = {}) => {
    const response = await fetch('/api/push/' + route, {
      ...options,
      headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json', ...(options.headers || {}) }
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw Error(data.error || 'Error al consultar las notificaciones.')
    return data
  }

  const refresh = async () => {
    try { setConfig(await api('config')) }
    catch (e) { setError(e.message) }
  }

  useEffect(() => { refresh() }, [session?.user?.id])

  const activate = async () => {
    setError(''); setNotice(''); setBusy(true)
    try {
      if (!supported) throw Error('Este navegador no permite notificaciones push.')
      if (ios && !standalone()) throw Error('En iPhone debes abrir el ERP desde el ícono agregado a la pantalla de inicio.')
      const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' })
      await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw Error('Debes permitir las notificaciones en iOS para continuar.')
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: asU8(config.publicKey)
      })
      const result = await api('register', {
        method: 'POST', body: JSON.stringify({ subscription: subscription.toJSON() })
      })
      setConfig(c => ({ ...c, ...result }))
      setNotice('Tu iPhone quedó registrado. Presiona «Enviar prueba» para comprobar la llegada del aviso.')
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  const test = async () => {
    setError(''); setNotice(''); setBusy(true)
    try {
      await api('test', { method: 'POST' })
      setNotice('Prueba enviada. Revisa las notificaciones de tu iPhone.')
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  const disable = async () => {
    setError(''); setNotice(''); setBusy(true)
    try {
      await api('disable', { method: 'POST' })
      const registration = await navigator.serviceWorker.getRegistration('/push-sw.js')
      const sub = await registration?.pushManager.getSubscription()
      await sub?.unsubscribe()
      await refresh()
      setNotice('Notificaciones del iPhone desactivadas.')
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  return (
    <section className="content-body" style={{ maxWidth: 760, margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ background: '#102b45', border: '1px solid #31516e', borderRadius: 18, padding: 24, color: '#f8fafc' }}>
        <h1 style={{ marginTop: 0 }}>Notificaciones push · Prueba iPhone</h1>
        <p style={{ color: '#cbd5e1' }}>
          Piloto de un solo dispositivo. Recibirás una alerta cuando se registre una nueva solicitud de mantenimiento QR.
          No se enviarán notificaciones antiguas ni avisos a otros usuarios.
        </p>
        {ios && !standalone() && (
          <div style={{ background: '#1b405c', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <strong>Antes de activar:</strong> abre este sitio en Safari, toca Compartir y selecciona
            <strong> «Añadir a pantalla de inicio»</strong>. Después abre el ERP desde el nuevo ícono e inicia sesión.
          </div>
        )}
        {!supported && <p style={{ color: '#fbbf24' }}>Este navegador no admite Web Push. En iPhone se necesita iOS 16.4 o superior.</p>}
        {config?.enabled && (
          <p style={{ color: '#86efac', fontWeight: 700 }}>● Hay un iPhone registrado para la prueba.</p>
        )}
        {error && <p role="alert" style={{ color: '#fda4af' }}>{error}</p>}
        {notice && <p role="status" style={{ color: '#86efac' }}>{notice}</p>}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" disabled={!supported || busy || !config || (ios && !standalone())} onClick={activate}
            style={{ padding: '12px 16px', background: '#0284c7', color: 'white', border: 0, borderRadius: 9, cursor: 'pointer' }}>
            {busy ? 'Procesando…' : 'Activar notificaciones'}
          </button>
          <button type="button" disabled={busy || !config?.enabled} onClick={test}
            style={{ padding: '12px 16px', background: '#147d54', color: 'white', border: 0, borderRadius: 9, cursor: 'pointer' }}>
            Enviar notificación de prueba
          </button>
          <button type="button" disabled={busy || !config?.enabled} onClick={disable}
            style={{ padding: '12px 16px', background: '#7f1d1d', color: 'white', border: 0, borderRadius: 9, cursor: 'pointer' }}>
            Desactivar
          </button>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 0 }}>
          La prueba no crea órdenes de trabajo. Las notificaciones reales solo se generan cuando se registra una OT nueva de origen «Solicitud QR».
        </p>
      </div>
    </section>
  )
}
