import { useEffect, useState } from 'react';
import * as locationsApi from '../../api/locations';
import { ApiError } from '../../api/client';
import type { Location } from '../../types';

export function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    locationsApi
      .listLocations()
      .then(({ locations }) => setLocations(locations))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Fehler beim Laden.'));
  }

  useEffect(load, []);

  async function toggleActive(loc: Location) {
    setError(null);
    try {
      await locationsApi.setLocationActive(loc.id, !loc.active);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler beim Speichern.');
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Standorte</h2>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showCreate ? 'Schließen' : 'Neuer Standort'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {showCreate && (
        <CreateLocationForm
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
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {locations.map((loc) => (
              <tr key={loc.id} className={loc.active ? '' : 'bg-slate-50 opacity-60'}>
                <td className="px-4 py-2">{loc.name}</td>
                <td className="px-4 py-2 font-mono text-xs">{loc.code}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleActive(loc)}
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      loc.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {loc.active ? 'Aktiv' : 'Inaktiv'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {locations.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">Keine Standorte.</p>
        )}
      </div>
    </div>
  );
}

function CreateLocationForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await locationsApi.createLocation(name.trim(), code.trim());
      setName('');
      setCode('');
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler beim Anlegen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-3 text-sm font-medium text-slate-500">Neuer Standort</h3>
      {error && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Name (z. B. Filiale Mitte)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Code (z. B. FIL-1)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting || !name.trim() || !code.trim()}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Wird angelegt…' : 'Anlegen'}
      </button>
    </div>
  );
}
