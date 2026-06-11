import type { CartItem } from '../types';
import { supabase } from './supabase';

export interface PlacedOrder {
  id: string;
  /** Short human-readable reference shown on the confirmation screen. */
  reference: string;
  source: 'remote' | 'local';
}

export type TrackStatus = 'pending' | 'accepted' | 'completed' | 'cancelled';

/**
 * Reads the current status of a single order by id, for customer tracking.
 * Uses the `get_order_status` RPC (SECURITY DEFINER) since anonymous customers
 * cannot SELECT the orders table directly. Returns null when unavailable.
 */
export async function fetchOrderStatus(orderId: string): Promise<TrackStatus | null> {
  if (!supabase || !UUID_RE.test(orderId)) return null;
  const { data, error } = await supabase.rpc('get_order_status', { order_id: orderId });
  if (error) return null;
  return (data as TrackStatus | null) ?? null;
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
export type PaymentMethod = 'cash' | 'mobile_money';

export async function createOrder(params: {
  establishmentId: string;
  items: CartItem[];
  total: number;
  tableNumber?: string;
  paymentMethod?: PaymentMethod;
}): Promise<PlacedOrder> {
  const { establishmentId, items, total, tableNumber, paymentMethod = 'cash' } = params;

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
      payment_method: paymentMethod,
      // Cash is settled in person (unpaid until the manager confirms); mobile
      // money starts pending until the payment provider confirms it.
      payment_status: paymentMethod === 'cash' ? 'unpaid' : 'pending',
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
