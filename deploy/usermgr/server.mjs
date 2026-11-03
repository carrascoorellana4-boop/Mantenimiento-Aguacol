// Gestión de usuarios para administradores. Verifica el JWT del que llama (debe tener rol mant_admin) y recién entonces
// usa la clave de servicio contra GoTrue, que nunca sale del servidor. Sin dependencias.
import http from 'node:http'
import crypto from 'node:crypto'

const { JWT_SECRET, SERVICE_KEY, GOTRUE = 'http://127.0.0.1:9999', PORT = '3200' } = process.env
if (!JWT_SECRET || !SERVICE_KEY) { console.error('Faltan JWT_SECRET o SERVICE_KEY'); process.exit(1) }

const ADMIN = 'mant_admin'
const VIEWER = 'mant_authenticated'
const b64 = (s) => Buffer.from(s, 'base64url')
const EMAIL_OK = /^[a-z0-9][a-z0-9._-]*@aguacol\.cl$/

function verificar(token) {
  const p = String(token || '').split('.')
  if (p.length !== 3) return null
  const firma = crypto.createHmac('sha256', JWT_SECRET).update(`${p[0]}.${p[1]}`).digest()
  const dada = b64(p[2])
  if (dada.length !== firma.length || !crypto.timingSafeEqual(dada, firma)) return null
  try {
    const c = JSON.parse(b64(p[1]).toString())
    if (!c.exp || c.exp * 1000 < Date.now()) return null
    return c
  } catch { return null }
}

const gotrue = (path, init = {}) => fetch(`${GOTRUE}${path}`, {
  ...init, headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
})
const publico = (u) => ({ id: u.id, email: u.email, role: u.role === ADMIN ? 'admin' : 'viewer', created_at: u.created_at, last_sign_in_at: u.last_sign_in_at })
const aRol = (r) => (r === 'admin' ? ADMIN : r === 'viewer' ? VIEWER : null)

async function listar() {
  const r = await gotrue('/admin/users?per_page=200')
  const d = await r.json()
  return (d.users || []).map(publico).sort((a, b) => a.email.localeCompare(b.email))
}

async function manejar(req, body, yo) {
  const m = req.url.split('?')[0].match(/^\/api\/users(?:\/([0-9a-f-]{36}))?$/)
  if (!m) return [404, { error: 'No existe.' }]
  const id = m[1]
  if (req.method === 'GET' && !id) return [200, { users: await listar() }]

  if (req.method === 'POST' && !id) {
    const rol = aRol(body.role)
    const email = String(body.email || '').trim().toLowerCase()
    if (!rol || !EMAIL_OK.test(email) || String(body.password || '').length < 8) return [400, { error: 'El usuario debe ser nombre@aguacol.cl, con rol y contraseña de al menos 8 caracteres.' }]
    const r = await gotrue('/admin/users', { method: 'POST', body: JSON.stringify({ email, password: body.password, role: rol, email_confirm: true }) })
    const d = await r.json()
    return r.ok ? [201, { user: publico(d) }] : [r.status === 422 ? 409 : 400, { error: r.status === 422 ? 'Ese correo ya existe.' : (d.msg || 'No se pudo crear.') }]
  }

  if (!id) return [405, { error: 'Método no permitido.' }]

  if (req.method === 'PATCH') {
    const cambios = {}
    if (body.role !== undefined) {
      const rol = aRol(body.role)
      if (!rol) return [400, { error: 'Rol inválido.' }]
      if (id === yo.sub && rol !== ADMIN) return [400, { error: 'No puedes quitarte tu propio rol de administrador.' }]
      cambios.role = rol
    }
    if (body.password) {
      if (String(body.password).length < 8) return [400, { error: 'La contraseña debe tener al menos 8 caracteres.' }]
      cambios.password = body.password
    }
    if (body.email) {
      const email = String(body.email).trim().toLowerCase()
      if (!EMAIL_OK.test(email)) return [400, { error: 'El usuario debe ser nombre@aguacol.cl.' }]
      cambios.email = email
    }
    if (!Object.keys(cambios).length) return [400, { error: 'Nada que cambiar.' }]
    const r = await gotrue(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(cambios) })
    const d = await r.json()
    return r.ok ? [200, { user: publico(d) }] : [400, { error: d.msg || 'No se pudo actualizar.' }]
  }

  if (req.method === 'DELETE') {
    if (id === yo.sub) return [400, { error: 'No puedes eliminar tu propia cuenta.' }]
    const r = await gotrue(`/admin/users/${id}`, { method: 'DELETE' })
    return r.ok ? [200, { ok: true }] : [r.status === 404 ? 404 : 400, { error: 'No se pudo eliminar.' }]
  }
  return [405, { error: 'Método no permitido.' }]
}

http.createServer(async (req, res) => {
  const send = (c, o) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)) }
  try {
    const yo = verificar((req.headers.authorization || '').replace(/^Bearer /, ''))
    if (!yo) return send(401, { error: 'Sesión inválida o vencida.' })
    if (yo.role !== ADMIN) return send(403, { error: 'Solo administradores.' })
    let raw = ''
    for await (const c of req) { raw += c; if (raw.length > 20000) return send(413, { error: 'Muy grande.' }) }
    const body = raw ? JSON.parse(raw) : {}
    const [c, o] = await manejar(req, body, yo)
    send(c, o)
  } catch (e) { console.error(e); send(500, { error: 'Error interno.' }) }
}).listen(Number(PORT), '127.0.0.1', () => console.log('usermgr en', PORT))
