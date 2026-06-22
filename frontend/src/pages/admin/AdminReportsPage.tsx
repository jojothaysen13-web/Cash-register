import { useEffect, useState } from 'react';
import * as reportsApi from '../../api/reports';
import { ApiError } from '../../api/client';
import { formatCents } from '../../utils/money';
import type { ReportRange, ReportSummary } from '../../types';

const methodLabels: Record<string, string> = {
  cash: 'Bargeld',
  card: 'Karte',
  voucher: 'Gutschein',
};

const rangeLabels: Record<ReportRange, string> = {
  day: 'Tag',
  week: 'Woche',
  month: 'Monat',
};

export function AdminReportsPage() {
  const [range, setRange] = useState<ReportRange>('day');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reportsApi
      .getReport(range, date)
      .then(setReport)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Fehler beim Laden.'));
  }, [range, date]);

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-slate-800">Berichte</h2>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-300 bg-white p-1">
          {(['day', 'week', 'month'] as ReportRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                range === r ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {rangeLabels[r]}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {report && (
        <>
          <p className="mb-4 text-sm text-slate-500">
            Zeitraum: {report.from} – {report.to}
          </p>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Umsatz" value={formatCents(report.totalCents)} />
            <StatCard label="Verkäufe" value={String(report.saleCount)} />
            <StatCard label="MwSt." value={formatCents(report.taxCents)} />
            <StatCard
              label="Rückgaben"
              value={`${formatCents(report.returnsCents)} (${report.returnsCount}×)`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
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
                  <li className="py-2 text-sm text-slate-400">Keine Verkäufe.</li>
                )}
              </ul>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h3 className="mb-3 text-sm font-medium text-slate-500">Topseller</h3>
              <ul className="divide-y divide-slate-100">
                {report.topProducts.map((p) => (
                  <li key={p.name} className="flex justify-between py-2 text-sm">
                    <span>
                      {p.name} ({p.qty}×)
                    </span>
                    <span className="font-medium">{formatCents(p.revenueCents)}</span>
                  </li>
                ))}
                {report.topProducts.length === 0 && (
                  <li className="py-2 text-sm text-slate-400">Keine Verkäufe.</li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
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
