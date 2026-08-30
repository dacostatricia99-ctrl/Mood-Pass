import type { Category, LocalizedField, Product } from '../types';
import { supabase } from './supabase';

/**
 * Where the food is. Never gated by payment — the kitchen starts cooking the
 * moment the customer validates, whether or not the bill has been settled.
 */
export type OrderStatus = 'new' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

/**
 * Where the money is. `cash_pending` is the window between the server bringing
 * the bill to the table and the cash changing hands; `pending` is a
 * mobile-money deposit in flight with the provider.
 */
export type PaymentMethod = 'cash' | 'mobile_money';
export type PaymentStatus = 'unpaid' | 'pending' | 'cash_pending' | 'paid';

/** The kitchen's queue: what still has to be cooked. */
export const KITCHEN_STATUSES: OrderStatus[] = ['new', 'preparing'];

/** What the order becomes when the current step is done, or null at the end. */
export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case 'new': return 'preparing';
    case 'preparing': return 'ready';
    case 'ready': return 'served';
    case 'served': return 'completed';
    default: return null;
  }
}

/** Change owed back to the customer, floored at zero. */
export function changeDue(total: number, received: number): number {
  return Math.max(0, Math.round((received - total) * 100) / 100);
}

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
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  /** What the customer handed over in cash, once settled. */
  cashReceived: number | null;
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

export interface MyEstablishment {
  id: string;
  name: string;
  slug: string;
}

export interface AdminRow {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  ownerEmail: string;
  status: string;
  currentPeriodEnd: string | null;
  active: boolean;
  orders: number;
}

export interface AdminOverview {
  totals: { establishments: number; active: number; trial: number; expired: number; orders: number; mrr: number };
  establishments: AdminRow[];
}

/** Platform super-admin overview (server enforces the admin email allowlist). */
export async function fetchAdminOverview(): Promise<AdminOverview | { error: string }> {
  if (!supabase) return { error: 'not-configured' };
  const { data, error } = await supabase.functions.invoke('admin-overview', { body: {} });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return data as AdminOverview;
}

/** Grants/extends 30 days of subscription to an establishment (admin only). */
export async function adminGrant(establishmentId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.functions.invoke('admin-overview', {
    body: { action: 'grant', establishment_id: establishmentId },
  });
  return !error && Boolean(data?.ok);
}

export interface Subscription {
  status: 'trial' | 'active' | 'expired';
  currentPeriodEnd: string;
  /** True while the trial or paid period still covers the current time. */
  active: boolean;
}

/** Reads an establishment's Mood Pass subscription (owner-only via RLS). */
export async function getSubscription(establishmentId: string): Promise<Subscription | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('establishment_id', establishmentId)
    .maybeSingle();
  if (error || !data) return null;
  const end = data.current_period_end as string;
  return {
    status: (data.status as Subscription['status']) ?? 'expired',
    currentPeriodEnd: end,
    active: new Date(end).getTime() >= Date.now(),
  };
}

/**
 * Starts a subscription payment (restaurant -> Mood Pass) via the platform's
 * own provider account. Returns a redirect URL (real) or { simulated } (sandbox,
 * which extends the subscription immediately).
 */
export async function startSubscriptionPayment(
  establishmentId: string,
): Promise<{ paymentUrl?: string; simulated?: boolean; error?: string }> {
  if (!supabase) return { error: 'not-configured' };
  const { data, error } = await supabase.functions.invoke('create-subscription-payment', {
    body: { establishment_id: establishmentId, return_url: window.location.href },
  });
  if (error) return { error: error.message };
  return { paymentUrl: data?.payment_url, simulated: Boolean(data?.simulated || data?.extended) };
}

/** Lists the establishments owned by the current user (for the manager home). */
export async function fetchMyEstablishments(): Promise<MyEstablishment[]> {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from('establishments')
    .select('id, name, slug')
    .eq('owner_id', uid)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data as MyEstablishment[];
}

export interface EstablishmentSettings {
  id: string;
  name: string;
  currency: string;
  phone: string | null;
  logoUrl: string | null;
}

/** Loads editable establishment details from its slug (owner-facing). */
export async function getEstablishmentSettings(slug: string): Promise<EstablishmentSettings | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('establishments')
    .select('id, name, currency, phone, logo_url')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string,
    name: (data.name as string) ?? '',
    currency: (data.currency as string) ?? 'FCFA',
    phone: (data.phone as string) ?? null,
    logoUrl: (data.logo_url as string) ?? null,
  };
}

/** Updates editable establishment details (owner-only via RLS). */
export async function updateEstablishment(
  id: string,
  patch: { name?: string; currency?: string; phone?: string | null },
): Promise<void> {
  if (!supabase) return;
  const clean: Record<string, unknown> = {};
  if (patch.name !== undefined) clean.name = patch.name.trim();
  if (patch.currency !== undefined) clean.currency = patch.currency.trim() || 'FCFA';
  if (patch.phone !== undefined) clean.phone = patch.phone?.toString().trim() || null;
  const { error } = await supabase.from('establishments').update(clean).eq('id', id);
  if (error) throw error;
}

/** Deletes the manager's establishment (owner-checked server-side). */
export async function deleteEstablishment(establishmentId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('delete_establishment', { est_id: establishmentId });
  if (error) throw error;
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

/** Counts orders still waiting for the kitchen (owner-only via RLS). */
export async function countPendingOrders(establishmentId: string): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('establishment_id', establishmentId)
    .eq('status', 'new');
  if (error) return 0;
  return count ?? 0;
}

interface OrderRow {
  id: string;
  table_number: string | null;
  total_amount: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  cash_received: number | null;
  created_at: string;
  order_items: {
    quantity: number;
    products: { name: string; name_i18n?: LocalizedField } | { name: string; name_i18n?: LocalizedField }[] | null;
  }[] | null;
}

const ORDER_COLUMNS =
  'id, table_number, total_amount, status, payment_method, payment_status, cash_received, created_at, order_items(quantity, products(name, name_i18n))';

// A service can produce a lot of orders; every screen reading them is bounded so
// none of them degrades into fetching the establishment's entire history.
const KITCHEN_LIMIT = 100;
const FLOOR_LIMIT = 100;
/** How far back the floor view still shows orders it has finished with. */
const SETTLED_WINDOW_MS = 24 * 60 * 60 * 1000;

function toOrderViews(rows: OrderRow[]): OrderView[] {
  return rows.map((row) => ({
    id: row.id,
    reference: shortRef(row.id),
    tableNumber: row.table_number,
    total: row.total_amount,
    status: row.status,
    paymentMethod: row.payment_method ?? 'cash',
    paymentStatus: row.payment_status ?? 'unpaid',
    cashReceived: row.cash_received,
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

/** Orders the kitchen still has to cook, oldest first (FIFO). */
export async function fetchKitchenOrders(establishmentId: string): Promise<OrderView[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('establishment_id', establishmentId)
    .in('status', KITCHEN_STATUSES)
    .order('created_at', { ascending: true })
    .limit(KITCHEN_LIMIT);
  if (error || !data) return [];
  return toOrderViews(data as OrderRow[]);
}

/**
 * What the floor still has to deal with, plus what it settled in the last day.
 *
 * Two queries rather than one `or(...)`: an order left open overnight must not
 * fall out of the only screen that can close it, while finished orders should
 * not accumulate on it forever. Newest first.
 */
export async function fetchFloorOrders(establishmentId: string): Promise<OrderView[]> {
  if (!supabase) return [];
  const since = new Date(Date.now() - SETTLED_WINDOW_MS).toISOString();

  const [open, recent] = await Promise.all([
    supabase
      .from('orders')
      .select(ORDER_COLUMNS)
      .eq('establishment_id', establishmentId)
      .in('status', ['new', 'preparing', 'ready', 'served'])
      .order('created_at', { ascending: false })
      .limit(FLOOR_LIMIT),
    supabase
      .from('orders')
      .select(ORDER_COLUMNS)
      .eq('establishment_id', establishmentId)
      .in('status', ['completed', 'cancelled'])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(FLOOR_LIMIT),
  ]);

  // A query that errors leaves its half of the floor silently empty otherwise,
  // which reads as "nothing to do" rather than as the failure it is.
  if (open.error) console.error('fetchFloorOrders: open orders query failed', open.error);
  if (recent.error) console.error('fetchFloorOrders: recent orders query failed', recent.error);
  if (open.error && recent.error) return [];
  // The two status sets are disjoint, so concatenating cannot duplicate a row.
  const rows = [...((open.data ?? []) as OrderRow[]), ...((recent.data ?? []) as OrderRow[])];
  return toOrderViews(rows).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export interface OrderStats {
  revenueToday: number;
  ordersToday: number;
  totalRevenue: number;
  orders: number;
  topProducts: { name: string; nameI18n?: LocalizedField; qty: number }[];
  days: { date: string; value: number }[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight, the day boundary the restaurant actually works to. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * The same aggregates as `get_order_stats`, over a list already in hand.
 *
 * Only the bundled demo data goes through this — with a backend the database
 * does the work, so the numbers stay right however many orders there are.
 */
export function computeStats(orders: OrderView[], dayStart: Date): OrderStats {
  const valid = orders.filter((o) => o.status !== 'cancelled');
  const start = dayStart.getTime();
  const today = valid.filter((o) => +new Date(o.createdAt) >= start);

  const byProduct = new Map<string, { name: string; nameI18n?: LocalizedField; qty: number }>();
  for (const o of valid) {
    for (const it of o.items) {
      const cur = byProduct.get(it.name) ?? { name: it.name, nameI18n: it.nameI18n, qty: 0 };
      cur.qty += it.quantity;
      byProduct.set(it.name, cur);
    }
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const from = start - (6 - i) * DAY_MS;
    const value = valid
      .filter((o) => {
        const c = +new Date(o.createdAt);
        return c >= from && c < from + DAY_MS;
      })
      .reduce((s, o) => s + o.total, 0);
    return { date: new Date(from).toISOString(), value };
  });

  return {
    revenueToday: today.reduce((s, o) => s + o.total, 0),
    ordersToday: today.length,
    totalRevenue: valid.reduce((s, o) => s + o.total, 0),
    orders: valid.length,
    topProducts: [...byProduct.values()]
      .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name))
      .slice(0, 5),
    days,
  };
}

/**
 * Aggregates for the stats screen, computed in the database.
 *
 * `dayStart` is the caller's own start-of-today, so the day boundaries follow
 * the restaurant's timezone rather than the server's.
 */
export async function fetchOrderStats(establishmentId: string, dayStart: Date): Promise<OrderStats | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_order_stats', {
    est_id: establishmentId,
    day_start: dayStart.toISOString(),
  });
  if (error || !data) return null;
  return data as OrderStats;
}

/**
 * Moves an order along its lifecycle (owner-only via RLS). Payment is never
 * consulted here: the kitchen advances whether or not the bill is settled. The
 * one exception lives in the database — closing an order requires it to be
 * paid — and surfaces as a thrown error the caller resyncs from.
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
  if (error) throw error;
  // The food is ready: tell the customer so they stop watching the door.
  if (status === 'ready') {
    supabase.functions.invoke('notify-order-ready', { body: { order_id: orderId } }).catch(() => {});
  }
}

/**
 * The server has taken the bill to the table and is waiting on the cash. Kept
 * distinct from `unpaid` so the floor can see which tables are mid-settlement.
 */
export async function requestBill(orderId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('orders').update({ payment_status: 'cash_pending' }).eq('id', orderId);
  if (error) throw error;
}

/**
 * Confirms cash received at the table. `received` is what the customer handed
 * over, recorded so the change given back is auditable; pass nothing when it
 * was the exact amount.
 */
export async function setOrderPaid(orderId: string, received?: number): Promise<void> {
  if (!supabase) return;
  const patch: { payment_status: PaymentStatus; cash_received?: number } = { payment_status: 'paid' };
  if (received !== undefined) patch.cash_received = received;
  const { error } = await supabase.from('orders').update(patch).eq('id', orderId);
  if (error) throw error;
}

export interface PaymentConfig {
  siteId: string;
  apiKey: string;
  country: string;
  sandbox: boolean;
  enabled: boolean;
}

/** Reads the establishment's mobile-money provider config (owner-only via RLS). */
export async function getPaymentConfig(establishmentId: string): Promise<PaymentConfig | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('payment_configs')
    .select('site_id, api_key, country, sandbox, enabled')
    .eq('establishment_id', establishmentId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    siteId: (data.site_id as string) ?? '',
    apiKey: (data.api_key as string) ?? '',
    country: (data.country as string) ?? '',
    sandbox: Boolean(data.sandbox),
    enabled: Boolean(data.enabled),
  };
}

/**
 * Upserts the PawaPay config and mirrors `enabled` onto the public
 * establishments.mobile_money_enabled flag (so the customer checkout can show
 * the option without ever reading the secret config).
 */
export async function savePaymentConfig(establishmentId: string, cfg: PaymentConfig): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('payment_configs').upsert({
    establishment_id: establishmentId,
    provider: 'pawapay',
    site_id: cfg.siteId.trim() || null,
    api_key: cfg.apiKey.trim() || null,
    country: cfg.country || null,
    sandbox: cfg.sandbox,
    enabled: cfg.enabled,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  const { error: estError } = await supabase
    .from('establishments')
    .update({ mobile_money_enabled: cfg.enabled })
    .eq('id', establishmentId);
  if (estError) throw estError;
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
      .select('id, establishment_id, category_id, name, description, name_i18n, description_i18n, price, image_url, is_available, featured')
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

/** Toggles whether a product is highlighted ("à la une") on the customer page. */
export async function setProductFeatured(productId: string, featured: boolean): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('products').update({ featured }).eq('id', productId);
  if (error) throw error;
}

/** Uploads the establishment's logo and stores its URL. Returns the public URL. */
export async function uploadEstablishmentLogo(establishmentId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `logos/${establishmentId}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('menus').upload(path, file, { upsert: false, contentType: file.type || 'image/png' });
  if (upErr) throw upErr;
  const url = supabase.storage.from('menus').getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from('establishments').update({ logo_url: url }).eq('id', establishmentId);
  if (error) throw error;
  return url;
}

/** Deletes a product. */
export async function deleteProduct(productId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) throw error;
}

/**
 * Uploads a photo for a product to the public `menus` bucket and stores its URL
 * on the product. Returns the public URL. Paths are unique (timestamped) so we
 * never need to overwrite existing objects.
 */
export async function uploadProductImage(establishmentId: string, productId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `products/${establishmentId}/${productId}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('menus').upload(path, file, { upsert: false });
  if (upErr) throw upErr;
  const url = supabase.storage.from('menus').getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from('products').update({ image_url: url }).eq('id', productId);
  if (error) throw error;
  return url;
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
