import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { LocationProvider } from './context/LocationContext.jsx';
import CompaniesPage from './pages/CompaniesPage';
import CompanyPage from './pages/CompanyPage';
import MailLogsPage from './pages/MailLogsPage';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LocationProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<App />}>
              <Route index element={<CompaniesPage />} />
              <Route path="company/:companyId" element={<CompanyPage />} />
              <Route path="mails" element={<MailLogsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LocationProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
