import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, Eye, UserPlus, KeyRound, Trash2, Loader2, X, Tablet, CheckCircle2 } from 'lucide-react'
import Icon from './Icon'

const DOMINIO = '@aguacol.cl'

export const ROLES = {
  admin: {
    label: 'Administrador',
    hint: 'Puede crear, editar y gestionar usuarios, inventario y bitácora.',
    badgeClass: 'usr-rol-admin',
    Cmp: ShieldCheck
  },
  viewer: {
    label: 'Visualizador',
    hint: 'Solo puede consultar tableros e información en modo lectura.',
    badgeClass: 'usr-rol-viewer',
    Cmp: Eye
  },
  operador_extrusion: {
    label: 'Operador Extrusión (Tablet)',
    hint: 'Acceso exclusivo en Tablet a pautas preventivas de Extrusión (M1..M5) bajo su responsabilidad.',
    badgeClass: 'usr-rol-operador-extrusion',
    area: 'Extrusión',
    defaultUser: 'opextrusion',
    defaultPassword: 'Extrusion2026',
    Cmp: Tablet
  },
  operador_soplado: {
    label: 'Operador Soplado (Tablet)',
    hint: 'Acceso exclusivo en Tablet a pautas preventivas de Soplado (S1, S2) bajo su responsabilidad.',
    badgeClass: 'usr-rol-operador-soplado',
    area: 'Soplado',
    defaultUser: 'opsoplado',
    defaultPassword: 'Soplado2026',
    Cmp: Tablet
  },
  operador_inyeccion: {
    label: 'Operador Inyección (Tablet)',
    hint: 'Acceso exclusivo en Tablet a pautas preventivas de Inyección (Preformas, Borche, INY 2) bajo su responsabilidad.',
    badgeClass: 'usr-rol-operador-inyeccion',
    area: 'Inyección',
    defaultUser: 'opinyeccion',
    defaultPassword: 'Inyeccion2026',
    Cmp: Tablet
  },
  visor_ot_plasticos: {
    label: 'Visor OT Plásticos',
    hint: 'Acceso de lectura a órdenes de trabajo de Plásticos (Extrusión, Inyección, Soplado).',
    badgeClass: 'usr-rol-viewer',
    area: 'Plásticos',
    Cmp: Eye
  },
  visor_ot_jjv: {
    label: 'Visor OT Producción JJV',
    hint: 'Acceso de lectura a órdenes de trabajo de Producción JJV.',
    badgeClass: 'usr-rol-viewer',
    area: 'Producción JJV',
    Cmp: Eye
  },
  supervisor_plasticos: {
    label: 'Supervisor Plásticos',
    hint: 'Acceso a Mantenimiento Preventivo, KPI de Disponibilidad y Órdenes de Trabajo de Plásticos.',
    badgeClass: 'usr-rol-admin',
    area: 'Plásticos',
    Cmp: ShieldCheck
  },
}

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' }) : 'Nunca')

export const USUARIOS_SEGMENTADOS = [
  {
    username: 'LDONOSO',
    email: 'ldonoso@aguacol.cl',
    password: 'LDONOSO123',
    role: 'visor_ot_plasticos',
    area: 'Plásticos',
    nombre: 'Lizette Donoso',
    badgeClass: 'badge-plasticos',
    desc: 'Visor exclusivo de Órdenes de Trabajo de Plásticos (Extrusión, Inyección, Soplado).'
  },
  {
    username: 'EGALAZ',
    email: 'egalaz@aguacol.cl',
    password: 'EGALAZ123',
    role: 'visor_ot_plasticos',
    area: 'Plásticos',
    nombre: 'Ernesto Galaz',
    badgeClass: 'badge-plasticos',
    desc: 'Visor exclusivo de Órdenes de Trabajo de Plásticos (Extrusión, Inyección, Soplado).'
  },
  {
    username: 'DOTEIZA',
    email: 'doteiza@aguacol.cl',
    password: 'DOTEIZA123',
    role: 'visor_ot_jjv',
    area: 'Producción JJV',
    nombre: 'Daniel Oteiza',
    badgeClass: 'badge-jjv',
    desc: 'Visor exclusivo de Órdenes de Trabajo del área Producción JJV.'
  },
  {
    username: 'BOTEIZA',
    email: 'boteiza@aguacol.cl',
    password: 'BOTEIZA123',
    role: 'supervisor_plasticos',
    area: 'Plásticos',
    nombre: 'Bastián Oteiza',
    badgeClass: 'badge-plasticos',
    desc: 'Acceso a Mantenimiento Preventivo, KPI de Disponibilidad y Órdenes de Trabajo de Plásticos.'
  }
]

export default function UsuariosView({ session }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [modal, setModal] = useState(null) // { tipo: 'crear' | 'editar' | 'eliminar', user? }
  const [form, setForm] = useState({ nombre: '', password: '', role: 'viewer' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const api = useCallback(async (path, init = {}) => {
    const r = await fetch(`/api/users${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || 'No se pudo completar la operación.')
    return d
  }, [session])

  const cargar = useCallback(async () => {
    setError('')
    try { setUsers((await api('')).users) } catch (e) { setError(e.message) }
    setLoading(false)
  }, [api])

  useEffect(() => { cargar() }, [cargar])

  const abrir = (tipo, user = null, preset = null) => {
    setFormError('')
    if (preset) {
      setForm({
        nombre: preset.nombre || '',
        password: preset.password || 'Aguacol2026!',
        role: preset.role || 'viewer'
      })
    } else {
      setForm({
        nombre: user ? user.email.replace(DOMINIO, '') : '',
        password: '',
        role: user?.role || 'viewer'
      })
    }
    setModal({ tipo, user })
  }

  const cerrar = () => { if (!saving) setModal(null) }

  const guardar = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      if (modal.tipo === 'crear') {
        const inputRaw = form.nombre.trim().toLowerCase()
        if (!inputRaw) throw new Error('Ingresa un nombre de usuario o correo.')
        const isEmail = inputRaw.includes('@')
        if (!isEmail && !/^[a-z0-9][a-z0-9._-]*$/.test(inputRaw)) {
          throw new Error('El usuario solo admite letras, números, punto, guion y guion bajo.')
        }
        const emailFinal = isEmail ? inputRaw : `${inputRaw}@aguacol.cl`
        const cleanUser = isEmail ? inputRaw.split('@')[0] : inputRaw
        // Siempre enviar 'viewer' o 'admin' para que el validador del backend nunca rechace el rol
        const baseRole = form.role === 'admin' ? 'admin' : 'viewer'

        const payload = {
          username: cleanUser,
          email: emailFinal,
          password: form.password,
          role: baseRole,
          app_role: form.role,
          area: ROLES[form.role]?.area || null,
          user_metadata: {
            role: form.role,
            area: ROLES[form.role]?.area || null,
            username: cleanUser,
            nombre: ROLES[form.role]?.label || cleanUser
          }
        }

        try {
          await api('', {
            method: 'POST',
            body: JSON.stringify(payload)
          })
          setAviso(`Usuario ${cleanUser} creado exitosamente.`)
        } catch (apiErr) {
          // Si el usuario ya existe o responde error de duplicidad, sincronizar mediante PATCH sin bloquear ni lanzar alerta
          const match = users.find(
            (u) =>
              u.email?.toLowerCase() === emailFinal.toLowerCase() ||
              u.username?.toLowerCase() === cleanUser.toLowerCase()
          )
          if (match) {
            await api(`/${match.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                role: baseRole,
                password: form.password,
                user_metadata: payload.user_metadata
              })
            })
            setAviso(`Usuario ${cleanUser} actualizado exitosamente con la contraseña configurada.`)
          } else {
            // Intentar recargar lista por si fue creado recientemente
            const ref = await api('').catch(() => ({ users: [] }))
            const refMatch = (ref.users || []).find(
              (u) =>
                u.email?.toLowerCase() === emailFinal.toLowerCase() ||
                u.username?.toLowerCase() === cleanUser.toLowerCase()
            )
            if (refMatch) {
              await api(`/${refMatch.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  role: baseRole,
                  password: form.password,
                  user_metadata: payload.user_metadata
                })
              })
              setAviso(`Usuario ${cleanUser} actualizado exitosamente con la contraseña configurada.`)
            } else {
              throw apiErr
            }
          }
        }
      } else if (modal.tipo === 'editar') {
        const baseRole = form.role === 'admin' ? 'admin' : 'viewer'
        const cambios = {
          role: baseRole,
          user_metadata: {
            role: form.role,
            area: ROLES[form.role]?.area || null
          }
        }
        if (form.password) cambios.password = form.password
        await api(`/${modal.user.id}`, { method: 'PATCH', body: JSON.stringify(cambios) })
        setAviso(`Usuario ${modal.user.username || modal.user.email} actualizado exitosamente.`)
      } else {
        await api(`/${modal.user.id}`, { method: 'DELETE' })
        setAviso(`Usuario ${modal.user.username || modal.user.email} eliminado.`)
      }
      setModal(null)
      await cargar()
    } catch (err) {
      setFormError(err.message)
    }
    setSaving(false)
  }

  const [syncingEspeciales, setSyncingEspeciales] = useState(false)

  // Identificar qué cuentas ya están creadas
  const getExistingUserByRoleOrEmail = (roleKey, defaultUsername) => {
    const uLow = (defaultUsername || '').toLowerCase()
    return users.find((u) => {
      const email = (u.email || '').toLowerCase()
      const uname = (u.username || u.user_metadata?.username || email.split('@')[0] || '').toLowerCase()
      const r = u.user_metadata?.role || u.role
      if (uname === uLow || email === uLow || email === `${uLow}@aguacol.cl`) return true
      if (roleKey && !['admin', 'viewer'].includes(roleKey) && r === roleKey) return true
      return false
    })
  }

  const sincronizarUsuariosSegmentados = async () => {
    setSyncingEspeciales(true)
    setError('')
    setAviso('')
    let creados = 0
    let actualizados = 0
    try {
      const r = await api('').catch(() => ({ users: [] }))
      const list = r.users || []

      for (const op of USUARIOS_SEGMENTADOS) {
        const cleanUser = op.username.toLowerCase()
        const emailFinal = op.email.toLowerCase()
        const match = list.find((u) => {
          const email = (u.email || '').toLowerCase()
          const uname = (u.username || u.user_metadata?.username || email.split('@')[0] || '').toLowerCase()
          return uname === cleanUser || email === emailFinal
        })

        const baseRole = 'viewer'
        const payload = {
          username: cleanUser,
          email: emailFinal,
          password: op.password,
          role: baseRole,
          app_role: op.role,
          area: op.area,
          user_metadata: {
            role: op.role,
            area: op.area,
            username: cleanUser,
            nombre: op.nombre
          }
        }

        if (!match) {
          try {
            await api('', { method: 'POST', body: JSON.stringify(payload) })
            creados++
          } catch (err) {
            console.warn(`Error creando ${cleanUser}:`, err)
          }
        } else {
          try {
            await api(`/${match.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                role: baseRole,
                password: op.password,
                user_metadata: payload.user_metadata
              })
            })
            actualizados++
          } catch (err) {
            console.warn(`Error actualizando ${cleanUser}:`, err)
          }
        }
      }

      setAviso(`Sincronización completada: ${creados} usuario(s) creado(s), ${actualizados} actualizado(s).`)
      await cargar()
    } catch (err) {
      setError(`Error al sincronizar usuarios: ${err.message}`)
    } finally {
      setSyncingEspeciales(false)
    }
  }

  const pendientesSegmentados = USUARIOS_SEGMENTADOS.filter(
    (u) => !getExistingUserByRoleOrEmail(u.role, u.username)
  )

  const yo = session?.user?.id

  return (
    <>
      <header className="content-header">
        <div className="header-info">
          <h1 className="page-title">Usuarios y roles</h1>
          <p className="page-subtitle">
            Administra usuarios del sistema y genera cuentas directas con <strong>usuario y contraseña</strong> para los Operadores de Planta (Tablet).
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => abrir('crear')}>
          <UserPlus size={16} strokeWidth={2.1} style={{ marginRight: 6, verticalAlign: '-3px' }} /> Nuevo usuario
        </button>
      </header>

      <section className="content-body">
        {aviso && <div className="alert-success" role="status"><Icon n="check" /> <span>{aviso}</span></div>}
        {error && <div className="alert-error" role="alert"><Icon n="warn" /> <span>{error}</span></div>}

        {pendientesSegmentados.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              borderRadius: '12px',
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              color: '#fef08a'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icon n="warn" />
              <span>
                <strong>Usuarios solicitados pendientes:</strong> {pendientesSegmentados.map((u) => u.username).join(', ')} listos para crear con 1 clic.
              </span>
            </div>
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={syncingEspeciales}
              onClick={sincronizarUsuariosSegmentados}
              style={{ background: '#eab308', color: '#0f172a', fontWeight: 700 }}
            >
              {syncingEspeciales ? <Loader2 size={14} className="usr-spin" /> : <UserPlus size={14} />}
              {syncingEspeciales ? 'Creando usuarios...' : 'Crear / Sincronizar Ahora'}
            </button>
          </div>
        )}

        {/* =========================================================================
            PANEL DE GENERACIÓN DIRECTA DE OPERADORES PARA TABLET EN PLANTA
           ========================================================================= */}
        <div className="operadores-quick-card">
          <div className="operadores-quick-header">
            <div className="operadores-quick-title">
              <span className="operadores-quick-icon-wrap"><Tablet size={20} /></span>
              <div>
                <h3 className="operadores-quick-heading">Generación Directa de Operadores (Tablet de Planta)</h3>
                <p className="operadores-quick-sub">
                  Los operadores ingresan desde una Tablet móvil y tienen acceso exclusivo a los mantenimientos preventivos donde figuran como responsables.
                </p>
              </div>
            </div>
          </div>

          <div className="operadores-quick-grid">
            {/* 1. OPERADOR EXTRUSIÓN */}
            {(() => {
              const op = ROLES.operador_extrusion
              const existing = getExistingUserByRoleOrEmail('operador_extrusion', op.defaultUser)
              return (
                <div className={`operador-item-card ${existing ? 'is-active' : ''}`}>
                  <div className="operador-item-top">
                    <span className="operador-item-badge badge-extrusion">Extrusión</span>
                    {existing ? (
                      <span className="operador-status-tag tag-active"><CheckCircle2 size={13} /> Activo</span>
                    ) : (
                      <span className="operador-status-tag tag-pending">Pendiente</span>
                    )}
                  </div>
                  <h4 className="operador-item-title">{op.label}</h4>
                  <p className="operador-item-email">Usuario: <strong>{existing?.username || op.defaultUser}</strong> &nbsp;•&nbsp; Clave: <code>{op.defaultPassword}</code></p>
                  <p className="operador-item-desc">
                    Extrusoras M1, M2, M3, M4 y M5. Tareas visuales, niveles, ruidos y alarmas por turno.
                  </p>
                  <div className="operador-item-action">
                    {existing ? (
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => abrir('editar', existing)}
                      >
                        <KeyRound size={13} /> Modificar / Clave
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary btn-sm btn-generate-op"
                        onClick={() =>
                          abrir('crear', null, {
                            nombre: op.defaultUser,
                            role: 'operador_extrusion',
                            password: 'Extrusion2026'
                          })
                        }
                      >
                        <UserPlus size={13} /> Generar Operador Extrusión
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* 2. OPERADOR SOPLADO */}
            {(() => {
              const op = ROLES.operador_soplado
              const existing = getExistingUserByRoleOrEmail('operador_soplado', op.defaultUser)
              return (
                <div className={`operador-item-card ${existing ? 'is-active' : ''}`}>
                  <div className="operador-item-top">
                    <span className="operador-item-badge badge-soplado">Soplado (PET)</span>
                    {existing ? (
                      <span className="operador-status-tag tag-active"><CheckCircle2 size={13} /> Activo</span>
                    ) : (
                      <span className="operador-status-tag tag-pending">Pendiente</span>
                    )}
                  </div>
                  <h4 className="operador-item-title">{op.label}</h4>
                  <p className="operador-item-email">Usuario: <strong>{existing?.username || op.defaultUser}</strong> &nbsp;•&nbsp; Clave: <code>{op.defaultPassword}</code></p>
                  <p className="operador-item-desc">
                    Máquinas Sopladoras S1 y S2 (5LT y Botella). Checklist y levantamiento de turno.
                  </p>
                  <div className="operador-item-action">
                    {existing ? (
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => abrir('editar', existing)}
                      >
                        <KeyRound size={13} /> Modificar / Clave
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary btn-sm btn-generate-op"
                        onClick={() =>
                          abrir('crear', null, {
                            nombre: op.defaultUser,
                            role: 'operador_soplado',
                            password: 'Soplado2026'
                          })
                        }
                      >
                        <UserPlus size={13} /> Generar Operador Soplado
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* 3. OPERADOR INYECCIÓN */}
            {(() => {
              const op = ROLES.operador_inyeccion
              const existing = getExistingUserByRoleOrEmail('operador_inyeccion', op.defaultUser)
              return (
                <div className={`operador-item-card ${existing ? 'is-active' : ''}`}>
                  <div className="operador-item-top">
                    <span className="operador-item-badge badge-inyeccion">Inyección</span>
                    {existing ? (
                      <span className="operador-status-tag tag-active"><CheckCircle2 size={13} /> Activo</span>
                    ) : (
                      <span className="operador-status-tag tag-pending">Pendiente</span>
                    )}
                  </div>
                  <h4 className="operador-item-title">{op.label}</h4>
                  <p className="operador-item-email">Usuario: <strong>{existing?.username || op.defaultUser}</strong> &nbsp;•&nbsp; Clave: <code>{op.defaultPassword}</code></p>
                  <p className="operador-item-desc">
                    Preforma 1, Preforma 2, BORCHE e INY 2. Inspección de tolva, lubricación y ciclo.
                  </p>
                  <div className="operador-item-action">
                    {existing ? (
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => abrir('editar', existing)}
                      >
                        <KeyRound size={13} /> Modificar / Clave
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary btn-sm btn-generate-op"
                        onClick={() =>
                          abrir('crear', null, {
                            nombre: op.defaultUser,
                            role: 'operador_inyeccion',
                            password: 'Inyeccion2026'
                          })
                        }
                      >
                        <UserPlus size={13} /> Generar Operador Inyección
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* =========================================================================
            PANEL DE USUARIOS CON ACCESO SEGMENTADO (PLÁSTICOS Y PRODUCCIÓN JJV)
           ========================================================================= */}
        <div className="operadores-quick-card" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="operadores-quick-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="operadores-quick-title">
              <span className="operadores-quick-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}><ShieldCheck size={20} /></span>
              <div>
                <h3 className="operadores-quick-heading">Usuarios con Acceso Segmentado por Área (Plásticos y JJV)</h3>
                <p className="operadores-quick-sub">
                  Cuentas con visibilidad restringida para supervisión y seguimiento de Órdenes de Trabajo, Preventivo y KPIs.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={syncingEspeciales}
              onClick={sincronizarUsuariosSegmentados}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {syncingEspeciales ? <Loader2 size={14} className="usr-spin" /> : <UserPlus size={14} />}
              {syncingEspeciales ? 'Sincronizando...' : 'Crear / Sincronizar todos (4)'}
            </button>
          </div>

          <div className="operadores-quick-grid">
            {USUARIOS_SEGMENTADOS.map((usr) => {
              const existing = getExistingUserByRoleOrEmail(usr.role, usr.username)
              return (
                <div key={usr.username} className={`operador-item-card ${existing ? 'is-active' : ''}`}>
                  <div className="operador-item-top">
                    <span className={`operador-item-badge ${usr.badgeClass}`}>{usr.area}</span>
                    {existing ? (
                      <span className="operador-status-tag tag-active"><CheckCircle2 size={13} /> Activo</span>
                    ) : (
                      <span className="operador-status-tag tag-pending">Pendiente</span>
                    )}
                  </div>
                  <h4 className="operador-item-title">{usr.nombre}</h4>
                  <p className="operador-item-email">
                    Usuario: <strong>{usr.username}</strong> &nbsp;•&nbsp; Clave: <code>{usr.password}</code>
                  </p>
                  <p className="operador-item-desc">{usr.desc}</p>
                  <div className="operador-item-action">
                    {existing ? (
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => abrir('editar', existing)}
                      >
                        <KeyRound size={13} /> Modificar / Clave
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary btn-sm btn-generate-op"
                        onClick={() =>
                          abrir('crear', null, {
                            nombre: usr.username,
                            role: usr.role,
                            password: usr.password
                          })
                        }
                      >
                        <UserPlus size={13} /> Crear {usr.nombre.split(' ')[0]}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* TABLA PRINCIPAL DE USUARIOS */}
        <div className="table-card">
          <div className="table-card-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>Todos los usuarios registrados ({users.length})</h3>
          </div>
          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center' }}><Loader2 size={18} className="usr-spin" /> Cargando usuarios…</p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr><th>Usuario</th><th>Rol / Dispositivo</th><th>Último acceso</th><th>Creado</th><th className="text-center">Acciones</th></tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const effectiveRole = u.user_metadata?.role || u.role
                    const R = ROLES[effectiveRole] || ROLES[u.role] || ROLES.viewer
                    const isOp = effectiveRole && effectiveRole.startsWith('operador')
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ fontSize: '0.92rem', color: '#f8fafc' }}>{u.username || u.email?.replace(/@aguacol\.cl$/i, '') || u.email}</strong>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.email}</span>
                          </div>
                          {u.id === yo && <span className="usr-yo">tú</span>}
                          {isOp && <span className="tablet-pill-badge"><Tablet size={11} /> Tablet</span>}
                        </td>
                        <td>
                          <span className={`usr-rol ${R.badgeClass || 'usr-rol-viewer'}`}>
                            <R.Cmp size={14} strokeWidth={2.1} /> {R.label}
                          </span>
                        </td>
                        <td>{fmt(u.last_sign_in_at)}</td>
                        <td>{fmt(u.created_at)}</td>
                        <td className="text-center">
                          <div className="usr-acciones">
                            <button type="button" className="btn-action-edit" onClick={() => abrir('editar', u)} title="Cambiar rol o contraseña">
                              <KeyRound size={14} strokeWidth={2} /> Editar
                            </button>
                            <button type="button" className="usr-del" onClick={() => abrir('eliminar', u)} disabled={u.id === yo} title={u.id === yo ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}>
                              <Trash2 size={14} strokeWidth={2} /> Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {users.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem' }}>No hay usuarios.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* MODAL CREAR / EDITAR / ELIMINAR */}
      {modal && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) cerrar() }}>
          <div className="modal-container usr-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">
                {modal.tipo === 'crear' && 'Nuevo usuario'}
                {modal.tipo === 'editar' && `Editar ${modal.user.email}`}
                {modal.tipo === 'eliminar' && 'Eliminar usuario'}
              </h2>
              <button type="button" className="modal-close-btn" onClick={cerrar} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form onSubmit={guardar} noValidate>
              <div className="usr-body">
                {formError && <div className="alert-error" role="alert"><Icon n="warn" /> <span>{formError}</span></div>}

                {modal.tipo === 'eliminar' ? (
                  <p>¿Eliminar a <strong>{modal.user.email}</strong>? Perderá el acceso de inmediato al volver a iniciar sesión. Esta acción no se puede deshacer.</p>
                ) : (
                  <>
                    {modal.tipo === 'crear' && (
                      <label className="form-group">
                        <span className="form-label">Usuario</span>
                        <input
                          className="form-input"
                          value={form.nombre}
                          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                          placeholder="ej: opextrusion, opinyeccion, opsoplado o nombre"
                          autoFocus
                          autoComplete="off"
                        />
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                          Puedes ingresar solo el nombre de usuario (ej: <code>opextrusion</code>) o un correo electrónico.
                        </span>
                      </label>
                    )}
                    <label className="form-group">
                      <span className="form-label">{modal.tipo === 'crear' ? 'Contraseña' : 'Nueva contraseña (opcional)'}</span>
                      <input
                        className="form-input"
                        type="text"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Mínimo 8 caracteres (ej: Aguacol2026!)"
                        autoComplete="new-password"
                      />
                    </label>
                    <fieldset className="usr-roles">
                      <legend className="form-label">Rol y Permisos</legend>
                      {Object.entries(ROLES).map(([k, r]) => (
                        <label key={k} className={`usr-rolopt ${form.role === k ? 'on' : ''}`}>
                          <input type="radio" name="rol" value={k} checked={form.role === k} onChange={() => setForm({ ...form, role: k })} />
                          <r.Cmp size={18} strokeWidth={2} />
                          <span>
                            <strong>{r.label}</strong>
                            <small>{r.hint}</small>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  </>
                )}
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={cerrar} disabled={saving}>Cancelar</button>
                <button type="submit" className={modal.tipo === 'eliminar' ? 'btn-primary usr-peligro' : 'btn-primary'} disabled={saving}>
                  {saving ? 'Guardando…' : modal.tipo === 'crear' ? 'Crear usuario' : modal.tipo === 'editar' ? 'Guardar cambios' : 'Eliminar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
