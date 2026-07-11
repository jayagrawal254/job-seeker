import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import CompaniesPage from './pages/CompaniesPage.jsx';
import CompanyPage from './pages/CompanyPage.jsx';
import MailLogsPage from './pages/MailLogsPage.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<CompaniesPage />} />
          <Route path="company/:companyId" element={<CompanyPage />} />
          <Route path="mails" element={<MailLogsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
