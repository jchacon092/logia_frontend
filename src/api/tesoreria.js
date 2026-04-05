import api from './http';

// ── Pagos (ingresos) ──────────────────────────────────────────────────────────
export const getPagos = (params = {}) =>
  api.get('/tesoreria/pagos', { params });

export const createPago = (payload) =>
  api.post('/tesoreria/pagos', payload);

export const getRecibo = (pagoId) =>
  api.get(`/tesoreria/pagos/${pagoId}/recibo`);

// ── Egresos ───────────────────────────────────────────────────────────────────
export const getEgresos = (params = {}) =>
  api.get('/tesoreria/egresos', { params });

export const createEgreso = (payload) =>
  api.post('/tesoreria/egresos', payload);

// ── Categorías de egreso ──────────────────────────────────────────────────────
export const getCategoriasEgreso = () =>
  api.get('/tesoreria/categorias-egreso');

export const createCategoriaEgreso = (payload) =>
  api.post('/tesoreria/categorias-egreso', payload);

// ── Resumen / Balance ─────────────────────────────────────────────────────────
export const getResumenTesoreria = (params) =>
  api.get('/tesoreria/resumen', { params });
