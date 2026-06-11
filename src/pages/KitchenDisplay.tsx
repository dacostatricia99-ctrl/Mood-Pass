import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChefHat, Check, CheckCheck, Clock, Printer } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { localizeText } from '../i18n/menuData';
import { LanguageSelect } from '../components/LanguageSelect';
import { useAuth } from '../lib/AuthContext';
import {
  fetchEstablishmentBySlug,
  fetchOrders,
  updateOrderStatus,
  subscribeToOrders,
  type OrderView,
  type OrderStatus,
} from '../lib/managerApi';
import { playOrderChime, requestNotificationPermission, showOrderNotification } from '../lib/notifications';

const DEMO_ORDERS: OrderView[] = [
  { id: 'k1', reference: '#A1B2C3', tableNumber: '4', total: 0, status: 'pending', createdAt: new Date(Date.now() - 2 * 60000).toISOString(), items: [{ quantity: 2, name: 'Burger Royal' }, { quantity: 1, name: 'Frites' }] },
  { id: 'k2', reference: '#D4E5F6', tableNumber: '7', total: 0, status: 'accepted', createdAt: new Date(Date.now() - 6 * 60000).toISOString(), items: [{ quantity: 1, name: 'Pizza Diabola' }] },
];

function timeHHMM(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function KitchenDisplay() {
  const { slug } = useParams<{ slug: string }>();
  const { t, language } = useTranslation();
  const { isConfigured } = useAuth();
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderView[]>(() => (isConfigured ? [] : DEMO_ORDERS));

  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Resolve the establishment from the slug.
  useEffect(() => {
    if (!isConfigured || !slug) return;
    let active = true;
    fetchEstablishmentBySlug(slug).then((est) => {
      if (active && est) setEstablishmentId(est.id);
    });
    return () => {
      active = false;
    };
  }, [slug, isConfigured]);

  // Load active orders + subscribe to live changes.
  useEffect(() => {
    if (!isConfigured || !establishmentId) return;
    let active = true;
    const load = () => fetchOrders(establishmentId).then((data) => {
      if (active) setOrders(data);
    });
    load();
    return subscribeToOrders(establishmentId, (event) => {
      load();
      if (event === 'INSERT') {
        playOrderChime();
        showOrderNotification(tRef.current('notify.newOrderTitle'), tRef.current('notify.newOrderBody'));
      }
    });
  }, [isConfigured, establishmentId]);

  const changeStatus = async (id: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    if (isConfigured) {
      try {
        await updateOrderStatus(id, status);
      } catch {
        if (establishmentId) setOrders(await fetchOrders(establishmentId));
      }
    }
  };

  // Opens a thermal-printer-friendly (80mm) ticket in a popup and prints it.
  const printTicket = (order: OrderView) => {
    const w = window.open('', '_blank', 'width=320,height=600');
    if (!w) return;
    const heading = order.tableNumber ? `${t('orders.table')} ${order.tableNumber}` : order.reference;
    const items = order.items
      .map((it) => `<div class="item"><span class="qty">${it.quantity}×</span> ${escapeHtml(localizeText(it.nameI18n, language, it.name))}</div>`)
      .join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(order.reference)}</title><style>
      @page { size: 80mm auto; margin: 0; }
      * { box-sizing: border-box; }
      body { width: 80mm; margin: 0; padding: 8px 10px; font-family: 'Courier New', monospace; color: #000; }
      h1 { font-size: 18px; text-align: center; margin: 0 0 2px; letter-spacing: 1px; }
      .sub { text-align: center; font-size: 12px; margin-bottom: 6px; }
      .meta { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; }
      hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
      .item { font-size: 16px; margin: 6px 0; }
      .qty { font-weight: bold; margin-right: 4px; }
      .foot { text-align: center; font-size: 11px; margin-top: 8px; }
    </style></head><body>
      <h1>${escapeHtml(t('kitchen.title')).toUpperCase()}</h1>
      <div class="sub">${escapeHtml(order.reference)}</div>
      <hr>
      <div class="meta"><span>${escapeHtml(heading)}</span><span>${timeHHMM(order.createdAt)}</span></div>
      <hr>
      ${items}
      <hr>
      <div class="foot">Mood Pass</div>
      <script>window.onload = function(){ window.print(); }<\/script>
    </body></html>`);
    w.document.close();
  };

  // Only orders the kitchen acts on, oldest first (FIFO).
  const active = orders
    .filter((o) => o.status === 'pending' || o.status === 'accepted')
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--bg-color)' }}>
      <header style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 'var(--border-glass)', background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 10 }}>
        <h1 className="text-gradient" style={{ fontSize: 'var(--font-lg)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <ChefHat size={22} /> {t('kitchen.title')}
          <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: 'var(--font-md)' }}>· {active.length}</span>
        </h1>
        <LanguageSelect />
      </header>

      {active.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: 'var(--space-sm)' }}>
          <ChefHat size={48} style={{ opacity: 0.2 }} />
          <p>{t('kitchen.empty')}</p>
        </div>
      ) : (
        <main style={{ padding: 'var(--space-md)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-md)', alignItems: 'start' }}>
          {active.map((order) => {
            const isNew = order.status === 'pending';
            const accent = isNew ? '#f59e0b' : 'var(--primary-accent)';
            return (
              <div key={order.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', borderTop: `4px solid ${accent}`, overflow: 'hidden' }}>
                <div style={{ padding: 'var(--space-sm) var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'var(--border-glass)' }}>
                  <div style={{ fontWeight: 'bold', fontSize: 'var(--font-md)' }}>
                    {order.tableNumber ? `${t('orders.table')} ${order.tableNumber}` : order.reference}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {timeHHMM(order.createdAt)}
                    </span>
                    <button onClick={() => printTicket(order)} title={t('kitchen.print')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 2 }}>
                      <Printer size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <span style={{ alignSelf: 'flex-start', fontSize: 'var(--font-xs)', fontWeight: 700, color: accent, textTransform: 'uppercase' }}>
                    {isNew ? t('kitchen.new') : t('order.track.preparing')}
                  </span>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 'var(--space-sm)', fontSize: 'var(--font-md)' }}>
                      <span style={{ fontWeight: 'bold', color: accent, minWidth: 28 }}>{item.quantity}×</span>
                      <span style={{ color: 'var(--text-primary)' }}>{localizeText(item.nameI18n, language, item.name)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ padding: 'var(--space-md)', paddingTop: 0 }}>
                  {isNew ? (
                    <button
                      onClick={() => changeStatus(order.id, 'accepted')}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 'var(--radius-sm)', border: 'none', background: '#f59e0b', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                    >
                      <Check size={18} /> {t('kitchen.start')}
                    </button>
                  ) : (
                    <button
                      onClick={() => changeStatus(order.id, 'completed')}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 'var(--radius-sm)', border: 'none', background: '#16a34a', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                    >
                      <CheckCheck size={18} /> {t('kitchen.markReady')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </main>
      )}
    </div>
  );
}
