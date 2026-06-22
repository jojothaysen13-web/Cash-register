import { apiFetch } from './client';

export interface CardIntent {
  paymentIntentId: string;
  clientSecret: string;
  mock: boolean;
}

export function createCardIntent(amountCents: number): Promise<CardIntent> {
  return apiFetch<CardIntent>('/api/payments/card/intent', {
    method: 'POST',
    body: JSON.stringify({ amountCents }),
  });
}

export function confirmMockCardIntent(paymentIntentId: string, cardNumberLast4: string) {
  return apiFetch<{ status: 'succeeded' | 'failed' }>('/api/payments/card/confirm-mock', {
    method: 'POST',
    body: JSON.stringify({ paymentIntentId, cardNumberLast4 }),
  });
}

export function checkVoucher(code: string): Promise<{ code: string; valueCents: number }> {
  return apiFetch(`/api/payments/voucher/${encodeURIComponent(code)}`);
}

export function getPaymentConfig(): Promise<{ cardPaymentsAreMocked: boolean }> {
  return apiFetch('/api/payments/config');
}
