// src/pages/Finanzas.jsx
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getCuotas, createCuota,
  getEventos, createEvento,
  getRubros, getCuotaBitacora, upsertCuotaBitacora,
  getResumenMensual
} from '../api/finanzas';
import { getMiembros } from '../api/miembros';
import Select from 'react-select';

// Helper numérico robusto
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function Finanzas() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('finanzas.edit');

  // ======== Filtros compactos ========
  const now = new Date();
  const [anio, setAnio] = useState(String(now.getFullYear()));
  const [mes, setMes] = useState(String(now.getMonth() + 1)); // 1..12
  const MESES = [
    { value: '1', label: 'Ene' }, { value: '2', label: 'Feb' },
    { value: '3', label: 'Mar' }, { value: '4', label: 'Abr' },
    { value: '5', label: 'May' }, { value: '6', label: 'Jun' },
    { value: '7', label: 'Jul' }, { value: '8', label: 'Ago' },
    { value: '9', label: 'Sep' }, { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' }, { value: '12', label: 'Dic' },
  ];

  const aplicarFiltros = async () => { await load(); };
  const limpiarFiltros = async () => {
    const d = new Date();
    setAnio(String(d.getFullYear()));
    setMes(String(d.getMonth() + 1));
    setBitacoras({});
    await load();
  };

  // ======== Catálogo de rubros + helpers ========
  const [rubros, setRubros] = useState([]);
  const [loadingRubros, setLoadingRubros] = useState(true);

  // Fallback (solo para UI mientras no hay catálogo real)
  const FALLBACK_RUBROS = [
    { id: 'FALLBACK-1', nombre: 'Mantenimiento (Josias)' },
    { id: 'FALLBACK-2', nombre: 'Gran Logia' },
    { id: 'FALLBACK-3', nombre: 'Luz/Agua' },
  ];

  const findRubroByName = (name) =>
    (rubros || []).find(r => String(r?.nombre).toLowerCase() === String(name).toLowerCase());

  const isNumericId = (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0;
  };

  const resolveRubroId = (item) => {
    if (isNumericId(item.rubro_id)) return Number(item.rubro_id);
    const name = item.rubro_nombre || item.rubro;
    if (name) {
      const r = findRubroByName(name);
      if (r?.id && isNumericId(r.id)) return Number(r.id);
    }
    return null;
  };

  // ======== Miembros ========
  const [miembros, setMiembros] = useState([]);
  const [loadingMiembros, setLoadingMiembros] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [mres, rres] = await Promise.all([getMiembros(), getRubros()]);
        const payloadM = Array.isArray(mres.data) ? mres.data : (mres.data?.data || []);
        setMiembros(payloadM);

        const payloadR = Array.isArray(rres?.data) ? rres.data : (rres?.data?.data || []);
        setRubros(payloadR.length ? payloadR : FALLBACK_RUBROS);
      } catch (e) {
        console.error('No se pudo cargar miembros/rubros', e);
        setRubros(FALLBACK_RUBROS);
      } finally {
        setLoadingMiembros(false);
        setLoadingRubros(false);
      }
    })();
  }, []);

  const miembroOptions = useMemo(
    () =>
      (miembros || []).map(m => ({
        value: Number(m.id),
        label: `${m.nombre_completo}${m.grado ? ` (${m.grado})` : ''}`,
      })),
    [miembros]
  );

  // ======== Cuotas ========
  const [cuotas, setCuotas] = useState([]);
  const [cuotaForm, setCuotaForm] = useState({
    miembro_id: '',
    fecha: '',
    monto: '',
    concepto: 'mensualidad',
  });

  // ======== Eventos ========
  const [eventos, setEventos] = useState([]);

  // Form de creación de evento (con gastos dinámicos)
  const [eventoForm, setEventoForm] = useState({
    nombre: '',
    fecha: '',
    total_proyectado: '',
    total_neto: ''
  });
  const [eventoGastos, setEventoGastos] = useState([]); // [{item:'', costo:''}]
  const [eventoError, setEventoError] = useState(null);

  // ======== Tabs ========
  const [tab, setTab] = useState('cuotas'); // 'cuotas' | 'eventos'

  // ======== Resumen mensual (backend) ========
  const [resumen, setResumen] = useState({
    total_recaudado: 0,
    total_asignado: 0,
    total_restante: 0,
    por_rubro: []
  });

  // ======== Bitácoras (persistentes con backend) ========
  const [bitacoras, setBitacoras] = useState({});

  // ORDEN condicional por monto (Q100 vs Q125+)
  const crearItemsDesdeCatalogo = (cuota) => {
    let items = (rubros || []).map(r => ({
      rubro_id: r.id,
      rubro_nombre: r.nombre,
      checked: false,
      monto: 0
    }));

    const monto = Number(cuota?.monto ?? 0);

    // PRIORIDAD PARA 125+
    if (monto >= 125) {
      const hasProyecto = !!findRubroByName('Proyecto');
      const hasMLogia  = !!findRubroByName('Mantenimiento Logia');
      const prioridad125 = [
        'Mantenimiento (Josias)',
        'Gran Logia',
        'Luz/Agua',
        ...(hasProyecto ? ['Proyecto'] : []),
        ...(hasMLogia  ? ['Mantenimiento Logia'] : []),
      ];
      const peso125 = (nombre) => {
        const i = prioridad125.findIndex(p => p.toLowerCase() === String(nombre).toLowerCase());
        return i === -1 ? 9999 : i;
      };
      items = items.slice().sort((a, b) => peso125(a.rubro_nombre) - peso125(b.rubro_nombre));
    }

    // PRIORIDAD PARA 100 EXACTOS
    if (monto === 100) {
      const prioridad100 = [
        'Gran Logia',
        'Luz/Agua',
        'Mantenimiento (Josias)'
      ];
      const peso100 = (nombre) => {
        const i = prioridad100.findIndex(p => p.toLowerCase() === String(nombre).toLowerCase());
        return i === -1 ? 9999 : i;
      };
      items = items.slice().sort((a, b) => peso100(a.rubro_nombre) - peso100(b.rubro_nombre));
    }

    return items;
  };

  const mergeItemsServerAndCatalog = (itemsServer, cuota) => {
    const catalog = crearItemsDesdeCatalogo(cuota);
    const mapServer = new Map((itemsServer || []).map(it => [String(it.rubro_id), it]));

    const merged = catalog.map(cat => {
      const srv = mapServer.get(String(cat.rubro_id));
      if (!srv) return cat;
      return {
        rubro_id: cat.rubro_id,
        rubro_nombre: cat.rubro_nombre,
        checked: !!srv.checked,
        monto: Number(srv.monto) || 0
      };
    });

    for (const srv of (itemsServer || [])) {
      if (!merged.some(x => String(x.rubro_id) === String(srv.rubro_id))) {
        merged.push({
          rubro_id: srv.rubro_id,
          rubro_nombre: srv.rubro || `Rubro ${srv.rubro_id}`,
          checked: !!srv.checked,
          monto: Number(srv.monto) || 0
        });
      }
    }

    return merged;
  };

  const validarBitacora = (cuota, items) => {
    const suma = items.reduce((a, it) => a + (Number(it.monto) || 0), 0);
    let error = null;
    if (suma > Number(cuota.monto)) {
      error = `El total asignado (Q ${suma.toFixed(2)}) supera el monto de la cuota (Q ${Number(cuota.monto).toFixed(2)}).`;
    }
    return { items, error };
  };

  const asignadoTotal = (cuotaId) => {
    const b = bitacoras[cuotaId];
    if (!b) return 0;
    return b.items.reduce((acc, it) => acc + (Number(it.monto) || 0), 0);
  };

  const onChangeRubro = (cuota, idx, patch) => {
    setBitacoras(prev => {
      const curr = prev[cuota.id];
      if (!curr) return prev;
      const items = curr.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
      const { items: fixed, error } = validarBitacora(cuota, items);
      return { ...prev, [cuota.id]: { ...curr, items: fixed, error, saved: false } };
    });
  };

  const toggleBitacora = async (cuota) => {
    // Toggle inmediato (optimista)
    setBitacoras(prev => {
      const curr = prev[cuota.id];
      if (curr) return { ...prev, [cuota.id]: { ...curr, abierto: !curr.abierto } };
      return {
        ...prev,
        [cuota.id]: { abierto: true, items: crearItemsDesdeCatalogo(cuota), error: null, saved: false, _loading: true }
      };
    });

    // Cargar desde backend sólo si no había estado previo
    try {
      const { data } = await getCuotaBitacora(cuota.id);
      const merged = mergeItemsServerAndCatalog(data?.items || [], cuota);
      setBitacoras(prev => {
        const prevEntry = prev[cuota.id] || {};
        const { items: fixed, error } = validarBitacora(cuota, merged);

        // CLAVE: respetar el estado actual de "abierto"
        const abierto = typeof prevEntry.abierto === 'boolean' ? prevEntry.abierto : true;

        return {
          ...prev,
          [cuota.id]: {
            ...prevEntry,
            abierto,
            items: fixed,
            error,
            saved: !!data?.items?.length,
            _loading: false
          }
        };
      });
      await cargarResumen();
    } catch (e) {
      console.error('No se pudo cargar bitácora', e);
      setBitacoras(prev => {
        const curr = prev[cuota.id] || {};
        return { ...prev, [cuota.id]: { ...curr, _loading: false } };
      });
    }
  };

  const guardarBitacoraServidor = async (cuota) => {
    const curr = bitacoras[cuota.id];
    if (!curr || curr.error) return;

    const normalized = [];
    let descartados = 0;

    for (const it of curr.items) {
      if (!it.checked) continue;
      const rid = resolveRubroId(it);
      if (rid) {
        normalized.push({
          rubro_id: rid,
          monto: Number(it.monto) || 0,
          checked: true
        });
      } else {
        descartados++;
      }
    }

    if (normalized.length === 0) {
      alert('No hay rubros válidos para guardar. Revisa que el catálogo esté cargado y marca al menos un rubro.');
      return;
    }
    if (descartados > 0) {
      console.warn(`Se descartaron ${descartados} rubros sin id válido (p.ej. FALLBACK).`);
    }

    try {
      await upsertCuotaBitacora(cuota.id, normalized);
      setBitacoras(prev => ({ ...prev, [cuota.id]: { ...prev[cuota.id], saved: true } }));
      await cargarResumen();

      // Reconsultar bitácora para limpiar cualquier fallback local
      const { data } = await getCuotaBitacora(cuota.id);
      const merged = mergeItemsServerAndCatalog(data?.items || [], cuota);
      setBitacoras(prev => {
        const { items: fixed, error } = validarBitacora(cuota, merged);
        return { ...prev, [cuota.id]: { ...prev[cuota.id], items: fixed, error, _loading: false } };
      });
    } catch (e) {
      console.error('Error guardando bitácora:', e);
      const msg = e?.response?.data?.message || 'No se pudo guardar la bitácora';
      alert(msg);
    }
  };

  const resetBitacora = async (cuota) => {
    setBitacoras(prev => ({
      ...prev,
      [cuota.id]: { abierto: true, items: crearItemsDesdeCatalogo(cuota), error: null, saved: false }
    }));
  };

  // Rehidratar bitácoras abiertas cuando terminen de cargar rubros
  useEffect(() => {
    if (!rubros || !rubros.length) return;
    setBitacoras(prev => {
      const next = { ...prev };
      for (const [cuotaId, b] of Object.entries(prev)) {
        if (!b || (b.items && b.items.length)) continue;
        const cuota = cuotas.find(x => String(x.id) === String(cuotaId));
        if (cuota) next[cuotaId] = { ...b, items: crearItemsDesdeCatalogo(cuota) };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rubros]);

  // ======== Carga de datos con filtros ========
  const cargarResumen = async () => {
    try {
      const { data } = await getResumenMensual({ anio, mes });

      const rec = toNum(data?.total_recaudado ?? data?.recaudado);
      const asig = toNum(data?.total_asignado ?? data?.asignado);

      // Soporta 'total_restante' o 'restante'; si no viene, lo calculamos.
      const restanteBack = data?.total_restante ?? data?.restante;
      const rest = (restanteBack !== undefined && restanteBack !== null && restanteBack !== '')
        ? toNum(restanteBack)
        : (rec - asig);

      setResumen({
        total_recaudado: rec,
        total_asignado:  asig,
        total_restante:  rest,
        por_rubro: Array.isArray(data?.por_rubro) ? data.por_rubro : []
      });
    } catch (e) {
      console.error('No se pudo cargar resumen mensual', e);
      setResumen({ total_recaudado: 0, total_asignado: 0, total_restante: 0, por_rubro: [] });
    }
  };

  const load = async () => {
    const filtro = { anio, mes };
    const [respC, respE] = await Promise.all([ getCuotas(filtro), getEventos(filtro) ]);
    const c = respC?.data;
    setCuotas(c?.data || c || []);
    const e = respE?.data;
    setEventos(e?.data || e || []);
    await cargarResumen();
  };

  // Carga inicial
  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  // Auto-recarga al cambiar año/mes (debounce) + limpiar bitácoras
  useEffect(() => {
    const t = setTimeout(() => {
      setBitacoras({});
      load();
    }, 150);
    return () => clearTimeout(t);
  }, [anio, mes]);

  // ======== Submits ========
  const submitCuota = async (e) => {
    e.preventDefault();
    if (!cuotaForm.miembro_id || !cuotaForm.fecha || !cuotaForm.monto) return;
    await createCuota({
      ...cuotaForm,
      miembro_id: Number(cuotaForm.miembro_id),
      monto: Number(cuotaForm.monto),
    });
    setCuotaForm({ miembro_id: '', fecha: '', monto: '', concepto: 'mensualidad' });
    await load();
    setTab('cuotas');
  };

  // ======== Crear Evento con gastos dinámicos ========
  const pushGastoForm = () => setEventoGastos((arr) => [...arr, { item: '', costo: '' }]);
  const removeGastoForm = (idx) => setEventoGastos((arr) => arr.filter((_, i) => i !== idx));
  const patchGastoForm = (idx, field, value) =>
    setEventoGastos((arr) => arr.map((g, i) => (i === idx ? { ...g, [field]: value } : g)));

  const sumaGastosForm = eventoGastos.reduce((acc, g) => acc + toNum(g.costo), 0);
  const restanteForm = toNum(eventoForm.total_neto) - sumaGastosForm;

  const submitEvento = async (e) => {
    e.preventDefault();

    // Normaliza gastos: solo filas con ítem o costo > 0
    const gastos_detalle = eventoGastos
      .filter(g => String(g.item || '').trim() !== '' || toNum(g.costo) > 0)
      .map(g => ({ item: String(g.item || '').trim(), costo: toNum(g.costo) }));

    await createEvento({
      nombre: eventoForm.nombre,
      fecha: eventoForm.fecha,
      total_proyectado: toNum(eventoForm.total_proyectado || 0),
      total_neto: toNum(eventoForm.total_neto || 0),
      gastos_detalle
    });

    // Reset
    setEventoForm({ nombre: '', fecha: '', total_proyectado: '', total_neto: '' });
    setEventoGastos([]);
    setEventoError(null);

    await load();
    setTab('eventos');
  };

  // ======== Helpers ========
  const nombreDe = (miembro_id) => {
    const id = Number(miembro_id);
    const m = miembros.find(x => Number(x.id) === id);
    if (!m) return `Miembro ${miembro_id}`;
    return `${m.nombre_completo}${m.grado ? ` (${m.grado})` : ''}`;
  };
  const fmtQ = (n) => `Q ${toNum(n).toFixed(2)}`;

  // Restante UI (seguro)
  const restanteUI = Number.isFinite(Number(resumen.total_restante))
    ? Number(resumen.total_restante)
    : (toNum(resumen.total_recaudado) - toNum(resumen.total_asignado));

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <h2 className="fw-semibold mb-0 me-auto">Finanzas</h2>

        {/* Filtros compactos */}
        <div className="d-flex align-items-center gap-2">
          <input
            className="form-control form-control-sm"
            style={{ width: 90 }}
            type="number"
            min="1900"
            max="2999"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            placeholder="Año"
            aria-label="Año"
            title="Año"
          />
          <select
            className="form-select form-select-sm"
            style={{ width: 110 }}
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            aria-label="Mes"
            title="Mes"
          >
            {MESES.map(mo => (
              <option key={mo.value} value={mo.value}>{mo.label}</option>
            ))}
          </select>
          <button className="btn btn-dark btn-sm" onClick={aplicarFiltros}>Aplicar</button>
          <button className="btn btn-outline-secondary btn-sm" onClick={limpiarFiltros}>Limpiar</button>
        </div>
      </div>

      {/* NAV TABS */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={'nav-link ' + (tab === 'cuotas' ? 'active' : '')}
            onClick={() => setTab('cuotas')}
          >
            Cuotas
          </button>
        </li>
        <li className="nav-item">
          <button
            className={'nav-link ' + (tab === 'eventos' ? 'active' : '')}
            onClick={() => setTab('eventos')}
          >
            Eventos
          </button>
        </li>
      </ul>

      {/* CUOTAS */}
      {tab === 'cuotas' && (
        <>
          {canEdit && (
            <div className="card mb-3">
              <div className="card-header">Nueva cuota</div>
              <div className="card-body">
                <form onSubmit={submitCuota} className="row g-2">
                  <div className="col-12 col-md-6 col-xl-5">
                    <Select
                      isClearable
                      isSearchable
                      isLoading={loadingMiembros}
                      options={miembroOptions}
                      placeholder="Seleccione un miembro"
                      value={
                        cuotaForm.miembro_id
                          ? miembroOptions.find(o => o.value === Number(cuotaForm.miembro_id)) || null
                          : null
                      }
                      onChange={(opt) =>
                        setCuotaForm(f => ({ ...f, miembro_id: opt?.value || '' }))
                      }
                    />
                  </div>

                  <div className="col-6 col-md-3 col-xl-3">
                    <input
                      className="form-control"
                      type="date"
                      value={cuotaForm.fecha}
                      onChange={e => setCuotaForm(f => ({ ...f, fecha: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="col-6 col-md-3 col-xl-2">
                    <input
                      className="form-control"
                      placeholder="Monto"
                      type="number"
                      step="0.01"
                      min="0"
                      value={cuotaForm.monto}
                      onChange={e => setCuotaForm(f => ({ ...f, monto: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-8 col-xl-7">
                    <input
                      className="form-control"
                      placeholder="Concepto"
                      value={cuotaForm.concepto}
                      onChange={e => setCuotaForm(f => ({ ...f, concepto: e.target.value }))}
                    />
                  </div>

                  <div className="col-12 col-md-4 col-xl-5 d-grid">
                    <button className="btn btn-dark">Guardar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <span>Cuotas</span>
              <div className="d-none d-md-flex gap-3 small text-muted">
                <span>Recaudado: <b>{fmtQ(resumen.total_recaudado)}</b></span>
                <span>Asignado: <b>{fmtQ(resumen.total_asignado)}</b></span>
                <span>Restante: <b className={restanteUI >= 0 ? 'text-success' : 'text-danger'}>
                  {fmtQ(restanteUI)}
                </b></span>
              </div>
            </div>

            <ul className="list-group list-group-flush">
              {cuotas.map(c => {
                const bit = bitacoras[c.id];
                const suma = asignadoTotal(c.id);
                const total = Number(c.monto) || 0;
                const pct = total > 0 ? Math.min(100, (suma / total) * 100) : 0;

                return (
                  <li key={c.id} className="list-group-item">
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <div className="me-auto">
                        #{c.id} — {nombreDe(c.miembro_id)} — {c.fecha} — <b>{fmtQ(c.monto)}</b> — {c.concepto}
                        {' '}
                        {Number(c.monto) === 100 && (
                          <span className="badge bg-info ms-1">Q100</span>
                        )}
                        {Number(c.monto) >= 125 && (
                          <span className="badge bg-warning text-dark ms-1">Q125+</span>
                        )}
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          type="button"
                          onClick={() => toggleBitacora(c)}
                          aria-expanded={!!bit?.abierto}
                          aria-controls={`bitacora-${c.id}`}
                        >
                          Bitácora
                        </button>
                        {bit && !bit._loading && (
                          <button
                            className="btn btn-sm btn-outline-dark"
                            type="button"
                            onClick={() => {
                              const activos = bit.items.filter(it => it.checked);
                              if (activos.length === 0) return;
                              const n = activos.length;
                              const base = Math.floor((total / n) * 100) / 100;
                              let resto = +(total - base * (n - 1)).toFixed(2);
                              let k = 0;
                              const items = bit.items.map(it => {
                                if (!it.checked) return { ...it, monto: 0 };
                                const val = k < n - 1 ? base : resto;
                                k++;
                                return { ...it, monto: val };
                              });
                              const { items: fixed, error } = validarBitacora(c, items);
                              setBitacoras(prev => ({ ...prev, [c.id]: { ...bit, items: fixed, error, saved: false } }));
                            }}
                          >
                            Autodistribuir
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progreso */}
                    {bit && (
                      <div className="mt-2">
                        <div className="progress" style={{ height: 6 }}>
                          <div
                            className="progress-bar"
                            role="progressbar"
                            style={{ width: `${pct}%` }}
                            aria-valuenow={pct}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          />
                        </div>
                        <div className="small text-muted mt-1">
                          Asignado: <b>{fmtQ(suma)}</b> / {fmtQ(total)} ({pct.toFixed(0)}%)
                        </div>
                      </div>
                    )}

                    {/* Panel bitácora */}
                    {bit?.abierto && (
                      <div id={`bitacora-${c.id}`} className="mt-3 border rounded p-2">
                        {bit._loading ? (
                          <div className="text-muted small">Cargando bitácora…</div>
                        ) : (
                          <>
                            <div className="table-responsive">
                              <table className="table table-sm align-middle mb-2">
                                <thead>
                                  <tr>
                                    <th style={{ width: 48 }}></th>
                                    <th>Rubro</th>
                                    <th style={{ width: 160 }}>Monto</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(!bit.items || bit.items.length === 0) && (
                                    <tr>
                                      <td colSpan={3} className="text-muted small">
                                        {loadingRubros ? 'Cargando rubros…' : 'Sin rubros configurados.'}
                                      </td>
                                    </tr>
                                  )}
                                  {bit.items?.map((it, idx) => (
                                    <tr key={String(it.rubro_id)}>
                                      <td>
                                        <input
                                          type="checkbox"
                                          className="form-check-input"
                                          checked={!!it.checked}
                                          onChange={(e) => onChangeRubro(c, idx, { checked: e.target.checked })}
                                        />
                                      </td>
                                      <td>{it.rubro_nombre || `Rubro ${it.rubro_id}`}</td>
                                      <td>
                                        <input
                                          className="form-control form-control-sm"
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={it.monto}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            onChangeRubro(c, idx, { monto: val === '' ? 0 : Number(val) });
                                          }}
                                          disabled={!it.checked}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {bit.error && <div className="text-danger small mb-2">{bit.error}</div>}

                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-primary"
                                type="button"
                                disabled={!!bit.error}
                                onClick={() => guardarBitacoraServidor(c)}
                              >
                                Guardar bitácora
                              </button>
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                type="button"
                                onClick={() => resetBitacora(c)}
                              >
                                Reset
                              </button>
                            </div>
                            {bit.saved && <div className="text-success small mt-2">¡Bitácora guardada!</div>}
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
              {cuotas.length === 0 && (
                <li className="list-group-item text-muted">Sin registros</li>
              )}
            </ul>

            {/* ====== ACUMULADOS GLOBALES (backend) ====== */}
            <div className="card-footer">
              <div className="row g-2">
                <div className="col-12 col-md-4">
                  <div className="border rounded p-2">
                    <div className="small text-secondary">Total recaudado</div>
                    <div className="fs-5 fw-semibold">{fmtQ(resumen.total_recaudado)}</div>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="border rounded p-2">
                    <div className="small text-secondary">Total asignado</div>
                    <div className="fs-5 fw-semibold">{fmtQ(resumen.total_asignado)}</div>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="border rounded p-2">
                    <div className="small text-secondary">Restante</div>
                    <div className={'fs-5 fw-semibold ' + (restanteUI >= 0 ? 'text-success' : 'text-danger')}>
                      {fmtQ(restanteUI)}
                    </div>
                  </div>
                </div>

                {/* Totales por rubro (backend) */}
                <div className="col-12">
                  <div className="border rounded p-2">
                    <div className="small text-secondary mb-2">Total por rubro</div>
                    <div className="row g-2">
                      {(!resumen.por_rubro || resumen.por_rubro.length === 0) && (
                        <div className="col-12 text-muted">Sin asignaciones</div>
                      )}
                      {(resumen.por_rubro || []).map((r) => (
                        <div key={String(r.rubro_id)} className="col-12 col-md-6 col-lg-3">
                          <div className="d-flex justify-content-between border rounded px-2 py-1">
                            <span>{r.rubro || `Rubro ${r.rubro_id}`}</span>
                            <b>{fmtQ(r.total_asignado)}</b>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 small text-muted">
                      * Totales calculados por el backend para {MESES.find(mo => mo.value === mes)?.label}/{anio}.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* ====== /ACUMULADOS GLOBALES ====== */}
          </div>
        </>
      )}

      {/* EVENTOS */}
      {tab === 'eventos' && (
        <>
          {canEdit && (
            <div className="card mb-3">
              <div className="card-header">Nuevo evento</div>
              <div className="card-body">
                <form onSubmit={submitEvento} className="row g-2">
                  <div className="col-12 col-md-6">
                    <input
                      className="form-control"
                      placeholder="Nombre"
                      value={eventoForm.nombre}
                      onChange={e => setEventoForm(f => ({ ...f, nombre: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-3">
                    <input
                      className="form-control"
                      type="date"
                      value={eventoForm.fecha}
                      onChange={e => setEventoForm(f => ({ ...f, fecha: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="col-6 col-md-1">
                    <input
                      className="form-control"
                      placeholder="Proj."
                      title="Total proyectado"
                      type="number"
                      step="0.01"
                      min="0"
                      value={eventoForm.total_proyectado}
                      onChange={e => setEventoForm(f => ({ ...f, total_proyectado: e.target.value }))}
                    />
                  </div>
                  <div className="col-6 col-md-2">
                    <input
                      className="form-control"
                      placeholder="Total Neto"
                      type="number"
                      step="0.01"
                      min="0"
                      value={eventoForm.total_neto}
                      onChange={e => setEventoForm(f => ({ ...f, total_neto: e.target.value }))}
                    />
                  </div>

                  {/* GASTOS DINÁMICOS */}
                  <div className="col-12 mt-2">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <b>Gastos</b>
                      <button className="btn btn-sm btn-outline-success" type="button" onClick={pushGastoForm}>
                        + Agregar gasto
                      </button>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle">
                        <thead>
                          <tr>
                            <th>Ítem</th>
                            <th style={{ width: 160 }}>Costo</th>
                            <th style={{ width: 60 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {eventoGastos.length === 0 && (
                            <tr>
                              <td colSpan={3} className="text-muted small">Sin gastos</td>
                            </tr>
                          )}
                          {eventoGastos.map((g, idx) => (
                            <tr key={idx}>
                              <td>
                                <input
                                  className="form-control form-control-sm"
                                  placeholder="Descripción"
                                  value={g.item}
                                  onChange={(ev) => patchGastoForm(idx, 'item', ev.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  className="form-control form-control-sm"
                                  placeholder="0.00"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={g.costo}
                                  onChange={(ev) => patchGastoForm(idx, 'costo', ev.target.value)}
                                />
                              </td>
                              <td className="text-end">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeGastoForm(idx)}
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-2 d-flex flex-wrap gap-3 small">
                      <span>Σ Gastos: <b>{fmtQ(sumaGastosForm)}</b></span>
                      <span>Restante: <b className={restanteForm >= 0 ? 'text-success' : 'text-danger'}>
                        {fmtQ(restanteForm)}
                      </b></span>
                    </div>
                  </div>

                  {eventoError && (
                    <div className="col-12 text-danger small mt-1">{eventoError}</div>
                  )}
                  <div className="col-12">
                    <button className="btn btn-dark w-100">Crear evento</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">Eventos</div>
            <ul className="list-group list-group-flush">
              {eventos.map(e => {
                // Acepta arreglo directo o string JSON
                const gastos = Array.isArray(e.gastos_detalle) ? e.gastos_detalle
                  : (typeof e.gastos_detalle === 'string' && e.gastos_detalle.trim()
                        ? (() => { try { return JSON.parse(e.gastos_detalle); } catch { return []; } })()
                        : []);
                const totalGastos = gastos.reduce((acc, g) => acc + toNum(g.costo), 0);
                const restante = toNum(e.total_neto) - totalGastos;

                return (
                  <li key={e.id} className="list-group-item">
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <div className="me-auto">
                        <b>{e.nombre}</b> — {e.fecha} — Neto: <b>{fmtQ(e.total_neto)}</b> — Gastos:{' '}
                        <b>{fmtQ(totalGastos)}</b> — Restante:{' '}
                        <span className={restante >= 0 ? 'text-success' : 'text-danger'}>
                          {fmtQ(restante)}
                        </span>
                      </div>
                    </div>

                    {/* Vista de gastos */}
                    {gastos.length > 0 && (
                      <div className="mt-2 table-responsive">
                        <table className="table table-sm align-middle">
                          <thead>
                            <tr>
                              <th>Ítem</th>
                              <th style={{ width: 160 }}>Costo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gastos.map((g, i) => (
                              <tr key={i}>
                                <td>{g.item}</td>
                                <td>{fmtQ(g.costo)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </li>
                );
              })}
              {eventos.length === 0 && (
                <li className="list-group-item text-muted">Sin registros</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
