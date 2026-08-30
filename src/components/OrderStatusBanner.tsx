import { useEffect, useState } from 'react';
import { Clock, ChefHat, PackageCheck, XCircle, CheckCircle, HandPlatter, X } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import {
  fetchOrderStatus,
  getTableOrders,
  clearLastOrder,
  ORDERS_CHANGED_EVENT,
  type LastOrder,
  type TrackStatus,
} from '../lib/orderApi';
import { playOrderChime } from '../lib/notifications';
import type { TranslationKey } from '../i18n/translations';

const STATUS: Record<TrackStatus, { key: TranslationKey; Icon: typeof Clock; color: string }> = {
  new: { key: 'order.track.received', Icon: Clock, color: '#f59e0b' },
  preparing: { key: 'order.track.preparing', Icon: ChefHat, color: 'var(--primary-accent)' },
  ready: { key: 'order.track.ready', Icon: PackageCheck, color: '#16a34a' },
  served: { key: 'order.track.served', Icon: HandPlatter, color: '#0ea5e9' },
  completed: { key: 'order.track.completed', Icon: CheckCircle, color: '#4cff78' },
  cancelled: { key: 'order.track.cancelled', Icon: XCircle, color: 'var(--primary-red)' },
};

/**
 * Floating stack that lets a customer follow every order still open at their
 * table — a round of drinks, then food, then dessert are each their own order
 * — even after closing the cart. Reads them from localStorage and polls each
 * one's status independently.
 */
export function OrderStatusBanner({ slug }: { slug?: string }) {
  const [orders, setOrders] = useState<LastOrder[]>(() => (slug ? getTableOrders(slug) : []));

  // Re-read when the customer moves to another establishment.
  const [loadedSlug, setLoadedSlug] = useState(slug);
  if (slug !== loadedSlug) {
    setLoadedSlug(slug);
    setOrders(slug ? getTableOrders(slug) : []);
  }

  useEffect(() => {
    if (!slug) return;
    // Checkout can add a new order (or another tab/redirect can clear one)
    // without this component remounting, so react to the change rather than
    // relying on a stale snapshot taken at mount time.
    const reload = () => setOrders(getTableOrders(slug));
    window.addEventListener(ORDERS_CHANGED_EVENT, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(ORDERS_CHANGED_EVENT, reload);
      window.removeEventListener('storage', reload);
    };
  }, [slug]);

  if (orders.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 'calc(var(--space-md) + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)',
      zIndex: 30, width: 'calc(100% - 2 * var(--space-md))', maxWidth: 440,
      display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)',
    }}>
      {orders.map((order) => (
        <OrderStatusItem key={order.id} order={order} onDismiss={() => clearLastOrder(order.id)} />
      ))}
    </div>
  );
}

function OrderStatusItem({ order, onDismiss }: { order: LastOrder; onDismiss: () => void }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<TrackStatus>('new');

  useEffect(() => {
    let active = true;
    let prev: TrackStatus | null = null;
    const poll = async () => {
      const s = await fetchOrderStatus(order.id);
      if (!active || !s) return;
      // Alert the customer the moment this order becomes ready.
      if (s === 'ready' && prev !== null && prev !== 'ready') {
        playOrderChime();
        try { navigator.vibrate?.(200); } catch { /* ignore */ }
      }
      prev = s;
      setStatus(s);
    };
    poll();
    const iv = window.setInterval(poll, 8000);
    return () => {
      active = false;
      window.clearInterval(iv);
    };
  }, [order.id]);

  const meta = STATUS[status];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
      background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-glass)', borderLeft: `4px solid ${meta.color}`,
      borderRadius: 'var(--radius-md)', padding: '10px 12px', boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color, flexShrink: 0 }}>
        <meta.Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{order.reference}</div>
        <div style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{t(meta.key)}</div>
      </div>
      <button onClick={onDismiss} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
        <X size={18} />
      </button>
    </div>
  );
}
