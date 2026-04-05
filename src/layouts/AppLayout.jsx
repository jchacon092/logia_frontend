import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useRef } from 'react';

export default function AppLayout(){
  const { user, hasPermission, hasRole, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const asideRef = useRef(null);

  // Cerrar al cambiar de ruta
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Permisos
  const can = (perm, rolesFallback = []) =>
    hasPermission(perm) || rolesFallback.some(hasRole);

  const Item = ({ to, label, perm, roles = [] }) =>
    can(perm, roles) ? (
      <NavLink
        to={to}
        className={({ isActive }) =>
          'nav-link px-3 py-2 rounded ' + (isActive ? 'active' : '')
        }
        onClick={() => setSidebarOpen(false)}
      >
        {label}
      </NavLink>
    ) : null;

  return (
    <div className="d-flex">
      {/* OVERLAY para móvil */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop d-md-none"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR
         - En móvil: alterna d-none/d-flex según sidebarOpen.
         - En desktop (md+): siempre visible con d-md-flex. */}
      <aside
        ref={asideRef}
        className={`sidebar ${sidebarOpen ? 'd-flex' : 'd-none'} d-md-flex flex-column ${sidebarOpen ? 'open' : ''}`}
      >
        <div className="brand">
          <img src="/img/logo-logia.png" alt="Logia"/>
          <div>
            <div className="title">Resp.·. Logia Silencio No. 29</div>
            <small className="text-secondary">Quetzaltenango</small>
          </div>
        </div>

        <div className="px-2 py-3">
          <div className="small mb-2 text-secondary">Menú</div>

          <Item to="/finanzas" perm="finanzas.view" roles={['tesorero']} label="💰 Finanzas" />
          <Item to="/secretaria" perm="secretaria.view" roles={['venerable','general']} label="📜 Secretaría" />
          <Item to="/asistencias" perm="asistencias.view" roles={['venerable','general']} label="🗓️ Asistencias" />
          <Item to="/limosnero" perm="limosnero.view" roles={['limosnero']} label="🤝 Limosnero" />
          <Item to="/hospitalario" perm="hospitalario.view" roles={['limosnero']} label="🏥 Hospitalario" />
          <Item to="/tesoreria" perm="tesoreria.view" roles={['tesorero','superadministrador']} label="🏦 Tesorería" />
          <Item to="/miembros" perm="miembros.manage" roles={['superadministrador','venerable']} label="👥 Miembros" />
 <Item to="/cuadro-activos" perm="miembros.manage" roles={['superadministrador','venerable']} label="📋 Cuadro Activos" />
        </div>

        <div className="mt-auto p-3 border-top border-secondary-subtle">
          <div className="small mb-2">
            <div className="fw-semibold">{user?.name}</div>
            <div className="text-secondary">
              {(user?.roles ?? []).map(r => (typeof r === 'string' ? r : r.name)).join(', ')}
            </div>
          </div>
          <button className="btn btn-outline-light btn-sm w-100" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-grow-1">
        <nav className="navbar navbar-expand-md bg-white border-bottom sticky-top">
          <div className="container-fluid">
            {/* Botón/Logo móvil: toggle del sidebar */}
            <button
              type="button"
              className="navbar-brand btn p-0 border-0 bg-transparent d-md-none d-flex align-items-center gap-2"
              aria-label="Abrir menú"
              aria-expanded={sidebarOpen}
              onClick={(e) => {
                e.stopPropagation(); // evita que el click burbujee al overlay
                setSidebarOpen(v => !v);
              }}
            >
              <img src="/img/logo-logia.png" width="28" height="28" alt="Logia" />
              <span>Logia 29</span>
            </button>

            <div className="ms-auto d-flex align-items-center">
              <span className="me-3 small text-muted d-none d-sm-inline">{user?.name}</span>
              <button className="btn btn-sm btn-outline-secondary" onClick={logout}>Salir</button>
            </div>
          </div>
        </nav>
        <main className="app-main container-fluid">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
