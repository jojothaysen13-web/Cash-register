import { apiFetch } from './client';
import type { ReportRange, ReportSummary } from '../types';

export function getReport(range: ReportRange, date: string): Promise<ReportSummary> {
  return apiFetch<ReportSummary>(`/api/reports?range=${range}&date=${date}`);
}
