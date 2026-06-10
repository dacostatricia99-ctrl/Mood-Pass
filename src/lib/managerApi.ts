import type { Category, LocalizedField, Product } from '../types';
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

export type OrderChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Subscribes to live order changes for an establishment. Calls `onChange` with
 * the event type on any insert/update/delete so callers can react specifically
 * to new orders. Returns an unsubscribe function (no-op without a backend).
 */
export function subscribeToOrders(
  establishmentId: string,
  onChange: (event: OrderChangeEvent) => void,
): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`orders:${establishmentId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `establishment_id=eq.${establishmentId}` },
      (payload) => onChange(payload.eventType as OrderChangeEvent),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

export interface MenuData {
  categories: Category[];
  products: Product[];
}

/** Loads the full menu (categories + products, available or not) for editing. */
export async function fetchMenu(establishmentId: string): Promise<MenuData> {
  if (!supabase) return { categories: [], products: [] };
  const [cats, prods] = await Promise.all([
    supabase
      .from('categories')
      .select('id, establishment_id, name, name_i18n, display_order')
      .eq('establishment_id', establishmentId)
      .order('display_order', { ascending: true }),
    supabase
      .from('products')
      .select('id, establishment_id, category_id, name, description, name_i18n, description_i18n, price, image_url, is_available')
      .eq('establishment_id', establishmentId)
      .order('created_at', { ascending: true }),
  ]);
  return {
    categories: (cats.data as Category[]) ?? [],
    products: (prods.data as Product[]) ?? [],
  };
}

/** Creates a category at the end of the list. Returns the new row. */
export async function createCategory(establishmentId: string, name: string, displayOrder: number): Promise<Category> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('categories')
    .insert({ establishment_id: establishmentId, name: name.trim(), display_order: displayOrder })
    .select('id, establishment_id, name, name_i18n, display_order')
    .single();
  if (error) throw error;
  return data as Category;
}

/** Renames a category. */
export async function updateCategory(categoryId: string, name: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('categories').update({ name: name.trim() }).eq('id', categoryId);
  if (error) throw error;
}

/** Deletes a category (and its products, via ON DELETE CASCADE). */
export async function deleteCategory(categoryId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error) throw error;
}

export interface ProductInput {
  establishmentId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
}

/** Creates a product. i18n maps are left empty — the UI falls back to canonical text. */
export async function createProduct(input: ProductInput): Promise<Product> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('products')
    .insert({
      establishment_id: input.establishmentId,
      category_id: input.categoryId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      price: input.price,
    })
    .select('id, establishment_id, category_id, name, description, name_i18n, description_i18n, price, image_url, is_available')
    .single();
  if (error) throw error;
  return data as Product;
}

/** Updates editable product fields (name, description, price). */
export async function updateProduct(
  productId: string,
  patch: { name?: string; description?: string | null; price?: number },
): Promise<void> {
  if (!supabase) return;
  const clean: Record<string, unknown> = {};
  if (patch.name !== undefined) clean.name = patch.name.trim();
  if (patch.description !== undefined) clean.description = patch.description?.toString().trim() || null;
  if (patch.price !== undefined) clean.price = patch.price;
  const { error } = await supabase.from('products').update(clean).eq('id', productId);
  if (error) throw error;
}

/** Toggles whether a product is shown to customers. */
export async function setProductAvailability(productId: string, isAvailable: boolean): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('products').update({ is_available: isAvailable }).eq('id', productId);
  if (error) throw error;
}

/** Deletes a product. */
export async function deleteProduct(productId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) throw error;
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
