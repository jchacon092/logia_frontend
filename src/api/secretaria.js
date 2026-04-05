import api from './http';
export const getTrazados = (params) => api.get('/secretaria/trazados', { params });
export const createTrazado = (payload) => api.post('/secretaria/trazados', payload);
export const getAsistencias = (params) => api.get('/secretaria/asistencias', { params });
export const createAsistencia = (payload) => api.post('/secretaria/asistencias', payload);
export const getEnviosGL = (params) => api.get('/secretaria/envios-gran-logia', { params });
export const createEnvioGL = (payload) => api.post('/secretaria/envios-gran-logia', payload);
