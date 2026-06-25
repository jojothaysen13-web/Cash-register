import { db } from '../../config/db';
import { getCachedProduct, setCachedProduct } from '../../config/redis';
import { HttpError } from '../../middleware/errorHandler';

export interface Product {
  id: number;
  barcode: string;
  name: string;
  price_cents: number;
  tax_rate: number;
  stock_qty: number;
  active: number;
}

interface CatalogRow {
  id: number;
  barcode: string;
  name: string;
  price_cents: number;
  tax_rate: number;
  active: number;
}

const CATALOG_COLUMNS = 'id, barcode, name, price_cents, tax_rate, active';

export function getStockAtLocation(productId: number, locationId: number): number {
  const row = db
    .prepare('SELECT qty_on_hand FROM product_stock WHERE product_id = ? AND location_id = ?')
    .get(productId, locationId) as { qty_on_hand: number } | undefined;
  return row?.qty_on_hand ?? 0;
}

function getTotalStock(productId: number): number {
  const row = db
    .prepare('SELECT COALESCE(SUM(qty_on_hand), 0) as total FROM product_stock WHERE product_id = ?')
    .get(productId) as { total: number };
  return row.total;
}

// Liefert den Bestand am angegebenen Standort, oder die Summe über alle Standorte,
// wenn kein Standort übergeben wird (z. B. Admin-Gesamtübersicht).
function withStock(catalog: CatalogRow, locationId: number | null): Product {
  return {
    ...catalog,
    stock_qty: locationId == null ? getTotalStock(catalog.id) : getStockAtLocation(catalog.id, locationId),
  };
}

// Bucht den Bestand eines Artikels an einem Standort um delta um (negativ = Abgang,
// positiv = Zugang) und legt die product_stock-Zeile bei Bedarf an.
export function adjustStock(productId: number, locationId: number, delta: number): void {
  db.prepare(
    `INSERT INTO product_stock (product_id, location_id, qty_on_hand) VALUES (?, ?, ?)
     ON CONFLICT(product_id, location_id) DO UPDATE SET qty_on_hand = qty_on_hand + ?`
  ).run(productId, locationId, delta, delta);
}

export async function findByBarcode(barcode: string, locationId: number | null): Promise<Product> {
  const cached = await getCachedProduct(barcode);
  let catalog: CatalogRow;
  if (cached) {
    catalog = JSON.parse(cached) as CatalogRow;
  } else {
    const row = db
      .prepare(`SELECT ${CATALOG_COLUMNS} FROM products WHERE barcode = ? AND active = 1`)
      .get(barcode) as CatalogRow | undefined;
    if (!row) {
      throw new HttpError(404, `Kein Artikel mit Barcode ${barcode} gefunden.`);
    }
    catalog = row;
    await setCachedProduct(barcode, JSON.stringify(catalog));
  }
  return withStock(catalog, locationId);
}

export function searchByName(query: string, locationId: number | null): Product[] {
  const rows = db
    .prepare(`SELECT ${CATALOG_COLUMNS} FROM products WHERE active = 1 AND name LIKE ? ORDER BY name LIMIT 25`)
    .all(`%${query}%`) as CatalogRow[];
  return rows.map((r) => withStock(r, locationId));
}

export function listActive(locationId: number | null): Product[] {
  const rows = db
    .prepare(`SELECT ${CATALOG_COLUMNS} FROM products WHERE active = 1 ORDER BY name`)
    .all() as CatalogRow[];
  return rows.map((r) => withStock(r, locationId));
}

export function listAll(locationId: number | null): Product[] {
  const rows = db.prepare(`SELECT ${CATALOG_COLUMNS} FROM products ORDER BY name`).all() as CatalogRow[];
  return rows.map((r) => withStock(r, locationId));
}

export interface CreateProductInput {
  barcode: string;
  name: string;
  priceCents: number;
  taxRate: number;
  stockQty: number;
  locationId?: number;
}

export function createProduct(input: CreateProductInput): Product {
  const exists = db.prepare('SELECT id FROM products WHERE barcode = ?').get(input.barcode.trim());
  if (exists) {
    throw new HttpError(409, 'Barcode wird bereits verwendet.');
  }
  const { lastInsertRowid } = db
    .prepare('INSERT INTO products (barcode, name, price_cents, tax_rate, stock_qty) VALUES (?, ?, ?, ?, 0)')
    .run(input.barcode.trim(), input.name.trim(), input.priceCents, input.taxRate);
  const productId = Number(lastInsertRowid);
  if (input.locationId && input.stockQty > 0) {
    adjustStock(productId, input.locationId, input.stockQty);
  }
  const catalog = db.prepare(`SELECT ${CATALOG_COLUMNS} FROM products WHERE id = ?`).get(productId) as CatalogRow;
  return withStock(catalog, input.locationId ?? null);
}

export interface UpdateProductInput {
  name?: string;
  priceCents?: number;
  taxRate?: number;
  active?: boolean;
  stockQty?: number;
  locationId?: number;
}

export function updateProduct(id: number, input: UpdateProductInput): Product {
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!existing) {
    throw new HttpError(404, 'Artikel nicht gefunden.');
  }
  if (input.stockQty !== undefined && !input.locationId) {
    throw new HttpError(400, 'Zum Ändern des Bestands wird ein Standort benötigt.');
  }
  db.prepare(
    `UPDATE products SET
       name = COALESCE(?, name),
       price_cents = COALESCE(?, price_cents),
       tax_rate = COALESCE(?, tax_rate),
       active = COALESCE(?, active)
     WHERE id = ?`
  ).run(
    input.name ?? null,
    input.priceCents ?? null,
    input.taxRate ?? null,
    input.active === undefined ? null : input.active ? 1 : 0,
    id
  );
  if (input.stockQty !== undefined && input.locationId) {
    db.prepare(
      `INSERT INTO product_stock (product_id, location_id, qty_on_hand) VALUES (?, ?, ?)
       ON CONFLICT(product_id, location_id) DO UPDATE SET qty_on_hand = excluded.qty_on_hand`
    ).run(id, input.locationId, input.stockQty);
  }
  const catalog = db.prepare(`SELECT ${CATALOG_COLUMNS} FROM products WHERE id = ?`).get(id) as CatalogRow;
  return withStock(catalog, input.locationId ?? null);
}
