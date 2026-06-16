import { useEffect, useState } from 'react';
import { Clock, ChefHat, PackageCheck, XCircle, X } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { fetchOrderStatus, getLastOrder, clearLastOrder, type LastOrder, type TrackStatus } from '../lib/orderApi';
import type { TranslationKey } from '../i18n/translations';

const STATUS: Record<TrackStatus, { key: TranslationKey; Icon: typeof Clock; color: string }> = {
  pending: { key: 'order.track.received', Icon: Clock, color: '#f59e0b' },
  accepted: { key: 'order.track.preparing', Icon: ChefHat, color: 'var(--primary-accent)' },
  completed: { key: 'order.track.ready', Icon: PackageCheck, color: '#16a34a' },
  cancelled: { key: 'order.track.cancelled', Icon: XCircle, color: 'var(--primary-red)' },
};

/**
 * Floating banner that lets a customer follow their last order even after
 * closing the cart. Reads it from localStorage and polls its status.
 */
export function OrderStatusBanner({ slug }: { slug?: string }) {
  const { t } = useTranslation();
  const [order, setOrder] = useState<LastOrder | null>(null);
  const [status, setStatus] = useState<TrackStatus>('pending');

  useEffect(() => {
    if (!slug) return;
    setOrder(getLastOrder(slug));
  }, [slug]);

  useEffect(() => {
    if (!order) return;
    let active = true;
    const poll = async () => {
      const s = await fetchOrderStatus(order.id);
      if (active && s) setStatus(s);
    };
    poll();
    const iv = window.setInterval(poll, 8000);
    return () => {
      active = false;
      window.clearInterval(iv);
    };
  }, [order]);

  if (!order) return null;

  const meta = STATUS[status];
  const dismiss = () => {
    clearLastOrder();
    setOrder(null);
  };

  return (
    <div style={{
      position: 'fixed', bottom: 'calc(var(--space-md) + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)',
      zIndex: 30, width: 'calc(100% - 2 * var(--space-md))', maxWidth: 440,
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
      <button onClick={dismiss} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
        <X size={18} />
      </button>
    </div>
  );
}
