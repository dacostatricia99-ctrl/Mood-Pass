import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Lock, CreditCard, ArrowLeft } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { useAuth } from '../lib/AuthContext';
import { fetchEstablishmentBySlug, getSubscription, startSubscriptionPayment } from '../lib/managerApi';

type GateState = 'loading' | 'ok' | 'blocked';

/**
 * Gates per-establishment manager pages behind an active Mood Pass subscription.
 * Demo mode (no backend) and an active trial/subscription pass through; an
 * expired one shows a paywall that triggers the subscription payment.
 */
export function SubscriptionGate({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const { isConfigured } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Demo mode has no subscription to check, so the gate opens immediately
  // rather than rendering a spinner it would correct one tick later.
  const [state, setState] = useState<GateState>(isConfigured && slug ? 'loading' : 'ok');
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!isConfigured || !slug) return;
    let active = true;
    (async () => {
      const est = await fetchEstablishmentBySlug(slug);
      if (!active) return;
      if (!est) {
        setState('blocked');
        return;
      }
      setEstablishmentId(est.id);
      const sub = await getSubscription(est.id);
      if (!active) return;
      setState(sub?.active ? 'ok' : 'blocked');
    })();
    return () => {
      active = false;
    };
  }, [slug, isConfigured]);

  const handleSubscribe = async () => {
    if (!establishmentId || paying) return;
    setPaying(true);
    const res = await startSubscriptionPayment(establishmentId);
    if (res.paymentUrl) {
      window.location.href = res.paymentUrl;
      return;
    }
    if (res.simulated) {
      setState('ok'); // sandbox extended the subscription
    }
    setPaying(false);
  };

  if (state === 'loading') {
    return (
      <div style={{ display: 'flex', height: '100dvh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--primary-accent)' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (state === 'ok') return <>{children}</>;

  // Paywall
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--bg-color)', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-lg)', gap: 'var(--space-md)', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-full)', background: 'rgba(239,68,68,0.15)', color: 'var(--primary-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Lock size={32} />
      </div>
      <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{t('sub.required')}</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 360, margin: 0 }}>{t('sub.expiredMsg')}</p>
      <div style={{ fontSize: 'var(--font-lg)', fontWeight: 'bold', color: 'var(--primary-accent)' }}>{t('sub.price')}</div>

      <button onClick={handleSubscribe} disabled={paying} className="btn-primary" style={{ width: '100%', maxWidth: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {paying ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <CreditCard size={18} />}
        {paying ? t('sub.processing') : t('sub.subscribe')}
      </button>
      <button onClick={() => navigate('/app')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-sm)' }}>
        <ArrowLeft size={16} /> {t('sub.backHome')}
      </button>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
