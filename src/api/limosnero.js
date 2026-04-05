import api from './http';
export const getColectas = (params) => api.get('/limosnero/colectas', { params });
export const createColecta = (payload) => api.post('/limosnero/colectas', payload);
export const getDonaciones = (params) => api.get('/hospitalario/donaciones', { params });
export const createDonacion = (payload) => api.post('/hospitalario/donaciones', payload);
