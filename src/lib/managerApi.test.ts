import { describe, expect, it } from 'vitest';
import {
  changeDue,
  computeStats,
  nextOrderStatus,
  KITCHEN_STATUSES,
  type OrderStatus,
  type OrderView,
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

describe('computeStats (demo aggregation)', () => {
  // Deliberately the same fixture and the same hand-computed figures as
  // supabase/tests/order_stats.sql. The stats screen runs whichever of the two
  // implementations is in play, so if they ever disagree one of these fails.
  const DAY_START = new Date('2026-08-25T00:00:00Z');
  const at = (days: number, hours: number) =>
    new Date(DAY_START.getTime() + (days * 24 + hours) * 3600_000).toISOString();

  const order = (
    id: string,
    createdAt: string,
    total: number,
    items: { quantity: number; name: string }[],
    status: OrderStatus = 'completed',
  ): OrderView => ({
    id, reference: `#${id}`, tableNumber: null, total, status,
    paymentMethod: 'cash', paymentStatus: 'paid', cashReceived: null, createdAt, items,
  });

  const fixture: OrderView[] = [
    order('d1', at(0, 10), 7000, [{ quantity: 2, name: 'Margherita' }]),
    order('d2', at(0, 12), 4500, [{ quantity: 1, name: 'Reine' }]),
    order('d3', at(-1, 12), 5000, [{ quantity: 1, name: 'Reine' }, { quantity: 1, name: 'Eau' }]),
    order('d4', at(-3, 12), 12500, [{ quantity: 3, name: 'Margherita' }, { quantity: 2, name: 'Coca-Cola' }]),
    order('d5', at(-8, 12), 4000, [{ quantity: 4, name: 'Coca-Cola' }]),
    order('d6', at(0, 13), 17500, [{ quantity: 5, name: 'Margherita' }], 'cancelled'),
  ];

  const stats = computeStats(fixture, DAY_START);

  it('totals today', () => {
    expect(stats.revenueToday).toBe(11500);
    expect(stats.ordersToday).toBe(2);
  });

  it('counts revenue older than the chart window', () => {
    expect(stats.totalRevenue).toBe(33000);
  });

  it('excludes cancelled orders', () => {
    expect(stats.orders).toBe(5);
  });

  it('ranks products by quantity sold, ignoring cancelled lines', () => {
    expect(stats.topProducts.map((p) => [p.name, p.qty])).toEqual([
      ['Coca-Cola', 6],
      ['Margherita', 5],
      ['Reine', 2],
      ['Eau', 1],
    ]);
  });

  it('buckets the last seven days, today last', () => {
    expect(stats.days).toHaveLength(7);
    expect(stats.days[6].value).toBe(11500);
    expect(stats.days[5].value).toBe(5000);
    expect(stats.days[3].value).toBe(12500);
    expect(stats.days[0].value).toBe(0);
  });

  it('leaves the pre-window revenue out of the chart', () => {
    const charted = stats.days.reduce((s, d) => s + d.value, 0);
    expect(charted).toBe(29000);
    expect(stats.totalRevenue - charted).toBe(4000);
  });

  it('keeps at most five products', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      order(`m${i}`, at(0, 1), 100, [{ quantity: i + 1, name: `P${i}` }]));
    expect(computeStats(many, DAY_START).topProducts).toHaveLength(5);
  });
});
