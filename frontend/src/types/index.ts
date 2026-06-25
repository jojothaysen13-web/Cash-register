export interface User {
  id: number;
  username: string;
  fullName: string;
  role: 'cashier' | 'admin';
  locationId: number | null;
  locationName: string | null;
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

export type PaymentMethod = 'cash' | 'card' | 'voucher' | 'mobile';

export interface Location {
  id: number;
  name: string;
  code: string;
  active: number;
  created_at: string;
}

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
  location_id: number | null;
  location_name: string | null;
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
  location_id: number | null;
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
  locationId: number | null;
  totalCents: number;
  taxCents: number;
  saleCount: number;
  byMethod: { method: string; amountCents: number; count: number }[];
  topProducts: { name: string; qty: number; revenueCents: number }[];
  returnsCents: number;
  returnsCount: number;
  byLocation: { locationId: number; locationName: string; totalCents: number; saleCount: number }[];
}
