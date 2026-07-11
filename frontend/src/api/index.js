// Re-export everything from domain modules for convenient imports.
// This lets components do: import { getCompanies, mailRecruiters } from '../api';
export { getCompanies, searchCompanies, getCompany, getCompanyRecruiters } from './company.api';
export { getLocations } from './location.api';
export { mailCompanyActive, mailRecruiters, mailCompaniesTopActive, getMailLogsGrouped, getMailStats, getMailLogs, sendTestMail, getTemplates } from './mail.api';
export { getResumes, uploadResume } from './resume.api';

export { default as api } from './client';
