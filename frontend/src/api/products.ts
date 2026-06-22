import { apiFetch } from './client';
import type { Product } from '../types';

export function findByBarcode(barcode: string): Promise<{ product: Product }> {
  return apiFetch<{ product: Product }>(`/api/products/barcode/${encodeURIComponent(barcode)}`);
}

export function searchProducts(query: string): Promise<{ products: Product[] }> {
  return apiFetch<{ products: Product[] }>(`/api/products?q=${encodeURIComponent(query)}`);
}

export function listAllProducts(): Promise<{ products: Product[] }> {
  return apiFetch<{ products: Product[] }>('/api/products/all');
}

export interface CreateProductInput {
  barcode: string;
  name: string;
  priceCents: number;
  taxRate: number;
  stockQty: number;
}

export function createProduct(input: CreateProductInput): Promise<{ product: Product }> {
  return apiFetch<{ product: Product }>('/api/products', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface UpdateProductInput {
  name?: string;
  priceCents?: number;
  taxRate?: number;
  stockQty?: number;
  active?: boolean;
}

export function updateProduct(id: number, input: UpdateProductInput): Promise<{ product: Product }> {
  return apiFetch<{ product: Product }>(`/api/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
