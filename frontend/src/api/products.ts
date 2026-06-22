import { apiFetch } from './client';
import type { Product } from '../types';

export function findByBarcode(barcode: string): Promise<{ product: Product }> {
  return apiFetch<{ product: Product }>(`/api/products/barcode/${encodeURIComponent(barcode)}`);
}

export function searchProducts(query: string): Promise<{ products: Product[] }> {
  return apiFetch<{ products: Product[] }>(`/api/products?q=${encodeURIComponent(query)}`);
}
