import Stripe from 'stripe';
import { db } from '../../config/db';
import { env } from '../../config/env';
import { HttpError } from '../../middleware/errorHandler';

const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

export const cardPaymentsAreMocked = !stripe;
export const mobilePaymentsAreMocked = !stripe;

export async function createCardIntent(amountCents: number) {
  if (stripe) {
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
    });
    return { paymentIntentId: intent.id, clientSecret: intent.client_secret, mock: false };
  }

  const mockId = `pi_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return { paymentIntentId: mockId, clientSecret: `${mockId}_secret_mock`, mock: true };
}

// Mirrors Stripe's well-known test card behaviour: a card ending in 0002 always declines.
export function confirmMockCardIntent(paymentIntentId: string, cardNumberLast4: string) {
  if (!paymentIntentId.startsWith('pi_mock_')) {
    throw new HttpError(400, 'Kein Mock-Zahlungsvorgang.');
  }
  if (cardNumberLast4 === '0002') {
    return { status: 'failed' as const };
  }
  return { status: 'succeeded' as const };
}

export async function assertCardPaymentSucceeded(paymentIntentId: string): Promise<void> {
  if (paymentIntentId.startsWith('pi_mock_')) {
    // Mock confirmations are checked client-side before the sale is submitted.
    return;
  }
  if (!stripe) {
    throw new HttpError(500, 'Stripe ist nicht konfiguriert.');
  }
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (intent.status !== 'succeeded') {
    throw new HttpError(402, 'Kartenzahlung wurde nicht erfolgreich bestätigt.');
  }
}

export async function createMobileIntent(amountCents: number) {
  if (stripe) {
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
    });
    return { paymentIntentId: intent.id, clientSecret: intent.client_secret, mock: false };
  }

  const mockId = `pi_mobilemock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return { paymentIntentId: mockId, clientSecret: `${mockId}_secret_mock`, mock: true };
}

// Analog zur Karten-Testkonvention: eine Telefonnummer, die auf 0000 endet, schlägt immer fehl.
export function confirmMockMobileIntent(paymentIntentId: string, phoneNumber: string) {
  if (!paymentIntentId.startsWith('pi_mobilemock_')) {
    throw new HttpError(400, 'Kein Mock-Zahlungsvorgang.');
  }
  if (phoneNumber.endsWith('0000')) {
    return { status: 'failed' as const };
  }
  return { status: 'succeeded' as const };
}

export async function assertMobilePaymentSucceeded(paymentIntentId: string): Promise<void> {
  if (paymentIntentId.startsWith('pi_mobilemock_')) {
    // Mock confirmations are checked client-side before the sale is submitted.
    return;
  }
  if (!stripe) {
    throw new HttpError(500, 'Stripe ist nicht konfiguriert.');
  }
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (intent.status !== 'succeeded') {
    throw new HttpError(402, 'Mobile Zahlung wurde nicht erfolgreich bestätigt.');
  }
}

interface VoucherRow {
  id: number;
  code: string;
  value_cents: number;
  redeemed_at: string | null;
  active: number;
}

export function validateVoucher(code: string): VoucherRow {
  const voucher = db
    .prepare('SELECT * FROM vouchers WHERE code = ?')
    .get(code.trim().toUpperCase()) as VoucherRow | undefined;

  if (!voucher || !voucher.active) {
    throw new HttpError(404, 'Gutschein nicht gefunden.');
  }
  if (voucher.redeemed_at) {
    throw new HttpError(409, 'Gutschein wurde bereits eingelöst.');
  }
  return voucher;
}
