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
import { formatCents } from '../utils/money';
import type { CreateSaleResult, LoyaltyInput } from '../api/sales';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type Tab = 'cash' | 'card' | 'voucher';

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
          {(['cash', 'card', 'voucher'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium ${
                tab === t
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'cash' ? 'Bargeld' : t === 'card' ? 'Karte' : 'Gutschein'}
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
          {tab === 'voucher' && (
            <VoucherTab
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

  const tenderedCents = Math.round(parseFloat(tendered || '0') * 100);
  const change = tenderedCents - totalCents;

  async function handleSubmit() {
    setError(null);
    if (Number.isNaN(tenderedCents) || tenderedCents < totalCents) {
      setError('Gegebener Betrag reicht nicht aus.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await salesApi.createSale(items, { method: 'cash', tenderedCents }, loyalty);
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
        type="number"
        step="0.01"
        min="0"
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
        className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
        { method: 'card', paymentIntentId: paymentIntent.id },
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
        className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
        { method: 'card', paymentIntentId },
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
        className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Wird verarbeitet…' : `${formatCents(totalCents)} bezahlen (Test)`}
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
          `Gutscheinwert (${formatCents(result.valueCents)}) reicht nicht für den vollen Betrag. Teilzahlung folgt in einer späteren Phase.`
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
        { method: 'voucher', code: checked.code },
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
        className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Wird verarbeitet…' : 'Mit Gutschein bezahlen'}
      </button>
    </div>
  );
}
