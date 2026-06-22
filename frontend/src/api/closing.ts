import { apiFetch } from './client';
import type { ClosingSummary } from '../types';

export function getClosingSummary(date?: string): Promise<ClosingSummary> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiFetch<ClosingSummary>(`/api/closing/summary${query}`);
}

export function closeDay(businessDate: string, countedCashCents: number) {
  return apiFetch<{ expectedCashCents: number; countedCashCents: number; differenceCents: number }>(
    '/api/closing',
    { method: 'POST', body: JSON.stringify({ businessDate, countedCashCents }) }
  );
}
