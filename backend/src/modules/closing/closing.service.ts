import { db } from '../../config/db';
import { HttpError } from '../../middleware/errorHandler';

export interface ClosingSummary {
  businessDate: string;
  totalCents: number;
  byMethod: { method: string; amountCents: number; count: number }[];
  expectedCashCents: number;
  alreadyClosed: boolean;
}

export function getSummary(cashierId: number, businessDate: string): ClosingSummary {
  const rows = db
    .prepare(
      `SELECT sp.method as method, SUM(sp.amount_cents) as amountCents, COUNT(*) as count
       FROM sale_payments sp
       JOIN sales s ON s.id = sp.sale_id
       WHERE s.cashier_id = ? AND s.business_date = ? AND s.status = 'completed'
       GROUP BY sp.method`
    )
    .all(cashierId, businessDate) as { method: string; amountCents: number; count: number }[];

  const totalCents = rows.reduce((sum, r) => sum + r.amountCents, 0);
  const expectedCashCents = rows.find((r) => r.method === 'cash')?.amountCents ?? 0;

  const closed = db
    .prepare('SELECT id FROM day_closings WHERE cashier_id = ? AND business_date = ?')
    .get(cashierId, businessDate);

  return {
    businessDate,
    totalCents,
    byMethod: rows,
    expectedCashCents,
    alreadyClosed: Boolean(closed),
  };
}

export function closeDay(
  cashierId: number,
  locationId: number | null,
  businessDate: string,
  countedCashCents: number
) {
  const existing = db
    .prepare('SELECT id FROM day_closings WHERE cashier_id = ? AND business_date = ?')
    .get(cashierId, businessDate);
  if (existing) {
    throw new HttpError(409, 'Tagesabschluss für dieses Datum wurde bereits erstellt.');
  }

  const { expectedCashCents } = getSummary(cashierId, businessDate);
  const differenceCents = countedCashCents - expectedCashCents;

  db.prepare(
    `INSERT INTO day_closings (cashier_id, location_id, business_date, expected_cash_cents, counted_cash_cents, difference_cents)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(cashierId, locationId, businessDate, expectedCashCents, countedCashCents, differenceCents);

  return { expectedCashCents, countedCashCents, differenceCents };
}
