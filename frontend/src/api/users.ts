import { apiFetch } from './client';
import type { UserSummary } from '../types';

export function listUsers(): Promise<{ users: UserSummary[] }> {
  return apiFetch<{ users: UserSummary[] }>('/api/users');
}

export function createUser(input: {
  username: string;
  password: string;
  fullName: string;
  role: 'cashier' | 'admin';
  locationId?: number | null;
}): Promise<{ user: UserSummary }> {
  return apiFetch<{ user: UserSummary }>('/api/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function setUserActive(id: number, active: boolean): Promise<{ user: UserSummary }> {
  return apiFetch<{ user: UserSummary }>(`/api/users/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}
