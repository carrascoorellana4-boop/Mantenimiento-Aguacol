// Gestión de usuarios y almacenamiento de evidencias para administradores.
// Verifica el JWT del que llama y opera de forma segura sin dependencias externas.
import http from 'node:http'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const { JWT_SECRET, SERVICE_KEY, GOTRUE = 'http://127.0.0.1:9999', PORT = '3200', EVIDENCIAS_DIR = '/data/evidencias' } = process.env
if (!JWT_SECRET || !SERVICE_KEY) { console.error('Faltan JWT_SECRET o SERVICE_KEY'); process.exit(1) }

// Asegurar directorio local de evidencias
const targetEvidenciasDir = fs.existsSync(EVIDENCIAS_DIR) ? EVIDENCIAS_DIR : path.resolve('./data/evidencias')
try {
  fs.mkdirSync(targetEvidenciasDir, { recursive: true })
} catch (e) {
  console.warn('No se pudo crear carpeta de evidencias inicial:', e.message)
}

const ADMIN = 'mant_admin'
const VIEWER = 'mant_authenticated'
const b64 = (s) => Buffer.from(s, 'base64url')
const EMAIL_OK = /^[a-z0-9][a-z0-9._-]*@aguacol\.cl$/

const MIME_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime'
}

const EXT_FROM_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov'
}

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

const gotrue = (pathUrl, init = {}) => fetch(`${GOTRUE}${pathUrl}`, {
  ...init, headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
})

const aRol = (r) => {
  if (r === 'admin') return ADMIN
  if (r === 'viewer' || r === 'operador' || r === 'operador_extrusion' || r === 'operador_soplado' || r === 'operador_inyeccion') {
    return VIEWER
  }
  return null
}

const publico = (u) => {
  let role = u.user_metadata?.role || u.app_metadata?.role
  if (!role) {
    if (u.role === ADMIN) role = 'admin'
    else if (u.email?.includes('operador.extrusion') || u.email?.includes('operador_extrusion')) role = 'operador_extrusion'
    else if (u.email?.includes('operador.soplado') || u.email?.includes('operador_soplado')) role = 'operador_soplado'
    else if (u.email?.includes('operador.inyeccion') || u.email?.includes('operador_inyeccion')) role = 'operador_inyeccion'
    else if (u.email?.includes('operador')) role = 'operador'
    else role = 'viewer'
  }
  const area = u.user_metadata?.area || (
    role === 'operador_extrusion' ? 'Extrusión' :
    role === 'operador_soplado' ? 'Soplado' :
    role === 'operador_inyeccion' ? 'Inyección' : null
  )
  return {
    id: u.id,
    email: u.email,
    role,
    area,
    user_metadata: { ...(u.user_metadata || {}), role, area },
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at
  }
}

async function listar() {
  const r = await gotrue('/admin/users?per_page=200')
  const d = await r.json()
  return (d.users || []).map(publico).sort((a, b) => a.email.localeCompare(b.email))
}

async function manejarUsers(req, body, yo) {
  const m = req.url.split('?')[0].match(/^\/api\/users(?:\/([0-9a-f-]{36}))?$/)
  if (!m) return [404, { error: 'No existe.' }]
  const id = m[1]
  if (req.method === 'GET' && !id) return [200, { users: await listar() }]

  if (req.method === 'POST' && !id) {
    const rol = aRol(body.role)
    const email = String(body.email || '').trim().toLowerCase()
    if (!rol || !EMAIL_OK.test(email) || String(body.password || '').length < 8) return [400, { error: 'El usuario debe ser nombre@aguacol.cl, con rol y contraseña de al menos 8 caracteres.' }]
    const area = body.area || (
      body.role === 'operador_extrusion' ? 'Extrusión' :
      body.role === 'operador_soplado' ? 'Soplado' :
      body.role === 'operador_inyeccion' ? 'Inyección' : null
    )
    const userPayload = {
      email,
      password: body.password,
      role: rol,
      user_metadata: {
        role: body.role,
        area,
        nombre: email.split('@')[0]
      },
      app_metadata: {
        role: body.role
      },
      email_confirm: true
    }
    const r = await gotrue('/admin/users', { method: 'POST', body: JSON.stringify(userPayload) })
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
      const area = body.area || (
        body.role === 'operador_extrusion' ? 'Extrusión' :
        body.role === 'operador_soplado' ? 'Soplado' :
        body.role === 'operador_inyeccion' ? 'Inyección' : null
      )
      cambios.user_metadata = {
        role: body.role,
        area
      }
      cambios.app_metadata = {
        role: body.role
      }
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
  const urlPath = req.url.split('?')[0]

  try {
    // -------------------------------------------------------------
    // 1. ENDPOINT PARA DESCARGAR / VISUALIZAR EVIDENCIA
    // -------------------------------------------------------------
    const mEvid = urlPath.match(/^\/api\/evidencias\/([a-zA-Z0-9_-]+\.[a-zA-Z0-9]{3,4})$/)
    if (req.method === 'GET' && mEvid) {
      const filename = mEvid[1]
      // Prevención de path traversal estricta
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return send(400, { error: 'Nombre de archivo no válido.' })
      }
      const ext = path.extname(filename).toLowerCase()
      const mime = MIME_MAP[ext] || 'application/octet-stream'
      const filePath = path.join(targetEvidenciasDir, filename)

      if (!fs.existsSync(filePath)) {
        return send(404, { error: 'Evidencia no encontrada.' })
      }

      const stat = fs.statSync(filePath)
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': stat.size,
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff'
      })
      const stream = fs.createReadStream(filePath)
      return stream.pipe(res)
    }

    // -------------------------------------------------------------
    // 2. ENDPOINT PÚBLICO: SOLICITUD DE MANTENIMIENTO VÍA CÓDIGO QR
    // -------------------------------------------------------------
    if (urlPath === '/api/solicitudes' && req.method === 'POST') {
      let raw = ''
      for await (const c of req) {
        raw += c
        if (raw.length > 10000) return send(413, { error: 'Cuerpo de solicitud demasiado grande.' })
      }
      let body = {}
      try {
        body = JSON.parse(raw || '{}')
      } catch {
        return send(400, { error: 'Formato JSON inválido.' })
      }

      const area = String(body.area || '').trim()
      const solicitante = String(body.solicitante || '').trim()
      const linea = String(body.linea || '').trim()
      const descripcion = String(body.descripcion || '').trim()

      if (!area) return send(400, { error: 'El área del solicitante es obligatoria.' })
      if (!solicitante || solicitante.length < 2) return send(400, { error: 'El nombre del trabajador debe tener al menos 2 caracteres.' })
      if (!linea) return send(400, { error: 'La línea o sector es obligatorio.' })
      if (!descripcion || descripcion.length < 3) return send(400, { error: 'La descripción del problema o trabajo requerido debe tener al menos 3 caracteres.' })

      // Sanitización contra inyección de HTML o scripts
      const cleanSolicitante = solicitante.replace(/<[^>]*>/g, '').slice(0, 120)
      const cleanLinea = linea.replace(/<[^>]*>/g, '').slice(0, 120)
      const cleanDesc = descripcion.replace(/<[^>]*>/g, '').slice(0, 3000)

      const pgrstUrl = process.env.PGRST_URL || 'http://127.0.0.1:3100'
      const rpcRes = await fetch(`${pgrstUrl}/rpc/crear_solicitud_mantenimiento_qr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_area: area,
          p_solicitante: cleanSolicitante,
          p_linea: cleanLinea,
          p_descripcion: cleanDesc
        })
      })

      if (!rpcRes.ok) {
        const errData = await rpcRes.json().catch(() => ({}))
        return send(rpcRes.status >= 400 && rpcRes.status < 500 ? rpcRes.status : 500, {
          error: errData.message || 'Error al procesar la solicitud en la base de datos.'
        })
      }

      const result = await rpcRes.json()
      return send(201, result)
    }

    // -------------------------------------------------------------
    // VALIDACIÓN DE SESIÓN JWT PARA ACCIONES DE ESCRITURA Y USERS
    // -------------------------------------------------------------
    const tokenHeader = (req.headers.authorization || '').replace(/^Bearer /, '')
    const yo = verificar(tokenHeader)
    if (!yo) return send(401, { error: 'Sesión inválida o vencida.' })

    // -------------------------------------------------------------
    // 3. ENDPOINT PARA SUBIR EVIDENCIA (FOTO O VIDEO)
    // -------------------------------------------------------------
    if (urlPath === '/api/evidencias/upload' || urlPath === '/api/evidencias') {
      if (req.method !== 'POST') return send(405, { error: 'Método no permitido.' })
      if (yo.role !== ADMIN && yo.role !== VIEWER) return send(403, { error: 'No autorizado para registrar evidencias.' })

      const rawMime = (req.headers['content-type'] || 'application/octet-stream').split(';')[0].trim().toLowerCase()
      const ext = EXT_FROM_MIME[rawMime]
      if (!ext) {
        return send(400, { error: `Tipo de archivo no permitido (${rawMime}). Solo se permiten imágenes (jpg, png, webp) y videos (mp4, webm, mov).` })
      }

      const MAX_SIZE = 35 * 1024 * 1024 // 35 MB
      const chunks = []
      let totalSize = 0

      for await (const chunk of req) {
        totalSize += chunk.length
        if (totalSize > MAX_SIZE) {
          return send(413, { error: 'El archivo excede el límite máximo de 35 MB.' })
        }
        chunks.push(chunk)
      }

      if (totalSize === 0) {
        return send(400, { error: 'Archivo vacío.' })
      }

      const fileBuffer = Buffer.concat(chunks)
      const uniqueId = crypto.randomUUID()
      const safeFilename = `${uniqueId}${ext}`
      const finalPath = path.join(targetEvidenciasDir, safeFilename)

      fs.writeFileSync(finalPath, fileBuffer)

      const origName = decodeURIComponent(req.headers['x-file-name'] || safeFilename)
      const fileType = req.headers['x-file-type'] || (rawMime.startsWith('video/') ? 'Video' : 'Foto')

      return send(201, {
        ok: true,
        archivo_path: `/api/evidencias/${safeFilename}`,
        nombre_archivo: origName,
        mime_type: rawMime,
        tipo: fileType,
        tamano: totalSize
      })
    }

    // -------------------------------------------------------------
    // 4. ENDPOINTS DE GESTIÓN DE USUARIOS
    // -------------------------------------------------------------
    if (urlPath.startsWith('/api/users')) {
      if (yo.role !== ADMIN) return send(403, { error: 'Solo administradores.' })
      let raw = ''
      for await (const c of req) { raw += c; if (raw.length > 20000) return send(413, { error: 'Muy grande.' }) }
      const body = raw ? JSON.parse(raw) : {}
      const [c, o] = await manejarUsers(req, body, yo)
      return send(c, o)
    }

    return send(404, { error: 'Ruta no encontrada.' })
  } catch (e) {
    console.error('Error en server.mjs:', e)
    return send(500, { error: 'Error interno del servidor.' })
  }
}).listen(Number(PORT), '127.0.0.1', () => console.log('usermgr y evidencias escuchando en', PORT))
