import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { POSPage } from './pages/POSPage';
import { ClosingPage } from './pages/ClosingPage';
import { AdminPlaceholderPage } from './pages/AdminPlaceholderPage';
import { ProtectedRoute } from './components/ProtectedRoute';
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
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPlaceholderPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
