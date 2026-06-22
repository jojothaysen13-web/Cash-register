import { create } from 'zustand';
import type { CartLine, Product } from '../types';

interface CartState {
  lines: CartLine[];
  addProduct: (product: Product) => void;
  setQty: (productId: number, qty: number) => void;
  removeLine: (productId: number) => void;
  clear: () => void;
  totalCents: () => number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  lines: [],
  addProduct: (product) =>
    set((state) => {
      const existing = state.lines.find((l) => l.product.id === product.id);
      if (existing) {
        // Bestand nicht überschreiten — der Server lehnt das ohnehin ab (409),
        // daher hier schon clientseitig deckeln statt unnötig zu erhöhen.
        if (existing.qty >= product.stock_qty) return state;
        return {
          lines: state.lines.map((l) =>
            l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l
          ),
        };
      }
      if (product.stock_qty < 1) return state;
      return { lines: [...state.lines, { product, qty: 1 }] };
    }),
  setQty: (productId, qty) =>
    set((state) => {
      const line = state.lines.find((l) => l.product.id === productId);
      if (!line) return state;
      const next = Math.min(qty, line.product.stock_qty);
      return {
        lines: next < 1
          ? state.lines.filter((l) => l.product.id !== productId)
          : state.lines.map((l) => (l.product.id === productId ? { ...l, qty: next } : l)),
      };
    }),
  removeLine: (productId) =>
    set((state) => ({ lines: state.lines.filter((l) => l.product.id !== productId) })),
  clear: () => set({ lines: [] }),
  totalCents: () => get().lines.reduce((sum, l) => sum + l.product.price_cents * l.qty, 0),
}));
