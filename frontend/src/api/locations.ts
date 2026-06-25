import { apiFetch } from './client';
import type { Location } from '../types';

export function listLocations(): Promise<{ locations: Location[] }> {
  return apiFetch<{ locations: Location[] }>('/api/locations');
}

export function createLocation(name: string, code: string): Promise<{ location: Location }> {
  return apiFetch<{ location: Location }>('/api/locations', {
    method: 'POST',
    body: JSON.stringify({ name, code }),
  });
}

export function setLocationActive(id: number, active: boolean): Promise<{ location: Location }> {
  return apiFetch<{ location: Location }>(`/api/locations/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}
