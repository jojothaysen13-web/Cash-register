import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { POSPage } from './pages/POSPage';
import { ClosingPage } from './pages/ClosingPage';
import { ReturnPage } from './pages/ReturnPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import { AdminLocationsPage } from './pages/admin/AdminLocationsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { useAuthStore } from './store/authStore';

function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/pos'} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/pos"
          element={
            <ProtectedRoute>
              <POSPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/closing"
          element={
            <ProtectedRoute>
              <ClosingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/returns"
          element={
            <ProtectedRoute>
              <ReturnPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="locations" element={<AdminLocationsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
