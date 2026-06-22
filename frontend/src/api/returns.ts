import { apiFetch } from './client';
import type { RefundMethod, ReturnResult, SaleDetail } from '../types';

export function getSale(saleId: number): Promise<SaleDetail> {
  return apiFetch<SaleDetail>(`/api/sales/${saleId}`);
}

export function createReturn(input: {
  saleId: number;
  items: { saleItemId: number; qty: number }[];
  refundMethod: RefundMethod;
}): Promise<ReturnResult> {
  return apiFetch<ReturnResult>('/api/returns', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
