import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as closingApi from '../api/closing';
import { ApiError } from '../api/client';
import { formatCents } from '../utils/money';
import type { ClosingSummary } from '../types';

const methodLabels: Record<string, string> = {
  cash: 'Bargeld',
  card: 'Karte',
  voucher: 'Gutschein',
};

export function ClosingPage() {
  const [summary, setSummary] = useState<ClosingSummary | null>(null);
  const [counted, setCounted] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ differenceCents: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const businessDate = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    closingApi
      .getClosingSummary(businessDate)
      .then(setSummary)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Fehler beim Laden.'));
  }, [businessDate]);

  async function handleClose() {
    if (!summary) return;
    const countedCents = Math.round(parseFloat(counted || '0') * 100);
    if (Number.isNaN(countedCents) || countedCents < 0) {
      setError('Bitte einen gültigen Betrag eingeben.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await closingApi.closeDay(businessDate, countedCents);
      setResult(res);
      setSummary({ ...summary, alreadyClosed: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler beim Tagesabschluss.');
    } finally {
      setSubmitting(false);
    }
  }

  const countedCents = Math.round(parseFloat(counted || '0') * 100);
  const liveDifference = summary ? countedCents - summary.expectedCashCents : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-600">Smithstoys</p>
            <h1 className="text-xl font-semibold text-slate-800">Tagesabschluss — {businessDate}</h1>
          </div>
          <Link to="/pos" className="text-sm text-blue-600 hover:underline">
            Zurück zur Kasse
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {summary && (
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-medium text-slate-500">Umsätze nach Zahlungsart</h2>
            <ul className="divide-y divide-slate-100">
              {summary.byMethod.map((m) => (
                <li key={m.method} className="flex justify-between py-2 text-sm">
                  <span>
                    {methodLabels[m.method] ?? m.method} ({m.count}×)
                  </span>
                  <span className="font-medium">{formatCents(m.amountCents)}</span>
                </li>
              ))}
              {summary.byMethod.length === 0 && (
                <li className="py-2 text-sm text-slate-400">Keine Verkäufe heute.</li>
              )}
            </ul>
            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base font-semibold">
              <span>Gesamt</span>
              <span>{formatCents(summary.totalCents)}</span>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-6">
              {summary.alreadyClosed ? (
                <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
                  Tagesabschluss für {businessDate} wurde bereits erstellt.
                  {result && (
                    <>
                      {' '}
                      Differenz:{' '}
                      <span className={result.differenceCents !== 0 ? 'font-semibold' : ''}>
                        {formatCents(result.differenceCents)}
                      </span>
                    </>
                  )}
                </p>
              ) : (
                <>
                  <label className="block text-sm font-medium text-slate-700">
                    Gezählter Bargeldbestand (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={counted}
                    onChange={(e) => setCounted(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    autoFocus
                  />
                  <p className="mt-2 text-sm text-slate-500">
                    Erwartet: {formatCents(summary.expectedCashCents)} · Differenz:{' '}
                    <span className={liveDifference !== 0 ? 'font-semibold text-amber-700' : ''}>
                      {formatCents(liveDifference)}
                    </span>
                  </p>
                  <button
                    onClick={handleClose}
                    disabled={submitting}
                    className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Wird abgeschlossen…' : 'Tag abschließen'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
