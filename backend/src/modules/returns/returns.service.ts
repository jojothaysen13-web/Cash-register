import Stripe from 'stripe';
import { db } from '../../config/db';
import { env } from '../../config/env';
import { HttpError } from '../../middleware/errorHandler';
import { adjustStock } from '../products/products.service';

const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

export interface ReturnItemInput {
  saleItemId: number;
  qty: number;
}

export type RefundMethod = 'cash' | 'card' | 'voucher_credit';

interface SaleItemRow {
  id: number;
  sale_id: number;
  product_id: number;
  name_snapshot: string;
  unit_price_cents: number;
  qty: number;
  returned_qty: number;
}

function randomVoucherCode(): string {
  return `ERSATZ${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function createReturn(
  cashierId: number,
  locationId: number | null,
  saleId: number,
  items: ReturnItemInput[],
  refundMethod: RefundMethod
) {
  if (items.length === 0) {
    throw new HttpError(400, 'Keine Artikel zur Rückgabe ausgewählt.');
  }
  if (!locationId) {
    throw new HttpError(400, 'Kein Standort zugewiesen — Rückgaben benötigen einen Standort.');
  }

  const sale = db.prepare('SELECT id FROM sales WHERE id = ?').get(saleId) as
    | { id: number }
    | undefined;
  if (!sale) {
    throw new HttpError(404, `Verkauf #${saleId} nicht gefunden.`);
  }

  const getSaleItem = db.prepare('SELECT * FROM sale_items WHERE id = ? AND sale_id = ?');
  const resolved = items.map((item) => {
    const row = getSaleItem.get(item.saleItemId, saleId) as SaleItemRow | undefined;
    if (!row) {
      throw new HttpError(404, `Position ${item.saleItemId} gehört nicht zu diesem Verkauf.`);
    }
    const remaining = row.qty - row.returned_qty;
    if (item.qty < 1 || item.qty > remaining) {
      throw new HttpError(
        409,
        `Maximal ${remaining}x "${row.name_snapshot}" kann zurückgegeben werden.`
      );
    }
    return { row, qty: item.qty, refundCents: row.unit_price_cents * item.qty };
  });

  const totalRefundCents = resolved.reduce((sum, r) => sum + r.refundCents, 0);

  let refundReference: string | null = null;
  if (refundMethod === 'card') {
    const cardPayment = db
      .prepare("SELECT reference FROM sale_payments WHERE sale_id = ? AND method = 'card'")
      .get(saleId) as { reference: string } | undefined;
    if (!cardPayment) {
      throw new HttpError(400, 'Dieser Verkauf wurde nicht per Karte bezahlt.');
    }
    if (stripe && !cardPayment.reference.startsWith('pi_mock_')) {
      const refund = await stripe.refunds.create({
        payment_intent: cardPayment.reference,
        amount: totalRefundCents,
      });
      refundReference = refund.id;
    } else {
      refundReference = `mock_refund_${Date.now()}`;
    }
  } else if (refundMethod === 'voucher_credit') {
    refundReference = randomVoucherCode();
  }

  const businessDate = new Date().toISOString().slice(0, 10);

  const insertReturn = db.prepare(
    `INSERT INTO returns (sale_id, cashier_id, location_id, total_refund_cents, refund_method, refund_reference, business_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertReturnItem = db.prepare(
    `INSERT INTO return_items (return_id, sale_item_id, product_id, qty, refund_cents) VALUES (?, ?, ?, ?, ?)`
  );
  const bumpReturned = db.prepare('UPDATE sale_items SET returned_qty = returned_qty + ? WHERE id = ?');
  const insertVoucherCredit = db.prepare('INSERT INTO vouchers (code, value_cents) VALUES (?, ?)');

  const returnId = db.transaction(() => {
    const { lastInsertRowid } = insertReturn.run(
      saleId,
      cashierId,
      locationId,
      totalRefundCents,
      refundMethod,
      refundReference,
      businessDate
    );
    for (const item of resolved) {
      insertReturnItem.run(lastInsertRowid, item.row.id, item.row.product_id, item.qty, item.refundCents);
      bumpReturned.run(item.qty, item.row.id);
      // Der zurückgegebene Artikel liegt physisch wieder am Standort der Rückgabe,
      // nicht notwendigerweise am ursprünglichen Verkaufsstandort.
      adjustStock(item.row.product_id, locationId, item.qty);
    }
    if (refundMethod === 'voucher_credit' && refundReference) {
      insertVoucherCredit.run(refundReference, totalRefundCents);
    }
    return lastInsertRowid;
  })();

  return { returnId, totalRefundCents, refundMethod, refundReference, businessDate };
}
