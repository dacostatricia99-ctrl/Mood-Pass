import type { LocalizedField } from '../types';
import { supabase } from './supabase';

export type OrderStatus = 'pending' | 'accepted' | 'completed' | 'cancelled';

export interface OrderItemView {
  quantity: number;
  name: string;
  nameI18n?: LocalizedField;
}

export interface OrderView {
  id: string;
  reference: string;
  tableNumber: string | null;
  total: number;
  status: OrderStatus;
  createdAt: string;
  items: OrderItemView[];
}

export interface ManagerEstablishment {
  id: string;
  currency: string;
}

function shortRef(id: string): string {
  return `#${id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`;
}

/** Resolves an establishment (id + currency) from its slug, or null. */
export async function fetchEstablishmentBySlug(slug: string): Promise<ManagerEstablishment | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('establishments')
    .select('id, currency')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, currency: (data.currency as string) ?? 'FCFA' };
}

/** Counts pending orders for an establishment (owner-only via RLS). */
export async function countPendingOrders(establishmentId: string): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('establishment_id', establishmentId)
    .eq('status', 'pending');
  if (error) return 0;
  return count ?? 0;
}

interface OrderRow {
  id: string;
  table_number: string | null;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  order_items: {
    quantity: number;
    products: { name: string; name_i18n?: LocalizedField } | { name: string; name_i18n?: LocalizedField }[] | null;
  }[] | null;
}

/** Loads an establishment's orders (most recent first) with their line items. */
export async function fetchOrders(establishmentId: string): Promise<OrderView[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('orders')
    .select('id, table_number, total_amount, status, created_at, order_items(quantity, products(name, name_i18n))')
    .eq('establishment_id', establishmentId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return (data as OrderRow[]).map((row) => ({
    id: row.id,
    reference: shortRef(row.id),
    tableNumber: row.table_number,
    total: row.total_amount,
    status: row.status,
    createdAt: row.created_at,
    items: (row.order_items ?? []).map((item) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      return {
        quantity: item.quantity,
        name: product?.name ?? '',
        nameI18n: product?.name_i18n,
      };
    }),
  }));
}

/** Updates an order's status (owner-only via RLS). */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
  if (error) throw error;
}

/**
 * Subscribes to live order changes for an establishment. Calls `onChange` on any
 * insert/update/delete. Returns an unsubscribe function (no-op without a backend).
 */
export function subscribeToOrders(establishmentId: string, onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`orders:${establishmentId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `establishment_id=eq.${establishmentId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

/**
 * Sends a natural-language management request to the AI Manager Edge Function
 * and returns its reply. Throws on transport/function errors.
 */
export async function sendManagerQuery(params: { query: string; establishmentId: string }): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.functions.invoke('mood-ai-manager', {
    body: { query: params.query, establishment_id: params.establishmentId },
  });
  if (error) throw error;
  return (data?.reply as string) ?? '';
}
