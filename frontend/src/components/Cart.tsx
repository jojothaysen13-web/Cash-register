import { useCartStore } from '../store/cartStore';
import { formatCents } from '../utils/money';

export function Cart() {
  const { lines, setQty, removeLine } = useCartStore();

  if (lines.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-400">
        Warenkorb ist leer — Artikel scannen, um zu beginnen.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-white text-sm text-slate-500">
          <tr>
            <th className="px-3 py-2">Artikel</th>
            <th className="px-3 py-2 text-right">Menge</th>
            <th className="px-3 py-2 text-right">Preis</th>
            <th className="px-3 py-2 text-right">Summe</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.product.id} className="border-t border-slate-100">
              <td className="px-3 py-2">{line.product.name}</td>
              <td className="px-3 py-2 text-right">
                <div className="inline-flex items-center gap-2">
                  <button
                    onClick={() => setQty(line.product.id, line.qty - 1)}
                    className="h-7 w-7 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                    aria-label="Menge verringern"
                  >
                    −
                  </button>
                  <span className="w-8 text-center">{line.qty}</span>
                  <button
                    onClick={() => setQty(line.product.id, line.qty + 1)}
                    className="h-7 w-7 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                    aria-label="Menge erhöhen"
                  >
                    +
                  </button>
                </div>
              </td>
              <td className="px-3 py-2 text-right text-slate-500">
                {formatCents(line.product.price_cents)}
              </td>
              <td className="px-3 py-2 text-right font-medium">
                {formatCents(line.product.price_cents * line.qty)}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  onClick={() => removeLine(line.product.id)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Entfernen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
