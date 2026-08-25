import { useEffect, useState } from 'react';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { getPendingPayment, clearPendingPayment, verifyPayment } from '../lib/orderApi';
import { playOrderChime } from '../lib/notifications';

type Phase = 'idle' | 'checking' | 'paid' | 'failed';

// After returning from the PawaPay page, poll our own verify-payment function
// until the deposit is confirmed. This makes the app self-sufficient — it never
// relies on the provider callback (which is shared with another project).
const POLL_MS = 3000;
const MAX_POLLS = 40; // ~2 min

/** 'checking' as soon as there is a payment worth watching for this slug. */
function openingPhase(slug?: string): Phase {
  return slug && getPendingPayment(slug) ? 'checking' : 'idle';
}

export function PaymentReturnWatcher({ slug }: { slug?: string }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>(() => openingPhase(slug));

  // Re-arm when the customer moves to another establishment.
  const [watchedSlug, setWatchedSlug] = useState(slug);
  if (slug !== watchedSlug) {
    setWatchedSlug(slug);
    setPhase(openingPhase(slug));
  }

  useEffect(() => {
    if (!slug) return;
    const pending = getPendingPayment(slug);
    if (!pending) return;

    let active = true;
    let tries = 0;

    const tick = async () => {
      if (!active) return;
      tries += 1;
      const { paid, failed } = await verifyPayment(pending.id);
      if (!active) return;
      if (paid) {
        clearPendingPayment();
        setPhase('paid');
        playOrderChime();
        try { navigator.vibrate?.(200); } catch { /* ignore */ }
        window.setTimeout(() => active && setPhase('idle'), 5000);
        return;
      }
      if (failed) {
        clearPendingPayment();
        setPhase('failed');
        window.setTimeout(() => active && setPhase('idle'), 6000);
        return;
      }
      if (tries >= MAX_POLLS) {
        // Give up quietly; the order stays pending and can still be confirmed
        // later. Don't clear it so a later reload can re-check within the TTL.
        setPhase('idle');
        return;
      }
      window.setTimeout(tick, POLL_MS);
    };
    tick();

    return () => { active = false; };
  }, [slug]);

  if (phase === 'idle') return null;

  const meta =
    phase === 'paid' ? { Icon: CheckCircle, color: '#16a34a', text: t('pay.confirmed'), spin: false }
    : phase === 'failed' ? { Icon: XCircle, color: 'var(--primary-red)', text: t('pay.failedMsg'), spin: false }
    : { Icon: Loader2, color: 'var(--primary-accent)', text: t('pay.verifying'), spin: true };

  return (
    <div style={{
      position: 'fixed', top: 'calc(var(--space-md) + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)',
      zIndex: 60, width: 'calc(100% - 2 * var(--space-md))', maxWidth: 440,
      display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
      background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-glass)', borderLeft: `4px solid ${meta.color}`,
      borderRadius: 'var(--radius-md)', padding: '12px 14px', boxShadow: 'var(--shadow-soft)',
    }}>
      <div style={{ color: meta.color, display: 'flex', flexShrink: 0 }}>
        <meta.Icon size={22} style={meta.spin ? { animation: 'spin 1s linear infinite' } : undefined} />
      </div>
      <div style={{ flex: 1, fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
        {meta.text}
      </div>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
