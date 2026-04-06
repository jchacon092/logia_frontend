import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login(){
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError(err?.response?.data?.message || 'Error de credenciales');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-bg d-flex align-items-center justify-content-center">
      <div className="login-card p-4 p-md-5">
        <div className="text-center mb-3">
          <img src="/img/logo-logia.png" alt="Logo" width="72" height="72" className="mb-2"/>
          <h1 className="h5 mb-0">Panel Administrativo</h1>
          <div className="text-muted small">Resp.·. Logia Silencio No. 29</div>
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <form onSubmit={onSubmit} className="vstack gap-3">
          <div>
            <label className="form-label">Correo</label>
            <input className="form-control" value={email} onChange={e=>setEmail(e.target.value)} placeholder="correo@dominio.com"/>
          </div>
          <div>
            <label className="form-label">Contraseña</label>
            <input className="form-control" type="password" value={password} onChange={e=>setPassword(e.target.value)}/>
          </div>
          <button className="btn btn-dark w-100" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
