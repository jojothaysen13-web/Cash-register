export interface User {
  id: number;
  username: string;
  fullName: string;
  role: 'cashier' | 'admin';
}

export interface Product {
  id: number;
  barcode: string;
  name: string;
  price_cents: number;
  tax_rate: number;
  stock_qty: number;
  active: number;
}

export interface CartLine {
  product: Product;
  qty: number;
}

export type PaymentMethod = 'cash' | 'card' | 'voucher';

export interface ClosingSummary {
  businessDate: string;
  totalCents: number;
  byMethod: { method: PaymentMethod; amountCents: number; count: number }[];
  expectedCashCents: number;
  alreadyClosed: boolean;
}
