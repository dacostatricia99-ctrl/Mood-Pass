import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard, BarChart3, ChefHat, LogOut, Store } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { LanguageSelect } from '../components/LanguageSelect';
import { useAuth } from '../lib/AuthContext';
import { fetchMyEstablishments, type MyEstablishment } from '../lib/managerApi';

export function ManagerHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, isConfigured, signOut } = useAuth();
  const [establishments, setEstablishments] = useState<MyEstablishment[]>([]);
  const [loading, setLoading] = useState(isConfigured);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    let active = true;
    fetchMyEstablishments().then((list) => {
      if (active) {
        setEstablishments(list);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [isConfigured, session]);

  const linkBtn = (icon: React.ReactNode, label: string, to: string, primary = false) => (
    <button
      onClick={() => navigate(to)}
      className={primary ? 'btn-primary' : undefined}
      style={primary
        ? { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }
        : { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 'var(--font-sm)' }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--bg-color)' }}>
      <header style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 'var(--border-glass)', background: 'var(--bg-surface)' }}>
        <h1 className="text-gradient" style={{ fontSize: 'var(--font-lg)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Store size={20} /> {t('app.title')}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <LanguageSelect />
          {session && (
            <button onClick={signOut} title={t('auth.signOut')} aria-label={t('auth.signOut')} style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      <main style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxWidth: 560, width: '100%', margin: '0 auto' }}>
        <button onClick={() => navigate('/onboarding')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Plus size={18} /> {t('app.newEstablishment')}
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 'var(--space-xl)' }}>…</div>
        ) : establishments.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 'var(--space-xl) var(--space-md)' }}>
            <Store size={48} style={{ opacity: 0.2, marginBottom: 'var(--space-sm)' }} />
            <p>{t('app.empty')}</p>
          </div>
        ) : (
          establishments.map((e) => (
            <div key={e.id} className="glass-panel" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div>
                <div style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', color: 'var(--text-primary)' }}>{e.name}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>/e/{e.slug}</div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                {linkBtn(<LayoutDashboard size={16} />, t('app.openDashboard'), `/manager/${e.slug}`, true)}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                {linkBtn(<BarChart3 size={15} />, t('stats.title'), `/stats/${e.slug}`)}
                {linkBtn(<ChefHat size={15} />, t('kitchen.title'), `/kitchen/${e.slug}`)}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
