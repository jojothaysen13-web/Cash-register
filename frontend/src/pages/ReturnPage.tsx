import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as returnsApi from '../api/returns';
import { ApiError } from '../api/client';
import { formatCents } from '../utils/money';
import type { RefundMethod, ReturnResult, SaleDetail } from '../types';

const methodLabels: Record<RefundMethod, string> = {
  cash: 'Bargeld',
  card: 'Karte',
  voucher_credit: 'Gutschrift (Gutschein)',
};

export function ReturnPage() {
  const [saleIdInput, setSaleIdInput] = useState('');
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('cash');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ReturnResult | null>(null);

  const hasCardPayment = sale?.payments.some((p) => p.method === 'card') ?? false;

  async function handleLookup() {
    setError(null);
    setResult(null);
    setSale(null);
    const saleId = parseInt(saleIdInput, 10);
    if (Number.isNaN(saleId)) {
      setError('Bitte eine gültige Verkaufsnummer eingeben.');
      return;
    }
    setLoading(true);
    try {
      const found = await returnsApi.getSale(saleId);
      setSale(found);
      setQtys({});
      setRefundMethod(found.payments.some((p) => p.method === 'card') ? 'card' : 'cash');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verkauf nicht gefunden.');
    } finally {
      setLoading(false);
    }
  }

  function setQty(itemId: number, max: number, value: string) {
    const n = Math.max(0, Math.min(max, parseInt(value || '0', 10) || 0));
    setQtys((prev) => ({ ...prev, [itemId]: n }));
  }

  const refundPreviewCents = sale
    ? sale.items.reduce((sum, item) => sum + item.unit_price_cents * (qtys[item.id] ?? 0), 0)
    : 0;

  async function handleSubmit() {
    if (!sale) return;
    const items = Object.entries(qtys)
      .map(([saleItemId, qty]) => ({ saleItemId: Number(saleItemId), qty }))
      .filter((i) => i.qty > 0);
    if (items.length === 0) {
      setError('Bitte mindestens eine Menge angeben.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await returnsApi.createReturn({ saleId: sale.id, items, refundMethod });
      setResult(res);
      setSale(null);
      setSaleIdInput('');
      setQtys({});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler bei der Rückgabe.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">Rückgabe / Umtausch</h1>
          <Link to="/pos" className="text-sm text-blue-600 hover:underline">
            Zurück zur Kasse
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {result && (
          <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            <p className="font-medium">Rückgabe #{result.returnId} abgeschlossen</p>
            <p>
              Erstattung: {formatCents(result.totalRefundCents)} (
              {methodLabels[result.refundMethod]})
            </p>
            {result.refundReference && (
              <p>
                Referenz: <span className="font-mono">{result.refundReference}</span>
              </p>
            )}
            <button
              onClick={() => setResult(null)}
              className="mt-2 text-xs text-green-700 underline"
            >
              Schließen
            </button>
          </div>
        )}

        <div className="mb-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <label className="block text-sm font-medium text-slate-700">Verkaufsnummer</label>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              value={saleIdInput}
              onChange={(e) => setSaleIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="z. B. 42"
              autoFocus
            />
            <button
              onClick={handleLookup}
              disabled={loading}
              className="rounded-lg bg-slate-100 px-4 font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
              {loading ? 'Suche…' : 'Suchen'}
            </button>
          </div>
        </div>

        {sale && (
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-medium text-slate-500">
              Verkauf #{sale.id} — {formatCents(sale.total_cents)} ({sale.business_date})
            </h2>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Artikel</th>
                  <th className="py-2">Gekauft</th>
                  <th className="py-2">Bereits zurück</th>
                  <th className="py-2">Rückgabe-Menge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item) => {
                  const max = item.qty - item.returned_qty;
                  return (
                    <tr key={item.id}>
                      <td className="py-2">{item.name_snapshot}</td>
                      <td className="py-2">{item.qty}</td>
                      <td className="py-2">{item.returned_qty}</td>
                      <td className="py-2">
                        <input
                          type="number"
                          min="0"
                          max={max}
                          value={qtys[item.id] ?? 0}
                          onChange={(e) => setQty(item.id, max, e.target.value)}
                          disabled={max === 0}
                          className="w-20 rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <label className="block text-sm font-medium text-slate-700">Erstattungsart</label>
              <div className="mt-1 flex gap-2">
                {(['cash', 'card', 'voucher_credit'] as RefundMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setRefundMethod(m)}
                    disabled={m === 'card' && !hasCardPayment}
                    className={`rounded-lg px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                      refundMethod === m
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {methodLabels[m]}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-base">
                <span className="text-slate-500">Erstattungsbetrag</span>
                <span className="font-semibold">{formatCents(refundPreviewCents)}</span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || refundPreviewCents === 0}
                className="mt-4 w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Wird verarbeitet…' : 'Rückgabe abschließen'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
