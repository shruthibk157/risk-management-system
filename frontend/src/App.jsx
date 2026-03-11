import React from 'react';
import './styles/enterprise-theme.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RiskList from './pages/RiskList';
import RiskForm from './pages/RiskForm';
import UserManagement from './pages/UserManagement';
import DepartmentManagement from './pages/DepartmentManagement';

import AskMe from './pages/AskMe';
import KnowledgeBase from './pages/KnowledgeBase';
import AdminDashboard from './pages/AdminDashboard';
import PerformanceMonitoring from './pages/PerformanceMonitoring';
import Layout from './components/Layout';

const ProtectedRoute = ({ children, showBackButton = false, backButtonText = 'Back to Dashboard', allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#6b7280' }}>Loading...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Role check (Robust case-insensitive check)
  if (allowedRoles.length > 0) {
    const userRole = user.role?.toLowerCase();
    const isAllowed = allowedRoles.some(role => role.toLowerCase() === userRole);

    if (!isAllowed) {
      console.warn(`Access denied for role: ${user.role}. Required one of: ${allowedRoles.join(', ')}`);
      return <Navigate to="/dashboard" />;
    }
  }

  return (
    <Layout showBackButton={showBackButton} backButtonText={backButtonText}>
      {children}
    </Layout>
  );
};

const OPERATIONAL_ROLES = ['admin', 'department_head', 'risk_owner', 'user', 'staff', 'manager', 'editor', 'department_user'];

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          {user?.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Dashboard />}
        </ProtectedRoute>
      } />

      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="/risks" element={
        <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
          <RiskList key={Date.now()} />
        </ProtectedRoute>
      } />

      <Route path="/risks/new" element={
        <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
          <RiskForm />
        </ProtectedRoute>
      } />

      <Route path="/add-risk" element={<ProtectedRoute allowedRoles={OPERATIONAL_ROLES}><Navigate to="/risks/new" replace /></ProtectedRoute>} />

      <Route path="/risks/:id" element={
        <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
          <RiskForm />
        </ProtectedRoute>
      } />

      <Route path="/risks/:id/edit" element={
        <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
          <RiskForm />
        </ProtectedRoute>
      } />

      <Route path="/risks/:id/view" element={
        <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
          <RiskForm />
        </ProtectedRoute>
      } />

      <Route path="/admin/users" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <UserManagement />
        </ProtectedRoute>
      } />


      <Route path="/admin/departments" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DepartmentManagement />
        </ProtectedRoute>
      } />


      <Route path="/ask-me" element={
        <ProtectedRoute>
          <AskMe />
        </ProtectedRoute>
      } />

      <Route path="/monitoring" element={
        <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
          <PerformanceMonitoring />
        </ProtectedRoute>
      } />
      <Route path="/knowledge" element={
        <ProtectedRoute>
          <KnowledgeBase />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
