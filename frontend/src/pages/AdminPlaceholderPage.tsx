import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function AdminPlaceholderPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 text-center">
      <h1 className="text-2xl font-semibold text-slate-800">Admin-Dashboard</h1>
      <p className="max-w-sm text-slate-500">
        Angemeldet als {user?.fullName}. Produktverwaltung, Berichte und Benutzer-Management
        folgen in Phase 2.
      </p>
      <button
        onClick={() => {
          logout();
          navigate('/login');
        }}
        className="text-sm text-blue-600 hover:underline"
      >
        Abmelden
      </button>
    </div>
  );
}
