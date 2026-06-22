import { apiFetch } from './client';

export type SalePaymentInput =
  | { method: 'cash'; tenderedCents: number }
  | { method: 'card'; paymentIntentId: string }
  | { method: 'voucher'; code: string };

export interface CreateSaleResult {
  saleId: number;
  totalCents: number;
  taxCents: number;
  changeCents: number | null;
  businessDate: string;
}

export function createSale(
  items: { productId: number; qty: number }[],
  payment: SalePaymentInput
): Promise<CreateSaleResult> {
  return apiFetch<CreateSaleResult>('/api/sales', {
    method: 'POST',
    body: JSON.stringify({ items, payment }),
  });
}
