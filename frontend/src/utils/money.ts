const formatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}
