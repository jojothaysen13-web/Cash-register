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
