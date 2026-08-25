import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { X, Minus, Plus, ShoppingBag, CheckCircle, Loader2, Clock, ChefHat, PackageCheck, XCircle, Wallet, Smartphone, HandPlatter } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { localizeProductText } from '../i18n/menuData';
import { createOrder, fetchOrderStatus, startMobilePayment, saveLastOrder, savePendingPayment, type PaymentMethod, type PlacedOrder, type TrackStatus } from '../lib/orderApi';
import { subscribeOrderPush } from '../lib/push';
import { formatPrice } from '../lib/format';

type Status = 'idle' | 'placing' | 'error' | 'success';

interface CartDrawerProps {
  currency: string;
  mobileMoneyEnabled: boolean;
  slug?: string;
}

export function CartDrawer({ currency, mobileMoneyEnabled, slug }: CartDrawerProps) {
  const { items, isDrawerOpen, toggleDrawer, updateQuantity, getCartTotal, clearCart } = useCartStore();
  const { language, t } = useTranslation();

  // The QR sticker on the table carries ?table=N, so a seated customer never
  // types their table number — and cannot mistype someone else's. The field
  // stays editable only when the menu was opened without one.
  const [searchParams] = useSearchParams();
  const scannedTable = (searchParams.get('table') ?? '').trim();
  const [typedTable, setTypedTable] = useState('');
  const tableNumber = scannedTable || typedTable;
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [status, setStatus] = useState<Status>('idle');
  const [reference, setReference] = useState('');
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [trackStatus, setTrackStatus] = useState<TrackStatus>('new');

  // Poll the order status so the customer follows it live (anon can't subscribe
  // to the orders table, so we poll the capability-scoped RPC every few seconds).
  useEffect(() => {
    if (status !== 'success' || !placedOrder || placedOrder.source !== 'remote') return;
    let active = true;
    const poll = async () => {
      const s = await fetchOrderStatus(placedOrder.id);
      if (active && s) setTrackStatus(s);
    };
    poll();
    const iv = window.setInterval(poll, 6000);
    return () => {
      active = false;
      window.clearInterval(iv);
    };
  }, [status, placedOrder]);

  if (!isDrawerOpen) return null;

  const closeDrawer = () => {
    setStatus('idle');
    setReference('');
    setTypedTable('');
    setPaymentMethod('cash');
    setPlacedOrder(null);
    setTrackStatus('new');
    toggleDrawer();
  };

  const handleCheckout = async () => {
    if (items.length === 0 || status === 'placing') return;
    const establishmentId = items[0].establishment_id;
    setStatus('placing');
    try {
      const order = await createOrder({
        establishmentId,
        items,
        total: getCartTotal(),
        tableNumber,
        paymentMethod,
      });

      // Mobile money: kick off the provider payment. A real flow redirects to
      // the provider's checkout; sandbox marks the order paid immediately and
      // we fall through to the confirmation screen.
      if (paymentMethod === 'mobile_money' && order.source === 'remote') {
        const res = await startMobilePayment(order.id, establishmentId);
        if (res.paymentUrl) {
          // Remember the order across the redirect so that, on return, the app
          // can verify the payment itself (no dependency on a shared callback).
          if (slug) {
            savePendingPayment({ id: order.id, reference: order.reference, slug, ts: Date.now() });
            saveLastOrder({ id: order.id, reference: order.reference, slug, ts: Date.now() });
            void subscribeOrderPush(order.id);
          }
          window.location.href = res.paymentUrl;
          return; // leaving the app for the provider's checkout
        }
      }

      if (order.source === 'remote' && slug) {
        saveLastOrder({ id: order.id, reference: order.reference, slug, ts: Date.now() });
        // Ask to notify the customer when the order is ready (best-effort).
        void subscribeOrderPush(order.id);
      }
      setReference(order.reference);
      setPlacedOrder(order);
      setTrackStatus('new');
      clearCart();
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  // Maps the order status to a 0-based step in the tracker (cancelled = -1).
  const TRACK_STEP: Record<TrackStatus, number> = {
    new: 0, preparing: 1, ready: 2, served: 3, completed: 3, cancelled: -1,
  };
  const trackStep = TRACK_STEP[trackStatus];
  const trackSteps = [
    { key: 'order.track.received' as const, Icon: Clock },
    { key: 'order.track.preparing' as const, Icon: ChefHat },
    { key: 'order.track.ready' as const, Icon: PackageCheck },
    { key: 'order.track.served' as const, Icon: HandPlatter },
  ];

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 40,
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={closeDrawer}
      />

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        height: '80dvh',
        background: 'var(--bg-surface)',
        borderTopLeftRadius: 'var(--radius-lg)',
        borderTopRightRadius: 'var(--radius-lg)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-soft)',
        animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'
      }}>
        {/* Header */}
        <div style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 'var(--border-glass)' }}>
          <h2 style={{ fontSize: 'var(--font-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <ShoppingBag size={24} color="var(--primary-accent)" />
            {t('cart.title')}
          </h2>
          <button
            onClick={closeDrawer}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
        </div>

        {status === 'success' ? (
          /* Confirmation */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'var(--space-lg)', gap: 'var(--space-md)' }}>
            <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-full)', background: 'rgba(76, 255, 120, 0.15)', color: '#4cff78', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={40} />
            </div>
            <h3 style={{ fontSize: 'var(--font-lg)' }}>{t('order.successTitle')}</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{t('order.successDesc', { ref: reference })}</p>

            {/* Live status tracker (only meaningful for a real backend order). */}
            {placedOrder?.source === 'remote' && (
              trackStatus === 'cancelled' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--primary-red, #ef4444)', marginTop: 'var(--space-sm)' }}>
                  <XCircle size={20} /> {t('order.track.cancelled')}
                </div>
              ) : (
                <div style={{ width: '100%', marginTop: 'var(--space-md)' }}>
                  <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>{t('order.track.title')}</div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    {trackSteps.map((step, i) => {
                      const reached = i <= trackStep;
                      return (
                        <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
                          {i > 0 && (
                            <div style={{ position: 'absolute', top: 18, right: '50%', width: '100%', height: 2, background: i <= trackStep ? 'var(--primary-accent)' : 'var(--border-glass)' }} />
                          )}
                          <div style={{
                            width: 36, height: 36, borderRadius: 'var(--radius-full)', zIndex: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: reached ? 'var(--gradient-brand)' : 'var(--bg-surface-elevated)',
                            color: reached ? 'white' : 'var(--text-secondary)',
                            boxShadow: i === trackStep ? 'var(--shadow-glow)' : 'none',
                            transition: 'all var(--transition-fast)',
                          }}>
                            <step.Icon size={18} />
                          </div>
                          <span style={{ fontSize: 'var(--font-xs)', color: reached ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: i === trackStep ? 700 : 400 }}>
                            {t(step.key)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}

            <button className="btn-primary" style={{ width: '100%', marginTop: 'var(--space-md)' }} onClick={closeDrawer}>
              {t('order.done')}
            </button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 'var(--space-2xl)' }}>
                  {t('cart.empty')}
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{localizeProductText(item, language).name}</div>
                      <div style={{ color: 'var(--primary-accent)', fontSize: 'var(--font-sm)' }}>{formatPrice(item.price, currency)}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-full)', padding: '4px 8px' }}>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Minus size={16} />
                      </button>
                      <span style={{ minWidth: '20px', textAlign: 'center', fontSize: 'var(--font-sm)', fontWeight: 'bold' }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div style={{ padding: 'var(--space-md)', borderTop: 'var(--border-glass)', background: 'var(--bg-surface-elevated)' }}>
                {scannedTable ? (
                  <div style={{ marginBottom: 'var(--space-md)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
                    {t('cart.atTable')} <strong style={{ color: 'var(--text-primary)' }}>{scannedTable}</strong>
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={typedTable}
                    onChange={(e) => setTypedTable(e.target.value)}
                    placeholder={t('cart.tableNumber')}
                    style={{ width: '100%', boxSizing: 'border-box', marginBottom: 'var(--space-md)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: 'var(--border-glass)', background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }}
                  />
                )}

                {/* Payment method */}
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>{t('checkout.payMethod')}</div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                  {([
                    { key: 'cash' as const, label: t('checkout.cash'), Icon: Wallet, enabled: true },
                    { key: 'mobile_money' as const, label: t('checkout.mobileMoney'), Icon: Smartphone, enabled: mobileMoneyEnabled },
                  ]).map(({ key, label, Icon, enabled }) => {
                    const selected = paymentMethod === key;
                    return (
                      <button
                        key={key}
                        onClick={() => enabled && setPaymentMethod(key)}
                        disabled={!enabled}
                        title={!enabled ? t('checkout.mobileMoneyOff') : label}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px',
                          borderRadius: 'var(--radius-sm)', cursor: enabled ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: 'var(--font-sm)',
                          border: selected ? '2px solid var(--primary-accent)' : '1px solid var(--border-glass)',
                          background: selected ? 'rgba(107, 76, 255, 0.12)' : 'var(--bg-surface)',
                          color: enabled ? 'var(--text-primary)' : 'var(--text-secondary)', opacity: enabled ? 1 : 0.5,
                        }}
                      >
                        <Icon size={16} /> {label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)', fontSize: 'var(--font-lg)', fontWeight: 'bold' }}>
                  <span>{t('cart.total')}</span>
                  <span>{formatPrice(getCartTotal(), currency)}</span>
                </div>
                {status === 'error' && (
                  <div style={{ color: 'var(--primary-red, #ef4444)', fontSize: 'var(--font-sm)', textAlign: 'center', marginBottom: 'var(--space-sm)' }}>
                    {t('order.error')}
                  </div>
                )}
                <button
                  className="btn-primary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)', opacity: status === 'placing' ? 0.6 : 1, cursor: status === 'placing' ? 'wait' : 'pointer' }}
                  onClick={handleCheckout}
                  disabled={status === 'placing'}
                >
                  {status === 'placing' && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
                  {status === 'placing' ? t('cart.placing') : t('cart.checkout')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); }
          to { transform: translate(-50%, 0); }
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
