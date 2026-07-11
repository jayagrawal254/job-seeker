import api from './client';

export const mailCompanyActive = (id, payload) =>
  api.post(`/mail/company/${id}/active`, payload).then(r => r.data);
export const mailRecruiters = payload => api.post('/mail/recruiters', payload).then(r => r.data);
export const mailCompaniesTopActive = payload =>
  api.post('/mail/companies/top-active', payload).then(r => r.data);
export const getMailLogsGrouped = () => api.get('/mail/logs/grouped').then(r => r.data);
export const getMailStats = () => api.get('/mail/stats').then(r => r.data);
export const getMailLogs = params => api.get('/mail/logs', { params }).then(r => r.data);
export const sendTestMail = payload => api.post('/mail/test', payload).then(r => r.data);
export const getTemplates = () => api.get('/templates').then(r => r.data);
