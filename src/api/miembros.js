import api from './http';

export const getMiembros = (q) =>
  api.get('/miembros', { params: q ? { q } : {} });