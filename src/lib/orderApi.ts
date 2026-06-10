import type { CartItem } from '../types';
import { supabase } from './supabase';

export interface PlacedOrder {
  id: string;
  /** Short human-readable reference shown on the confirmation screen. */
  reference: string;
  source: 'remote' | 'local';
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function shortRef(id: string): string {
  const clean = id.replace(/[^a-zA-Z0-9]/g, '');
  return `#${clean.slice(-6).toUpperCase()}`;
}

function randomId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `local-${Date.now()}`;
}

/**
 * Creates an order and its line items.
 *
 * Persists to Supabase when configured and the establishment id is a real UUID
 * (i.e. not the demo data). Otherwise returns a local-only confirmation so the
 * checkout flow still works on the bundled demo menu.
 */
export async function createOrder(params: {
  establishmentId: string;
  items: CartItem[];
  total: number;
  tableNumber?: string;
}): Promise<PlacedOrder> {
  const { establishmentId, items, total, tableNumber } = params;

  if (!supabase || !UUID_RE.test(establishmentId)) {
    const id = randomId();
    return { id, reference: shortRef(id), source: 'local' };
  }

  // The customer is anonymous and (by design) cannot read back orders, so we
  // generate the id client-side and avoid a RETURNING/SELECT after insert.
  const orderId = randomId();

  const { error: orderError } = await supabase
    .from('orders')
    .insert({
      id: orderId,
      establishment_id: establishmentId,
      table_number: tableNumber?.trim() || null,
      total_amount: total,
    });

  if (orderError) throw orderError;

  const rows = items.map((item) => ({
    order_id: orderId,
    product_id: item.id,
    quantity: item.quantity,
    unit_price: item.price,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(rows);
  if (itemsError) throw itemsError;

  return { id: orderId, reference: shortRef(orderId), source: 'remote' };
}
