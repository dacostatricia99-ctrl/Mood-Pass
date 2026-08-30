import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart3, TrendingUp, ShoppingBag, Wallet, Trophy } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { localizeText } from '../i18n/menuData';
import { formatPrice } from '../lib/format';
import { LanguageSelect } from '../components/LanguageSelect';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../lib/AuthContext';
import {
  fetchEstablishmentBySlug,
  fetchOrderStats,
  computeStats,
  startOfToday,
  type OrderStats,
  type OrderView,
} from '../lib/managerApi';

// Demo data so the screen is meaningful without a backend.
function demoOrders(): OrderView[] {
  const now = Date.now();
  const mk = (daysAgo: number, total: number, items: { quantity: number; name: string }[]): OrderView => ({
    id: `d${daysAgo}-${total}`, reference: '#DEMO', tableNumber: null, total, status: 'completed', cashReceived: null,
    paymentMethod: 'cash', paymentStatus: 'paid',
    createdAt: new Date(now - daysAgo * 86400000).toISOString(), items,
  });
  return [
    mk(0, 7500, [{ quantity: 2, name: 'Margherita' }, { quantity: 1, name: 'Coca-Cola' }]),
    mk(0, 4500, [{ quantity: 1, name: 'Reine' }]),
    mk(1, 9000, [{ quantity: 2, name: 'Reine' }, { quantity: 1, name: 'Eau minérale' }]),
    mk(2, 3500, [{ quantity: 1, name: 'Margherita' }]),
    mk(3, 12000, [{ quantity: 3, name: 'Margherita' }, { quantity: 2, name: 'Coca-Cola' }]),
    mk(5, 5000, [{ quantity: 1, name: '4 Fromages' }]),
  ];
}

export function StatsView() {
  const { slug } = useParams<{ slug: string }>();
  const { t, language } = useTranslation();
  const { isConfigured } = useAuth();
  const [currency, setCurrency] = useState('FCFA');
  // Aggregated in the database when there is one, so the totals stay correct
  // however many orders the establishment has taken.
  const [stats, setStats] = useState<OrderStats | null>(
    () => (isConfigured ? null : computeStats(demoOrders(), startOfToday())),
  );

  useEffect(() => {
    if (!isConfigured || !slug) return;
    let active = true;
    (async () => {
      const est = await fetchEstablishmentBySlug(slug);
      if (!active || !est) return;
      setCurrency(est.currency);
      const s = await fetchOrderStats(est.id, startOfToday());
      if (active) setStats(s);
    })();
    return () => {
      active = false;
    };
  }, [slug, isConfigured]);

  // Only what the chart needs on top of the aggregates: a localized weekday
  // label per bucket, and the average basket.
  const days = useMemo(
    () => (stats?.days ?? []).map((d) => ({
      label: new Date(d.date).toLocaleDateString(language, { weekday: 'short' }),
      value: d.value,
    })),
    [stats, language],
  );
  const avgBasket = stats && stats.orders ? stats.totalRevenue / stats.orders : 0;

  const maxDay = Math.max(1, ...days.map((d) => d.value));
  // Narrowed once here so the panels below need no non-null assertions.
  const ready = stats && stats.orders > 0 ? stats : null;

  const card = (icon: React.ReactNode, label: string, value: string) => (
    <div className="glass-panel" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 140 }}>
      <div style={{ color: 'var(--primary-accent)' }}>{icon}</div>
      <div style={{ fontSize: 'var(--font-xl)', fontWeight: 'bold', color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--bg-color)' }}>
      <header style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 'var(--border-glass)', background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandLogo size={18} />
          <span style={{ fontSize: 'var(--font-md)', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart3 size={16} /> {t('stats.title')}
          </span>
        </div>
        <LanguageSelect />
      </header>

      {!ready ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: 'var(--space-sm)' }}>
          <BarChart3 size={48} style={{ opacity: 0.2 }} />
          <p>{t('stats.empty')}</p>
        </div>
      ) : (
        <main style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* KPI cards */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            {card(<TrendingUp size={20} />, t('stats.revenueToday'), formatPrice(ready.revenueToday, currency))}
            {card(<ShoppingBag size={20} />, t('stats.ordersToday'), String(ready.ordersToday))}
            {card(<Wallet size={20} />, t('stats.avgBasket'), formatPrice(avgBasket, currency))}
            {card(<BarChart3 size={20} />, t('stats.totalRevenue'), formatPrice(ready.totalRevenue, currency))}
          </div>

          {/* 7-day revenue chart */}
          <div className="glass-panel" style={{ padding: 'var(--space-md)' }}>
            <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', margin: '0 0 var(--space-md)', color: 'var(--text-primary)' }}>{t('stats.last7days')}</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--space-sm)', height: 140 }}>
              {days.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{d.value > 0 ? Math.round(d.value / 1000) + 'k' : ''}</div>
                  <div style={{ width: '70%', height: `${(d.value / maxDay) * 100}%`, minHeight: d.value > 0 ? 4 : 0, background: 'var(--gradient-brand)', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', transition: 'height var(--transition-base)' }} />
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{d.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top products */}
          <div className="glass-panel" style={{ padding: 'var(--space-md)' }}>
            <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', margin: '0 0 var(--space-md)', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
              <Trophy size={18} color="#f59e0b" /> {t('stats.topProducts')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {ready.topProducts.map((p, i) => {
                const max = ready.topProducts[0]?.qty || 1;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span style={{ width: 20, fontWeight: 'bold', color: 'var(--text-secondary)' }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>{localizeText(p.nameI18n, language, p.name)}</span>
                        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{p.qty} {t('stats.sold')}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-surface-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${(p.qty / max) * 100}%`, height: '100%', background: 'var(--gradient-brand)' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
