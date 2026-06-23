import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Settings as SettingsIcon, Smartphone, Check, Loader2, Info, Store } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { LanguageSelect } from '../components/LanguageSelect';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../lib/AuthContext';
import { getEstablishmentSettings, updateEstablishment, getPaymentConfig, savePaymentConfig, type PaymentConfig } from '../lib/managerApi';

const EMPTY: PaymentConfig = { siteId: '', apiKey: '', sandbox: true, enabled: false };

export function SettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { isConfigured } = useAuth();
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [details, setDetails] = useState({ name: '', currency: 'FCFA', phone: '' });
  const [savedDetails, setSavedDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [cfg, setCfg] = useState<PaymentConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isConfigured || !slug) {
      setLoading(false);
      return;
    }
    let active = true;
    getEstablishmentSettings(slug).then(async (est) => {
      if (!active || !est) return;
      setEstablishmentId(est.id);
      setDetails({ name: est.name, currency: est.currency, phone: est.phone ?? '' });
      const existing = await getPaymentConfig(est.id);
      if (active && existing) setCfg(existing);
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [slug, isConfigured]);

  const handleSaveDetails = async () => {
    if (!establishmentId || savingDetails) return;
    setSavingDetails(true);
    setSavedDetails(false);
    try {
      await updateEstablishment(establishmentId, details);
      setSavedDetails(true);
      setTimeout(() => setSavedDetails(false), 2500);
    } catch {
      /* ignore */
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSave = async () => {
    if (!establishmentId) return;
    setSaving(true);
    setSaved(false);
    try {
      await savePaymentConfig(establishmentId, cfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      /* surfaced by the disabled state resetting */
    } finally {
      setSaving(false);
    }
  };

  const field: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-glass)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none', fontSize: 'var(--font-sm)',
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--bg-color)' }}>
      <header style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 'var(--border-glass)', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandLogo size={18} />
          <span style={{ fontSize: 'var(--font-md)', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <SettingsIcon size={16} /> {t('nav.settings')}
          </span>
        </div>
        <LanguageSelect />
      </header>

      <main style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxWidth: 520, width: '100%', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 'var(--space-xl)' }}>…</div>
        ) : !isConfigured || !establishmentId ? (
          <div className="glass-panel" style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {t('menu.demoNotice')}
          </div>
        ) : (
          <>
          {/* Establishment details */}
          <div className="glass-panel" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h2 style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <Store size={18} color="var(--primary-accent)" /> {t('settings.details')}
            </h2>
            <label style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
              {t('settings.name')}
              <input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} style={{ ...field, marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
              {t('settings.currency')}
              <input value={details.currency} onChange={(e) => setDetails({ ...details, currency: e.target.value })} placeholder="FCFA" style={{ ...field, marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
              {t('settings.phone')}
              <input value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} inputMode="tel" style={{ ...field, marginTop: 4 }} />
            </label>
            <button onClick={handleSaveDetails} disabled={savingDetails} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {savingDetails ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : savedDetails ? <Check size={18} /> : null}
              {savedDetails ? t('pay.saved') : t('pay.save')}
            </button>
          </div>

          <div className="glass-panel" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h2 style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <Smartphone size={18} color="var(--primary-accent)" /> {t('pay.mmTitle')}
            </h2>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', margin: 0 }}>{t('pay.mmHint')}</p>

            <label style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
              {t('pay.siteId')}
              <input value={cfg.siteId} onChange={(e) => setCfg({ ...cfg, siteId: e.target.value })} placeholder="CinetPay site_id" style={{ ...field, marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
              {t('pay.apiKey')}
              <input value={cfg.apiKey} onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })} placeholder="CinetPay API key" type="password" style={{ ...field, marginTop: 4 }} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={cfg.sandbox} onChange={(e) => setCfg({ ...cfg, sandbox: e.target.checked })} />
              {t('pay.sandbox')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />
              {t('pay.enable')}
            </label>

            {cfg.sandbox && cfg.enabled && (
              <div style={{ display: 'flex', gap: 8, fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', background: 'var(--bg-color)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>
                <Info size={16} style={{ flexShrink: 0 }} /> {t('pay.sandboxNote')}
              </div>
            )}

            <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {saving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={18} /> : null}
              {saved ? t('pay.saved') : t('pay.save')}
            </button>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
          </>
        )}
      </main>
    </div>
  );
}
