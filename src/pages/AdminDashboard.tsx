import { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, TrendingUp, Store, Clock, XCircle, ShoppingBag, Gift } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { BrandLogo } from '../components/BrandLogo';
import { formatPrice } from '../lib/format';
import { fetchAdminOverview, adminGrant, type AdminOverview, type AdminRow } from '../lib/managerApi';

// Internal platform tool — French only (single super-admin user).
export function AdminDashboard() {
  const { session, signOut } = useAuth();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState<string | null>(null);

  const applyOverview = (res: Awaited<ReturnType<typeof fetchAdminOverview>>) => {
    if ('error' in res) setError(res.error);
    else setData(res);
    setLoading(false);
  };

  const load = async () => applyOverview(await fetchAdminOverview());

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetchAdminOverview();
      if (active) applyOverview(res);
    })();
    return () => {
      active = false;
    };
  }, [session]);

  const handleGrant = async (row: AdminRow) => {
    if (granting) return;
    setGranting(row.id);
    const ok = await adminGrant(row.id);
    if (ok) await load();
    setGranting(null);
  };

  const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—');

  const card = (icon: React.ReactNode, label: string, value: string) => (
    <div className="glass-panel" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 130 }}>
      <div style={{ color: 'var(--primary-accent)' }}>{icon}</div>
      <div style={{ fontSize: 'var(--font-xl)', fontWeight: 'bold', color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--bg-color)' }}>
      {/* Distinct dark header so the platform admin is never confused with a
          restaurant's own (light) manager pages. */}
      <header style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f172a', color: 'white', borderBottom: '3px solid var(--primary-accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={18} light />
          <div style={{ lineHeight: 1.15, borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
            <div style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={16} /> Administration</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#94a3b8' }}>Plateforme</div>
          </div>
        </div>
        {session && (
          <button onClick={signOut} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px 14px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-sm)' }}>
            Déconnexion
          </button>
        )}
      </header>
      <div style={{ background: '#0f172a', color: '#94a3b8', fontSize: 'var(--font-xs)', textAlign: 'center', padding: '6px var(--space-md)' }}>
        Vue d'ensemble de TOUS les établissements de la plateforme
      </div>

      <main style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxWidth: 900, width: '100%', margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)', color: 'var(--primary-accent)' }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : error ? (
          <div className="glass-panel" style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <ShieldCheck size={40} style={{ opacity: 0.2, marginBottom: 'var(--space-sm)' }} />
            <p>Accès réservé à l'administrateur Mood Pass.</p>
          </div>
        ) : data ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
              {card(<Store size={18} />, 'Établissements', String(data.totals.establishments))}
              {card(<TrendingUp size={18} />, 'Abonnés actifs', String(data.totals.active))}
              {card(<Clock size={18} />, 'En essai', String(data.totals.trial))}
              {card(<XCircle size={18} />, 'Expirés', String(data.totals.expired))}
              {card(<TrendingUp size={18} />, 'MRR estimé', formatPrice(data.totals.mrr, 'FCFA'))}
              {card(<ShoppingBag size={18} />, 'Commandes', String(data.totals.orders))}
            </div>

            <div className="glass-panel" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <h2 style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>Établissements</h2>
              {data.establishments.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Aucun établissement inscrit.</p>}
              {data.establishments.map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm)', borderTop: 'var(--border-glass)', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{r.ownerEmail} · {r.orders} cmd</div>
                  </div>
                  <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap',
                    background: r.active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: r.active ? '#16a34a' : 'var(--primary-red)' }}>
                    {r.status === 'trial' ? 'Essai' : r.active ? 'Actif' : 'Expiré'} · {fmtDate(r.currentPeriodEnd)}
                  </span>
                  <button onClick={() => handleGrant(r)} disabled={granting === r.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--primary-accent)', cursor: 'pointer', fontSize: 'var(--font-sm)', fontWeight: 600 }}>
                    {granting === r.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Gift size={14} />}
                    +30j
                  </button>
                </div>
              ))}
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
