import { useEffect, useState } from 'react';
import * as usersApi from '../../api/users';
import * as locationsApi from '../../api/locations';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { Location, UserSummary } from '../../types';

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  cashier: 'Kassierer',
};

export function AdminUsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    usersApi
      .listUsers()
      .then(({ users }) => setUsers(users))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Fehler beim Laden.'));
  }

  useEffect(load, []);
  useEffect(() => {
    locationsApi.listLocations().then(({ locations }) => setLocations(locations));
  }, []);

  async function toggleActive(u: UserSummary) {
    setError(null);
    try {
      await usersApi.setUserActive(u.id, !u.active);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler beim Speichern.');
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Benutzer</h2>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showCreate ? 'Schließen' : 'Neuer Benutzer'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {showCreate && (
        <CreateUserForm
          locations={locations}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Benutzername</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Rolle</th>
              <th className="px-4 py-3">Standort</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id;
              return (
                <tr key={u.id} className={u.active ? '' : 'bg-slate-50 opacity-60'}>
                  <td className="px-4 py-2">{u.username}</td>
                  <td className="px-4 py-2">{u.full_name}</td>
                  <td className="px-4 py-2">{roleLabels[u.role] ?? u.role}</td>
                  <td className="px-4 py-2 text-slate-500">{u.location_name ?? '—'}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleActive(u)}
                      disabled={isSelf}
                      title={isSelf ? 'Du kannst dich nicht selbst deaktivieren.' : undefined}
                      className={`rounded-full px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                        u.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {u.active ? 'Aktiv' : 'Inaktiv'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">Keine Benutzer.</p>
        )}
      </div>
    </div>
  );
}

function CreateUserForm({
  locations,
  onCreated,
}: {
  locations: Location[];
  onCreated: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'cashier' | 'admin'>('cashier');
  const [locationId, setLocationId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const locationRequired = role === 'cashier';
  const locationMissing = locationRequired && !locationId;

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await usersApi.createUser({
        username: username.trim(),
        password,
        fullName: fullName.trim(),
        role,
        locationId: locationId ? Number(locationId) : null,
      });
      setUsername('');
      setPassword('');
      setFullName('');
      setRole('cashier');
      setLocationId('');
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler beim Anlegen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-3 text-sm font-medium text-slate-500">Neuer Benutzer</h3>
      {error && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <input
          placeholder="Benutzername"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Voller Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'cashier' | 'admin')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="cashier">Kassierer</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">{locationRequired ? 'Standort wählen…' : 'Kein Standort'}</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>
      {locationRequired && (
        <p className="mt-2 text-xs text-slate-400">Kassierer benötigen einen Standort.</p>
      )}
      <button
        onClick={handleSubmit}
        disabled={submitting || !username.trim() || !password || !fullName.trim() || locationMissing}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Wird angelegt…' : 'Anlegen'}
      </button>
    </div>
  );
}
