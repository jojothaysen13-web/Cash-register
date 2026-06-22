import { apiFetch } from './client';
import type { User } from '../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export function login(username: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}
