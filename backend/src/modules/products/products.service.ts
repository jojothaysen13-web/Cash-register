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

export async function findByBarcode(barcode: string): Promise<Product> {
  const cached = await getCachedProduct(barcode);
  if (cached) return JSON.parse(cached) as Product;

  const product = db
    .prepare('SELECT * FROM products WHERE barcode = ? AND active = 1')
    .get(barcode) as Product | undefined;

  if (!product) {
    throw new HttpError(404, `Kein Artikel mit Barcode ${barcode} gefunden.`);
  }

  await setCachedProduct(barcode, JSON.stringify(product));
  return product;
}

export function searchByName(query: string): Product[] {
  return db
    .prepare(
      `SELECT * FROM products WHERE active = 1 AND name LIKE ? ORDER BY name LIMIT 25`
    )
    .all(`%${query}%`) as Product[];
}

export function listActive(): Product[] {
  return db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY name').all() as Product[];
}

export function listAll(): Product[] {
  return db.prepare('SELECT * FROM products ORDER BY name').all() as Product[];
}

export interface CreateProductInput {
  barcode: string;
  name: string;
  priceCents: number;
  taxRate: number;
  stockQty: number;
}

export function createProduct(input: CreateProductInput): Product {
  const exists = db.prepare('SELECT id FROM products WHERE barcode = ?').get(input.barcode.trim());
  if (exists) {
    throw new HttpError(409, 'Barcode wird bereits verwendet.');
  }
  const { lastInsertRowid } = db
    .prepare(
      'INSERT INTO products (barcode, name, price_cents, tax_rate, stock_qty) VALUES (?, ?, ?, ?, ?)'
    )
    .run(input.barcode.trim(), input.name.trim(), input.priceCents, input.taxRate, input.stockQty);
  return db.prepare('SELECT * FROM products WHERE id = ?').get(lastInsertRowid) as Product;
}

export interface UpdateProductInput {
  name?: string;
  priceCents?: number;
  taxRate?: number;
  stockQty?: number;
  active?: boolean;
}

export function updateProduct(id: number, input: UpdateProductInput): Product {
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!existing) {
    throw new HttpError(404, 'Artikel nicht gefunden.');
  }
  db.prepare(
    `UPDATE products SET
       name = COALESCE(?, name),
       price_cents = COALESCE(?, price_cents),
       tax_rate = COALESCE(?, tax_rate),
       stock_qty = COALESCE(?, stock_qty),
       active = COALESCE(?, active)
     WHERE id = ?`
  ).run(
    input.name ?? null,
    input.priceCents ?? null,
    input.taxRate ?? null,
    input.stockQty ?? null,
    input.active === undefined ? null : input.active ? 1 : 0,
    id
  );
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product;
}
