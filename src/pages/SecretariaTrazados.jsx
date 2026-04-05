import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTrazados, createTrazado } from '../api/secretaria';

export default function SecretariaTrazados(){
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('secretaria.edit');
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ titulo:'', fecha:'', ponente:'' });

  const load = async () => {
    const { data } = await getTrazados();
    setRows(data.data || data);
  };
  useEffect(()=>{ load(); },[]);

  const onSubmit = async (e) => {
    e.preventDefault();
    await createTrazado(form);
    setForm({ titulo:'', fecha:'', ponente:'' });
    load();
  };

  return (
    <div>
      <h2 style={{fontWeight:700, marginBottom:8}}>Secretaría — Trazados</h2>
      {canEdit && (
        <form onSubmit={onSubmit} style={{display:'flex', gap:8, marginBottom:16}}>
          <input placeholder="Título" value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} style={{border:'1px solid #ddd', padding:8}}/>
          <input type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} style={{border:'1px solid #ddd', padding:8}}/>
          <input placeholder="Ponente" value={form.ponente} onChange={e=>setForm(f=>({...f,ponente:e.target.value}))} style={{border:'1px solid #ddd', padding:8}}/>
          <button style={{background:'#111', color:'#fff'}}>Guardar</button>
        </form>
      )}
      <ul style={{display:'grid', gap:8}}>
        {rows.map(r => (
          <li key={r.id} style={{border:'1px solid #eee', padding:8}}>
            <b>{r.titulo}</b> — {r.ponente} — {r.fecha}
          </li>
        ))}
      </ul>
    </div>
  );
}
