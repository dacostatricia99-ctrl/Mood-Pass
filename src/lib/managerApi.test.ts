import { describe, expect, it } from 'vitest';
import {
  changeDue,
  nextOrderStatus,
  KITCHEN_STATUSES,
  OPEN_STATUSES,
  type OrderStatus,
} from './managerApi';

describe('order lifecycle', () => {
  it('walks new → preparing → ready → served → completed', () => {
    const walk: OrderStatus[] = ['new'];
    let cur = nextOrderStatus('new');
    while (cur) {
      walk.push(cur);
      cur = nextOrderStatus(cur);
    }

    expect(walk).toEqual(['new', 'preparing', 'ready', 'served', 'completed']);
  });

  it('ends at completed', () => {
    expect(nextOrderStatus('completed')).toBeNull();
  });

  it('does not resurrect a cancelled order', () => {
    expect(nextOrderStatus('cancelled')).toBeNull();
  });

  it('keeps the kitchen queue to what still has to be cooked', () => {
    // Once ready, the order belongs to the floor, not the kitchen.
    expect(KITCHEN_STATUSES).toEqual(['new', 'preparing']);
    expect(KITCHEN_STATUSES).not.toContain('ready');
  });

  it('treats everything up to served as still open', () => {
    expect(OPEN_STATUSES).toEqual(['new', 'preparing', 'ready', 'served']);
    expect(OPEN_STATUSES).not.toContain('completed');
  });
});

describe('cash change', () => {
  it('computes the worked example from the spec', () => {
    // Total 9 500, customer hands over 10 000.
    expect(changeDue(9500, 10000)).toBe(500);
  });

  it('gives nothing back on the exact amount', () => {
    expect(changeDue(9500, 9500)).toBe(0);
  });

  it('never reports negative change when the cash is short', () => {
    expect(changeDue(9500, 5000)).toBe(0);
  });

  it('does not drift on decimal amounts', () => {
    expect(changeDue(0.1 + 0.2, 1)).toBe(0.7);
  });
});
