import { useEffect, useState } from 'react';
import * as productsApi from '../../api/products';
import * as locationsApi from '../../api/locations';
import { ApiError } from '../../api/client';
import type { Location, Product } from '../../types';

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    productsApi
      .listAllProducts(locationId ? Number(locationId) : undefined)
      .then(({ products }) => setProducts(products))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Fehler beim Laden.'));
  }

  useEffect(load, [locationId]);
  useEffect(() => {
    locationsApi.listLocations().then(({ locations }) => setLocations(locations));
  }, []);

  const selectedLocationId = locationId ? Number(locationId) : null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Produkte</h2>
        <div className="flex items-center gap-3">
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Alle Standorte (Gesamtbestand, nur Ansicht)</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showCreate ? 'Schließen' : 'Neues Produkt'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {showCreate && (
        <CreateProductForm
          locations={locations}
          defaultLocationId={locationId}
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
              <th className="px-4 py-3">Barcode</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Preis (€)</th>
              <th className="px-4 py-3">MwSt.</th>
              <th className="px-4 py-3">
                Bestand{selectedLocationId == null ? ' (gesamt)' : ''}
              </th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <ProductRow key={p.id} product={p} locationId={selectedLocationId} onChanged={load} />
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">Keine Produkte.</p>
        )}
      </div>
    </div>
  );
}

function ProductRow({
  product,
  locationId,
  onChanged,
}: {
  product: Product;
  locationId: number | null;
  onChanged: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState((product.price_cents / 100).toFixed(2));
  const [taxRate, setTaxRate] = useState(String(product.tax_rate));
  const [stock, setStock] = useState(String(product.stock_qty));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(product.name);
    setPrice((product.price_cents / 100).toFixed(2));
    setTaxRate(String(product.tax_rate));
    setStock(String(product.stock_qty));
    setError(null);
  }, [product.name, product.price_cents, product.tax_rate, product.stock_qty]);

  const stockEditable = locationId != null;

  const dirty =
    name !== product.name ||
    price !== (product.price_cents / 100).toFixed(2) ||
    taxRate !== String(product.tax_rate) ||
    (stockEditable && stock !== String(product.stock_qty));

  function discard() {
    setName(product.name);
    setPrice((product.price_cents / 100).toFixed(2));
    setTaxRate(String(product.tax_rate));
    setStock(String(product.stock_qty));
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await productsApi.updateProduct(product.id, {
        name,
        priceCents: Math.round(parseFloat(price || '0') * 100),
        taxRate: parseFloat(taxRate || '0'),
        ...(stockEditable
          ? { stockQty: parseInt(stock || '0', 10), locationId: locationId! }
          : {}),
      });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    setSaving(true);
    setError(null);
    try {
      await productsApi.updateProduct(product.id, { active: !product.active });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className={product.active ? '' : 'bg-slate-50 opacity-60'}>
      <td className="px-4 py-2 font-mono text-xs text-slate-500">{product.barcode}</td>
      <td className="px-4 py-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-200 focus:border-blue-400 focus:outline-none"
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-20 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-200 focus:border-blue-400 focus:outline-none"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          step="0.01"
          min="0"
          max="1"
          value={taxRate}
          onChange={(e) => setTaxRate(e.target.value)}
          className="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-200 focus:border-blue-400 focus:outline-none"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          step="1"
          min="0"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          disabled={!stockEditable}
          title={stockEditable ? undefined : 'Standort wählen, um den Bestand zu bearbeiten.'}
          className="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-200 focus:border-blue-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </td>
      <td className="px-4 py-2">
        <button
          onClick={toggleActive}
          disabled={saving}
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            product.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
          }`}
        >
          {product.active ? 'Aktiv' : 'Inaktiv'}
        </button>
      </td>
      <td className="px-4 py-2 text-right">
        {dirty && (
          <div className="flex justify-end gap-2">
            <button onClick={discard} className="text-xs text-slate-500 hover:underline">
              Verwerfen
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Speichern
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function CreateProductForm({
  locations,
  defaultLocationId,
  onCreated,
}: {
  locations: Location[];
  defaultLocationId: string;
  onCreated: () => void;
}) {
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [taxRate, setTaxRate] = useState('0.19');
  const [stock, setStock] = useState('0');
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await productsApi.createProduct({
        barcode: barcode.trim(),
        name: name.trim(),
        priceCents: Math.round(parseFloat(price || '0') * 100),
        taxRate: parseFloat(taxRate || '0'),
        stockQty: parseInt(stock || '0', 10),
        ...(locationId ? { locationId: Number(locationId) } : {}),
      });
      setBarcode('');
      setName('');
      setPrice('');
      setStock('0');
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Fehler beim Anlegen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-3 text-sm font-medium text-slate-500">Neues Produkt</h3>
      {error && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <input
          placeholder="Barcode"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Preis (€)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="number"
          step="0.01"
          placeholder="MwSt."
          value={taxRate}
          onChange={(e) => setTaxRate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="number"
          step="1"
          placeholder="Bestand"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Standort für Bestand…</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting || !barcode.trim() || !name.trim()}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Wird angelegt…' : 'Anlegen'}
      </button>
    </div>
  );
}
