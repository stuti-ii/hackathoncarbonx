import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';

// Temporary Dashboard stub
const DummyDashboard = () => (
  <div className="dashboard-fallback">
    <h1>CarbonX Dashboard</h1>
    <p>Authentication successful. Moving forward...</p>
  </div>
);

const AppRoutes = () => {
  return (
    <Routes>
      {/* Root path: auto-redirects to /login if you aren't logged in yet */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Explicit Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<DummyDashboard />} />

      {/* Wildcard Fallback: If any URL is mismatched, instantly safely redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
