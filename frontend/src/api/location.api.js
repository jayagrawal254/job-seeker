import api from './client';

export const getLocations = () => api.get('/locations').then(r => r.data);
