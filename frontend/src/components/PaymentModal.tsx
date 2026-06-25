import { loadStripe } from '@stripe/stripe-js';
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { useState } from 'react';
import * as paymentsApi from '../api/payments';
import * as salesApi from '../api/sales';
import { ApiError } from '../api/client';
import { formatCents, parseAmountToCents } from '../utils/money';
import type { CreateSaleResult, LoyaltyInput, SalePaymentInput } from '../api/sales';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type Tab = 'cash' | 'card' | 'mobile' | 'voucher' | 'split';

interface PaymentModalProps {
  totalCents: number;
  items: { productId: number; qty: number }[];
  loyalty?: LoyaltyInput;
  loyaltyDiscountCents?: number;
  onClose: () => void;
  onSuccess: (result: CreateSaleResult) => void;
}

export function PaymentModal({
  totalCents,
  items,
  loyalty = {},
  loyaltyDiscountCents = 0,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [tab, setTab] = useState<Tab>('cash');
  const netCents = totalCents - loyaltyDiscountCents;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'cash', label: 'Bargeld' },
    { key: 'card', label: 'Karte' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'voucher', label: 'Gutschein' },
    { key: 'split', label: 'Split' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Zahlung — {formatCents(netCents)}</h2>
            {loyaltyDiscountCents > 0 && (
              <p className="text-xs text-slate-500">
                Summe {formatCents(totalCents)} − Treuerabatt {formatCents(loyaltyDiscountCents)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="flex border-b border-slate-200">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium ${
                tab === t.key
                  ? 'border-b-2 border-brand-600 text-brand-700'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'cash' && (
            <CashTab totalCents={netCents} items={items} loyalty={loyalty} onSuccess={onSuccess} />
          )}
          {tab === 'card' &&
            (stripePromise ? (
              <Elements stripe={stripePromise}>
                <RealCardTab
                  totalCents={netCents}
                  items={items}
                  loyalty={loyalty}
                  onSuccess={onSuccess}
                />
              </Elements>
            ) : (
              <MockCardTab
                totalCents={netCents}
                items={items}
                loyalty={loyalty}
                onSuccess={onSuccess}
              />
            ))}
          {tab === 'mobile' && (
            <MockMobileTab
              totalCents={netCents}
              items={items}
              loyalty={loyalty}
              onSuccess={onSuccess}
            />
          )}
          {tab === 'voucher' && (
            <VoucherTab
              totalCents={netCents}
              items={items}
              loyalty={loyalty}
              onSuccess={onSuccess}
            />
          )}
          {tab === 'split' && (
            <SplitTab
              totalCents={netCents}
              items={items}
              loyalty={loyalty}
              onSuccess={onSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{message}</div>
  );
}

interface TabProps {
  totalCents: number;
  items: { productId: number; qty: number }[];
  loyalty: LoyaltyInput;
  onSuccess: (result: CreateSaleResult) => void;
}

function CashTab({ totalCents, items, loyalty, onSuccess }: TabProps) {
  const [tendered, setTendered] = useState((totalCents / 100).toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tenderedCents = parseAmountToCents(tendered);
  const change = (Number.isNaN(tenderedCents) ? 0 : tenderedCents) - totalCents;

  async function handleSubmit() {
    setError(null);
    if (Number.isNaN(tenderedCents) || tenderedCents < totalCents) {
      setError('Gegebener Betrag reicht nicht aus.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await salesApi.createSale(
        items,
        [{ method: 'cash', tenderedCents }],
        loyalty
      );
      onSuccess(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler beim Abschließen des Verkaufs.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <ErrorBanner message={error} />
      <label className="block text-sm font-medium text-slate-700">Gegeben (€)</label>
      <input
        type="text"
        inputMode="decimal"
        value={tendered}
        onChange={(e) => setTendered(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        autoFocus
      />
      <div className="mt-4 flex justify-between text-base">
        <span className="text-slate-500">Rückgeld</span>
        <span className={`font-semibold ${change < 0 ? 'text-red-600' : 'text-green-700'}`}>
          {formatCents(Math.max(change, 0))}
        </span>
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-6 w-full rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? 'Wird verarbeitet…' : 'Zahlung abschließen'}
      </button>
    </div>
  );
}

function RealCardTab({ totalCents, items, loyalty, onSuccess }: TabProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!stripe || !elements) return;
    setError(null);
    setSubmitting(true);
    try {
      const { clientSecret } = await paymentsApi.createCardIntent(totalCents);
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Kartenfeld nicht verfügbar.');

      const { paymentIntent, error: stripeError } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: { card: cardElement } }
      );

      if (stripeError) {
        setError(stripeError.message ?? 'Kartenzahlung fehlgeschlagen.');
        return;
      }
      if (paymentIntent?.status !== 'succeeded') {
        setError('Kartenzahlung wurde nicht bestätigt.');
        return;
      }

      const result = await salesApi.createSale(
        items,
        [{ method: 'card', paymentIntentId: paymentIntent.id, amountCents: totalCents }],
        loyalty
      );
      onSuccess(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler bei der Kartenzahlung.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <ErrorBanner message={error} />
      <div className="rounded-lg border border-slate-300 px-4 py-3">
        <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting || !stripe}
        className="mt-6 w-full rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? 'Wird verarbeitet…' : `${formatCents(totalCents)} bezahlen`}
      </button>
    </div>
  );
}

function MockCardTab({ totalCents, items, loyalty, onSuccess }: TabProps) {
  const [last4, setLast4] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!/^\d{4}$/.test(last4)) {
      setError('Bitte die letzten 4 Ziffern der Testkarte eingeben.');
      return;
    }
    setSubmitting(true);
    try {
      const { paymentIntentId } = await paymentsApi.createCardIntent(totalCents);
      const { status } = await paymentsApi.confirmMockCardIntent(paymentIntentId, last4);
      if (status === 'failed') {
        setError('Karte abgelehnt (Testkarte endet auf 0002).');
        return;
      }
      const result = await salesApi.createSale(
        items,
        [{ method: 'card', paymentIntentId, amountCents: totalCents }],
        loyalty
      );
      onSuccess(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler bei der Kartenzahlung.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Testmodus — kein Stripe-Konto konfiguriert. Es wird keine echte Zahlung verarbeitet.
        Letzte 4 Ziffern <code className="font-mono">0002</code> simulieren eine Ablehnung,
        jede andere Eingabe simuliert Erfolg.
      </div>
      <ErrorBanner message={error} />
      <label className="block text-sm font-medium text-slate-700">
        Letzte 4 Ziffern der Testkarte
      </label>
      <input
        type="text"
        inputMode="numeric"
        maxLength={4}
        value={last4}
        onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))}
        className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-lg font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        placeholder="4242"
        autoFocus
      />
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-6 w-full rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? 'Wird verarbeitet…' : `${formatCents(totalCents)} bezahlen (Test)`}
      </button>
    </div>
  );
}

function MockMobileTab({ totalCents, items, loyalty, onSuccess }: TabProps) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (phone.replace(/\D/g, '').length < 4) {
      setError('Bitte eine Telefonnummer eingeben (mind. 4 Ziffern).');
      return;
    }
    setSubmitting(true);
    try {
      const { paymentIntentId } = await paymentsApi.createMobileIntent(totalCents);
      const { status } = await paymentsApi.confirmMockMobileIntent(paymentIntentId, phone);
      if (status === 'failed') {
        setError('Mobile Zahlung abgelehnt (Nummer endet auf 0000).');
        return;
      }
      const result = await salesApi.createSale(
        items,
        [{ method: 'mobile', paymentIntentId, amountCents: totalCents }],
        loyalty
      );
      onSuccess(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler bei der mobilen Zahlung.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Mobile-Payment Testmodus (Apple Pay / Google Pay Simulation).
        Eine Nummer die auf <code className="font-mono">0000</code> endet, simuliert eine
        Ablehnung, jede andere simuliert Erfolg.
      </div>
      <ErrorBanner message={error} />
      <label className="block text-sm font-medium text-slate-700">Telefonnummer</label>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-lg font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        placeholder="+49 170 1234567"
        autoFocus
      />
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-6 w-full rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? 'Wird verarbeitet…' : `${formatCents(totalCents)} bezahlen (Mobile)`}
      </button>
    </div>
  );
}

function VoucherTab({ totalCents, items, loyalty, onSuccess }: TabProps) {
  const [code, setCode] = useState('');
  const [checked, setChecked] = useState<{ code: string; valueCents: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCheck() {
    setError(null);
    setChecked(null);
    try {
      const result = await paymentsApi.checkVoucher(code.trim());
      if (result.valueCents < totalCents) {
        setError(
          `Gutscheinwert (${formatCents(result.valueCents)}) reicht nicht für den vollen Betrag. Für Teilzahlung nutze den Split-Tab.`
        );
        return;
      }
      setChecked(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gutschein konnte nicht geprüft werden.');
    }
  }

  async function handleSubmit() {
    if (!checked) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await salesApi.createSale(
        items,
        [{ method: 'voucher', code: checked.code }],
        loyalty
      );
      onSuccess(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler beim Einlösen des Gutscheins.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <ErrorBanner message={error} />
      <label className="block text-sm font-medium text-slate-700">Gutscheincode</label>
      <div className="mt-1 flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setChecked(null);
          }}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-lg font-mono uppercase focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="GUTSCHEIN10"
          autoFocus
        />
        <button
          onClick={handleCheck}
          className="rounded-lg bg-slate-100 px-4 font-medium text-slate-700 hover:bg-slate-200"
        >
          Prüfen
        </button>
      </div>
      {checked && (
        <div className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Gültig — Wert {formatCents(checked.valueCents)}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={!checked || submitting}
        className="mt-6 w-full rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? 'Wird verarbeitet…' : 'Mit Gutschein bezahlen'}
      </button>
    </div>
  );
}

type SplitMethod = 'cash' | 'card' | 'mobile' | 'voucher';

interface SplitLine {
  id: number;
  method: SplitMethod;
  amountStr: string;
  cardLast4: string;
  mobilePhone: string;
  voucherCode: string;
}

let nextSplitId = 1;
function newSplitLine(method: SplitMethod = 'cash'): SplitLine {
  return {
    id: nextSplitId++,
    method,
    amountStr: '',
    cardLast4: '',
    mobilePhone: '',
    voucherCode: '',
  };
}

function SplitTab({ totalCents, items, loyalty, onSuccess }: TabProps) {
  const [lines, setLines] = useState<SplitLine[]>([newSplitLine('cash'), newSplitLine('card')]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const coveredCents = lines.reduce((sum, l) => {
    const c = parseAmountToCents(l.amountStr);
    return sum + (Number.isNaN(c) ? 0 : c);
  }, 0);
  const remainingCents = totalCents - coveredCents;

  function updateLine(id: number, patch: Partial<SplitLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: number) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function addLine() {
    setLines((prev) => [...prev, newSplitLine()]);
  }

  async function handleSubmit() {
    setError(null);
    if (remainingCents > 0) {
      setError(`Noch ${formatCents(remainingCents)} offen.`);
      return;
    }

    setSubmitting(true);
    try {
      const paymentInputs: SalePaymentInput[] = [];

      for (const line of lines) {
        const amountCents = parseAmountToCents(line.amountStr);
        if (Number.isNaN(amountCents) || amountCents <= 0) continue;

        if (line.method === 'cash') {
          paymentInputs.push({ method: 'cash', tenderedCents: amountCents });
        } else if (line.method === 'card') {
          if (!/^\d{4}$/.test(line.cardLast4)) {
            setError('Bitte die letzten 4 Ziffern für jeden Kartenanteil eingeben.');
            setSubmitting(false);
            return;
          }
          const { paymentIntentId } = await paymentsApi.createCardIntent(amountCents);
          const { status } = await paymentsApi.confirmMockCardIntent(paymentIntentId, line.cardLast4);
          if (status === 'failed') {
            setError('Karte abgelehnt (Testkarte endet auf 0002).');
            setSubmitting(false);
            return;
          }
          paymentInputs.push({ method: 'card', paymentIntentId, amountCents });
        } else if (line.method === 'mobile') {
          if (line.mobilePhone.replace(/\D/g, '').length < 4) {
            setError('Bitte eine Telefonnummer für jeden Mobile-Anteil eingeben.');
            setSubmitting(false);
            return;
          }
          const { paymentIntentId } = await paymentsApi.createMobileIntent(amountCents);
          const { status } = await paymentsApi.confirmMockMobileIntent(paymentIntentId, line.mobilePhone);
          if (status === 'failed') {
            setError('Mobile Zahlung abgelehnt (Nummer endet auf 0000).');
            setSubmitting(false);
            return;
          }
          paymentInputs.push({ method: 'mobile', paymentIntentId, amountCents });
        } else {
          paymentInputs.push({ method: 'voucher', code: line.voucherCode });
        }
      }

      if (paymentInputs.length === 0) {
        setError('Mindestens eine Zahlart mit Betrag wird benötigt.');
        setSubmitting(false);
        return;
      }

      const result = await salesApi.createSale(items, paymentInputs, loyalty);
      onSuccess(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler bei der Split-Zahlung.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <ErrorBanner message={error} />
      <div className="mb-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
        Betrag auf mehrere Zahlarten aufteilen. Gesamtbetrag: {formatCents(totalCents)}
      </div>

      <div className="space-y-3">
        {lines.map((line) => (
          <div key={line.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <select
                value={line.method}
                onChange={(e) => updateLine(line.id, { method: e.target.value as SplitMethod })}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="cash">Bargeld</option>
                <option value="card">Karte</option>
                <option value="mobile">Mobile</option>
                <option value="voucher">Gutschein</option>
              </select>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Betrag €"
                value={line.amountStr}
                onChange={(e) => updateLine(line.id, { amountStr: e.target.value })}
                className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono"
              />
              {lines.length > 1 && (
                <button
                  onClick={() => removeLine(line.id)}
                  className="text-slate-400 hover:text-red-500 text-lg leading-none"
                >
                  ✕
                </button>
              )}
            </div>

            {line.method === 'card' && (
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="Letzte 4 Ziffern"
                value={line.cardLast4}
                onChange={(e) => updateLine(line.id, { cardLast4: e.target.value.replace(/\D/g, '') })}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono"
              />
            )}
            {line.method === 'mobile' && (
              <input
                type="tel"
                placeholder="Telefonnummer"
                value={line.mobilePhone}
                onChange={(e) => updateLine(line.id, { mobilePhone: e.target.value })}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono"
              />
            )}
            {line.method === 'voucher' && (
              <input
                type="text"
                placeholder="Gutscheincode"
                value={line.voucherCode}
                onChange={(e) => updateLine(line.id, { voucherCode: e.target.value })}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono uppercase"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addLine}
        className="mt-3 w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-500 hover:bg-slate-50"
      >
        + Zahlart hinzufügen
      </button>

      <div className="mt-4 flex justify-between text-sm">
        <span className="text-slate-500">Offen</span>
        <span className={`font-semibold ${remainingCents > 0 ? 'text-red-600' : 'text-green-700'}`}>
          {formatCents(Math.max(remainingCents, 0))}
        </span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || remainingCents > 0}
        className="mt-4 w-full rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? 'Wird verarbeitet…' : 'Split-Zahlung abschließen'}
      </button>
    </div>
  );
}
