import { useEffect, useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { X, Minus, Plus, ShoppingBag, CheckCircle, Loader2, Clock, ChefHat, PackageCheck, XCircle } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { localizeProductText } from '../i18n/menuData';
import { createOrder, fetchOrderStatus, type PlacedOrder, type TrackStatus } from '../lib/orderApi';
import { formatPrice } from '../lib/format';

type Status = 'idle' | 'placing' | 'error' | 'success';

interface CartDrawerProps {
  currency: string;
}

export function CartDrawer({ currency }: CartDrawerProps) {
  const { items, isDrawerOpen, toggleDrawer, updateQuantity, getCartTotal, clearCart } = useCartStore();
  const { language, t } = useTranslation();

  const [tableNumber, setTableNumber] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [reference, setReference] = useState('');
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [trackStatus, setTrackStatus] = useState<TrackStatus>('pending');

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
    setTableNumber('');
    setPlacedOrder(null);
    setTrackStatus('pending');
    toggleDrawer();
  };

  const handleCheckout = async () => {
    if (items.length === 0 || status === 'placing') return;
    setStatus('placing');
    try {
      const order = await createOrder({
        establishmentId: items[0].establishment_id,
        items,
        total: getCartTotal(),
        tableNumber,
      });
      setReference(order.reference);
      setPlacedOrder(order);
      setTrackStatus('pending');
      clearCart();
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  // Maps the order status to a 0-based step in the tracker (cancelled = -1).
  const trackStep = trackStatus === 'cancelled' ? -1
    : trackStatus === 'completed' ? 2
    : trackStatus === 'accepted' ? 1
    : 0;
  const trackSteps = [
    { key: 'order.track.received' as const, Icon: Clock },
    { key: 'order.track.preparing' as const, Icon: ChefHat },
    { key: 'order.track.ready' as const, Icon: PackageCheck },
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
                <input
                  type="text"
                  inputMode="numeric"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder={t('cart.tableNumber')}
                  style={{ width: '100%', boxSizing: 'border-box', marginBottom: 'var(--space-md)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: 'var(--border-glass)', background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }}
                />
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
