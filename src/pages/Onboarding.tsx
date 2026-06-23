import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { UploadCloud, CheckCircle, Loader2, Download } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { LanguageSelect } from '../components/LanguageSelect';
import { useAuth } from '../lib/AuthContext';
import { generateMenuFromImage, slugify, type OnboardingResult } from '../lib/onboardingApi';

export function Onboarding() {
  const { t } = useTranslation();
  const { isConfigured } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [error, setError] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Once the menu is created, build a QR code pointing at the customer page so
  // the manager can immediately print it / put it on tables.
  const menuUrl = result ? `${window.location.origin}/e/${result.slug}` : '';
  useEffect(() => {
    if (!menuUrl) return;
    QRCode.toDataURL(menuUrl, { width: 512, margin: 2, color: { dark: '#6b4cff', light: '#ffffff' } })
      .then(setQrUrl)
      .catch(() => setQrUrl(''));
  }, [menuUrl]);

  const handleDownloadQr = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `mood-pass-${result?.slug ?? 'menu'}-qr.png`;
    a.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const canSubmit = file !== null && (!isConfigured || name.trim().length > 0);

  const handleProcess = async () => {
    if (!file || !canSubmit) return;
    setIsProcessing(true);
    setError('');

    try {
      if (isConfigured) {
        const res = await generateMenuFromImage({ name: name.trim(), file });
        setResult(res);
      } else {
        // Demo mode: no backend — simulate the Vision pipeline.
        await new Promise((resolve) => setTimeout(resolve, 4000));
        setResult({ slug: slugify(name || 'demo'), categoryCount: 3, productCount: 24 });
      }
    } catch (e) {
      // Surface the real reason so PDF/vision failures are diagnosable.
      setError(e instanceof Error && e.message ? e.message : t('onboarding.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const isDone = result !== null;

  return (
    <div className="app-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg-color)', padding: 'var(--space-lg)' }}>
      <header style={{ marginBottom: 'var(--space-2xl)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
          <LanguageSelect />
        </div>
        <h1 className="text-gradient" style={{ fontSize: 'var(--font-xl)', fontWeight: 'bold' }}>{t('onboarding.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-sm)' }}>{t('onboarding.subtitle')}</p>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {!isProcessing && !isDone && (
          <div 
            className="glass-panel" 
            style={{ 
              width: '100%', 
              padding: 'var(--space-2xl) var(--space-md)', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              borderStyle: 'dashed',
              cursor: 'pointer'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} hidden accept="image/*,application/pdf" onChange={handleFileSelect} />
            <UploadCloud size={48} color="var(--primary-accent)" style={{ marginBottom: 'var(--space-md)' }} />
            <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-sm)' }}>
              {file ? file.name : t('onboarding.import')}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', textAlign: 'center' }}>
              {t('onboarding.importHint')}
            </p>
          </div>
        )}

        {!isProcessing && !isDone && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('onboarding.namePlaceholder')}
            style={{ width: '100%', boxSizing: 'border-box', marginTop: 'var(--space-md)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: 'var(--border-glass)', background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }}
          />
        )}

        {error && !isProcessing && (
          <div style={{ color: 'var(--primary-red, #ef4444)', fontSize: 'var(--font-sm)', textAlign: 'center', marginTop: 'var(--space-md)' }}>
            {error}
          </div>
        )}

        {isProcessing && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary-accent)" style={{ animation: 'spin 2s linear infinite' }} />
            <h3 style={{ fontSize: 'var(--font-lg)' }}>{t('onboarding.analyzing')}</h3>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
              {t('onboarding.analyzingHint')}
            </p>
            <style>{`
              @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
          </div>
        )}

        {isDone && (
          <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }}>
            <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-full)', background: 'rgba(76, 255, 120, 0.2)', color: '#4cff78', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
              <CheckCircle size={32} />
            </div>
            <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-sm)' }}>{t('onboarding.doneTitle')}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              {t('onboarding.doneDesc', { categories: result.categoryCount, products: result.productCount })}
            </p>

            {/* QR code for the new menu — the manager's main takeaway. */}
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-sm)' }}>{t('qr.description')}</p>
            {qrUrl && (
              <div style={{ background: 'white', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', marginBottom: 'var(--space-sm)' }}>
                <img src={qrUrl} alt="QR code" width={200} height={200} style={{ display: 'block', width: 200, height: 200 }} />
              </div>
            )}
            <button onClick={handleDownloadQr} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--primary-accent)', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--font-sm)', marginBottom: 'var(--space-lg)' }}>
              <Download size={16} /> {t('qr.download')}
            </button>

            <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate(`/manager/${result.slug}`)}>
              {t('onboarding.goToDashboard')}
            </button>
            <button
              onClick={() => navigate(`/e/${result.slug}`)}
              style={{ marginTop: 'var(--space-sm)', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 'var(--font-sm)', textDecoration: 'underline' }}
            >
              {t('onboarding.previewMenu')}
            </button>
          </div>
        )}
      </main>

      {!isProcessing && !isDone && (
        <footer style={{ marginTop: 'auto', paddingTop: 'var(--space-lg)' }}>
          <button
            className="btn-primary"
            onClick={handleProcess}
            disabled={!canSubmit}
            style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
          >
            {t('onboarding.generate')}
          </button>
        </footer>
      )}
    </div>
  );
}
