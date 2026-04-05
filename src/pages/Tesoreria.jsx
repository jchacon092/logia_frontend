// src/pages/Tesoreria.jsx
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMiembros } from '../api/miembros';
import {
  getPagos, createPago, getRecibo,
  getEgresos, createEgreso,
  getCategoriasEgreso, createCategoriaEgreso,
  getResumenTesoreria,
} from '../api/tesoreria';
import Select from 'react-select';
import { montoALetras, rangoMesesATexto, fechaLarga } from '../utils/numeroALetras';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const fmtQ  = (n) => `Q ${toNum(n).toFixed(2)}`;

const MESES = [
  { value: '',   label: 'Todos los meses' },
  { value: '1',  label: 'Enero'     }, { value: '2',  label: 'Febrero'    },
  { value: '3',  label: 'Marzo'     }, { value: '4',  label: 'Abril'      },
  { value: '5',  label: 'Mayo'      }, { value: '6',  label: 'Junio'      },
  { value: '7',  label: 'Julio'     }, { value: '8',  label: 'Agosto'     },
  { value: '9',  label: 'Septiembre'}, { value: '10', label: 'Octubre'    },
  { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre'  },
];

const MESES_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const CONCEPTOS = [
  { value: 'mensualidad', label: 'Mensualidad' },
  { value: 'iniciacion',  label: 'Derechos de iniciación' },
  { value: 'exaltacion',  label: 'Derechos de exaltación' },
  { value: 'examen',      label: 'Examen' },
  { value: 'donacion',    label: 'Donación' },
  { value: 'rifa',        label: 'Rifa / Talonario' },
  { value: 'otro',        label: 'Otro' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Generación de recibo en PDF (sin dependencias externas — usa window.print)
// ─────────────────────────────────────────────────────────────────────────────
function imprimirRecibo(recibo) {
  const concepto = recibo.descripcion
    ? recibo.descripcion.toUpperCase()
    : `POR CONCEPTO DE ${(recibo.concepto || 'CUOTA ORDINARIA').toUpperCase()} DE ${rangoMesesATexto(recibo.fecha_inicio, recibo.fecha_fin)}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Recibo ${recibo.codigo_recibo}</title>
  <style>
    @page { size: 148mm 105mm; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      color: #000;
      width: 148mm;
      min-height: 105mm;
      padding: 6mm;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4mm; }
    .logo-area { display: flex; align-items: center; gap: 3mm; }
    .logo-area img { width: 18mm; height: 18mm; object-fit: contain; }
    .logia-title { font-size: 9pt; line-height: 1.4; }
    .logia-title b { font-size: 10pt; }
    .recibo-num { text-align: right; font-size: 9pt; }
    .recibo-num .num { font-size: 14pt; font-weight: bold; }
    .recibo-num .monto-badge {
      display: inline-block;
      border: 2px solid #000;
      padding: 1mm 3mm;
      font-weight: bold;
      font-size: 11pt;
      margin-top: 1mm;
    }
    .divider { border-top: 1px solid #000; margin: 3mm 0; }
    .row { margin-bottom: 2mm; font-size: 9.5pt; }
    .row span { font-weight: normal; }
    .row b { text-decoration: underline; }
    .concepto { font-size: 9pt; margin-bottom: 3mm; line-height: 1.4; }
    .footer { display: flex; justify-content: space-between; margin-top: 5mm; }
    .firma { text-align: center; font-size: 8.5pt; line-height: 1.5; }
    .firma-linea { border-top: 1px solid #000; width: 50mm; margin: 0 auto 1mm; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-area">
      <img src="/img/logo-logia.png" alt="Logo"/>
      <div class="logia-title">
        <b>Resp.·. Logia Silencio No. 29</b><br/>
        Quetzaltenango, Guatemala<br/>
        Oficial Tesorero
      </div>
    </div>
    <div class="recibo-num">
      <div>RECIBO NÚMERO</div>
      <div class="num">${recibo.codigo_recibo}</div>
      <div class="monto-badge">POR Q.${toNum(recibo.monto).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="row">
    RECIBÍ DEL QUERIDO HERMANO: <b>${recibo.miembro?.nombre?.toUpperCase() ?? '(NO ESPECIFICADO)'}</b>
  </div>
  <div class="row">
    LA CANTIDAD DE: <b>${montoALetras(toNum(recibo.monto))}</b>
  </div>
  <div class="concepto">
    ${concepto}
  </div>
  <div class="row" style="font-size:8.5pt; color:#333;">
    ${fechaLarga(recibo.fecha_pago.split('/').reverse().join('-'))}
  </div>

  <div class="footer">
    <div class="firma">
      <div class="firma-linea"></div>
      <div>${(recibo.registrado_por || 'TESORERO').toUpperCase()}</div>
      <div>OFICIAL TESORERO</div>
      <div>LOGIA SILENCIO No. 29</div>
    </div>
    <div style="font-size:8pt; color:#555; align-self:flex-end;">
      Emitido: ${new Date().toLocaleDateString('es-GT')}
    </div>
  </div>
</body>
</html>`;

  const ventana = window.open('', '_blank', 'width=600,height=450');
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  setTimeout(() => { ventana.print(); }, 400);
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function Tesoreria() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('tesoreria.edit');

  const now = new Date();
  const [anio, setAnio] = useState(String(now.getFullYear()));
  const [mes,  setMes]  = useState('');
  const [tab,  setTab]  = useState('pagos'); // 'pagos' | 'egresos' | 'resumen'

  // ── Catálogos ──────────────────────────────────────────────────────────────
  const [miembros,        setMiembros]        = useState([]);
  const [loadingMiembros, setLoadingMiembros] = useState(true);
  const [categorias,      setCategorias]      = useState([]);
  const [loadingCats,     setLoadingCats]     = useState(true);

  useEffect(() => {
    // Cargamos por separado para que un fallo en uno no afecte al otro
    getMiembros()
      .then(mr => {
        const payload = Array.isArray(mr.data) ? mr.data : (mr.data?.data ?? []);
        setMiembros(payload);
      })
      .catch(e => console.error('Error cargando miembros:', e))
      .finally(() => setLoadingMiembros(false));

    getCategoriasEgreso()
      .then(cr => {
        const payload = Array.isArray(cr.data) ? cr.data : (cr.data?.data ?? []);
        setCategorias(payload);
      })
      .catch(e => console.error('Error cargando categorías:', e))
      .finally(() => setLoadingCats(false));
  }, []);

  const miembroOptions = useMemo(
    () => (miembros || []).map(m => ({
      value: Number(m.id),
      label: `${m.nombre_completo}${m.grado ? ` (${m.grado})` : ''}`,
    })),
    [miembros]
  );

  const categoriaOptions = useMemo(
    () => categorias.map(c => ({ value: c.id, label: c.nombre })),
    [categorias]
  );

  // ── Pagos ──────────────────────────────────────────────────────────────────
  const [pagos,       setPagos]       = useState([]);
  const [pagosMeta,   setPagosMeta]   = useState(null);
  const [pagosTotal,  setPagosTotal]  = useState(0);
  const [loadingPagos,setLoadingPagos]= useState(false);

  const PAGO_EMPTY = {
    miembro_id: '', fecha_pago: '', fecha_inicio: '', fecha_fin: '',
    monto: '', concepto: 'mensualidad', descripcion: '',
  };
  const [pagoForm, setPagoForm] = useState(PAGO_EMPTY);
  const [pagoErr,  setPagoErr]  = useState('');

  const loadPagos = async () => {
    setLoadingPagos(true);
    try {
      const params = { anio };
      if (mes) params.mes = mes;
      const { data } = await getPagos(params);
      setPagos(data.data ?? data ?? []);
      setPagosMeta(data.meta ?? null);
      setPagosTotal(data.totales?.monto_total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoadingPagos(false); }
  };

  // ── Egresos ────────────────────────────────────────────────────────────────
  const [egresos,        setEgresos]        = useState([]);
  const [egresosMeta,    setEgresosMeta]    = useState(null);
  const [egresosTotal,   setEgresosTotal]   = useState(0);
  const [loadingEgresos, setLoadingEgresos] = useState(false);

  const EGRESO_EMPTY = { categoria_egreso_id: '', descripcion: '', monto: '', fecha: '', referencia: '' };
  const [egresoForm, setEgresoForm] = useState(EGRESO_EMPTY);
  const [egresoErr,  setEgresoErr]  = useState('');

  // Nueva categoría inline
  const [nuevaCat,     setNuevaCat]     = useState('');
  const [creandoCat,   setCreandoCat]   = useState(false);

  const loadEgresos = async () => {
    setLoadingEgresos(true);
    try {
      const params = { anio };
      if (mes) params.mes = mes;
      const { data } = await getEgresos(params);
      setEgresos(data.data ?? data ?? []);
      setEgresosMeta(data.meta ?? null);
      setEgresosTotal(data.totales?.monto_total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoadingEgresos(false); }
  };

  // ── Resumen ────────────────────────────────────────────────────────────────
  const [resumen,        setResumen]        = useState(null);
  const [loadingResumen, setLoadingResumen] = useState(false);

  const loadResumen = async () => {
    setLoadingResumen(true);
    try {
      const params = { anio };
      if (mes) params.mes = mes;
      const { data } = await getResumenTesoreria(params);
      setResumen(data);
    } catch (e) { console.error(e); }
    finally { setLoadingResumen(false); }
  };

  // ── Carga inicial y al cambiar filtros ────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      loadPagos();
      loadEgresos();
      loadResumen();
    }, 150);
    return () => clearTimeout(t);
  }, [anio, mes]);

  // ── Submit pago ───────────────────────────────────────────────────────────
  const submitPago = async (e) => {
    e.preventDefault();
    setPagoErr('');
    if (!pagoForm.fecha_pago || !pagoForm.fecha_inicio || !pagoForm.fecha_fin || !pagoForm.monto) {
      setPagoErr('Completa todos los campos obligatorios.');
      return;
    }
    try {
      await createPago({
        ...pagoForm,
        miembro_id: pagoForm.miembro_id || null,
        monto: Number(pagoForm.monto),
      });
      setPagoForm(PAGO_EMPTY);
      await Promise.all([loadPagos(), loadResumen()]);
    } catch (err) {
      setPagoErr(err?.response?.data?.message || 'Error al registrar el pago.');
    }
  };

  // ── Submit egreso ─────────────────────────────────────────────────────────
  const submitEgreso = async (e) => {
    e.preventDefault();
    setEgresoErr('');
    if (!egresoForm.categoria_egreso_id || !egresoForm.descripcion || !egresoForm.monto || !egresoForm.fecha) {
      setEgresoErr('Completa todos los campos obligatorios.');
      return;
    }
    try {
      await createEgreso({ ...egresoForm, monto: Number(egresoForm.monto) });
      setEgresoForm(EGRESO_EMPTY);
      await Promise.all([loadEgresos(), loadResumen()]);
    } catch (err) {
      setEgresoErr(err?.response?.data?.message || 'Error al registrar el egreso.');
    }
  };

  // ── Crear categoría inline ────────────────────────────────────────────────
  const crearCategoria = async () => {
    if (!nuevaCat.trim()) return;
    setCreandoCat(true);
    try {
      const { data } = await createCategoriaEgreso({ nombre: nuevaCat.trim() });
      setCategorias(prev => [...prev, data]);
      setEgresoForm(f => ({ ...f, categoria_egreso_id: data.id }));
      setNuevaCat('');
    } catch (err) {
      alert(err?.response?.data?.message || 'Error al crear la categoría.');
    } finally { setCreandoCat(false); }
  };

  // ── Imprimir recibo ───────────────────────────────────────────────────────
  const handleImprimir = async (pagoId) => {
    try {
      const { data } = await getRecibo(pagoId);
      imprimirRecibo(data);
    } catch {
      alert('No se pudo obtener el recibo.');
    }
  };

  // ── Nombre de miembro ─────────────────────────────────────────────────────
  const nombreMiembro = (id) => {
    if (!id) return '—';
    const m = miembros.find(x => x.id === id);
    return m ? m.nombre_completo : `Miembro #${id}`;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="container-fluid">

      {/* ── Encabezado + filtros ── */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h2 className="fw-semibold mb-0 me-auto">🏦 Tesorería</h2>
        <input
          className="form-control form-control-sm"
          style={{ width: 90 }}
          type="number" min="2000" max="2999"
          value={anio}
          onChange={e => setAnio(e.target.value)}
          placeholder="Año"
        />
        <select
          className="form-select form-select-sm"
          style={{ width: 150 }}
          value={mes}
          onChange={e => setMes(e.target.value)}
        >
          {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* ── Tabs ── */}
      <ul className="nav nav-tabs mb-3">
        {[
          { key: 'pagos',   label: '💰 Ingresos'     },
          { key: 'egresos', label: '📤 Egresos'       },
          { key: 'resumen', label: '📊 Balance'       },
        ].map(t => (
          <li key={t.key} className="nav-item">
            <button
              className={`nav-link ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >{t.label}</button>
          </li>
        ))}
      </ul>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: PAGOS                                                          */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === 'pagos' && (
        <>
          {canEdit && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">Registrar ingreso</div>
              <div className="card-body">
                <form onSubmit={submitPago} className="row g-2">

                  {/* Miembro (opcional) */}
                  <div className="col-12 col-md-6">
                    <label className="form-label small mb-1">
                      Hermano <span className="text-muted">(opcional para donaciones, rifas…)</span>
                    </label>
                    <Select
                      isClearable
                      isSearchable
                      isLoading={loadingMiembros}
                      options={miembroOptions}
                      placeholder="Seleccione un miembro"
                      value={
                        pagoForm.miembro_id
                          ? miembroOptions.find(o => o.value === Number(pagoForm.miembro_id)) || null
                          : null
                      }
                      onChange={opt => setPagoForm(f => ({ ...f, miembro_id: opt?.value || '' }))}
                    />
                  </div>

                  {/* Concepto */}
                  <div className="col-12 col-md-3">
                    <label className="form-label small mb-1">Concepto</label>
                    <input
                      className="form-control"
                      placeholder="Ej: mensualidad, iniciación, donación..."
                      value={pagoForm.concepto}
                      onChange={e => setPagoForm(f => ({ ...f, concepto: e.target.value }))}
                    />
                  </div>

                  {/* Monto */}
                  <div className="col-6 col-md-3">
                    <label className="form-label small mb-1">Monto (Q) *</label>
                    <input
                      className="form-control"
                      type="number" step="0.01" min="0.01"
                      placeholder="0.00"
                      value={pagoForm.monto}
                      onChange={e => setPagoForm(f => ({ ...f, monto: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Fecha de pago */}
                  <div className="col-6 col-md-3">
                    <label className="form-label small mb-1">Fecha de pago *</label>
                    <input
                      className="form-control"
                      type="date"
                      value={pagoForm.fecha_pago}
                      onChange={e => setPagoForm(f => ({ ...f, fecha_pago: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Rango de meses que cubre */}
                  <div className="col-6 col-md-3">
                    <label className="form-label small mb-1">Cubre desde (mes) *</label>
                    <input
                      className="form-control"
                      type="date"
                      value={pagoForm.fecha_inicio}
                      onChange={e => setPagoForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label small mb-1">Hasta (mes) *</label>
                    <input
                      className="form-control"
                      type="date"
                      value={pagoForm.fecha_fin}
                      onChange={e => setPagoForm(f => ({ ...f, fecha_fin: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Descripción libre */}
                  <div className="col-12 col-md-9">
                    <label className="form-label small mb-1">Descripción (aparece en el recibo)</label>
                    <input
                      className="form-control"
                      placeholder="Ej: Cuota ordinaria ene-jun 2026 / Donación Logia Hiram..."
                      value={pagoForm.descripcion}
                      onChange={e => setPagoForm(f => ({ ...f, descripcion: e.target.value }))}
                    />
                  </div>

                  {pagoErr && <div className="col-12 text-danger small">{pagoErr}</div>}

                  <div className="col-12 col-md-3 d-grid align-items-end">
                    <button className="btn btn-dark">Registrar ingreso</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Lista de pagos */}
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Ingresos registrados</span>
              <span className="text-muted small">
                Total: <b className="text-success">{fmtQ(pagosTotal)}</b>
                {pagosMeta && <> &nbsp;·&nbsp; {pagosMeta.total} registro(s)</>}
              </span>
            </div>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Recibo</th>
                    <th>Hermano</th>
                    <th>Concepto</th>
                    <th>Período cubierto</th>
                    <th>Fecha pago</th>
                    <th className="text-end">Monto</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPagos && (
                    <tr><td colSpan={7} className="text-muted text-center py-3">Cargando…</td></tr>
                  )}
                  {!loadingPagos && pagos.length === 0 && (
                    <tr><td colSpan={7} className="text-muted text-center py-3">Sin registros</td></tr>
                  )}
                  {pagos.map(p => {
                    const ini = new Date(p.fecha_inicio + 'T00:00:00');
                    const fin = new Date(p.fecha_fin    + 'T00:00:00');
                    const periodo = ini.getTime() === fin.getTime()
                      ? `${MESES_ES[ini.getMonth()]} ${ini.getFullYear()}`
                      : `${MESES_ES[ini.getMonth()]} ${ini.getFullYear()} — ${MESES_ES[fin.getMonth()]} ${fin.getFullYear()}`;

                    return (
                      <tr key={p.id}>
                        <td>
                          <span className="badge bg-secondary">
                            {p.anio_recibo}-{String(p.numero_recibo).padStart(3,'0')}
                          </span>
                        </td>
                        <td>{p.miembro?.nombre_completo ?? nombreMiembro(p.miembro_id)}</td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {CONCEPTOS.find(c => c.value === p.concepto)?.label ?? p.concepto}
                          </span>
                        </td>
                        <td className="small">{periodo}</td>
                        <td className="small">{p.fecha_pago}</td>
                        <td className="text-end fw-semibold text-success">{fmtQ(p.monto)}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            title="Imprimir recibo"
                            onClick={() => handleImprimir(p.id)}
                          >
                            🖨️ Recibo
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: EGRESOS                                                        */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === 'egresos' && (
        <>
          {canEdit && (
            <div className="card mb-3">
              <div className="card-header fw-semibold">Registrar egreso</div>
              <div className="card-body">
                <form onSubmit={submitEgreso} className="row g-2">

                  {/* Categoría */}
                  <div className="col-12 col-md-4">
                    <label className="form-label small mb-1">Categoría *</label>
                    <Select
                      isLoading={loadingCats}
                      options={categoriaOptions}
                      placeholder="Seleccione categoría"
                      value={categoriaOptions.find(o => o.value === egresoForm.categoria_egreso_id) ?? null}
                      onChange={opt => setEgresoForm(f => ({ ...f, categoria_egreso_id: opt?.value ?? '' }))}
                    />
                    {/* Crear categoría inline */}
                    <div className="d-flex gap-1 mt-1">
                      <input
                        className="form-control form-control-sm"
                        placeholder="Nueva categoría…"
                        value={nuevaCat}
                        onChange={e => setNuevaCat(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); crearCategoria(); } }}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success"
                        disabled={!nuevaCat.trim() || creandoCat}
                        onClick={crearCategoria}
                      >+ Crear</button>
                    </div>
                  </div>

                  {/* Descripción */}
                  <div className="col-12 col-md-5">
                    <label className="form-label small mb-1">Descripción *</label>
                    <input
                      className="form-control"
                      placeholder="Ej: Pago energía eléctrica 26/03/2026"
                      value={egresoForm.descripcion}
                      onChange={e => setEgresoForm(f => ({ ...f, descripcion: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Monto */}
                  <div className="col-6 col-md-2">
                    <label className="form-label small mb-1">Monto (Q) *</label>
                    <input
                      className="form-control"
                      type="number" step="0.01" min="0.01"
                      placeholder="0.00"
                      value={egresoForm.monto}
                      onChange={e => setEgresoForm(f => ({ ...f, monto: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Fecha */}
                  <div className="col-6 col-md-2">
                    <label className="form-label small mb-1">Fecha *</label>
                    <input
                      className="form-control"
                      type="date"
                      value={egresoForm.fecha}
                      onChange={e => setEgresoForm(f => ({ ...f, fecha: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Referencia */}
                  <div className="col-12 col-md-4">
                    <label className="form-label small mb-1">Referencia / Factura</label>
                    <input
                      className="form-control"
                      placeholder="Número de factura, folio, etc."
                      value={egresoForm.referencia}
                      onChange={e => setEgresoForm(f => ({ ...f, referencia: e.target.value }))}
                    />
                  </div>

                  {egresoErr && <div className="col-12 text-danger small">{egresoErr}</div>}

                  <div className="col-12 col-md-2 d-grid align-items-end">
                    <button className="btn btn-dark">Registrar egreso</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Lista de egresos */}
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Egresos registrados</span>
              <span className="text-muted small">
                Total: <b className="text-danger">{fmtQ(egresosTotal)}</b>
                {egresosMeta && <> &nbsp;·&nbsp; {egresosMeta.total} registro(s)</>}
              </span>
            </div>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Categoría</th>
                    <th>Descripción</th>
                    <th>Referencia</th>
                    <th>Fecha</th>
                    <th className="text-end">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingEgresos && (
                    <tr><td colSpan={5} className="text-muted text-center py-3">Cargando…</td></tr>
                  )}
                  {!loadingEgresos && egresos.length === 0 && (
                    <tr><td colSpan={5} className="text-muted text-center py-3">Sin registros</td></tr>
                  )}
                  {egresos.map(eg => (
                    <tr key={eg.id}>
                      <td>
                        <span className="badge bg-warning text-dark">
                          {eg.categoria?.nombre ?? `Cat. ${eg.categoria_egreso_id}`}
                        </span>
                      </td>
                      <td>{eg.descripcion}</td>
                      <td className="text-muted small">{eg.referencia ?? '—'}</td>
                      <td className="small">{eg.fecha}</td>
                      <td className="text-end fw-semibold text-danger">{fmtQ(eg.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: RESUMEN / BALANCE                                              */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === 'resumen' && (
        <div>
          {loadingResumen && <p className="text-muted">Cargando resumen…</p>}
          {resumen && (
            <>
              {/* Tarjetas de totales */}
              <div className="row g-3 mb-4">
                <div className="col-12 col-md-4">
                  <div className="card border-success">
                    <div className="card-body text-center">
                      <div className="text-success small fw-semibold mb-1">TOTAL INGRESOS</div>
                      <div className="fs-3 fw-bold text-success">{fmtQ(resumen.total_ingresos)}</div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="card border-danger">
                    <div className="card-body text-center">
                      <div className="text-danger small fw-semibold mb-1">TOTAL EGRESOS</div>
                      <div className="fs-3 fw-bold text-danger">{fmtQ(resumen.total_egresos)}</div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className={`card border-${toNum(resumen.balance) >= 0 ? 'primary' : 'warning'}`}>
                    <div className="card-body text-center">
                      <div className="small fw-semibold mb-1">BALANCE</div>
                      <div className={`fs-3 fw-bold ${toNum(resumen.balance) >= 0 ? 'text-primary' : 'text-warning'}`}>
                        {fmtQ(resumen.balance)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                {/* Ingresos por concepto */}
                <div className="col-12 col-md-6">
                  <div className="card">
                    <div className="card-header small fw-semibold">Ingresos por concepto</div>
                    <table className="table table-sm mb-0">
                      <thead className="table-light">
                        <tr><th>Concepto</th><th className="text-end">Total</th><th className="text-end">#</th></tr>
                      </thead>
                      <tbody>
                        {(!resumen.por_concepto || resumen.por_concepto.length === 0) && (
                          <tr><td colSpan={3} className="text-muted text-center">Sin datos</td></tr>
                        )}
                        {(resumen.por_concepto ?? []).map((c, i) => (
                          <tr key={i}>
                            <td>{CONCEPTOS.find(x => x.value === c.concepto)?.label ?? c.concepto}</td>
                            <td className="text-end text-success">{fmtQ(c.total)}</td>
                            <td className="text-end text-muted small">{c.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Egresos por categoría */}
                <div className="col-12 col-md-6">
                  <div className="card">
                    <div className="card-header small fw-semibold">Egresos por categoría</div>
                    <table className="table table-sm mb-0">
                      <thead className="table-light">
                        <tr><th>Categoría</th><th className="text-end">Total</th><th className="text-end">#</th></tr>
                      </thead>
                      <tbody>
                        {(!resumen.por_categoria || resumen.por_categoria.length === 0) && (
                          <tr><td colSpan={3} className="text-muted text-center">Sin datos</td></tr>
                        )}
                        {(resumen.por_categoria ?? []).map((c, i) => (
                          <tr key={i}>
                            <td>{c.categoria}</td>
                            <td className="text-end text-danger">{fmtQ(c.total)}</td>
                            <td className="text-end text-muted small">{c.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}