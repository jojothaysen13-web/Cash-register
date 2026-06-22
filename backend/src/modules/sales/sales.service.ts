import { db } from '../../config/db';
import { HttpError } from '../../middleware/errorHandler';
import { assertCardPaymentSucceeded } from '../payments/payments.service';
import { invalidateCachedProduct } from '../../config/redis';
import { pointsEarnedFor, redemptionValueCents } from '../customers/loyalty';

export interface SaleItemInput {
  productId: number;
  qty: number;
}

export type SalePaymentInput =
  | { method: 'cash'; tenderedCents: number }
  | { method: 'card'; paymentIntentId: string }
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
  stock_qty: number;
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

function taxPortionCents(grossCents: number, ratePercent: number): number {
  return Math.round(grossCents - grossCents / (1 + ratePercent / 100));
}

export async function createSale(
  cashierId: number,
  items: SaleItemInput[],
  payment: SalePaymentInput,
  loyalty: LoyaltyInput = {}
) {
  if (items.length === 0) {
    throw new HttpError(400, 'Der Warenkorb ist leer.');
  }

  const getProduct = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1');
  const resolvedItems = items.map((item) => {
    const product = getProduct.get(item.productId) as ProductRow | undefined;
    if (!product) {
      throw new HttpError(404, `Artikel ${item.productId} existiert nicht.`);
    }
    if (item.qty < 1) {
      throw new HttpError(400, 'Menge muss mindestens 1 sein.');
    }
    if (product.stock_qty < item.qty) {
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

  let voucher: VoucherRow | null = null;
  let changeCents: number | null = null;
  let tenderedCents: number | null = null;
  let reference: string | null = null;

  if (payment.method === 'cash') {
    if (payment.tenderedCents < netPayableCents) {
      throw new HttpError(400, 'Gegebener Betrag reicht nicht aus.');
    }
    tenderedCents = payment.tenderedCents;
    changeCents = payment.tenderedCents - netPayableCents;
  } else if (payment.method === 'card') {
    await assertCardPaymentSucceeded(payment.paymentIntentId);
    reference = payment.paymentIntentId;
  } else {
    voucher = (db
      .prepare('SELECT * FROM vouchers WHERE code = ?')
      .get(payment.code.trim().toUpperCase()) as VoucherRow | undefined) ?? null;
    if (!voucher || !voucher.active) {
      throw new HttpError(404, 'Gutschein nicht gefunden.');
    }
    if (voucher.redeemed_at) {
      throw new HttpError(409, 'Gutschein wurde bereits eingelöst.');
    }
    if (voucher.value_cents < netPayableCents) {
      throw new HttpError(
        400,
        'Gutscheinwert reicht nicht aus (Teilzahlung/Split folgt in einer späteren Phase).'
      );
    }
    reference = voucher.code;
  }

  const pointsEarned = pointsEarnedFor(netPayableCents);
  const businessDate = new Date().toISOString().slice(0, 10);

  const insertSale = db.prepare(
    `INSERT INTO sales (cashier_id, total_cents, tax_cents, business_date, customer_id, points_earned, points_redeemed, loyalty_discount_cents)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertItem = db.prepare(
    `INSERT INTO sale_items (sale_id, product_id, name_snapshot, unit_price_cents, qty, line_total_cents)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertPayment = db.prepare(
    `INSERT INTO sale_payments (sale_id, method, amount_cents, tendered_cents, change_cents, reference)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const decrementStock = db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?');
  const redeemVoucher = db.prepare("UPDATE vouchers SET redeemed_at = datetime('now') WHERE id = ?");
  const adjustCustomerPoints = db.prepare(
    'UPDATE customers SET points_balance = points_balance - ? + ? WHERE id = ?'
  );

  const saleId = db.transaction(() => {
    const { lastInsertRowid } = insertSale.run(
      cashierId,
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
      decrementStock.run(item.qty, item.product.id);
    }
    insertPayment.run(lastInsertRowid, payment.method, netPayableCents, tenderedCents, changeCents, reference);
    if (voucher) {
      redeemVoucher.run(voucher.id);
    }
    if (customer) {
      adjustCustomerPoints.run(redeemPoints, pointsEarned, customer.id);
    }
    return lastInsertRowid;
  })();

  for (const item of resolvedItems) {
    await invalidateCachedProduct(item.product.barcode);
  }

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
