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
        return {
          lines: state.lines.map((l) =>
            l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l
          ),
        };
      }
      return { lines: [...state.lines, { product, qty: 1 }] };
    }),
  setQty: (productId, qty) =>
    set((state) => ({
      lines: qty < 1
        ? state.lines.filter((l) => l.product.id !== productId)
        : state.lines.map((l) => (l.product.id === productId ? { ...l, qty } : l)),
    })),
  removeLine: (productId) =>
    set((state) => ({ lines: state.lines.filter((l) => l.product.id !== productId) })),
  clear: () => set({ lines: [] }),
  totalCents: () => get().lines.reduce((sum, l) => sum + l.product.price_cents * l.qty, 0),
}));
