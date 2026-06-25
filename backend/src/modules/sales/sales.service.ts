import { db } from '../../config/db';
import { HttpError } from '../../middleware/errorHandler';
import { assertCardPaymentSucceeded, assertMobilePaymentSucceeded } from '../payments/payments.service';
import { adjustStock, getStockAtLocation } from '../products/products.service';
import { pointsEarnedFor, redemptionValueCents } from '../customers/loyalty';

export interface SaleItemInput {
  productId: number;
  qty: number;
}

export type SalePaymentInput =
  | { method: 'cash'; tenderedCents: number }
  | { method: 'card'; paymentIntentId: string; amountCents: number }
  | { method: 'mobile'; paymentIntentId: string; amountCents: number }
  | { method: 'voucher'; code: string };

export interface LoyaltyInput {
  customerId?: number;
  redeemPoints?: number;
}

interface ProductRow {
  id: number;
  barcode: string;
  name: string;
  price_cents: number;
  tax_rate: number;
}

interface VoucherRow {
  id: number;
  code: string;
  value_cents: number;
  redeemed_at: string | null;
  active: number;
}

interface CustomerRow {
  id: number;
  card_number: string;
  full_name: string;
  points_balance: number;
}

interface ResolvedPayment {
  method: 'cash' | 'card' | 'mobile' | 'voucher';
  amountAppliedCents: number;
  tenderedCents: number | null;
  changeCents: number | null;
  reference: string | null;
}

function taxPortionCents(grossCents: number, ratePercent: number): number {
  return Math.round(grossCents - grossCents / (1 + ratePercent / 100));
}

export async function createSale(
  cashierId: number,
  locationId: number | null,
  items: SaleItemInput[],
  payments: SalePaymentInput[],
  loyalty: LoyaltyInput = {}
) {
  if (items.length === 0) {
    throw new HttpError(400, 'Der Warenkorb ist leer.');
  }
  if (payments.length === 0) {
    throw new HttpError(400, 'Mindestens eine Zahlart wird benötigt.');
  }
  if (!locationId) {
    throw new HttpError(400, 'Kein Standort zugewiesen — Verkäufe benötigen einen Standort.');
  }

  const getProduct = db.prepare(
    'SELECT id, barcode, name, price_cents, tax_rate FROM products WHERE id = ? AND active = 1'
  );
  const resolvedItems = items.map((item) => {
    const product = getProduct.get(item.productId) as ProductRow | undefined;
    if (!product) {
      throw new HttpError(404, `Artikel ${item.productId} existiert nicht.`);
    }
    if (item.qty < 1) {
      throw new HttpError(400, 'Menge muss mindestens 1 sein.');
    }
    const stock = getStockAtLocation(product.id, locationId);
    if (stock < item.qty) {
      throw new HttpError(409, `Nicht genug Bestand für "${product.name}".`);
    }
    return { product, qty: item.qty, lineTotalCents: product.price_cents * item.qty };
  });

  const totalCents = resolvedItems.reduce((sum, i) => sum + i.lineTotalCents, 0);
  const taxCents = resolvedItems.reduce(
    (sum, i) => sum + taxPortionCents(i.lineTotalCents, i.product.tax_rate),
    0
  );

  let customer: CustomerRow | null = null;
  let redeemPoints = 0;
  if (loyalty.customerId) {
    customer =
      (db.prepare('SELECT * FROM customers WHERE id = ?').get(loyalty.customerId) as
        | CustomerRow
        | undefined) ?? null;
    if (!customer) {
      throw new HttpError(404, 'Kunde nicht gefunden.');
    }
    redeemPoints = Math.max(0, Math.floor(loyalty.redeemPoints ?? 0));
    if (redeemPoints > customer.points_balance) {
      throw new HttpError(400, 'Nicht genug Punkte auf dem Kundenkonto.');
    }
  }

  const loyaltyDiscountCents = Math.min(redemptionValueCents(redeemPoints), totalCents);
  const netPayableCents = totalCents - loyaltyDiscountCents;

  // Zahlungen werden in Reihenfolge gegen den Restbetrag verrechnet (Split-Payment):
  // Bar und Gutschein werden auf den Restbetrag gekappt (Bar mit Rückgeld, Gutschein-
  // Restwert verfällt wie bisher), Karte/Mobile müssen exakt zum vorab bestätigten
  // Intent-Betrag passen und dürfen den Restbetrag nicht überschreiten.
  const resolvedPayments: ResolvedPayment[] = [];
  const vouchersToRedeem: VoucherRow[] = [];
  const usedVoucherIds = new Set<number>();
  let remainingCents = netPayableCents;

  for (const payment of payments) {
    if (payment.method === 'cash') {
      const amountAppliedCents = Math.min(payment.tenderedCents, remainingCents);
      resolvedPayments.push({
        method: 'cash',
        amountAppliedCents,
        tenderedCents: payment.tenderedCents,
        changeCents: payment.tenderedCents - amountAppliedCents,
        reference: null,
      });
      remainingCents -= amountAppliedCents;
    } else if (payment.method === 'card') {
      if (payment.amountCents > remainingCents) {
        throw new HttpError(400, 'Kartenbetrag übersteigt den Restbetrag.');
      }
      await assertCardPaymentSucceeded(payment.paymentIntentId);
      resolvedPayments.push({
        method: 'card',
        amountAppliedCents: payment.amountCents,
        tenderedCents: null,
        changeCents: null,
        reference: payment.paymentIntentId,
      });
      remainingCents -= payment.amountCents;
    } else if (payment.method === 'mobile') {
      if (payment.amountCents > remainingCents) {
        throw new HttpError(400, 'Mobile-Zahlbetrag übersteigt den Restbetrag.');
      }
      await assertMobilePaymentSucceeded(payment.paymentIntentId);
      resolvedPayments.push({
        method: 'mobile',
        amountAppliedCents: payment.amountCents,
        tenderedCents: null,
        changeCents: null,
        reference: payment.paymentIntentId,
      });
      remainingCents -= payment.amountCents;
    } else {
      const code = payment.code.trim().toUpperCase();
      const voucher =
        (db.prepare('SELECT * FROM vouchers WHERE code = ?').get(code) as VoucherRow | undefined) ?? null;
      if (!voucher || !voucher.active) {
        throw new HttpError(404, 'Gutschein nicht gefunden.');
      }
      if (voucher.redeemed_at || usedVoucherIds.has(voucher.id)) {
        throw new HttpError(409, 'Gutschein wurde bereits eingelöst.');
      }
      usedVoucherIds.add(voucher.id);
      const amountAppliedCents = Math.min(voucher.value_cents, remainingCents);
      vouchersToRedeem.push(voucher);
      resolvedPayments.push({
        method: 'voucher',
        amountAppliedCents,
        tenderedCents: null,
        changeCents: null,
        reference: voucher.code,
      });
      remainingCents -= amountAppliedCents;
    }
  }

  if (remainingCents > 0) {
    throw new HttpError(400, 'Zahlungen decken den Gesamtbetrag nicht vollständig ab.');
  }

  const changeCents = resolvedPayments.reduce((sum, p) => sum + (p.changeCents ?? 0), 0);
  const pointsEarned = pointsEarnedFor(netPayableCents);
  const businessDate = new Date().toISOString().slice(0, 10);

  const insertSale = db.prepare(
    `INSERT INTO sales (cashier_id, location_id, total_cents, tax_cents, business_date, customer_id, points_earned, points_redeemed, loyalty_discount_cents)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertItem = db.prepare(
    `INSERT INTO sale_items (sale_id, product_id, name_snapshot, unit_price_cents, qty, line_total_cents)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertPayment = db.prepare(
    `INSERT INTO sale_payments (sale_id, method, amount_cents, tendered_cents, change_cents, reference)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const redeemVoucher = db.prepare("UPDATE vouchers SET redeemed_at = datetime('now') WHERE id = ?");
  const adjustCustomerPoints = db.prepare(
    'UPDATE customers SET points_balance = points_balance - ? + ? WHERE id = ?'
  );

  const saleId = db.transaction(() => {
    const { lastInsertRowid } = insertSale.run(
      cashierId,
      locationId,
      totalCents,
      taxCents,
      businessDate,
      customer?.id ?? null,
      pointsEarned,
      redeemPoints,
      loyaltyDiscountCents
    );
    for (const item of resolvedItems) {
      insertItem.run(
        lastInsertRowid,
        item.product.id,
        item.product.name,
        item.product.price_cents,
        item.qty,
        item.lineTotalCents
      );
      adjustStock(item.product.id, locationId, -item.qty);
    }
    for (const p of resolvedPayments) {
      insertPayment.run(lastInsertRowid, p.method, p.amountAppliedCents, p.tenderedCents, p.changeCents, p.reference);
    }
    for (const voucher of vouchersToRedeem) {
      redeemVoucher.run(voucher.id);
    }
    if (customer) {
      adjustCustomerPoints.run(redeemPoints, pointsEarned, customer.id);
    }
    return lastInsertRowid;
  })();

  return {
    saleId,
    totalCents,
    taxCents,
    changeCents,
    businessDate,
    loyaltyDiscountCents,
    netPayableCents,
    pointsEarned,
    customerId: customer?.id ?? null,
  };
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

export interface SalePaymentDetail {
  method: string;
  amount_cents: number;
  reference: string | null;
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
  payments: SalePaymentDetail[];
}

export function getSaleById(saleId: number): SaleDetail {
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId) as
    | Omit<SaleDetail, 'items' | 'payments'>
    | undefined;
  if (!sale) {
    throw new HttpError(404, `Verkauf #${saleId} nicht gefunden.`);
  }
  const items = db
    .prepare('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id')
    .all(saleId) as SaleItemDetail[];
  const payments = db
    .prepare('SELECT method, amount_cents, reference FROM sale_payments WHERE sale_id = ?')
    .all(saleId) as SalePaymentDetail[];
  return { ...sale, items, payments };
}
