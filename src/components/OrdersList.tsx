import { useEffect, useState } from 'react';
import { Check, X, CheckCheck, Wallet, Smartphone, ChefHat, HandPlatter, Receipt, Lock } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { localizeText } from '../i18n/menuData';
import { formatPrice } from '../lib/format';
import type { TranslationKey } from '../i18n/translations';
import {
  fetchOrders,
  updateOrderStatus,
  requestBill,
  setOrderPaid,
  changeDue,
  nextOrderStatus,
  type OrderStatus,
  type PaymentStatus,
  type OrderView,
} from '../lib/managerApi';

const DEMO_ORDERS: OrderView[] = [
  {
    id: 'demo-1', reference: '#A1B2C3', tableNumber: '4', total: 15000, status: 'new',
    paymentMethod: 'cash', paymentStatus: 'unpaid', cashReceived: null, createdAt: new Date().toISOString(),
    items: [{ quantity: 2, name: 'Burger Royal' }, { quantity: 1, name: 'Pizza Diabola' }],
  },
  {
    id: 'demo-2', reference: '#D4E5F6', tableNumber: '7', total: 9500, status: 'served',
    paymentMethod: 'cash', paymentStatus: 'cash_pending', cashReceived: null, createdAt: new Date().toISOString(),
    items: [{ quantity: 1, name: 'Cocktail Sunrise' }],
  },
];

const STATUS_COLOR: Record<OrderStatus, string> = {
  new: '#f59e0b',
  preparing: 'var(--primary-accent)',
  ready: '#16a34a',
  served: '#0ea5e9',
  completed: '#4cff78',
  cancelled: 'var(--text-secondary)',
};

const STATUS_KEY: Record<OrderStatus, TranslationKey> = {
  new: 'order.status.new',
  preparing: 'order.status.preparing',
  ready: 'order.status.ready',
  served: 'order.status.served',
  completed: 'order.status.completed',
  cancelled: 'order.status.cancelled',
};

const PAYMENT_KEY: Record<PaymentStatus, TranslationKey> = {
  unpaid: 'orders.unpaid',
  pending: 'orders.payment.pending',
  cash_pending: 'orders.payment.cashPending',
  paid: 'orders.paid',
};

// Label and icon for the button that advances the order one step.
const NEXT_ACTION: Record<string, { key: TranslationKey; Icon: typeof Check; color: string }> = {
  preparing: { key: 'orders.action.prepare', Icon: ChefHat, color: 'var(--primary-accent)' },
  ready: { key: 'orders.action.ready', Icon: CheckCheck, color: '#16a34a' },
  served: { key: 'orders.action.serve', Icon: HandPlatter, color: '#0ea5e9' },
  completed: { key: 'orders.action.close', Icon: Check, color: '#4cff78' },
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
  // Which order has its cash pad open, and what has been typed into it.
  const [settling, setSettling] = useState<string | null>(null);
  const [received, setReceived] = useState('');

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

  const resync = async () => {
    if (establishmentId) setOrders(await fetchOrders(establishmentId));
  };

  const changeStatus = async (id: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    if (isConfigured) {
      try {
        await updateOrderStatus(id, status);
      } catch {
        await resync(); // e.g. the database refused to close an unpaid order
      }
    }
    onChanged?.();
  };

  const askForBill = async (id: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, paymentStatus: 'cash_pending' } : o)));
    if (isConfigured) {
      try {
        await requestBill(id);
      } catch {
        await resync();
      }
    }
    onChanged?.();
  };

  const confirmCash = async (order: OrderView, cash: number) => {
    setSettling(null);
    setReceived('');
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, paymentStatus: 'paid', cashReceived: cash } : o)));
    if (isConfigured) {
      try {
        await setOrderPaid(order.id, cash);
      } catch {
        await resync();
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

  // The neutral surface is near-white in the light theme, so a button using it
  // needs the normal text colour rather than the white used on solid accents.
  const SECONDARY_BG = 'var(--bg-surface-elevated)';
  const actionBtn = (label: string, icon: React.ReactNode, color: string, onClick: () => void, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: color === SECONDARY_BG ? '1px solid var(--border-glass)' : 'none', background: color, color: color === SECONDARY_BG ? 'var(--text-primary)' : 'white', fontWeight: 600, fontSize: 'var(--font-sm)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1 }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {orders.map((order) => {
        const next = nextOrderStatus(order.status);
        const action = next ? NEXT_ACTION[next] : null;
        const isCash = order.paymentMethod === 'cash';
        const settled = order.paymentStatus === 'paid';
        // Closing an order is the one step the database gates on payment.
        const blockedOnPayment = next === 'completed' && !settled;
        const cash = Number(received.replace(',', '.'));
        const cashValid = Number.isFinite(cash) && cash >= order.total;

        return (
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
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-xs)', fontWeight: 600, color: settled ? '#16a34a' : 'var(--text-secondary)' }}>
                {isCash ? <Wallet size={13} /> : <Smartphone size={13} />}
                {isCash ? t('checkout.cash') : t('checkout.mobileMoney')}
                {' · '}
                {t(PAYMENT_KEY[order.paymentStatus])}
              </span>
            </div>

            {/* What was handed over, and what went back, once settled in cash. */}
            {settled && order.cashReceived != null && order.cashReceived > order.total && (
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                {t('orders.cash.received')}: {formatPrice(order.cashReceived, currency)}
                {' · '}
                {t('orders.cash.changeGiven')}: {formatPrice(changeDue(order.total, order.cashReceived), currency)}
              </div>
            )}

            {/* Cash settlement at the table. */}
            {isCash && !settled && order.status !== 'cancelled' && (
              settling === order.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)' }}>
                  <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{t('orders.cash.received')}</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    autoFocus
                    value={received}
                    onChange={(e) => setReceived(e.target.value)}
                    placeholder={String(order.total)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 'var(--font-md)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-sm)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('orders.cash.change')}</span>
                    <strong style={{ color: cashValid ? '#16a34a' : 'var(--text-secondary)' }}>
                      {cashValid ? formatPrice(changeDue(order.total, cash), currency) : '—'}
                    </strong>
                  </div>
                  {received !== '' && !cashValid && (
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--primary-red)' }}>{t('orders.cash.insufficient')}</span>
                  )}
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    {actionBtn(t('orders.cash.confirm'), <Check size={16} />, '#16a34a', () => confirmCash(order, cash), !cashValid)}
                    {actionBtn(t('orders.cash.cancelPad'), <X size={16} />, SECONDARY_BG, () => { setSettling(null); setReceived(''); })}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  {order.paymentStatus === 'unpaid' &&
                    actionBtn(t('orders.bill'), <Receipt size={16} />, SECONDARY_BG, () => askForBill(order.id))}
                  {actionBtn(t('orders.cash.settle'), <Wallet size={16} />, '#16a34a', () => { setSettling(order.id); setReceived(''); })}
                </div>
              )
            )}

            {/* Non-cash orders keep the plain "mark as paid" confirmation. */}
            {!isCash && !settled && order.status !== 'cancelled' && (
              <button
                onClick={() => confirmCash(order, order.total)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', background: 'transparent', color: '#16a34a', fontWeight: 600, fontSize: 'var(--font-sm)', cursor: 'pointer' }}
              >
                <Wallet size={14} /> {t('orders.markPaid')}
              </button>
            )}

            {order.status !== 'cancelled' && order.status !== 'completed' && (
              <>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
                  {action && actionBtn(t(action.key), <action.Icon size={16} />, action.color, () => changeStatus(order.id, next!), blockedOnPayment)}
                  {actionBtn(t('orders.cancel'), <X size={16} />, SECONDARY_BG, () => changeStatus(order.id, 'cancelled'))}
                </div>
                {blockedOnPayment && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                    <Lock size={12} /> {t('orders.awaitingPayment')}
                  </span>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
