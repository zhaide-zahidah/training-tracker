import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Programs from './pages/Programs';
import Schedules from './pages/Schedules';
import Reports from './pages/Reports';
import DailyMonitoring from './pages/DailyMonitoring';
import ProgressSummary from './pages/ProgressSummary';

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login"      element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/"           element={<Protected><Dashboard /></Protected>} />
      <Route path="/employees"  element={<Protected><Employees /></Protected>} />
      <Route path="/programs"   element={<Protected><Programs /></Protected>} />
      <Route path="/schedules"  element={<Protected><Schedules /></Protected>} />
      <Route path="/reports"    element={<Protected><Reports /></Protected>} />
      <Route path="/monitoring" element={<Protected><DailyMonitoring /></Protected>} />
      <Route path="/progress"   element={<Protected><ProgressSummary /></Protected>} />
      <Route path="*"           element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{
          style: { fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', borderRadius: '12px' }
        }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
