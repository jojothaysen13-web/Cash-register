import { db } from '../../config/db';
import { HttpError } from '../../middleware/errorHandler';
import { assertCardPaymentSucceeded } from '../payments/payments.service';
import { invalidateCachedProduct } from '../../config/redis';

export interface SaleItemInput {
  productId: number;
  qty: number;
}

export type SalePaymentInput =
  | { method: 'cash'; tenderedCents: number }
  | { method: 'card'; paymentIntentId: string }
  | { method: 'voucher'; code: string };

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

function taxPortionCents(grossCents: number, ratePercent: number): number {
  return Math.round(grossCents - grossCents / (1 + ratePercent / 100));
}

export async function createSale(
  cashierId: number,
  items: SaleItemInput[],
  payment: SalePaymentInput
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

  let voucher: VoucherRow | null = null;
  let changeCents: number | null = null;
  let tenderedCents: number | null = null;
  let reference: string | null = null;

  if (payment.method === 'cash') {
    if (payment.tenderedCents < totalCents) {
      throw new HttpError(400, 'Gegebener Betrag reicht nicht aus.');
    }
    tenderedCents = payment.tenderedCents;
    changeCents = payment.tenderedCents - totalCents;
  } else if (payment.method === 'card') {
    await assertCardPaymentSucceeded(payment.paymentIntentId);
    reference = payment.paymentIntentId;
  } else {
    voucher = db
      .prepare('SELECT * FROM vouchers WHERE code = ?')
      .get(payment.code.trim().toUpperCase()) as VoucherRow | undefined ?? null;
    if (!voucher || !voucher.active) {
      throw new HttpError(404, 'Gutschein nicht gefunden.');
    }
    if (voucher.redeemed_at) {
      throw new HttpError(409, 'Gutschein wurde bereits eingelöst.');
    }
    if (voucher.value_cents < totalCents) {
      throw new HttpError(
        400,
        'Gutscheinwert reicht nicht aus (Teilzahlung/Split folgt in einer späteren Phase).'
      );
    }
    reference = voucher.code;
  }

  const businessDate = new Date().toISOString().slice(0, 10);

  const insertSale = db.prepare(
    `INSERT INTO sales (cashier_id, total_cents, tax_cents, business_date) VALUES (?, ?, ?, ?)`
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

  const saleId = db.transaction(() => {
    const { lastInsertRowid } = insertSale.run(cashierId, totalCents, taxCents, businessDate);
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
    insertPayment.run(lastInsertRowid, payment.method, totalCents, tenderedCents, changeCents, reference);
    if (voucher) {
      redeemVoucher.run(voucher.id);
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
  };
}
