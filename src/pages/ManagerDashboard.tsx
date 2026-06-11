import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Bot, Package, LayoutDashboard, Settings, LogOut, QrCode, BellRing, ChefHat, BarChart3 } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { QRCodeModal } from '../components/QRCodeModal';
import { LanguageSelect } from '../components/LanguageSelect';
import { OrdersList } from '../components/OrdersList';
import { MenuEditor } from '../components/MenuEditor';
import { useAuth } from '../lib/AuthContext';
import { fetchEstablishmentBySlug, countPendingOrders, sendManagerQuery, subscribeToOrders } from '../lib/managerApi';
import { playOrderChime, requestNotificationPermission, showOrderNotification } from '../lib/notifications';
import type { TranslationKey } from '../i18n/translations';

type View = 'assistant' | 'orders' | 'menu';

// A chat message is either free text (the user's input) or a translation key
// resolved at render time, so assistant messages follow the active language.
interface ChatMessage {
  role: 'user' | 'assistant';
  text?: string;
  key?: TranslationKey;
  params?: Record<string, string | number>;
}

export function ManagerDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { session, isConfigured, signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', key: 'manager.greeting' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [view, setView] = useState<View>('assistant');
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [currency, setCurrency] = useState('FCFA');
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [newOrderToast, setNewOrderToast] = useState(false);
  // Demo mode shows a static placeholder; real mode loads the count below.
  const [pendingCount, setPendingCount] = useState<number | null>(isConfigured ? null : 4);

  // Keep the latest `t` reachable from the realtime callback without making the
  // subscription depend on it (which would re-subscribe on every language change).
  const tRef = useRef(t);
  tRef.current = t;

  // Ask for browser-notification permission once on the dashboard.
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Resolve the establishment (id + currency) and load its pending-order count.
  useEffect(() => {
    if (!isConfigured || !slug) return;
    let active = true;
    fetchEstablishmentBySlug(slug).then(async (establishment) => {
      if (!active || !establishment) return;
      setEstablishmentId(establishment.id);
      setCurrency(establishment.currency);
      const count = await countPendingOrders(establishment.id);
      if (active) setPendingCount(count);
    });
    return () => {
      active = false;
    };
  }, [slug, isConfigured]);

  const refreshPending = async () => {
    if (isConfigured && establishmentId) {
      setPendingCount(await countPendingOrders(establishmentId));
    }
  };

  // Live updates: refresh the pending count and signal the orders list on any change.
  useEffect(() => {
    if (!isConfigured || !establishmentId) return;
    return subscribeToOrders(establishmentId, (event) => {
      countPendingOrders(establishmentId).then(setPendingCount);
      setOrdersRefreshKey((k) => k + 1);
      // A brand-new customer order: alert the manager (chime + browser
      // notification + on-screen toast). Status updates (their own actions)
      // arrive as UPDATE and stay silent.
      if (event === 'INSERT') {
        playOrderChime();
        showOrderNotification(tRef.current('notify.newOrderTitle'), tRef.current('notify.newOrderBody'));
        setNewOrderToast(true);
        window.setTimeout(() => setNewOrderToast(false), 5000);
      }
    });
  }, [isConfigured, establishmentId]);

  const handleSend = async () => {
    if (!query.trim() || isTyping) return;

    const userMessage = query;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setQuery('');
    setIsTyping(true);

    try {
      if (isConfigured && establishmentId) {
        const reply = await sendManagerQuery({ query: userMessage, establishmentId });
        setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
        // A management action may have changed pending orders.
        setPendingCount(await countPendingOrders(establishmentId));
      } else {
        // Demo mode: simulate the AI Manager.
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setMessages(prev => [...prev, { role: 'assistant', key: 'manager.actionDone', params: { query: userMessage } }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', key: 'manager.error' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = (msg: ChatMessage) => (msg.key ? t(msg.key, msg.params) : msg.text);

  return (
    <div className="app-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg-color)' }}>
      {/* Header */}
      <header style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 'var(--border-glass)', background: 'var(--bg-surface)' }}>
        <h1 className="text-gradient" style={{ fontSize: 'var(--font-lg)', fontWeight: 'bold' }}>{t('manager.title')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {slug && (
            <a
              href={`/stats/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              title={t('stats.title')}
              aria-label={t('stats.title')}
              style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <BarChart3 size={18} />
            </a>
          )}
          {slug && (
            <a
              href={`/kitchen/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              title={t('kitchen.title')}
              aria-label={t('kitchen.title')}
              style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ChefHat size={18} />
            </a>
          )}
          <button
            onClick={() => setShowQR(true)}
            title="Show QR Code"
            aria-label="Show QR Code"
            style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <QrCode size={18} />
          </button>
          <LanguageSelect />
          {session && (
            <button
              onClick={signOut}
              title={t('auth.signOut')}
              aria-label={t('auth.signOut')}
              style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <LogOut size={18} />
            </button>
          )}
          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', background: 'rgba(107, 76, 255, 0.2)', color: 'var(--primary-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={20} />
          </div>
        </div>
      </header>

      {showQR && slug && (
        <QRCodeModal slug={slug} onClose={() => setShowQR(false)} />
      )}

      {/* New-order toast */}
      {newOrderToast && (
        <button
          onClick={() => { setView('orders'); setNewOrderToast(false); }}
          style={{
            position: 'fixed', top: 'calc(var(--space-md) + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)',
            zIndex: 90, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
            background: 'var(--gradient-brand)', color: 'white', border: 'none', cursor: 'pointer',
            padding: '12px 18px', borderRadius: 'var(--radius-full)', boxShadow: 'var(--shadow-glow)', fontWeight: 600,
            animation: 'slideDownToast 0.3s ease-out',
          }}
        >
          <BellRing size={18} /> {t('notify.newOrderTitle')}
          <style>{`@keyframes slideDownToast { from { transform: translate(-50%, -120%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }`}</style>
        </button>
      )}

      {/* Main Content Area - Chat Interface */}
      <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        
        {/* Status Card */}
        <div className="glass-panel" style={{ padding: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>{t('manager.pendingOrders')}</div>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 'bold', color: 'var(--primary-accent)' }}>{pendingCount ?? '—'}</div>
          </div>
          <button
            onClick={() => setView('orders')}
            style={{ background: 'var(--bg-surface-elevated)', border: 'none', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: 'var(--radius-full)', fontWeight: 500, cursor: 'pointer' }}
          >
            {t('manager.viewAll')}
          </button>
        </div>

        {view === 'orders' ? (
          <OrdersList
            establishmentId={establishmentId}
            currency={currency}
            isConfigured={isConfigured}
            onChanged={refreshPending}
            refreshKey={ordersRefreshKey}
          />
        ) : view === 'menu' ? (
          <MenuEditor
            establishmentId={establishmentId}
            currency={currency}
            isConfigured={isConfigured}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? 'var(--primary-accent)' : 'var(--bg-surface-elevated)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-lg)',
                borderBottomRightRadius: msg.role === 'user' ? 4 : 'var(--radius-lg)',
                borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 'var(--radius-lg)',
                maxWidth: '85%',
                color: 'white',
                boxShadow: msg.role === 'user' ? 'var(--shadow-glow)' : 'none'
              }}>
                {renderMessage(msg)}
              </div>
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--bg-surface-elevated)', padding: '12px 16px', borderRadius: 'var(--radius-lg)', borderBottomLeftRadius: 4 }}>
                <span style={{ opacity: 0.7 }}>{t('manager.thinking')}</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Chat Input (assistant view only) */}
      {view === 'assistant' && (
        <div style={{ padding: 'var(--space-md)', background: 'var(--bg-surface)', borderTop: 'var(--border-glass)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', background: 'var(--bg-color)', padding: 4, borderRadius: 'var(--radius-full)', border: 'var(--border-focus)' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t('manager.inputPlaceholder')}
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', padding: '0 var(--space-md)', outline: 'none' }}
            />
            <button
              onClick={handleSend}
              style={{ width: 44, height: 44, borderRadius: 'var(--radius-full)', background: 'var(--gradient-brand)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Send size={18} style={{ marginLeft: -2 }} />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav style={{ display: 'flex', justifyContent: 'space-around', padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-surface)', borderTop: 'var(--border-glass)', paddingBottom: 'calc(var(--space-sm) + env(safe-area-inset-bottom))' }}>
        <button
          onClick={() => setView('assistant')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: view === 'assistant' ? 'var(--primary-accent)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
        >
          <Bot size={24} />
          <span style={{ fontSize: 10, fontWeight: 500 }}>{t('nav.assistant')}</span>
        </button>
        <button
          onClick={() => setView('orders')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: view === 'orders' ? 'var(--primary-accent)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
        >
          <LayoutDashboard size={24} />
          <span style={{ fontSize: 10, fontWeight: 500 }}>{t('nav.orders')}</span>
        </button>
        <button
          onClick={() => setView('menu')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: view === 'menu' ? 'var(--primary-accent)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
        >
          <Package size={24} />
          <span style={{ fontSize: 10, fontWeight: 500 }}>{t('nav.menu')}</span>
        </button>
        <button
          onClick={() => setShowQR(true)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
        >
          <Settings size={24} />
          <span style={{ fontSize: 10, fontWeight: 500 }}>{t('nav.settings')}</span>
        </button>
      </nav>
    </div>
  );
}
