import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import Dashboard from '../pages/Dashboard';
import Gamification from '../pages/Gamification';
import Trading from '../pages/Trading';
import ProtectedRoute from './ProtectedRoute';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Root path: auto-redirects to /dashboard (which redirects to /login if unauthenticated) */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Explicit Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Protected Dashboard Route */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected Gamification Route */}
      <Route
        path="/gamification"
        element={
          <ProtectedRoute>
            <Gamification />
          </ProtectedRoute>
        }
      />

      {/* Protected Trading Route */}
      <Route
        path="/trading"
        element={
          <ProtectedRoute>
            <Trading />
          </ProtectedRoute>
        }
      />

      {/* Wildcard Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;

