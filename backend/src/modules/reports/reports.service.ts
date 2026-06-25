import { db } from '../../config/db';

export type ReportRange = 'day' | 'week' | 'month';

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dateRangeFor(range: ReportRange, referenceDate: string): { from: string; to: string } {
  const ref = new Date(`${referenceDate}T00:00:00`);
  if (range === 'day') {
    return { from: referenceDate, to: referenceDate };
  }
  if (range === 'week') {
    const monday = startOfWeek(ref);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: toISODate(monday), to: toISODate(sunday) };
  }
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const last = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return { from: toISODate(first), to: toISODate(last) };
}

export interface ReportSummary {
  range: ReportRange;
  from: string;
  to: string;
  locationId: number | null;
  totalCents: number;
  taxCents: number;
  saleCount: number;
  byMethod: { method: string; amountCents: number; count: number }[];
  topProducts: { name: string; qty: number; revenueCents: number }[];
  returnsCents: number;
  returnsCount: number;
  byLocation: { locationId: number; locationName: string; totalCents: number; saleCount: number }[];
}

export function getReport(
  range: ReportRange,
  referenceDate: string,
  locationId: number | null = null
): ReportSummary {
  const { from, to } = dateRangeFor(range, referenceDate);
  const salesLocationFilter = locationId != null ? 'AND s.location_id = ?' : '';
  const bareLocationFilter = locationId != null ? 'AND location_id = ?' : '';
  const locationParams = locationId != null ? [locationId] : [];

  const totals = db
    .prepare(
      `SELECT COALESCE(SUM(total_cents),0) as totalCents, COALESCE(SUM(tax_cents),0) as taxCents, COUNT(*) as saleCount
       FROM sales s WHERE business_date BETWEEN ? AND ? AND status = 'completed' ${salesLocationFilter}`
    )
    .get(from, to, ...locationParams) as { totalCents: number; taxCents: number; saleCount: number };

  const byMethod = db
    .prepare(
      `SELECT sp.method as method, SUM(sp.amount_cents) as amountCents, COUNT(*) as count
       FROM sale_payments sp
       JOIN sales s ON s.id = sp.sale_id
       WHERE s.business_date BETWEEN ? AND ? AND s.status = 'completed' ${salesLocationFilter}
       GROUP BY sp.method`
    )
    .all(from, to, ...locationParams) as { method: string; amountCents: number; count: number }[];

  const topProducts = db
    .prepare(
      `SELECT si.name_snapshot as name, SUM(si.qty) as qty, SUM(si.line_total_cents) as revenueCents
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.business_date BETWEEN ? AND ? AND s.status = 'completed' ${salesLocationFilter}
       GROUP BY si.product_id
       ORDER BY revenueCents DESC
       LIMIT 10`
    )
    .all(from, to, ...locationParams) as { name: string; qty: number; revenueCents: number }[];

  const returns = db
    .prepare(
      `SELECT COALESCE(SUM(total_refund_cents),0) as returnsCents, COUNT(*) as returnsCount
       FROM returns WHERE business_date BETWEEN ? AND ? ${bareLocationFilter}`
    )
    .get(from, to, ...locationParams) as { returnsCents: number; returnsCount: number };

  // Standort-Vergleich: unabhängig von einem evtl. gesetzten Standortfilter, damit
  // Admins immer alle Standorte nebeneinander sehen können.
  const byLocation = db
    .prepare(
      `SELECT l.id as locationId, l.name as locationName,
              COALESCE(SUM(s.total_cents),0) as totalCents, COUNT(s.id) as saleCount
       FROM locations l
       LEFT JOIN sales s ON s.location_id = l.id AND s.business_date BETWEEN ? AND ? AND s.status = 'completed'
       GROUP BY l.id
       ORDER BY l.name`
    )
    .all(from, to) as { locationId: number; locationName: string; totalCents: number; saleCount: number }[];

  return {
    range,
    from,
    to,
    locationId,
    totalCents: totals.totalCents,
    taxCents: totals.taxCents,
    saleCount: totals.saleCount,
    byMethod,
    topProducts,
    returnsCents: returns.returnsCents,
    returnsCount: returns.returnsCount,
    byLocation,
  };
}
