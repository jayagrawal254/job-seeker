import api from './client';

export const getCompanies = params => api.get('/companies', { params }).then(r => r.data);
export const searchCompanies = term => api.get(`/companies/search/${encodeURIComponent(term)}`).then(r => r.data);
export const getCompany = id => api.get(`/companies/${id}`).then(r => r.data);
export const getCompanyRecruiters = (id, params) =>
  api.get(`/companies/${id}/recruiters`, { params }).then(r => r.data);
