import { useEffect, useState } from 'react';
import { Check, X, CheckCheck } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { localizeText } from '../i18n/menuData';
import { formatPrice } from '../lib/format';
import { fetchOrders, updateOrderStatus, type OrderStatus, type OrderView } from '../lib/managerApi';

const DEMO_ORDERS: OrderView[] = [
  {
    id: 'demo-1', reference: '#A1B2C3', tableNumber: '4', total: 15000, status: 'pending',
    createdAt: new Date().toISOString(),
    items: [{ quantity: 2, name: 'Burger Royal' }, { quantity: 1, name: 'Pizza Diabola' }],
  },
  {
    id: 'demo-2', reference: '#D4E5F6', tableNumber: '7', total: 3000, status: 'accepted',
    createdAt: new Date().toISOString(),
    items: [{ quantity: 1, name: 'Cocktail Sunrise' }],
  },
];

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: '#f59e0b',
  accepted: 'var(--primary-accent)',
  completed: '#4cff78',
  cancelled: 'var(--text-secondary)',
};

const STATUS_KEY: Record<OrderStatus, 'order.status.pending' | 'order.status.accepted' | 'order.status.completed' | 'order.status.cancelled'> = {
  pending: 'order.status.pending',
  accepted: 'order.status.accepted',
  completed: 'order.status.completed',
  cancelled: 'order.status.cancelled',
};

interface OrdersListProps {
  establishmentId: string | null;
  currency: string;
  isConfigured: boolean;
  onChanged?: () => void;
  /** Bumped by the parent (e.g. on a realtime event) to force a reload. */
  refreshKey?: number;
}

export function OrdersList({ establishmentId, currency, isConfigured, onChanged, refreshKey }: OrdersListProps) {
  const { t, language } = useTranslation();
  // Demo mode starts from static orders; real mode loads them in the effect.
  const [orders, setOrders] = useState<OrderView[]>(() => (isConfigured ? [] : DEMO_ORDERS));

  useEffect(() => {
    if (!isConfigured || !establishmentId) return;
    let active = true;
    fetchOrders(establishmentId).then((data) => {
      if (active) setOrders(data);
    });
    return () => {
      active = false;
    };
  }, [isConfigured, establishmentId, refreshKey]);

  const changeStatus = async (id: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    if (isConfigured) {
      try {
        await updateOrderStatus(id, status);
      } catch {
        if (establishmentId) setOrders(await fetchOrders(establishmentId)); // resync on failure
      }
    }
    onChanged?.();
  };

  if (orders.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 'var(--space-2xl)' }}>
        {t('orders.empty')}
      </div>
    );
  }

  const actionBtn = (label: string, icon: React.ReactNode, color: string, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: 'none', background: color, color: 'white', fontWeight: 600, fontSize: 'var(--font-sm)', cursor: 'pointer' }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {orders.map((order) => (
        <div key={order.id} className="glass-panel" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 'bold' }}>
              {order.reference}
              {order.tableNumber && (
                <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: 'var(--font-sm)' }}>
                  {' · '}{t('orders.table')} {order.tableNumber}
                </span>
              )}
            </div>
            <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: STATUS_COLOR[order.status] }}>
              {t(STATUS_KEY[order.status])}
            </span>
          </div>

          <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            {order.items.map((item, idx) => (
              <div key={idx}>{item.quantity} × {localizeText(item.nameI18n, language, item.name)}</div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--primary-accent)' }}>{formatPrice(order.total, currency)}</span>
          </div>

          {(order.status === 'pending' || order.status === 'accepted') && (
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
              {order.status === 'pending' && actionBtn(t('orders.accept'), <Check size={16} />, 'var(--primary-accent)', () => changeStatus(order.id, 'accepted'))}
              {order.status === 'accepted' && actionBtn(t('orders.complete'), <CheckCheck size={16} />, '#16a34a', () => changeStatus(order.id, 'completed'))}
              {actionBtn(t('orders.cancel'), <X size={16} />, 'var(--bg-surface-elevated)', () => changeStatus(order.id, 'cancelled'))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
