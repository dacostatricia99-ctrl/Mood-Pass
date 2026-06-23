import { QrCode } from 'lucide-react';

/**
 * The Mood Pass wordmark — purple QR mark + "MoodPass". Reusable across the app
 * so the brand stays consistent. `light` makes the text readable on dark headers.
 */
export function BrandLogo({ size = 20, light = false }: { size?: number; light?: boolean }) {
  const box = size + 14;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: box, height: box, borderRadius: box * 0.28, background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
        <QrCode size={size} />
      </span>
      <span style={{ fontSize: size, fontWeight: 800, letterSpacing: '-0.3px', color: light ? '#fff' : 'var(--text-primary)' }}>
        Mood<span style={{ color: light ? '#d6ccff' : 'var(--primary-accent)' }}>Pass</span>
      </span>
    </span>
  );
}