import { apiFetch } from './client';

export type SalePaymentInput =
  | { method: 'cash'; tenderedCents: number }
  | { method: 'card'; paymentIntentId: string; amountCents: number }
  | { method: 'mobile'; paymentIntentId: string; amountCents: number }
  | { method: 'voucher'; code: string };

export interface CreateSaleResult {
  saleId: number;
  totalCents: number;
  taxCents: number;
  changeCents: number | null;
  businessDate: string;
  loyaltyDiscountCents: number;
  netPayableCents: number;
  pointsEarned: number;
  customerId: number | null;
}

export interface LoyaltyInput {
  customerId?: number;
  redeemPoints?: number;
}

export function createSale(
  items: { productId: number; qty: number }[],
  payments: SalePaymentInput[],
  loyalty: LoyaltyInput = {}
): Promise<CreateSaleResult> {
  return apiFetch<CreateSaleResult>('/api/sales', {
    method: 'POST',
    body: JSON.stringify({ items, payments, ...loyalty }),
  });
}
