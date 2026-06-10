/** Formats a price with the establishment's currency, e.g. "4 500 FCFA". */
export function formatPrice(amount: number, currency: string): string {
  return `${amount.toLocaleString()} ${currency}`;
}
