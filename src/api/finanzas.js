// src/api/finanzas.js
import api from './http';

export const getCuotas  = ({ anio, mes } = {}) =>
  api.get('/finanzas/cuotas',  { params: { anio, mes } });

export const createCuota = (payload) =>
  api.post('/finanzas/cuotas', payload);

export const getEventos = ({ anio, mes } = {}) =>
  api.get('/finanzas/eventos', { params: { anio, mes } });

export const createEvento = (payload) =>
  api.post('/finanzas/eventos', payload);

// NUEVOS
export const getRubros = () =>
  api.get('/finanzas/rubros');

export const getCuotaBitacora = (cuotaId) =>
  api.get(`/finanzas/cuotas/${cuotaId}/bitacora`);

export const upsertCuotaBitacora = (cuotaId, items) =>
  api.put(`/finanzas/cuotas/${cuotaId}/bitacora`, { items });

export const getResumenMensual = ({ anio, mes }) =>
  api.get('/finanzas/resumen', { params: { anio, mes } });
