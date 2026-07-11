import api from './client';

export const getResumes = () => api.get('/resumes').then(r => r.data);
export const uploadResume = file => {
  const fd = new FormData();
  fd.append('resume', file);
  return api.post('/resumes', fd).then(r => r.data);
};
