import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearLastOrder,
  clearPendingPayment,
  createOrder,
  fetchOrderStatus,
  getLastOrder,
  getPendingPayment,
  getTableOrders,
  saveLastOrder,
  savePendingPayment,
  verifyPayment,
} from './orderApi';

// These tests run with no VITE_SUPABASE_* env vars, so the module's Supabase
// client is null and every call takes the offline/demo path. That is exactly
// the surface worth covering here: the local bookkeeping the customer relies on
// across a redirect to the payment provider.

function stubLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
  return store;
}

let store: Map<string, string>;

beforeEach(() => {
  store = stubLocalStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('createOrder (no backend configured)', () => {
  const items = [
    { id: 'p1', establishment_id: 'demo', category_id: 'c1', name: 'Pizza', price: 10000, is_available: true, quantity: 2 },
  ];

  it('falls back to a local confirmation instead of throwing', async () => {
    const order = await createOrder({ establishmentId: 'demo', items, total: 20000 });

    expect(order.source).toBe('local');
    expect(order.id).toBeTruthy();
  });

  it('derives a short human-readable reference', async () => {
    const order = await createOrder({ establishmentId: 'demo', items, total: 20000 });

    expect(order.reference).toMatch(/^#[A-Z0-9]{6}$/);
  });

  it('stays local even for a real-looking UUID when there is no client', async () => {
    const order = await createOrder({
      establishmentId: '11111111-1111-1111-1111-111111111111',
      items,
      total: 20000,
    });

    expect(order.source).toBe('local');
  });
});

describe('pending payment (survives the redirect to the provider)', () => {
  const pending = { id: 'order-1', reference: '#ABC123', slug: 'chez-a', ts: Date.now() };

  it('returns the payment saved for the same establishment', () => {
    savePendingPayment(pending);

    expect(getPendingPayment('chez-a')).toEqual(pending);
  });

  it('ignores a payment belonging to another establishment', () => {
    savePendingPayment(pending);

    expect(getPendingPayment('chez-b')).toBeNull();
  });

  it('stops offering it once the 15 minute window has passed', () => {
    vi.useFakeTimers();
    savePendingPayment({ ...pending, ts: Date.now() });

    vi.advanceTimersByTime(15 * 60 * 1000 + 1);

    expect(getPendingPayment('chez-a')).toBeNull();
  });

  it('still offers it just inside the window', () => {
    vi.useFakeTimers();
    savePendingPayment({ ...pending, ts: Date.now() });

    vi.advanceTimersByTime(14 * 60 * 1000);

    expect(getPendingPayment('chez-a')).not.toBeNull();
  });

  it('is dropped on clear', () => {
    savePendingPayment(pending);
    clearPendingPayment();

    expect(getPendingPayment('chez-a')).toBeNull();
  });
});

describe('last order (re-opening the tracker)', () => {
  const last = { id: 'order-2', reference: '#DEF456', slug: 'chez-a', ts: Date.now() };

  it('is returned for the matching establishment', () => {
    saveLastOrder(last);

    expect(getLastOrder('chez-a')).toEqual(last);
  });

  it('expires after three hours', () => {
    vi.useFakeTimers();
    saveLastOrder({ ...last, ts: Date.now() });

    vi.advanceTimersByTime(3 * 60 * 60 * 1000 + 1);

    expect(getLastOrder('chez-a')).toBeNull();
  });

  it('survives a corrupt entry rather than crashing the checkout', () => {
    store.set('moodpass.lastOrder', '{ not json');

    expect(getLastOrder('chez-a')).toBeNull();
  });

  it('is dropped on clear', () => {
    saveLastOrder(last);
    clearLastOrder();

    expect(getLastOrder('chez-a')).toBeNull();
  });
});

describe('several orders from the same table', () => {
  // A table orders drinks, then food, then dessert. Each is its own order and
  // the customer must be able to follow all of them.
  // Recent, and ordered: the tracker drops anything older than its TTL.
  const now = Date.now();
  const drinks = { id: 'order-a', reference: '#AAA111', slug: 'chez-a', ts: now - 2000 };
  const food = { id: 'order-b', reference: '#BBB222', slug: 'chez-a', ts: now - 1000 };

  it('does not let a new order erase the previous one', () => {
    saveLastOrder(drinks);
    saveLastOrder(food);

    expect(getTableOrders('chez-a').map((o) => o.id)).toEqual(['order-b', 'order-a']);
  });

  it('still surfaces the most recent as the tracked one', () => {
    saveLastOrder(drinks);
    saveLastOrder(food);

    expect(getLastOrder('chez-a')?.id).toBe('order-b');
  });

  it('updates an order in place rather than duplicating it', () => {
    saveLastOrder(drinks);
    saveLastOrder({ ...drinks, reference: '#RENAMED' });

    const all = getTableOrders('chez-a');
    expect(all).toHaveLength(1);
    expect(all[0].reference).toBe('#RENAMED');
  });

  it('dismisses one order without dropping the others', () => {
    saveLastOrder(drinks);
    saveLastOrder(food);

    clearLastOrder('order-b');

    expect(getTableOrders('chez-a').map((o) => o.id)).toEqual(['order-a']);
  });

  it('keeps each establishment separate', () => {
    saveLastOrder(food);
    saveLastOrder({ id: 'order-c', reference: '#CCC333', slug: 'chez-b', ts: now });

    expect(getTableOrders('chez-a').map((o) => o.id)).toEqual(['order-b']);
    expect(getTableOrders('chez-b').map((o) => o.id)).toEqual(['order-c']);
  });

  it('reads back an order saved in the older single-order format', () => {
    store.set('moodpass.lastOrder', JSON.stringify({ ...food, ts: Date.now() }));

    expect(getLastOrder('chez-a')?.id).toBe('order-b');
  });
});

describe('order id validation', () => {
  // Both helpers reject a non-UUID before reaching the network, so a stale or
  // hand-crafted local id never turns into a backend call.
  it('refuses to look up a status for a non-UUID', async () => {
    await expect(fetchOrderStatus('local-1730000000000')).resolves.toBeNull();
  });

  it('reports a non-UUID payment as unpaid', async () => {
    await expect(verifyPayment('local-1730000000000')).resolves.toEqual({ paid: false });
  });
});
