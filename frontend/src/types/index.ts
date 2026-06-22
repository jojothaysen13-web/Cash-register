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

export interface Customer {
  id: number;
  card_number: string;
  full_name: string;
  phone: string | null;
  points_balance: number;
  created_at: string;
}

export interface UserSummary {
  id: number;
  username: string;
  full_name: string;
  role: 'cashier' | 'admin';
  active: number;
  created_at: string;
}

export interface SaleItemDetail {
  id: number;
  product_id: number;
  name_snapshot: string;
  unit_price_cents: number;
  qty: number;
  line_total_cents: number;
  returned_qty: number;
}

export interface SaleDetail {
  id: number;
  cashier_id: number;
  total_cents: number;
  tax_cents: number;
  business_date: string;
  created_at: string;
  customer_id: number | null;
  items: SaleItemDetail[];
  payments: { method: string; amount_cents: number; reference: string | null }[];
}

export type RefundMethod = 'cash' | 'card' | 'voucher_credit';

export interface ReturnResult {
  returnId: number;
  totalRefundCents: number;
  refundMethod: RefundMethod;
  refundReference: string | null;
  businessDate: string;
}

export type ReportRange = 'day' | 'week' | 'month';

export interface ReportSummary {
  range: ReportRange;
  from: string;
  to: string;
  totalCents: number;
  taxCents: number;
  saleCount: number;
  byMethod: { method: string; amountCents: number; count: number }[];
  topProducts: { name: string; qty: number; revenueCents: number }[];
  returnsCents: number;
  returnsCount: number;
}
