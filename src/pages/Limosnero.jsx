import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getColectas, createColecta } from '../api/limosnero';

export default function Limosnero(){
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('limosnero.edit');
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ fecha:'', monto:'' });

  const load = async () => {
    const { data } = await getColectas();
    setRows(data.data || data);
  };
  useEffect(()=>{ load(); },[]);

  const onSubmit = async (e) => {
    e.preventDefault();
    await createColecta({ ...form, monto: Number(form.monto) });
    setForm({ fecha:'', monto:'' });
    load();
  };

  const total = rows.reduce((acc, r) => acc + Number(r.monto || 0), 0);

  return (
    <div>
      <h2 style={{fontWeight:700, marginBottom:8}}>Limosnero — Colectas</h2>
      {canEdit && (
        <form onSubmit={onSubmit} style={{display:'flex', gap:8, marginBottom:16}}>
          <input type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} style={{border:'1px solid #ddd', padding:8}}/>
          <input placeholder="Monto" value={form.monto} onChange={e=>setForm(f=>({...f,monto:e.target.value}))} style={{border:'1px solid #ddd', padding:8}}/>
          <button style={{background:'#111', color:'#fff'}}>Registrar</button>
        </form>
      )}
      <div style={{marginBottom:8}}>Total listado: Q {total.toFixed(2)}</div>
      <ul style={{display:'grid', gap:8}}>
        {rows.map(r => (
          <li key={r.id} style={{border:'1px solid #eee', padding:8}}>
            {r.fecha} — Q {Number(r.monto).toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}
