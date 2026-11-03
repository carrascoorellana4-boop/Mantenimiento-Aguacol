import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, Eye, UserPlus, KeyRound, Trash2, Loader2, X } from 'lucide-react'
import Icon from './Icon'

const DOMINIO = '@aguacol.cl'
const ROLES = {
  admin: { label: 'Administrador', hint: 'Puede crear, editar y gestionar usuarios.', Cmp: ShieldCheck },
  viewer: { label: 'Visualizador', hint: 'Solo puede ver la información.', Cmp: Eye },
}

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' }) : 'Nunca')

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

  const abrir = (tipo, user = null) => {
    setFormError('')
    setForm({ nombre: '', password: '', role: user?.role || 'viewer' })
    setModal({ tipo, user })
  }
  const cerrar = () => { if (!saving) setModal(null) }

  const guardar = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      if (modal.tipo === 'crear') {
        const nombre = form.nombre.trim().toLowerCase()
        if (!/^[a-z0-9][a-z0-9._-]*$/.test(nombre)) throw new Error('El usuario solo admite letras, números, punto, guion y guion bajo.')
        await api('', { method: 'POST', body: JSON.stringify({ email: `${nombre}${DOMINIO}`, password: form.password, role: form.role }) })
        setAviso(`Usuario ${nombre}${DOMINIO} creado.`)
      } else if (modal.tipo === 'editar') {
        const cambios = { role: form.role }
        if (form.password) cambios.password = form.password
        await api(`/${modal.user.id}`, { method: 'PATCH', body: JSON.stringify(cambios) })
        setAviso(`Usuario ${modal.user.email} actualizado.`)
      } else {
        await api(`/${modal.user.id}`, { method: 'DELETE' })
        setAviso(`Usuario ${modal.user.email} eliminado.`)
      }
      setModal(null)
      await cargar()
    } catch (err) {
      setFormError(err.message)
    }
    setSaving(false)
  }

  const yo = session?.user?.id

  return (
    <>
      <header className="content-header">
        <div className="header-info">
          <h1 className="page-title">Usuarios y roles</h1>
          <p className="page-subtitle">Los administradores gestionan cuentas; los visualizadores solo consultan. Todas las cuentas usan {DOMINIO}.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => abrir('crear')}>
          <UserPlus size={16} strokeWidth={2.1} style={{ marginRight: 6, verticalAlign: '-3px' }} /> Nuevo usuario
        </button>
      </header>

      <section className="content-body">
        {aviso && <div className="alert-success" role="status" onAnimationEnd={() => {}}><Icon n="check" /> <span>{aviso}</span></div>}
        {error && <div className="alert-error" role="alert"><Icon n="warn" /> <span>{error}</span></div>}

        <div className="table-card">
          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center' }}><Loader2 size={18} className="usr-spin" /> Cargando usuarios…</p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr><th>Usuario</th><th>Rol</th><th>Último acceso</th><th>Creado</th><th className="text-center">Acciones</th></tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const R = ROLES[u.role]
                    return (
                      <tr key={u.id}>
                        <td><strong>{u.email}</strong>{u.id === yo && <span className="usr-yo">tú</span>}</td>
                        <td><span className={`usr-rol usr-rol-${u.role}`}><R.Cmp size={14} strokeWidth={2.1} /> {R.label}</span></td>
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
                        <span className="usr-mail">
                          <input className="form-input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="nombre.apellido" autoFocus autoComplete="off" />
                          <span className="usr-dom">{DOMINIO}</span>
                        </span>
                      </label>
                    )}
                    <label className="form-group">
                      <span className="form-label">{modal.tipo === 'crear' ? 'Contraseña' : 'Nueva contraseña (opcional)'}</span>
                      <input className="form-input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
                    </label>
                    <fieldset className="usr-roles">
                      <legend className="form-label">Rol</legend>
                      {Object.entries(ROLES).map(([k, r]) => (
                        <label key={k} className={`usr-rolopt ${form.role === k ? 'on' : ''}`}>
                          <input type="radio" name="rol" value={k} checked={form.role === k} onChange={() => setForm({ ...form, role: k })} />
                          <r.Cmp size={18} strokeWidth={2} />
                          <span><strong>{r.label}</strong><small>{r.hint}</small></span>
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
