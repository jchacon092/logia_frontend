import api from './http';

export const login = (payload) => api.post('/auth/login', payload, { headers: { Accept: 'application/json' } });
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');
