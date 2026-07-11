import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getLocations = () => api.get('/locations').then(r => r.data);
export const getCompanies = params => api.get('/companies', { params }).then(r => r.data);
export const searchCompanies = term => api.get(`/companies/search/${encodeURIComponent(term)}`).then(r => r.data);
export const getCompany = id => api.get(`/companies/${id}`).then(r => r.data);
export const getCompanyRecruiters = (id, params) =>
  api.get(`/companies/${id}/recruiters`, { params }).then(r => r.data);
export const mailCompanyActive = (id, payload) =>
  api.post(`/mail/company/${id}/active`, payload).then(r => r.data);
export const mailRecruiters = payload => api.post('/mail/recruiters', payload).then(r => r.data);
export const mailCompaniesTopActive = payload =>
  api.post('/mail/companies/top-active', payload).then(r => r.data);
export const getMailLogsGrouped = () => api.get('/mail/logs/grouped').then(r => r.data);
export const getMailStats = () => api.get('/mail/stats').then(r => r.data);
export const getTemplates = () => api.get('/templates').then(r => r.data);
export const getMailLogs = params => api.get('/mail/logs', { params }).then(r => r.data);
export const sendTestMail = payload => api.post('/mail/test', payload).then(r => r.data);
export const getResumes = () => api.get('/resumes').then(r => r.data);
export const uploadResume = file => {
  const fd = new FormData();
  fd.append('resume', file);
  return api.post('/resumes', fd).then(r => r.data);
};

export default api;
