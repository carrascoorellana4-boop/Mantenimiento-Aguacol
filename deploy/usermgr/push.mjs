import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

// Piloto de un solo dispositivo, autenticado como administrador.
// Todos los secretos y la suscripción se guardan exclusivamente en el servidor.
const STORE = path.join(process.env.EVIDENCIAS_DIR || '/data/evidencias', '.push-pilot.json')
const POLL_MS = 15000
const SUBJECT = 'mailto:soporte@aguacol.cl'
const PGRST = process.env.PGRST_URL || 'http://127.0.0.1:3100'
const b64 = (b) => Buffer.from(b).toString('base64url')
const decode = (s) => Buffer.from(s, 'base64url')
const escapeHtml = (s) => String(s || '').replace(/[<>]/g, '').slice(0, 300)
let state = null
let sending = false

function save() {
  fs.mkdirSync(path.dirname(STORE), { recursive: true })
  fs.writeFileSync(STORE + '.tmp', JSON.stringify(state), { mode: 0o600 })
  fs.renameSync(STORE + '.tmp', STORE)
}

function load() {
  try {
    state = JSON.parse(fs.readFileSync(STORE, 'utf8'))
  } catch {
    state = { subscription: null, started: new Date().toISOString(), notified: [] }
  }
  if (!state.keys?.public || !state.keys?.private) {
    const ecdh = crypto.createECDH('prime256v1')
    ecdh.generateKeys()
    state.keys = { public: b64(ecdh.getPublicKey()), private: b64(ecdh.getPrivateKey()) }
  }
  state.notified ||= []
  state.started ||= new Date().toISOString()
  save()
}

function vapidJwt(endpoint) {
  const origin = new URL(endpoint).origin
  const pub = decode(state.keys.public)
  const jwk = {
    kty: 'EC', crv: 'P-256',
    x: b64(pub.subarray(1, 33)),
    y: b64(pub.subarray(33, 65)),
    d: state.keys.private
  }
  const key = crypto.createPrivateKey({ key: jwk, format: 'jwk' })
  const header = b64(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const claims = b64(JSON.stringify({ aud: origin, exp: Math.floor(Date.now() / 1000) + 3600, sub: SUBJECT }))
  const part = header + '.' + claims
  const signature = crypto.sign('sha256', Buffer.from(part), { key, dsaEncoding: 'ieee-p1363' })
  return part + '.' + b64(signature)
}

function encryptWebPush(subscription, payload) {
  const receiverPublic = decode(subscription.keys.p256dh)
  const receiverAuth = decode(subscription.keys.auth)
  if (receiverPublic.length !== 65 || receiverAuth.length < 16) throw Error('Claves push inválidas.')
  const sender = crypto.createECDH('prime256v1')
  sender.generateKeys()
  const senderPublic = sender.getPublicKey()
  const shared = sender.computeSecret(receiverPublic)
  const info = Buffer.concat([Buffer.from('WebPush: info\0'), receiverPublic, senderPublic])
  const ikm = Buffer.from(crypto.hkdfSync('sha256', shared, receiverAuth, info, 32))
  const salt = crypto.randomBytes(16)
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16))
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12))
  const plaintext = Buffer.concat([Buffer.from(JSON.stringify(payload), 'utf8'), Buffer.from([2])])
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce)
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()])
  const header = Buffer.alloc(21)
  salt.copy(header)
  header.writeUInt32BE(4096, 16)
  header[20] = senderPublic.length
  return Buffer.concat([header, senderPublic, ciphertext])
}

async function send(subscription, payload) {
  const body = encryptWebPush(subscription, payload)
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': 'vapid t=' + vapidJwt(subscription.endpoint) + ', k=' + state.keys.public,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(body.length),
      'TTL': '3600',
      'Urgency': payload.urgent ? 'high' : 'normal'
    },
    body,
    signal: AbortSignal.timeout(10000)
  })
  if (response.status === 404 || response.status === 410) {
    state.subscription = null
    save()
    throw Error('La suscripción del iPhone expiró; debe activarse nuevamente.')
  }
  if (!response.ok) {
    throw Error('Push rechazado por proveedor (' + response.status + '): ' + (await response.text()).slice(0, 200))
  }
}

function isSubscriptionValid(v) {
  if (!v || typeof v !== 'object' || typeof v.endpoint !== 'string') return false
  if (!v.keys || typeof v.keys.p256dh !== 'string' || typeof v.keys.auth !== 'string') return false
  if (v.endpoint.length > 2048) return false
  try {
    const u = new URL(v.endpoint)
    // No hacer solicitudes arbitrarias desde el servidor (SSRF).
    if (u.protocol !== 'https:' || u.port || u.username || u.password) return false
    if (!/\.(push\.apple\.com|push\.services\.mozilla\.com|googleapis\.com|fcm\.googleapis\.com)$/.test(u.hostname) &&
        !['web.push.apple.com', 'updates.push.services.mozilla.com', 'fcm.googleapis.com'].includes(u.hostname)) return false
    return decode(v.keys.p256dh).length === 65 && decode(v.keys.auth).length >= 16
  } catch { return false }
}

export function pushPilotStatus() {
  return { enabled: Boolean(state.subscription), pilot: true, device: state.subscription ? 'iPhone de prueba' : null }
}

export function pushPilotPublicKey() { return state.keys.public }

export function pushPilotEnroll(userId, subscription) {
  if (!isSubscriptionValid(subscription)) throw Error('Suscripción push inválida.')
  if (state.subscription && state.subscription.userId !== userId) {
    throw Error('El piloto ya está registrado por otro administrador.')
  }
  // Un único dispositivo de prueba. No pueden activarse múltiples destinatarios.
  state.subscription = {
    endpoint: subscription.endpoint, keys: subscription.keys, userId,
    installedAt: new Date().toISOString()
  }
  state.started = new Date().toISOString()
  state.notified = []
  save()
  return pushPilotStatus()
}

export function pushPilotDisable(userId) {
  if (state.subscription?.userId !== userId) throw Error('La suscripción no pertenece a esta cuenta.')
  state.subscription = null
  save()
  return pushPilotStatus()
}

export async function pushPilotTest(userId) {
  if (!state.subscription || state.subscription.userId !== userId) throw Error('Activa antes las notificaciones en tu iPhone.')
  await send(state.subscription, {
    title: 'AGUACOL — Prueba de notificación',
    body: '¡Correcto! Tu iPhone puede recibir alertas del sistema de mantenimiento.',
    url: '/?push=prueba', tag: 'aguacol-prueba-' + Date.now(), urgent: false
  })
  return { ok: true, message: 'Notificación de prueba enviada al servicio push.' }
}

async function poll(serviceKey) {
  if (sending || !state.subscription) return
  sending = true
  try {
    // Consultar la fuente real: la OT del QR se crea directamente mediante PostgREST.
    // Filtramos desde que el teléfono se suscribió, sin disparar por historial previo.
    const start = new Date(Math.max(Date.parse(state.started) || Date.now(), Date.now() - 24 * 3600000)).toISOString()
    const params = new URLSearchParams({
      select: 'id,codigo_ot,numero_ot,solicitante_nombre,solicitante_area,ubicacion,equipo_solicitado,trabajo,condicion_linea,created_at',
      origen: 'eq.Solicitud QR',
      created_at: 'gte.' + start,
      order: 'created_at.asc',
      limit: '5000'
    })
    const res = await fetch(PGRST + '/orden_trabajo?' + params, {
      headers: { Authorization: 'Bearer ' + serviceKey },
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) throw Error('Consulta órdenes: HTTP ' + res.status)
    const rows = await res.json()
    const notified = new Set(state.notified)
    for (const ot of rows) {
      if (!state.subscription || notified.has(ot.id)) continue
      const urgent = ot.condicion_linea === 'Línea detenida' || ot.condicion_linea === 'Detenida'
      await send(state.subscription, {
        title: urgent ? '🚨 AGUACOL — Línea detenida' : '🔔 AGUACOL — Nueva solicitud',
        body: [
          ot.codigo_ot || ('OT-' + String(ot.numero_ot || '').padStart(6, '0')),
          escapeHtml(ot.ubicacion || ot.equipo_solicitado || ot.solicitante_area),
          escapeHtml(ot.trabajo).slice(0, 110)
        ].filter(Boolean).join(' · '),
        url: '/?ot=' + encodeURIComponent(ot.id),
        tag: 'aguacol-ot-' + ot.id, urgent
      })
      notified.add(ot.id)
      state.notified = Array.from(notified).slice(-1500)
      save()
    }
  } catch (err) {
    console.warn('[push-pilot] No se pudieron consultar/enviar alertas:', err.message)
  } finally {
    sending = false
  }
}

export function startPushPilot(serviceKey) {
  load()
  setInterval(() => { poll(serviceKey).catch(err => console.warn('[push-pilot]', err.message)) }, POLL_MS)
  console.log('[push-pilot] Iniciado; solo un teléfono autorizado, sin notificaciones históricas.')
}
