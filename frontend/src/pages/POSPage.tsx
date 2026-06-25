import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { BrandMark } from '../components/BrandMark';
import { Cart } from '../components/Cart';
import { PaymentModal } from '../components/PaymentModal';
import * as productsApi from '../api/products';
import * as customersApi from '../api/customers';
import { ApiError } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { formatCents } from '../utils/money';
import type { CreateSaleResult } from '../api/sales';
import type { Customer, Product } from '../types';

export function POSPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { lines, addProduct, clear, totalCents } = useCartStore();

  const [scanError, setScanError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const searchSeq = useRef(0);
  const [showPayment, setShowPayment] = useState(false);
  const [receipt, setReceipt] = useState<CreateSaleResult | null>(null);

  const [cardNumber, setCardNumber] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [redeemPoints, setRedeemPoints] = useState('0');
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);

  // Gemeinsamer Pfad für Scan und manuelle Auswahl: deckelt am Bestand und gibt Feedback.
  function tryAddProduct(product: Product): boolean {
    const inCart = useCartStore.getState().lines.find((l) => l.product.id === product.id)?.qty ?? 0;
    if (inCart >= product.stock_qty) {
      setScanError(`Bestand erschöpft: nur ${product.stock_qty}× „${product.name}" verfügbar.`);
      return false;
    }
    addProduct(product);
    return true;
  }

  async function handleScan(barcode: string) {
    setScanError(null);
    try {
      const { product } = await productsApi.findByBarcode(barcode);
      tryAddProduct(product);
    } catch (err) {
      setScanError(err instanceof ApiError ? err.message : 'Artikel nicht gefunden.');
    }
  }

  async function handleCustomerLookup() {
    setLoyaltyError(null);
    try {
      const { customer } = await customersApi.findByCardNumber(cardNumber.trim());
      setCustomer(customer);
      setRedeemPoints('0');
    } catch (err) {
      setCustomer(null);
      setLoyaltyError(err instanceof ApiError ? err.message : 'Kunde nicht gefunden.');
    }
  }

  function clearCustomer() {
    setCustomer(null);
    setCardNumber('');
    setRedeemPoints('0');
    setLoyaltyError(null);
  }

  // Suche entkoppelt vom Tastendruck: 250 ms Debounce vermeidet einen Request
  // pro Zeichen, der Sequenzzähler verwirft veraltete Antworten (Race Condition).
  useEffect(() => {
    const query = searchQuery.trim();
    const seq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const { products } = await productsApi.searchProducts(query);
        if (seq === searchSeq.current) setSearchResults(products);
      } catch {
        if (seq === searchSeq.current) setSearchResults([]);
      }
    }, query.length < 2 ? 0 : 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function handlePaymentSuccess(result: CreateSaleResult) {
    setShowPayment(false);
    setReceipt(result);
    clear();
    clearCustomer();
  }

  const total = totalCents();
  const items = lines.map((l) => ({ productId: l.product.id, qty: l.qty }));
  const maxRedeemable = customer ? Math.min(customer.points_balance, total) : 0;
  const redeemPointsNum = Math.max(
    0,
    Math.min(maxRedeemable, parseInt(redeemPoints || '0', 10) || 0)
  );
  const loyaltyDiscountCents = redeemPointsNum;

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <BrandMark tag="Kasse" />
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">{user?.fullName}</span>
          {user?.locationName && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {user.locationName}
            </span>
          )}
          <Link to="/returns" className="text-blue-600 hover:underline">
            Rückgabe
          </Link>
          <Link to="/closing" className="text-blue-600 hover:underline">
            Tagesabschluss
          </Link>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-slate-500 hover:text-slate-700"
          >
            Abmelden
          </button>
        </div>
      </header>

      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        <div className="flex w-72 flex-col gap-4">
          <BarcodeScanner onScan={handleScan} disabled={showPayment} />
          {scanError && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{scanError}</div>
          )}

          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Artikel suchen (manuell)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {searchResults.length > 0 && (
              <ul className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                {searchResults.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => {
                        if (tryAddProduct(p)) setScanError(null);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span>{p.name}</span>
                      <span className="text-slate-400">{formatCents(p.price_cents)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-2 text-sm font-medium text-slate-700">Kundenkarte</p>
            {!customer ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomerLookup()}
                  placeholder="Kartennummer"
                  disabled={showPayment}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
                />
                <button
                  onClick={handleCustomerLookup}
                  disabled={showPayment}
                  className="rounded-lg bg-slate-100 px-3 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  OK
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span>{customer.full_name}</span>
                  <button
                    onClick={clearCustomer}
                    disabled={showPayment}
                    className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-50"
                  >
                    Entfernen
                  </button>
                </div>
                <p className="text-xs text-slate-500">{customer.points_balance} Punkte verfügbar</p>
                <label className="mt-2 block text-xs font-medium text-slate-700">
                  Punkte einlösen (max. {maxRedeemable})
                </label>
                <input
                  type="number"
                  min="0"
                  max={maxRedeemable}
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(e.target.value)}
                  disabled={showPayment}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
                />
                {loyaltyDiscountCents > 0 && (
                  <p className="mt-1 text-xs text-green-700">
                    Rabatt: {formatCents(loyaltyDiscountCents)}
                  </p>
                )}
              </div>
            )}
            {loyaltyError && <p className="mt-2 text-xs text-red-600">{loyaltyError}</p>}
          </div>

          {receipt && (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-medium">Verkauf #{receipt.saleId} abgeschlossen</p>
              <p>Summe: {formatCents(receipt.totalCents)}</p>
              {receipt.changeCents !== null && receipt.changeCents > 0 && (
                <p>Rückgeld: {formatCents(receipt.changeCents)}</p>
              )}
              <button
                onClick={() => setReceipt(null)}
                className="mt-2 text-xs text-green-700 underline"
              >
                Schließen
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <Cart />
          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center justify-between text-xl font-semibold">
              <span>Summe</span>
              <span>{formatCents(total)}</span>
            </div>
            <button
              onClick={() => setShowPayment(true)}
              disabled={lines.length === 0}
              className="mt-4 w-full rounded-lg bg-brand-600 py-3 text-lg font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
            >
              Zahlung starten
            </button>
          </div>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          totalCents={total}
          items={items}
          loyalty={{ customerId: customer?.id, redeemPoints: redeemPointsNum }}
          loyaltyDiscountCents={loyaltyDiscountCents}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
