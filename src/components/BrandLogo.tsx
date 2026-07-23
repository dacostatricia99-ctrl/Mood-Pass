/**
 * The Mood Pass wordmark — QR-circuit mark + "MOOD PASS". Reusable across the app
 * so the brand stays consistent. `light` makes the text readable on dark headers.
 *
 * The mark image lives at /logo-mark.png (icon only, transparent, square).
 */
export function BrandLogo({ size = 20, light = false }: { size?: number; light?: boolean }) {
  const mark = size + 14;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <img
        src="/logo-mark.png"
        alt=""
        aria-hidden="true"
        width={mark}
        height={mark}
        style={{ display: 'block', objectFit: 'contain', flexShrink: 0 }}
      />
      <span style={{ fontSize: size, fontWeight: 800, letterSpacing: '0.4px', color: light ? '#fff' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
        MOOD <span style={{ color: light ? '#d6ccff' : 'var(--primary-accent)' }}>PASS</span>
      </span>
    </span>
  );
}
