import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as reportsApi from '../../api/reports';
import { ApiError } from '../../api/client';
import { formatCents } from '../../utils/money';
import type { ReportSummary } from '../../types';

const methodLabels: Record<string, string> = {
  cash: 'Bargeld',
  card: 'Karte',
  voucher: 'Gutschein',
};

export function AdminDashboardPage() {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    reportsApi
      .getReport('day', today)
      .then(setReport)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Fehler beim Laden.'));
  }, [today]);

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-slate-800">Übersicht — Heute ({today})</h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {report && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Umsatz" value={formatCents(report.totalCents)} />
            <StatCard label="Verkäufe" value={String(report.saleCount)} />
            <StatCard label="MwSt." value={formatCents(report.taxCents)} />
            <StatCard
              label="Rückgaben"
              value={`${formatCents(report.returnsCents)} (${report.returnsCount}×)`}
            />
          </div>

          <div className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h3 className="mb-3 text-sm font-medium text-slate-500">Nach Zahlungsart</h3>
            <ul className="divide-y divide-slate-100">
              {report.byMethod.map((m) => (
                <li key={m.method} className="flex justify-between py-2 text-sm">
                  <span>
                    {methodLabels[m.method] ?? m.method} ({m.count}×)
                  </span>
                  <span className="font-medium">{formatCents(m.amountCents)}</span>
                </li>
              ))}
              {report.byMethod.length === 0 && (
                <li className="py-2 text-sm text-slate-400">Keine Verkäufe heute.</li>
              )}
            </ul>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <NavCard to="/admin/products" label="Produkte" />
        <NavCard to="/admin/users" label="Benutzer" />
        <NavCard to="/admin/customers" label="Kunden" />
        <NavCard to="/admin/reports" label="Berichte" />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function NavCard({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl bg-white p-4 text-center font-medium text-blue-700 shadow-sm ring-1 ring-slate-200 hover:bg-blue-50"
    >
      {label}
    </Link>
  );
}
