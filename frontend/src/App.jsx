import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './layouts/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import CustomerBooking from './pages/CustomerBooking';
import Customers from './pages/Customers';
import Staff from './pages/Staff';
import Inventory from './pages/Inventory';
import Accounts from './pages/Accounts';
import Reports from './pages/Reports';
import LiveTracking from './pages/LiveTracking';
import MyBookings  from './pages/MyBookings';

function Spinner() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800 }}>
        ✦ SparkWash
      </div>
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/booking" element={<CustomerBooking />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* All roles */}
        <Route path="dashboard" element={<Dashboard />} />

        {/* Admin + Staff + Accountant (Accountant = view-only enforced in component) */}
        <Route path="bookings" element={
          <ProtectedRoute roles={['admin','staff','accountant']}>
            <Bookings />
          </ProtectedRoute>
        } />

        {/* Admin + Accountant */}
        <Route path="customers" element={
          <ProtectedRoute roles={['admin','accountant']}>
            <Customers />
          </ProtectedRoute>
        } />

        {/* Admin only */}
        <Route path="staff" element={
          <ProtectedRoute roles={['admin']}>
            <Staff />
          </ProtectedRoute>
        } />

        {/* Admin + Staff */}
        <Route path="inventory" element={
          <ProtectedRoute roles={['admin','staff']}>
            <Inventory />
          </ProtectedRoute>
        } />

        {/* Admin + Accountant */}
        <Route path="accounts" element={
          <ProtectedRoute roles={['admin','accountant']}>
            <Accounts />
          </ProtectedRoute>
        } />

        {/* Admin + Accountant */}
        <Route path="reports" element={
          <ProtectedRoute roles={['admin','accountant']}>
            <Reports />
          </ProtectedRoute>
        } />

        {/* Customer: own booking history */}
        <Route path="my-bookings" element={
          <ProtectedRoute roles={['customer']}>
            <MyBookings />
          </ProtectedRoute>
        } />

        {/* Admin (all staff) + Staff (own location share) + Customer (track their booking) */}
        <Route path="tracking" element={
          <ProtectedRoute roles={['admin','staff','customer']}>
            <LiveTracking />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
