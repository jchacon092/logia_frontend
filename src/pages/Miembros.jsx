// src/pages/Miembros.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getMiembros, createMiembro, updateMiembro,
  deleteMiembro, restaurarMiembro,
  getUsuarios, getRoles, crearUsuario, cambiarRol,
} from '../api/miembros_admin';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────
const ESTADOS = ['activo', 'suspendido', 'retirado', 'fallecido'];
const ESTADOS_CIVILES = ['soltero', 'casado', 'divorciado', 'viudo', 'otro'];
const GRADOS = ['AP', 'CF', 'MM', 'AM', 'CM'];

const ESTADO_BADGE = {
  activo:     'bg-success',
  suspendido: 'bg-warning text-dark',
  retirado:   'bg-secondary',
  fallecido:  'bg-dark',
};

const ROL_BADGE = {
  superadministrador: 'bg-danger',
  tesorero:           'bg-primary',
  venerable:          'bg-purple',
  general:            'bg-info text-dark',
  limosnero:          'bg-warning text-dark',
};

const MIEMBRO_EMPTY = {
  nombre_completo: '', grado: '', email: '', telefono: '',
  direccion: '', dpi: '', estado_civil: '', fecha_ingreso: '',
  estado: 'activo', foto: null,
};

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';

// ─────────────────────────────────────────────────────────────────────────────
// Modal genérico
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }} tabIndex="-1">
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function Miembros() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('miembros.manage');

  const [tab, setTab] = useState('miembros'); // 'miembros' | 'usuarios'

  // ── Estado miembros ────────────────────────────────────────────────────────
  const [miembros,        setMiembros]        = useState([]);
  const [miembrosMeta,    setMiembrosMeta]    = useState(null);
  const [loadingMiembros, setLoadingMiembros] = useState(false);
  const [filtroEstado,    setFiltroEstado]    = useState('activo');
  const [filtroQ,         setFiltroQ]         = useState('');
  const [conBaja,         setConBaja]         = useState(false);

  // ── Estado usuarios ────────────────────────────────────────────────────────
  const [usuarios,        setUsuarios]        = useState([]);
  const [roles,           setRoles]           = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  // ── Modales ────────────────────────────────────────────────────────────────
  const [modalForm,      setModalForm]      = useState(false);
  const [modalBaja,      setModalBaja]      = useState(false);
  const [modalUsuario,   setModalUsuario]   = useState(false);
  const [miembroActivo,  setMiembroActivo]  = useState(null); // miembro seleccionado

  // ── Formulario miembro ─────────────────────────────────────────────────────
  const [form,      setForm]      = useState(MIEMBRO_EMPTY);
  const [fotoFile,  setFotoFile]  = useState(null);
  const [formErr,   setFormErr]   = useState('');
  const [saving,    setSaving]    = useState(false);

  // ── Formulario baja ────────────────────────────────────────────────────────
  const [motivoBaja,  setMotivoBaja]  = useState('');
  const [estadoBaja,  setEstadoBaja]  = useState('retirado');
  const [bajaErr,     setBajaErr]     = useState('');

  // ── Formulario crear usuario ───────────────────────────────────────────────
  const [userForm,  setUserForm]  = useState({ name: '', email: '', password: '', rol: '' });
  const [userErr,   setUserErr]   = useState('');
  const [userSaving,setUserSaving]= useState(false);

  // ── Carga de datos ─────────────────────────────────────────────────────────
  const loadMiembros = useCallback(async () => {
    setLoadingMiembros(true);
    try {
      const params = { page: 1 };
      if (filtroQ)      params.q      = filtroQ;
      if (filtroEstado) params.estado = filtroEstado;
      if (conBaja)      params.con_baja = 1;

      const { data } = await getMiembros(params);
      setMiembros(data.data ?? data ?? []);
      setMiembrosMeta(data.meta ?? null);
    } catch (e) { console.error(e); }
    finally { setLoadingMiembros(false); }
  }, [filtroQ, filtroEstado, conBaja]);

  const loadUsuarios = useCallback(async () => {
    setLoadingUsuarios(true);
    try {
      const [ur, rr] = await Promise.all([getUsuarios(), getRoles()]);
      setUsuarios(Array.isArray(ur.data) ? ur.data : []);
      setRoles(Array.isArray(rr.data) ? rr.data : []);
    } catch (e) { console.error(e); }
    finally { setLoadingUsuarios(false); }
  }, []);

  // Cargar roles siempre al montar (se necesitan en el modal de crear usuario)
  useEffect(() => {
    getRoles()
      .then(r => setRoles(Array.isArray(r.data) ? r.data : []))
      .catch(console.error);
  }, []);

  useEffect(() => { loadMiembros(); }, [loadMiembros]);
  useEffect(() => { if (tab === 'usuarios') loadUsuarios(); }, [tab, loadUsuarios]);

  // ── Abrir modal crear/editar ───────────────────────────────────────────────
  const abrirCrear = () => {
    setMiembroActivo(null);
    setForm(MIEMBRO_EMPTY);
    setFotoFile(null);
    setFormErr('');
    setModalForm(true);
  };

  const abrirEditar = (m) => {
    setMiembroActivo(m);
    setForm({
      nombre_completo: m.nombre_completo ?? '',
      grado:           m.grado           ?? '',
      email:           m.email           ?? '',
      telefono:        m.telefono        ?? '',
      direccion:       m.direccion       ?? '',
      dpi:             m.dpi             ?? '',
      estado_civil:    m.estado_civil    ?? '',
      fecha_ingreso:   m.fecha_ingreso   ? m.fecha_ingreso.split('T')[0] : '',
      estado:          m.estado          ?? 'activo',
      foto:            null,
    });
    setFotoFile(null);
    setFormErr('');
    setModalForm(true);
  };

  // ── Submit miembro ─────────────────────────────────────────────────────────
  const submitForm = async (e) => {
    e.preventDefault();
    setFormErr('');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') fd.append(k, v);
      });
      if (fotoFile) fd.append('foto', fotoFile);

      if (miembroActivo) {
        await updateMiembro(miembroActivo.id, fd);
      } else {
        await createMiembro(fd);
      }
      setModalForm(false);
      loadMiembros();
    } catch (err) {
      const msg = err?.response?.data?.message
        || Object.values(err?.response?.data?.errors ?? {}).flat().join(' ')
        || 'Error al guardar.';
      setFormErr(msg);
    } finally { setSaving(false); }
  };

  // ── Dar de baja ────────────────────────────────────────────────────────────
  const abrirBaja = (m) => {
    setMiembroActivo(m);
    setMotivoBaja('');
    setEstadoBaja('retirado');
    setBajaErr('');
    setModalBaja(true);
  };

  const submitBaja = async (e) => {
    e.preventDefault();
    setBajaErr('');
    if (!motivoBaja.trim()) { setBajaErr('El motivo es obligatorio.'); return; }
    try {
      await deleteMiembro(miembroActivo.id, { motivo_baja: motivoBaja, estado: estadoBaja });
      setModalBaja(false);
      loadMiembros();
    } catch (err) {
      setBajaErr(err?.response?.data?.message || 'Error al dar de baja.');
    }
  };

  // ── Restaurar ──────────────────────────────────────────────────────────────
  const handleRestaurar = async (m) => {
    if (!confirm(`¿Restaurar a ${m.nombre_completo}?`)) return;
    try {
      await restaurarMiembro(m.id);
      loadMiembros();
    } catch { alert('Error al restaurar.'); }
  };

  // ── Crear usuario ──────────────────────────────────────────────────────────
  const abrirCrearUsuario = (m) => {
    setMiembroActivo(m);
    setUserForm({ name: m.nombre_completo, email: m.email ?? '', password: '', rol: 'general' });
    setUserErr('');
    setModalUsuario(true);
  };

  const submitUsuario = async (e) => {
    e.preventDefault();
    setUserErr('');
    setUserSaving(true);
    try {
      await crearUsuario(miembroActivo.id, userForm);
      setModalUsuario(false);
      loadMiembros();
      if (tab === 'usuarios') loadUsuarios();
    } catch (err) {
      const msg = err?.response?.data?.message
        || Object.values(err?.response?.data?.errors ?? {}).flat().join(' ')
        || 'Error al crear usuario.';
      setUserErr(msg);
    } finally { setUserSaving(false); }
  };

  // ── Cambiar rol ────────────────────────────────────────────────────────────
  const handleCambiarRol = async (userId, rol) => {
    try {
      await cambiarRol(userId, rol);
      loadUsuarios();
    } catch { alert('Error al cambiar rol.'); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center gap-2 mb-3">
        <h2 className="fw-semibold mb-0 me-auto">👥 Miembros</h2>
        {canManage && tab === 'miembros' && (
          <button className="btn btn-dark btn-sm" onClick={abrirCrear}>
            + Nuevo miembro
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${tab === 'miembros' ? 'active' : ''}`} onClick={() => setTab('miembros')}>
            👥 Miembros
          </button>
        </li>
        {canManage && (
          <li className="nav-item">
            <button className={`nav-link ${tab === 'usuarios' ? 'active' : ''}`} onClick={() => setTab('usuarios')}>
              🔐 Usuarios y roles
            </button>
          </li>
        )}
      </ul>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: MIEMBROS                                                       */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === 'miembros' && (
        <>
          {/* Filtros */}
          <div className="d-flex flex-wrap gap-2 mb-3">
            <input
              className="form-control form-control-sm"
              style={{ width: 220 }}
              placeholder="Buscar por nombre…"
              value={filtroQ}
              onChange={e => setFiltroQ(e.target.value)}
            />
            <select
              className="form-select form-select-sm"
              style={{ width: 150 }}
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            {canManage && (
              <div className="form-check form-switch align-self-center ms-1">
                <input
                  className="form-check-input" type="checkbox" id="conBaja"
                  checked={conBaja} onChange={e => setConBaja(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="conBaja">
                  Incluir dados de baja
                </label>
              </div>
            )}
          </div>

          {/* Tabla */}
          <div className="card">
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 48 }}>Foto</th>
                    <th>Nombre</th>
                    <th>Grado</th>
                    <th>Contacto</th>
                    <th>Ingreso</th>
                    <th>Estado</th>
                    <th>Usuario</th>
                    {canManage && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {loadingMiembros && (
                    <tr><td colSpan={8} className="text-center text-muted py-3">Cargando…</td></tr>
                  )}
                  {!loadingMiembros && miembros.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-muted py-3">Sin registros</td></tr>
                  )}
                  {miembros.map(m => (
                    <tr key={m.id} className={m.deleted_at ? 'table-secondary' : ''}>
                      <td>
                        {m.foto
                          ? <img src={`${API_URL}/storage/${m.foto}`} alt="" width={36} height={36}
                              className="rounded-circle object-fit-cover border" />
                          : <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white"
                              style={{ width: 36, height: 36, fontSize: 14 }}>
                              {m.nombre_completo?.[0]?.toUpperCase()}
                            </div>
                        }
                      </td>
                      <td>
                        <div className="fw-semibold">{m.nombre_completo}</div>
                        {m.deleted_at && (
                          <div className="small text-muted">
                            Baja: {m.motivo_baja}
                          </div>
                        )}
                      </td>
                      <td><span className="badge bg-dark">{m.grado || '—'}</span></td>
                      <td className="small">
                        <div>{m.email || '—'}</div>
                        <div className="text-muted">{m.telefono || ''}</div>
                      </td>
                      <td className="small">{m.fecha_ingreso ?? '—'}</td>
                      <td>
                        <span className={`badge ${ESTADO_BADGE[m.estado] || 'bg-secondary'}`}>
                          {m.estado}
                        </span>
                      </td>
                      <td className="small">
                        {m.user
                          ? <span className="text-success">✓ {m.user.email}</span>
                          : <span className="text-muted">Sin usuario</span>
                        }
                      </td>
                      {canManage && (
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            {!m.deleted_at ? (
                              <>
                                <button className="btn btn-xs btn-outline-secondary"
                                  style={{ fontSize: 11, padding: '2px 7px' }}
                                  onClick={() => abrirEditar(m)}>
                                  Editar
                                </button>
                                {!m.user_id && (
                                  <button className="btn btn-xs btn-outline-primary"
                                    style={{ fontSize: 11, padding: '2px 7px' }}
                                    onClick={() => abrirCrearUsuario(m)}>
                                    + Usuario
                                  </button>
                                )}
                                <button className="btn btn-xs btn-outline-danger"
                                  style={{ fontSize: 11, padding: '2px 7px' }}
                                  onClick={() => abrirBaja(m)}>
                                  Dar de baja
                                </button>
                              </>
                            ) : (
                              <button className="btn btn-xs btn-outline-success"
                                style={{ fontSize: 11, padding: '2px 7px' }}
                                onClick={() => handleRestaurar(m)}>
                                Restaurar
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {miembrosMeta && (
              <div className="card-footer small text-muted">
                {miembrosMeta.total} miembro(s) — Página {miembrosMeta.current_page} de {miembrosMeta.last_page}
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: USUARIOS Y ROLES                                               */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === 'usuarios' && canManage && (
        <div className="card">
          <div className="card-header small fw-semibold">Usuarios del sistema</div>
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol actual</th>
                  <th>Miembro vinculado</th>
                  <th>Cambiar rol</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsuarios && (
                  <tr><td colSpan={5} className="text-center text-muted py-3">Cargando…</td></tr>
                )}
                {!loadingUsuarios && usuarios.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted py-3">Sin usuarios</td></tr>
                )}
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td className="fw-semibold">{u.name}</td>
                    <td className="small text-muted">{u.email}</td>
                    <td>
                      {(u.roles ?? []).map(r => (
                        <span key={r} className={`badge me-1 ${ROL_BADGE[r] || 'bg-secondary'}`}>
                          {r}
                        </span>
                      ))}
                      {(!u.roles || u.roles.length === 0) && (
                        <span className="text-muted small">Sin rol</span>
                      )}
                    </td>
                    <td className="small">
                      {u.miembro
                        ? <span>{u.miembro.nombre_completo} <span className="badge bg-dark">{u.miembro.grado}</span></span>
                        : <span className="text-muted">—</span>
                      }
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 180 }}
                        value={u.roles?.[0] ?? ''}
                        onChange={e => handleCambiarRol(u.id, e.target.value)}
                      >
                        <option value="">Sin rol</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CREAR / EDITAR MIEMBRO                                       */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {modalForm && (
        <Modal
          title={miembroActivo ? 'Editar miembro' : 'Nuevo miembro'}
          onClose={() => setModalForm(false)}
        >
          <form onSubmit={submitForm}>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-12 col-md-8">
                  <label className="form-label small">Nombre completo *</label>
                  <input className="form-control" required
                    value={form.nombre_completo}
                    onChange={e => setForm(f => ({ ...f, nombre_completo: e.target.value }))} />
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label small">Grado</label>
                  <select className="form-select"
                    value={form.grado}
                    onChange={e => setForm(f => ({ ...f, grado: e.target.value }))}>
                    <option value="">—</option>
                    {GRADOS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label small">Estado</label>
                  <select className="form-select"
                    value={form.estado}
                    onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                    {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small">Email</label>
                  <input className="form-control" type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label small">Teléfono</label>
                  <input className="form-control"
                    value={form.telefono}
                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label small">Fecha de ingreso</label>
                  <input className="form-control" type="date"
                    value={form.fecha_ingreso}
                    onChange={e => setForm(f => ({ ...f, fecha_ingreso: e.target.value }))} />
                </div>

                <div className="col-12">
                  <label className="form-label small">Dirección</label>
                  <input className="form-control"
                    value={form.direccion}
                    onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
                </div>

                <div className="col-6 col-md-4">
                  <label className="form-label small">DPI</label>
                  <input className="form-control"
                    value={form.dpi}
                    onChange={e => setForm(f => ({ ...f, dpi: e.target.value }))} />
                </div>
                <div className="col-6 col-md-4">
                  <label className="form-label small">Estado civil</label>
                  <select className="form-select"
                    value={form.estado_civil}
                    onChange={e => setForm(f => ({ ...f, estado_civil: e.target.value }))}>
                    <option value="">—</option>
                    {ESTADOS_CIVILES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small">Foto (opcional)</label>
                  <input className="form-control" type="file" accept="image/*"
                    onChange={e => setFotoFile(e.target.files[0] || null)} />
                  {miembroActivo?.foto && !fotoFile && (
                    <div className="mt-1 small text-muted">Foto actual cargada</div>
                  )}
                </div>

                {formErr && (
                  <div className="col-12">
                    <div className="alert alert-danger py-2 small mb-0">{formErr}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-dark" disabled={saving}>
                {saving ? 'Guardando…' : (miembroActivo ? 'Guardar cambios' : 'Crear miembro')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: DAR DE BAJA                                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {modalBaja && (
        <Modal
          title={`Dar de baja — ${miembroActivo?.nombre_completo}`}
          onClose={() => setModalBaja(false)}
        >
          <form onSubmit={submitBaja}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label small">Tipo de baja *</label>
                <select className="form-select"
                  value={estadoBaja}
                  onChange={e => setEstadoBaja(e.target.value)}>
                  <option value="retirado">Retirado</option>
                  <option value="suspendido">Suspendido</option>
                  <option value="fallecido">Fallecido</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label small">Motivo *</label>
                <textarea className="form-control" rows={3} required
                  placeholder="Describe el motivo de la baja…"
                  value={motivoBaja}
                  onChange={e => setMotivoBaja(e.target.value)} />
              </div>
              {bajaErr && <div className="alert alert-danger py-2 small">{bajaErr}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalBaja(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-danger">Confirmar baja</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CREAR USUARIO                                                */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {modalUsuario && (
        <Modal
          title={`Crear usuario — ${miembroActivo?.nombre_completo}`}
          onClose={() => setModalUsuario(false)}
        >
          <form onSubmit={submitUsuario}>
            <div className="modal-body">
              <div className="alert alert-info py-2 small mb-3">
                Se creará un usuario del sistema vinculado a este miembro.
              </div>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small">Nombre para el usuario *</label>
                  <input className="form-control" required
                    value={userForm.name}
                    onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small">Email *</label>
                  <input className="form-control" type="email" required
                    value={userForm.email}
                    onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small">Contraseña temporal *</label>
                  <input className="form-control" type="password" required minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    value={userForm.password}
                    onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                <div className="col-12">
                  <label className="form-label small">Rol *</label>
                  <select className="form-select" required
                    value={userForm.rol}
                    onChange={e => setUserForm(f => ({ ...f, rol: e.target.value }))}>
                    <option value="">Seleccione un rol</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                {userErr && (
                  <div className="col-12">
                    <div className="alert alert-danger py-2 small mb-0">{userErr}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalUsuario(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-dark" disabled={userSaving}>
                {userSaving ? 'Creando…' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}