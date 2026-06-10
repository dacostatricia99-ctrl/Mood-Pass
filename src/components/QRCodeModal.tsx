import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Copy, Check } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

interface QRCodeModalProps {
  slug: string;
  onClose: () => void;
}

export function QRCodeModal({ slug, onClose }: QRCodeModalProps) {
  const { t } = useTranslation();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Derive full URL assuming current origin
  const customerUrl = `${window.location.origin}/e/${slug}`;

  useEffect(() => {
    QRCode.toDataURL(customerUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#ef4444', // brand red
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR generation failed', err));
  }, [customerUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(customerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      padding: 'var(--space-lg)'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%', maxWidth: 360, padding: 'var(--space-xl)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
        
        <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 'bold', margin: 0, textAlign: 'center' }}>
          {t('qr.title')}
        </h2>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
          {t('qr.description')}
        </p>

        {qrDataUrl ? (
          <div style={{ background: 'white', padding: 8, borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)' }}>
            <img src={qrDataUrl} alt="QR Code" style={{ display: 'block', width: 240, height: 240 }} />
          </div>
        ) : (
          <div style={{ width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            {t('qr.generating')}
          </div>
        )}

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a
            href={qrDataUrl}
            download={`QR_${slug}.png`}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
          >
            <Download size={18} /> {t('qr.download')}
          </a>
          
          <button
            onClick={handleCopy}
            style={{ 
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px', borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-elevated)', 
              border: '1px solid var(--border-glass)', color: 'var(--text-primary)', cursor: 'pointer',
              fontWeight: 600, fontSize: 'var(--font-sm)'
            }}
          >
            {copied ? <Check size={18} color="#10b981" /> : <Copy size={18} />} 
            {copied ? t('qr.copied') : t('qr.copy')}
          </button>
        </div>
      </div>
    </div>
  );
}
