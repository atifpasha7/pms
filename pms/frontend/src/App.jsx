// src/App.jsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppLayout from './components/Layout/AppLayout.jsx';
import { PageLoader } from './components/common/index.jsx';

const Login         = lazy(() => import('./pages/Login.jsx'));
const Register      = lazy(() => import('./pages/Register.jsx'));
const Dashboard     = lazy(() => import('./pages/Dashboard.jsx'));
const Projects      = lazy(() => import('./pages/Projects.jsx'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail.jsx'));
const Tasks         = lazy(() => import('./pages/Tasks.jsx'));
const MyTasks       = lazy(() => import('./pages/MyTasks.jsx'));
const Settings      = lazy(() => import('./pages/Settings.jsx'));

const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

const App = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index                       element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"           element={<Dashboard />} />
        <Route path="/projects"            element={<Projects />} />
        <Route path="/projects/:id"        element={<ProjectDetail />} />
        <Route path="/projects/:id/kanban" element={<ProjectDetail />} />
        <Route path="/tasks"               element={<Tasks />} />
        <Route path="/my-tasks"            element={<MyTasks />} />
        <Route path="/settings"            element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);

export default App;
