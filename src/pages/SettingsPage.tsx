import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Settings as SettingsIcon, Smartphone, Check, Loader2, Info, Store, ImagePlus } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { LanguageSelect } from '../components/LanguageSelect';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../lib/AuthContext';
import { getEstablishmentSettings, updateEstablishment, uploadEstablishmentLogo, getPaymentConfig, savePaymentConfig, type PaymentConfig } from '../lib/managerApi';

const EMPTY: PaymentConfig = { siteId: '', apiKey: '', country: 'CIV', sandbox: true, enabled: false };

// CFA-franc countries PawaPay supports for mobile money (XOF = West, XAF = Central).
const PAY_COUNTRIES: { code: string; label: string }[] = [
  { code: 'CIV', label: "Côte d'Ivoire" },
  { code: 'SEN', label: 'Sénégal' },
  { code: 'BEN', label: 'Bénin' },
  { code: 'BFA', label: 'Burkina Faso' },
  { code: 'TGO', label: 'Togo' },
  { code: 'MLI', label: 'Mali' },
  { code: 'NER', label: 'Niger' },
  { code: 'CMR', label: 'Cameroun' },
  { code: 'COG', label: 'Congo' },
  { code: 'GAB', label: 'Gabon' },
];

export function SettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { isConfigured } = useAuth();
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [details, setDetails] = useState({ name: '', currency: 'FCFA', phone: '' });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
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
      setLogoUrl(est.logoUrl);
      const existing = await getPaymentConfig(est.id);
      if (active && existing) setCfg(existing);
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [slug, isConfigured]);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !establishmentId) return;
    setUploadingLogo(true);
    try {
      const url = await uploadEstablishmentLogo(establishmentId, file);
      setLogoUrl(url);
    } catch {
      /* ignore */
    } finally {
      setUploadingLogo(false);
    }
  };

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

            {/* Logo */}
            <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={handleLogoSelect} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                title={t('settings.logo')}
                style={{ position: 'relative', width: 64, height: 64, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, padding: 0, border: '1px solid var(--border-glass)', cursor: 'pointer', background: logoUrl ? '#eee' : 'var(--bg-color)' }}
              >
                {logoUrl
                  ? <img src={logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'var(--text-secondary)' }}><ImagePlus size={24} /></span>}
                {uploadingLogo && <span style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></span>}
              </button>
              <div>
                <div style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{t('settings.logo')}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{t('settings.logoHint')}</div>
              </div>
            </div>

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
              {t('pay.apiKey')}
              <input value={cfg.apiKey} onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })} placeholder="PawaPay API token" type="password" style={{ ...field, marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
              {t('pay.country')}
              <select value={cfg.country} onChange={(e) => setCfg({ ...cfg, country: e.target.value })} style={{ ...field, marginTop: 4 }}>
                {PAY_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
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
