import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { Cart } from '../components/Cart';
import { PaymentModal } from '../components/PaymentModal';
import * as productsApi from '../api/products';
import { ApiError } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { formatCents } from '../utils/money';
import type { CreateSaleResult } from '../api/sales';
import type { Product } from '../types';

export function POSPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { lines, addProduct, clear, totalCents } = useCartStore();

  const [scanError, setScanError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [receipt, setReceipt] = useState<CreateSaleResult | null>(null);

  async function handleScan(barcode: string) {
    setScanError(null);
    try {
      const { product } = await productsApi.findByBarcode(barcode);
      addProduct(product);
    } catch (err) {
      setScanError(err instanceof ApiError ? err.message : 'Artikel nicht gefunden.');
    }
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const { products } = await productsApi.searchProducts(query.trim());
      setSearchResults(products);
    } catch {
      setSearchResults([]);
    }
  }

  function handlePaymentSuccess(result: CreateSaleResult) {
    setShowPayment(false);
    setReceipt(result);
    clear();
  }

  const total = totalCents();
  const items = lines.map((l) => ({ productId: l.product.id, qty: l.qty }));

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <h1 className="text-lg font-semibold text-slate-800">Kasse</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">{user?.fullName}</span>
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
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Artikel suchen (manuell)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {searchResults.length > 0 && (
              <ul className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                {searchResults.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => {
                        addProduct(p);
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
              className="mt-4 w-full rounded-lg bg-blue-600 py-3 text-lg font-medium text-white hover:bg-blue-700 disabled:opacity-40"
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
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
