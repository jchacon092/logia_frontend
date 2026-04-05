import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { hasPermission, hasRole, user, logout } = useAuth();
  const { pathname } = useLocation();
  const active = (to) => pathname.startsWith(to) ? { fontWeight: '700' } : {};

  return (
    <aside style={{width:260, padding:16, borderRight:'1px solid #ddd'}}>
      <div style={{marginBottom:16}}>
        <div style={{fontWeight:700}}>Logia Panel</div>
        <div style={{fontSize:12, color:'#666'}}>{user?.name}</div>
        <div style={{fontSize:12, color:'#666'}}>
          {user?.roles?.map(r => r.name).join(', ')}
        </div>
      </div>

      <nav style={{display:'grid', gap:8}}>
        {hasPermission('finanzas.view') && <Link style={active('/finanzas')} to="/finanzas">Finanzas</Link>}
        {hasPermission('secretaria.view') && <Link style={active('/secretaria')} to="/secretaria">Secretaría</Link>}
        {hasPermission('asistencias.view') && <Link style={active('/asistencias')} to="/asistencias">Asistencias</Link>}
        {hasPermission('limosnero.view') && <Link style={active('/limosnero')} to="/limosnero">Limosnero</Link>}
        {hasPermission('hospitalario.view') && <Link style={active('/hospitalario')} to="/hospitalario">Hospitalario</Link>}
      </nav>

      <div style={{marginTop:24, fontSize:12, color:'#999'}}>
        {hasRole('superadministrador') ? 'Acceso total' : 'Acceso limitado'}
      </div>

      <button style={{marginTop:16, padding:'8px 12px', border:'1px solid #ddd', cursor:'pointer'}}
              onClick={logout}>
        Cerrar sesión
      </button>
    </aside>
  );
}
