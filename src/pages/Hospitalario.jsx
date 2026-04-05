import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDonaciones, createDonacion } from '../api/limosnero';

export default function Hospitalario(){
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('hospitalario.edit');
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ fecha:'', beneficiario:'', monto:'', nota:'' });

  const load = async () => {
    const { data } = await getDonaciones();
    setRows(data.data || data);
  };
  useEffect(()=>{ load(); },[]);

  const onSubmit = async (e) => {
    e.preventDefault();
    await createDonacion({ ...form, monto: Number(form.monto) });
    setForm({ fecha:'', beneficiario:'', monto:'', nota:'' });
    load();
  };

  return (
    <div>
      <h2 style={{fontWeight:700, marginBottom:8}}>Hospitalario — Donaciones</h2>
      {canEdit && (
        <form onSubmit={onSubmit} style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:8, marginBottom:16}}>
          <input type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} style={{border:'1px solid #ddd', padding:8}}/>
          <input placeholder="Beneficiario" value={form.beneficiario} onChange={e=>setForm(f=>({...f,beneficiario:e.target.value}))} style={{border:'1px solid #ddd', padding:8}}/>
          <input placeholder="Monto" value={form.monto} onChange={e=>setForm(f=>({...f,monto:e.target.value}))} style={{border:'1px solid #ddd', padding:8}}/>
          <input placeholder="Nota" value={form.nota} onChange={e=>setForm(f=>({...f,nota:e.target.value}))} style={{border:'1px solid #ddd', padding:8}}/>
          <button style={{background:'#111', color:'#fff'}}>Registrar</button>
        </form>
      )}
      <ul style={{display:'grid', gap:8}}>
        {rows.map(r => (
          <li key={r.id} style={{border:'1px solid #eee', padding:8}}>
            {r.fecha} — {r.beneficiario} — Q {Number(r.monto).toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}
