import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './app/AppLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { DayPage } from './features/day/DayPage';
import { MonthPage } from './features/month/MonthPage';
import { ClientsPage } from './features/clients/ClientsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { QuickAddPage } from './features/quick-add/QuickAddPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="day">
          <Route index element={<DayPage />} />
          <Route path=":date" element={<DayPage />} />
        </Route>
        <Route path="month">
          <Route index element={<MonthPage />} />
          <Route path=":month" element={<MonthPage />} />
        </Route>
        <Route path="clients" element={<ClientsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/quick-add" element={<QuickAddPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
