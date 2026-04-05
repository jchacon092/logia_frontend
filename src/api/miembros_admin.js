import api from './http';

// ── Miembros ──────────────────────────────────────────────────────────────────

export const getMiembros = (params = {}) =>
  api.get('/miembros', { params });

export const getMiembro = (id) =>
  api.get(`/miembros/${id}`);

export const createMiembro = (formData) =>
  api.post('/miembros', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateMiembro = (id, formData) =>
  api.post(`/miembros/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteMiembro = (id, payload) =>
  api.delete(`/miembros/${id}`, { data: payload });

export const restaurarMiembro = (id) =>
  api.post(`/miembros/${id}/restaurar`);

// ── Usuarios ──────────────────────────────────────────────────────────────────

export const getUsuarios = () =>
  api.get('/miembros/usuarios');

export const getRoles = () =>
  api.get('/miembros/roles');

export const crearUsuario = (miembroId, payload) =>
  api.post(`/miembros/${miembroId}/crear-usuario`, payload);

export const cambiarRol = (userId, rol) =>
  api.put(`/miembros/usuarios/${userId}/rol`, { rol });
