import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import StaffLogin from './pages/StaffLogin.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Assistant from './pages/Assistant.jsx';
import Assessment from './pages/Assessment.jsx';
import Journal from './pages/Journal.jsx';
import SelfCare from './pages/SelfCare.jsx';
import Progress from './pages/Progress.jsx';
import Counseling from './pages/Counseling.jsx';
import Notifications from './pages/Notifications.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';
import GetHelp from './pages/GetHelp.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';

function Protected({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/app" replace />;
  return children;
}

function useSameTabGuard() {
  const navigate = useNavigate();
  useEffect(() => {
    const isInternal = (a) => {
      const href = a.getAttribute('href') || '';
      return href.startsWith('/') && !href.startsWith('//');
    };
    const toHref = (a) => a.getAttribute('href');
    const goSameTab = (e, a) => {
      e.preventDefault();
      navigate(toHref(a));
    };
    const onMouseDown = (e) => {
      if (e.button !== 1) return;
      const a = e.target.closest('a[href]');
      if (a && isInternal(a)) e.preventDefault();
    };
    const onAuxClick = (e) => {
      if (e.button !== 1) return;
      const a = e.target.closest('a[href]');
      if (a && isInternal(a)) goSameTab(e, a);
    };
    const onClick = (e) => {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) return;
      const a = e.target.closest('a[href]');
      if (a && isInternal(a)) goSameTab(e, a);
    };
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('auxclick', onAuxClick, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('auxclick', onAuxClick, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [navigate]);
}

export default function App() {
  useSameTabGuard();
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/staff-login" element={<StaffLogin />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/get-help" element={<GetHelp />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      <Route
        path="/app"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="wellness" element={<Assessment />} />
        <Route path="journal" element={<Journal />} />
        <Route path="selfcare" element={<SelfCare />} />
        <Route path="progress" element={<Progress />} />
        <Route path="counseling" element={<Counseling />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}