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
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_OK = /^[a-z0-9][a-z0-9._-]*$/

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
  if (
    r === 'viewer' ||
    r === 'operador' ||
    r === 'operador_extrusion' ||
    r === 'operador_soplado' ||
    r === 'operador_inyeccion' ||
    r === 'visor_ot_plasticos' ||
    r === 'visor_ot_jjv' ||
    r === 'supervisor_plasticos'
  ) {
    return VIEWER
  }
  return null
}

const publico = (u) => {
  let role = u.user_metadata?.role || u.app_metadata?.role
  if (!role) {
    if (u.role === ADMIN) role = 'admin'
    else if (u.email?.includes('opextrusion') || u.email?.includes('operador.extrusion') || u.email?.includes('operador_extrusion')) role = 'operador_extrusion'
    else if (u.email?.includes('opsoplado') || u.email?.includes('operador.soplado') || u.email?.includes('operador_soplado')) role = 'operador_soplado'
    else if (u.email?.includes('opinyeccion') || u.email?.includes('operador.inyeccion') || u.email?.includes('operador_inyeccion')) role = 'operador_inyeccion'
    else if (u.email?.includes('ldonoso')) role = 'visor_ot_plasticos'
    else if (u.email?.includes('egalaz')) role = 'visor_ot_plasticos'
    else if (u.email?.includes('doteiza')) role = 'visor_ot_jjv'
    else if (u.email?.includes('boteiza')) role = 'supervisor_plasticos'
    else if (u.email?.includes('operador')) role = 'operador'
    else role = 'viewer'
  }
  const area = u.user_metadata?.area || (
    role === 'operador_extrusion' ? 'Extrusión' :
    role === 'operador_soplado' ? 'Soplado' :
    role === 'operador_inyeccion' ? 'Inyección' :
    role === 'visor_ot_plasticos' || role === 'supervisor_plasticos' ? 'Plásticos' :
    role === 'visor_ot_jjv' ? 'Producción JJV' : null
  )
  const username = u.user_metadata?.username || u.email?.replace(/@aguacol\.cl$/i, '') || u.email
  return {
    id: u.id,
    email: u.email,
    username,
    role,
    area,
    user_metadata: { ...(u.user_metadata || {}), role, area, username },
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
    const rawInput = String(body.username || body.email || '').trim().toLowerCase()
    if (!rol) return [400, { error: 'Debes seleccionar un rol válido.' }]
    if (String(body.password || '').length < 6) return [400, { error: 'La contraseña debe tener al menos 6 caracteres.' }]

    let email = ''
    let username = ''

    if (rawInput.includes('@')) {
      if (!EMAIL_OK.test(rawInput)) return [400, { error: 'El formato de correo no es válido.' }]
      email = rawInput
      username = rawInput.split('@')[0]
    } else {
      if (!USERNAME_OK.test(rawInput)) return [400, { error: 'El usuario solo admite letras, números, punto y guion bajo.' }]
      username = rawInput
      email = `${username}@aguacol.cl`
    }

    const area = body.area || (
      body.role === 'operador_extrusion' ? 'Extrusión' :
      body.role === 'operador_soplado' ? 'Soplado' :
      body.role === 'operador_inyeccion' ? 'Inyección' : null
    )
    const nombre = body.nombre || (
      username === 'opextrusion' ? 'Operador Extrusión' :
      username === 'opinyeccion' ? 'Operador Inyección' :
      username === 'opsoplado' ? 'Operador Soplado' : username
    )

    const userPayload = {
      email,
      password: body.password,
      role: rol,
      user_metadata: {
        role: body.role,
        area,
        nombre,
        username
      },
      app_metadata: {
        role: body.role
      },
      email_confirm: true
    }
    const r = await gotrue('/admin/users', { method: 'POST', body: JSON.stringify(userPayload) })
    const d = await r.json()
    return r.ok ? [201, { user: publico(d) }] : [r.status === 422 ? 409 : 400, { error: r.status === 422 ? 'Ese usuario ya existe.' : (d.msg || 'No se pudo crear.') }]
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
    if (body.email || body.username) {
      const rawInput = String(body.username || body.email).trim().toLowerCase()
      const email = rawInput.includes('@') ? rawInput : `${rawInput}@aguacol.cl`
      cambios.email = email
      cambios.user_metadata = { ...(cambios.user_metadata || {}), username: rawInput.includes('@') ? rawInput.split('@')[0] : rawInput }
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
    // 2. ENDPOINT PÚBLICO: SOLICITUD DE MANTENIMIENTO VÍA CÓDIGO QR / WEB
    // -------------------------------------------------------------
    if (urlPath === '/api/solicitudes' && req.method === 'POST') {
      let raw = ''
      for await (const c of req) {
        raw += c
        if (raw.length > 20 * 1024 * 1024) return send(413, { error: 'Cuerpo de solicitud demasiado grande.' })
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
      const equipo = String(body.equipo || '').trim()
      const descripcion = String(body.descripcion || '').trim()
      const lineaDetenida = Boolean(body.linea_detenida)
      const fotoBase64 = String(body.foto_base64 || '').trim()

      if (!area) return send(400, { error: 'El área del solicitante es obligatoria.' })
      if (!solicitante || solicitante.length < 2) return send(400, { error: 'El nombre del solicitante debe tener al menos 2 caracteres.' })
      if (!linea) return send(400, { error: 'La línea o sector es obligatorio.' })
      if (!descripcion || descripcion.length < 3) return send(400, { error: 'La descripción del problema o trabajo requerido debe tener al menos 3 caracteres.' })

      // Procesar foto opcional si viene en base64
      let fotoUrl = null
      if (fotoBase64) {
        try {
          const match = fotoBase64.match(/^data:([^;]+);base64,(.+)$/)
          const b64Data = match ? match[2] : fotoBase64
          const mime = match ? match[1] : 'image/jpeg'
          const ext = EXT_FROM_MIME[mime] || 'jpg'
          const safeId = crypto.randomUUID ? crypto.randomUUID() : Date.now()
          const filename = `solicitud-${safeId}.${ext}`
          const finalPath = path.join(targetEvidenciasDir, filename)
          fs.writeFileSync(finalPath, Buffer.from(b64Data, 'base64'))
          fotoUrl = `/api/evidencias/${filename}`
        } catch (imgErr) {
          console.warn('Error guardando fotografía de solicitud:', imgErr.message)
        }
      }

      // Sanitización contra inyección de HTML o scripts
      const cleanSolicitante = solicitante.replace(/<[^>]*>/g, '').slice(0, 120)
      const cleanLinea = linea.replace(/<[^>]*>/g, '').slice(0, 120)
      const cleanEquipo = equipo.replace(/<[^>]*>/g, '').slice(0, 120)
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
          p_descripcion: cleanDesc,
          p_equipo: cleanEquipo || null,
          p_linea_detenida: lineaDetenida,
          p_foto_url: fotoUrl
        })
      })

      if (!rpcRes.ok) {
        const errData = await rpcRes.json().catch(() => ({}))
        return send(rpcRes.status >= 400 && rpcRes.status < 500 ? rpcRes.status : 500, {
          error: errData.message || 'Error al procesar la solicitud en la base de datos.'
        })
      }

      const result = await rpcRes.json()

      // Despachar notificación automática por correo si es una OT nueva (no duplicada)
      if (result && result.ok && !result.ya_existia) {
        notificarSolicitudEmail({
          codigo_ot: result.codigo_ot || (result.numero_ot ? `OT-${String(result.numero_ot).padStart(6, '0')}` : 'OT NUEVA'),
          area,
          solicitante: cleanSolicitante,
          linea: cleanLinea,
          equipo: cleanEquipo,
          descripcion: cleanDesc,
          lineaDetenida,
          fotoUrl
        }).catch(err => console.warn('[notificaciones] Error al despachar correo:', err.message))
      }

      return send(201, result)
    }

    // -------------------------------------------------------------
    // 2b. ENDPOINT PARA SINCRONIZACIÓN AUTOMÁTICA DE USUARIOS BASE
    // -------------------------------------------------------------
    if (urlPath === '/api/solicitudes/sync-usuarios' || urlPath === '/api/sync-usuarios') {
      const resSync = await asegurarOperadoresBase(true)
      return send(200, { ok: true, message: 'Sincronización de usuarios base ejecutada.', detalle: resSync })
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

// Creación y aseguramiento automático de los usuarios base y roles requeridos
const OPERADORES_BASE = [
  {
    username: 'opextrusion',
    email: 'opextrusion@aguacol.cl',
    password: 'Extrusion2026',
    role: 'operador_extrusion',
    area: 'Extrusión',
    nombre: 'Operador Extrusión',
    allowed_modules: ['mantenimiento-preventivo']
  },
  {
    username: 'opinyeccion',
    email: 'opinyeccion@aguacol.cl',
    password: 'Inyeccion2026',
    role: 'operador_inyeccion',
    area: 'Inyección',
    nombre: 'Operador Inyección',
    allowed_modules: ['mantenimiento-preventivo']
  },
  {
    username: 'opsoplado',
    email: 'opsoplado@aguacol.cl',
    password: 'Soplado2026',
    role: 'operador_soplado',
    area: 'Soplado',
    nombre: 'Operador Soplado',
    allowed_modules: ['mantenimiento-preventivo']
  },
  {
    username: 'ldonoso',
    email: 'ldonoso@aguacol.cl',
    password: 'LDONOSO123',
    role: 'visor_ot_plasticos',
    area: 'Plásticos',
    nombre: 'Lizette Donoso',
    allowed_modules: ['ordenes-trabajo']
  },
  {
    username: 'egalaz',
    email: 'egalaz@aguacol.cl',
    password: 'EGALAZ123',
    role: 'visor_ot_plasticos',
    area: 'Plásticos',
    nombre: 'Ernesto Galaz',
    allowed_modules: ['ordenes-trabajo']
  },
  {
    username: 'doteiza',
    email: 'doteiza@aguacol.cl',
    password: 'DOTEIZA123',
    role: 'visor_ot_jjv',
    area: 'Producción JJV',
    nombre: 'Daniel Oteiza',
    allowed_modules: ['ordenes-trabajo']
  },
  {
    username: 'boteiza',
    email: 'boteiza@aguacol.cl',
    password: 'BOTEIZA123',
    role: 'supervisor_plasticos',
    area: 'Plásticos',
    nombre: 'Bastián Oteiza',
    allowed_modules: ['ordenes-trabajo', 'mantenimiento-preventivo', 'disponibilidad']
  }
]

let seedEjecutado = false
let syncInProgress = false
async function asegurarOperadoresBase(forzar = false) {
  if (syncInProgress) return { status: 'en_progreso' }
  if (seedEjecutado && !forzar) return { status: 'ya_ejecutado' }
  syncInProgress = true
  const resultados = []
  try {
    const r = await gotrue('/admin/users?per_page=200')
    const d = await r.json()
    const existing = d.users || []

    for (const op of OPERADORES_BASE) {
      const match = existing.find(
        (u) =>
          u.email?.toLowerCase() === op.email.toLowerCase() ||
          u.user_metadata?.username?.toLowerCase() === op.username.toLowerCase()
      )
      if (!match) {
        console.log(`[usermgr] Creando usuario automático ${op.username} (${op.email})...`)
        const resp = await gotrue('/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            email: op.email,
            password: op.password,
            role: VIEWER,
            user_metadata: {
              role: op.role,
              area: op.area,
              nombre: op.nombre,
              username: op.username,
              allowed_modules: op.allowed_modules
            },
            app_metadata: { role: op.role },
            email_confirm: true
          })
        })
        resultados.push({ usuario: op.username, accion: 'creado', ok: resp.ok })
      } else {
        // Asegurar que tenga la contraseña y metadata asignadas
        console.log(`[usermgr] Usuario ${op.username} ya existe, verificando y actualizando metadata...`)
        const resp = await gotrue(`/admin/users/${match.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            password: op.password,
            user_metadata: {
              ...(match.user_metadata || {}),
              role: op.role,
              area: op.area,
              nombre: op.nombre,
              username: op.username,
              allowed_modules: op.allowed_modules
            },
            app_metadata: { ...(match.app_metadata || {}), role: op.role }
          })
        })
        resultados.push({ usuario: op.username, accion: 'actualizado', ok: resp.ok })
      }
    }
    seedEjecutado = true
    return { ok: true, detalle: resultados }
  } catch (err) {
    console.warn('[usermgr] No se pudo sincronizar usuarios base:', err.message)
    return { ok: false, error: err.message }
  } finally {
    syncInProgress = false
  }
}

// Ejecutar seed al arrancar el servidor
setTimeout(asegurarOperadoresBase, 1500)

// Asegurar sincronización periódica cada 60 segundos
setInterval(() => {
  asegurarOperadoresBase(true).catch((e) =>
    console.warn('[usermgr] Error en sincronización periódica de usuarios:', e.message)
  )
}, 60000)

// -------------------------------------------------------------
// CONFIGURACIÓN DINÁMICA DEL SISTEMA (POSTGRESQL / POSTGREST)
// -------------------------------------------------------------
const cachedConfig = {}
let lastConfigFetch = 0

async function obtenerParametroConfig(clave, valorPorDefecto = '') {
  if (process.env[clave.toUpperCase()]) {
    return process.env[clave.toUpperCase()]
  }

  const ahora = Date.now()
  if (ahora - lastConfigFetch > 60000 || !cachedConfig[clave]) {
    try {
      const pgrstUrl = process.env.PGRST_URL || 'http://127.0.0.1:3100'
      const r = await fetch(`${pgrstUrl}/rpc/obtener_sistema_config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_clave: clave })
      })
      if (r.ok) {
        const val = await r.json()
        if (val) {
          cachedConfig[clave] = val
          lastConfigFetch = ahora
        }
      }
    } catch (e) {
      console.warn(`[config] Error al obtener ${clave}:`, e.message)
    }
  }

  return cachedConfig[clave] || valorPorDefecto
}

// -------------------------------------------------------------
// NOTIFICACIONES AUTOMÁTICAS POR CORREO (RESEND API)
// -------------------------------------------------------------
async function notificarSolicitudEmail(ot) {
  const apiKey = await obtenerParametroConfig('resend_api_key')
  if (!apiKey || apiKey === 'CONFIGURAR_API_KEY') {
    console.warn('[notificaciones] No se ha configurado la API Key de Resend en sistema_config.')
    return
  }

  const destinatarioPrincipal = await obtenerParametroConfig('notif_email_to', 'acarrasco@aguacol.cl')
  const destinatarioRespaldo = await obtenerParametroConfig('notif_email_fallback', 'carrascoorellana4@gmail.com')

  const subject = ot.lineaDetenida
    ? `🚨 [URGENTE - LÍNEA DETENIDA] Solicitud ${ot.codigo_ot} - ${ot.linea}`
    : `🔔 [Nueva Solicitud] ${ot.codigo_ot} - ${ot.linea}`

  const urgenciaBadge = ot.lineaDetenida
    ? `<div style="background-color: #ef4444; color: #ffffff; padding: 7px 16px; border-radius: 6px; font-weight: 800; font-size: 13px; display: inline-block; letter-spacing: 0.05em; text-transform: uppercase;">
        🚨 LÍNEA DETENIDA (PARADA POR FALLA)
       </div>`
    : `<div style="background-color: #10b981; color: #ffffff; padding: 7px 16px; border-radius: 6px; font-weight: 700; font-size: 13px; display: inline-block;">
        🟢 LÍNEA EN OPERACIÓN (AVISO PREVENTIVO)
       </div>`

  const fotoHtml = ot.fotoUrl
    ? `
      <div style="margin-top: 20px; padding: 14px; background-color: #1e293b; border-radius: 8px; border: 1px solid #334155;">
        <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Fotografía Adjunta:</p>
        <a href="https://mantenimiento.aguacol.cl${ot.fotoUrl}" target="_blank" style="color: #38bdf8; text-decoration: underline; font-size: 14px; font-weight: 600;">
          Ver fotografía adjunta en el sistema &rarr;
        </a>
      </div>
    `
    : ''

  const fechaStr = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 24px; background-color: #0b1329; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 12px 30px rgba(0,0,0,0.5);">
        <tr>
          <td style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 22px 28px; text-align: left;">
            <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #bae6fd;">
              AGUACOL &bull; SISTEMA DE MANTENIMIENTO
            </div>
            <h1 style="margin: 6px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">
              Nueva Solicitud de Mantenimiento
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px 28px;">
            <div style="margin-bottom: 20px;">
              ${urgenciaBadge}
            </div>

            <div style="background-color: #1e293b; border-left: 4px solid #38bdf8; padding: 14px 18px; border-radius: 4px; margin-bottom: 20px;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; display: block;">Orden de Trabajo Generada</span>
              <strong style="font-size: 20px; color: #38bdf8; letter-spacing: 0.05em;">${ot.codigo_ot}</strong>
              <span style="font-size: 12px; color: #64748b; margin-left: 12px;">(${fechaStr})</span>
            </div>

            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px; width: 35%;"><strong>Área:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #f8fafc; font-size: 14px;">${ot.area}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;"><strong>Línea / Sector:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #38bdf8; font-size: 14px; font-weight: 700;">${ot.linea}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;"><strong>Equipo / Componente:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #f8fafc; font-size: 14px;">${ot.equipo || 'No especificado'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px;"><strong>Solicitante:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #f8fafc; font-size: 14px;">${ot.solicitante}</td>
              </tr>
            </table>

            <div style="background-color: #0b1329; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; display: block; margin-bottom: 8px;">
                Descripción del Problema / Trabajo Requerido:
              </span>
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #f1f5f9; white-space: pre-wrap;">${ot.descripcion}</p>
            </div>

            ${fotoHtml}

            <div style="text-align: center; margin: 28px 0 10px 0;">
              <a href="https://mantenimiento.aguacol.cl" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.02em; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);">
                Acceder al Sistema de Mantenimiento &rarr;
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background-color: #090e17; padding: 16px 28px; text-align: center; border-top: 1px solid #1e293b;">
            <p style="margin: 0; font-size: 11px; color: #64748b;">
              Notificación automática del Sistema de Mantenimiento AGUACOL.<br>
              Generado en tiempo real desde <a href="https://mantenimiento.aguacol.cl" style="color: #38bdf8; text-decoration: none;">mantenimiento.aguacol.cl</a>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  let target = destinatarioPrincipal
  try {
    let resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Mantenimiento AGUACOL <onboarding@resend.dev>',
        to: [target],
        subject,
        html
      })
    })

    // Si Resend limita por modo prueba (403), reenviar automáticamente a la cuenta registrada
    if (resp.status === 403 && destinatarioRespaldo && target !== destinatarioRespaldo) {
      console.warn(`[notificaciones] Resend no permitió enviar a ${target} (modo prueba sin dominio). Reenviando a ${destinatarioRespaldo}...`)
      target = destinatarioRespaldo
      resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Mantenimiento AGUACOL <onboarding@resend.dev>',
          to: [target],
          subject,
          html
        })
      })
    }

    if (resp.ok) {
      console.log(`[notificaciones] Correo enviado exitosamente a ${target} para orden ${ot.codigo_ot}`)
    } else {
      const errBody = await resp.json().catch(() => ({}))
      console.warn(`[notificaciones] Error Resend (${resp.status}):`, errBody)
    }
  } catch (err) {
    console.warn('[notificaciones] Error de red al contactar Resend API:', err.message)
  }
}
