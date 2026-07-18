import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { LocationProvider } from './context/LocationContext.jsx';
import CompaniesPage from './pages/CompaniesPage/CompaniesPage.jsx';
import CompanyPage from './pages/CompanyPage/CompanyPage.jsx';
import MailLogsPage from './pages/MailLogsPage/MailLogsPage.jsx';
import 'antd/dist/reset.css';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LocationProvider>
        <HashRouter>
          <Routes>
            <Route element={<App />}>
              <Route index element={<CompaniesPage />} />
              <Route path="company/:companyId" element={<CompanyPage />} />
              <Route path="mails" element={<MailLogsPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </LocationProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
