import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAsistencias, createAsistencia } from '../api/secretaria';

export default function Asistencias(){
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('asistencias.edit');
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ fecha:'', miembro_id:'', estado:'presente' });

  const load = async () => {
    const { data } = await getAsistencias();
    setRows(data.data || data);
  };
  useEffect(()=>{ load(); },[]);

  const onSubmit = async (e) => {
    e.preventDefault();
    await createAsistencia(form);
    setForm({ fecha:'', miembro_id:'', estado:'presente' });
    load();
  };

  return (
    <div>
      <h2 style={{fontWeight:700, marginBottom:8}}>Asistencias</h2>
      {canEdit && (
        <form onSubmit={onSubmit} style={{display:'flex', gap:8, marginBottom:16}}>
          <input type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} style={{border:'1px solid #ddd', padding:8}}/>
          <input placeholder="ID Miembro" value={form.miembro_id} onChange={e=>setForm(f=>({...f,miembro_id:e.target.value}))} style={{border:'1px solid #ddd', padding:8}}/>
          <select value={form.estado} onChange={e=>setForm(f=>({...f,estado:e.target.value}))} style={{border:'1px solid #ddd', padding:8}}>
            <option value="presente">Presente</option>
            <option value="ausente">Ausente</option>
            <option value="justificado">Justificado</option>
          </select>
          <button style={{background:'#111', color:'#fff'}}>Registrar</button>
        </form>
      )}
      <ul style={{display:'grid', gap:8}}>
        {rows.map(r => (
          <li key={r.id} style={{border:'1px solid #eee', padding:8}}>
            {r.fecha} — Miembro #{r.miembro_id} — {r.estado}
          </li>
        ))}
      </ul>
    </div>
  );
}
