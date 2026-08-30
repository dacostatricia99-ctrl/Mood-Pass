import { describe, expect, it } from 'vitest';
import { formatPrice } from './format';

describe('formatPrice', () => {
  it('keeps whole prices as they were', () => {
    expect(formatPrice(4500, 'FCFA')).toBe('4,500 FCFA');
  });

  it('does not invent precision the database cannot hold', () => {
    // 41 500 / 6 — an average basket, not a real till amount.
    expect(formatPrice(41500 / 6, 'FCFA')).toBe('6,916.67 FCFA');
  });

  it('still shows the two decimals a price column can hold', () => {
    expect(formatPrice(4.5, 'EUR')).toBe('4.5 EUR');
  });

  it('handles zero', () => {
    expect(formatPrice(0, 'FCFA')).toBe('0 FCFA');
  });
});
