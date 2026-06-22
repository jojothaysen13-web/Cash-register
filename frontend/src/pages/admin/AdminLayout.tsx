import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { BrandMark } from '../../components/BrandMark';

const navItems = [
  { to: '/admin', label: 'Übersicht', end: true },
  { to: '/admin/products', label: 'Produkte', end: false },
  { to: '/admin/users', label: 'Benutzer', end: false },
  { to: '/admin/customers', label: 'Kunden', end: false },
  { to: '/admin/reports', label: 'Berichte', end: false },
];

export function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="flex w-56 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <BrandMark size="sm" tag="Admin" />
          <p className="mt-1 text-sm text-slate-500">{user?.fullName}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <Link
            to="/pos"
            className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Zur Kasse
          </Link>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
          >
            Abmelden
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
