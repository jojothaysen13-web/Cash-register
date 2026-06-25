import { apiFetch } from './client';

export interface PaymentIntent {
  paymentIntentId: string;
  clientSecret: string;
  mock: boolean;
}

export function createCardIntent(amountCents: number): Promise<PaymentIntent> {
  return apiFetch<PaymentIntent>('/api/payments/card/intent', {
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

export function createMobileIntent(amountCents: number): Promise<PaymentIntent> {
  return apiFetch<PaymentIntent>('/api/payments/mobile/intent', {
    method: 'POST',
    body: JSON.stringify({ amountCents }),
  });
}

export function confirmMockMobileIntent(paymentIntentId: string, phoneNumber: string) {
  return apiFetch<{ status: 'succeeded' | 'failed' }>('/api/payments/mobile/confirm-mock', {
    method: 'POST',
    body: JSON.stringify({ paymentIntentId, phoneNumber }),
  });
}

export function checkVoucher(code: string): Promise<{ code: string; valueCents: number }> {
  return apiFetch(`/api/payments/voucher/${encodeURIComponent(code)}`);
}

export function getPaymentConfig(): Promise<{
  cardPaymentsAreMocked: boolean;
  mobilePaymentsAreMocked: boolean;
}> {
  return apiFetch('/api/payments/config');
}
