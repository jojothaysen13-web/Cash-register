import { apiFetch } from './client';
import type { Customer } from '../types';

export function findByCardNumber(cardNumber: string): Promise<{ customer: Customer }> {
  return apiFetch<{ customer: Customer }>(`/api/customers/card/${encodeURIComponent(cardNumber)}`);
}

export function listCustomers(): Promise<{ customers: Customer[] }> {
  return apiFetch<{ customers: Customer[] }>('/api/customers');
}

export function createCustomer(input: {
  cardNumber: string;
  fullName: string;
  phone?: string;
}): Promise<{ customer: Customer }> {
  return apiFetch<{ customer: Customer }>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
