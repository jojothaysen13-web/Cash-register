const formatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/**
 * Wandelt eine Geldeingabe in Cent um und akzeptiert dabei sowohl die deutsche
 * Komma- als auch die Punkt-Schreibweise (z. B. "10,50" wie "10.50").
 * Gibt NaN zurück, wenn die Eingabe keine gültige Zahl ist.
 */
export function parseAmountToCents(input: string): number {
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.');
  if (normalized === '') return NaN;
  const value = parseFloat(normalized);
  if (Number.isNaN(value)) return NaN;
  return Math.round(value * 100);
}
