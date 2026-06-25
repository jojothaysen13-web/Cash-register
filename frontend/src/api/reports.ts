import { apiFetch } from './client';
import type { ReportRange, ReportSummary } from '../types';

export function getReport(range: ReportRange, date: string, locationId?: number): Promise<ReportSummary> {
  let url = `/api/reports?range=${range}&date=${date}`;
  if (locationId) url += `&locationId=${locationId}`;
  return apiFetch<ReportSummary>(url);
}
