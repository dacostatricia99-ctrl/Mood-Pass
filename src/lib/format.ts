/**
 * Formats a price with the establishment's currency, e.g. "4 500 FCFA".
 *
 * Capped at the two decimals the database actually stores, so a derived figure
 * like an average basket cannot display precision that does not exist — it read
 * "6,916.667 FCFA" before, a third of a franc no till can give back.
 */
export function formatPrice(amount: number, currency: string): string {
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}
