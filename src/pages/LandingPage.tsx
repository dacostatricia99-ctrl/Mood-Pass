import { Link } from 'react-router-dom';
import {
  Smartphone, BrainCircuit, ClipboardList, LayoutGrid, Smile, PieChart,
  Zap, Clock, Headphones, Check, ArrowRight, Utensils, BedDouble, Wine,
  Plus, Trash2, Power, CalendarClock, Percent,
} from 'lucide-react';

// Public marketing site for mood-pass.com (French — primary market).
const ACCENT = 'var(--primary-accent)';
const PURPLE = 'linear-gradient(135deg, #6b4cff 0%, #a855f7 100%)';

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <img src="/logo-mark.png" alt="" aria-hidden="true" width={36} height={36} style={{ display: 'block', objectFit: 'contain' }} />
      <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.4px', color: light ? 'white' : '#1e1b2e' }}>
        MOOD <span style={{ color: light ? '#d6ccff' : ACCENT }}>PASS</span>
      </span>
    </div>
  );
}

const FEATURES = [
  { Icon: Smartphone, title: 'Accès instantané', text: 'Un scan suffit pour accéder à tous vos services.' },
  { Icon: BrainCircuit, title: 'IA intelligente', text: 'Notre IA comprend vos demandes et agit pour vous.' },
  { Icon: ClipboardList, title: 'Commandes digitalisées', text: 'Fini les tickets papier et les erreurs de saisie.' },
  { Icon: LayoutGrid, title: 'Gestion centralisée', text: 'Pilotez tous vos services depuis un seul tableau de bord.' },
  { Icon: Smile, title: 'Expérience client', text: "Réduisez l'attente et améliorez la satisfaction." },
  { Icon: PieChart, title: 'Statistiques temps réel', text: 'Suivez vos performances et prenez les bonnes décisions.' },
];

const STATS = [
  { value: '< 2 min', label: 'Pour mettre votre menu en ligne' },
  { value: '5', label: 'Langues pour vos clients' },
  { value: 'Temps réel', label: 'Commandes en cuisine instantanées' },
  { value: 'Mobile Money', label: '& espèces — paiement intégré' },
];

const SECTORS = [
  { Icon: Utensils, img: 'restaurant', title: 'Restaurants & Cafés', text: 'Menu digital, commandes, paiement, cuisine en temps réel.' },
  { Icon: BedDouble, img: 'hotel', title: 'Hôtels', text: 'Livret d\'accueil, informations pratiques, demandes de service.' },
  { Icon: Wine, img: 'bar', title: 'Bars & Lounges', text: 'Carte digitale, commandes au bar, paiement rapide.' },
];

const AI_COMMANDS = [
  { Icon: Plus, text: 'Ajoute Pizza Royale 8 500 FCFA' },
  { Icon: Trash2, text: 'Supprime le Burger Classic' },
  { Icon: Power, text: 'Rends le Poulet Yassa indisponible' },
  { Icon: CalendarClock, text: 'Change le prix du Coca à 1 200' },
  { Icon: Percent, text: 'Affiche mes ventes du jour' },
];

const STEPS = [
  { n: '1', title: 'Scannez', text: 'Vos clients scannent le QR Code de votre établissement.' },
  { n: '2', title: 'Accédez', text: 'Ils accèdent instantanément au menu et passent commande.' },
  { n: '3', title: 'Profitez', text: 'Vous servez plus vite, sans attente et sans erreur.' },
];

const card: React.CSSProperties = { background: 'white', borderRadius: 16, border: '1px solid #ece9f5', padding: 22 };
const sectionPad: React.CSSProperties = { padding: '64px 20px', maxWidth: 1120, margin: '0 auto' };

export function LandingPage() {
  return (
    <div style={{ background: '#fbfaff', color: '#1e1b2e', fontFamily: 'inherit' }}>
      <style>{`
        .lp-navlink { color: #4b4660; text-decoration: none; font-weight: 600; font-size: 14px; }
        .lp-navlink:hover { color: var(--primary-accent); }
        .lp-footlink { color: #c9c4dd; text-decoration: none; }
        .lp-footlink:hover { color: #fff; }
        @media (max-width: 720px) { .lp-navlink { display: none; } }
      `}</style>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(251,250,255,0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #ece9f5' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo />
          <nav style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <a href="#features" className="lp-navlink">Fonctionnalités</a>
            <a href="#sectors" className="lp-navlink">Secteurs</a>
            <a href="#how" className="lp-navlink">Comment ça marche</a>
            <Link to="/register" style={{ background: PURPLE, color: 'white', padding: '10px 18px', borderRadius: 999, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              Essayer gratuitement
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: 'radial-gradient(1200px 500px at 70% -10%, rgba(107,76,255,0.18), transparent), #14101f', color: 'white' }}>
        <div style={{ ...sectionPad, paddingTop: 64, paddingBottom: 64, display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 380px' }}>
            <h1 style={{ fontSize: 'clamp(36px, 6vw, 58px)', lineHeight: 1.05, fontWeight: 800, margin: 0 }}>
              Un scan.<br />Un accès.<br />Toutes vos <span style={{ color: '#a855f7' }}>envies.</span>
            </h1>
            <p style={{ color: '#c9c4dd', fontSize: 'clamp(15px,2.5vw,19px)', maxWidth: 540, marginTop: 22 }}>
              Mood Pass transforme un simple QR Code en point d'accès intelligent à tous les services de votre établissement.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 30 }}>
              <Link to="/register" style={{ background: PURPLE, color: 'white', padding: '14px 26px', borderRadius: 999, fontWeight: 700, textDecoration: 'none', boxShadow: '0 10px 30px rgba(107,76,255,0.4)' }}>
                Démarrer gratuitement
              </Link>
              <a href="#how" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '14px 26px', borderRadius: 999, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)' }}>
                Voir comment ça marche
              </a>
            </div>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginTop: 34, color: '#c9c4dd', fontSize: 14 }}>
              {[[Zap, 'Sans application'], [Clock, 'Installation en 2 min'], [BrainCircuit, 'IA intégrée'], [Headphones, 'Multilingue']].map(([I, t], i) => {
                const Ic = I as typeof Zap;
                return <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Ic size={16} color="#a855f7" /> {t as string}</span>;
              })}
            </div>
          </div>
          <div style={{ flex: '1 1 360px', minWidth: 280 }}>
            <img src="/landing/hero.jpg" alt="Mood Pass — QR de table et application" loading="eager" style={{ width: '100%', borderRadius: 18, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={sectionPad}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(26px,4vw,36px)', fontWeight: 800, margin: 0 }}>
          Gérez votre établissement plus simplement
        </h2>
        <p style={{ textAlign: 'center', color: '#6b6580', maxWidth: 620, margin: '14px auto 0' }}>
          Une plateforme tout-en-un alimentée par l'IA pour automatiser vos services et offrir une expérience client exceptionnelle.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginTop: 40 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={card}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(107,76,255,0.1)', color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <f.Icon size={22} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>{f.title}</h3>
              <p style={{ color: '#6b6580', margin: 0, fontSize: 15 }}>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats band */}
      <section style={{ background: '#14101f', color: 'white' }}>
        <div style={{ ...sectionPad, paddingTop: 48, paddingBottom: 48, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24, textAlign: 'center' }}>
          {STATS.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#a855f7' }}>{s.value}</div>
              <div style={{ color: '#c9c4dd', fontSize: 14, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Sectors */}
      <section id="sectors" style={sectionPad}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(26px,4vw,36px)', fontWeight: 800, margin: 0 }}>
          Une solution adaptée à tous les établissements
        </h2>
        <p style={{ textAlign: 'center', color: '#6b6580', maxWidth: 620, margin: '14px auto 0' }}>
          Restaurants, hôtels, bars, cafés… Mood Pass s'adapte à votre activité et à vos besoins.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginTop: 40 }}>
          {SECTORS.map((s) => (
            <div key={s.title} style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 150, background: PURPLE, backgroundImage: `url(/landing/${s.img}.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <s.Icon size={20} color={ACCENT} />
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{s.title}</h3>
                </div>
                <p style={{ color: '#6b6580', margin: 0, fontSize: 15 }}>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI section */}
      <section style={{ background: 'linear-gradient(180deg, #f3f0ff, #fbfaff)' }}>
        <div style={sectionPad}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(26px,4vw,36px)', fontWeight: 800, margin: 0 }}>
            L'IA au service de votre quotidien
          </h2>
          <p style={{ textAlign: 'center', color: '#6b6580', margin: '14px auto 0' }}>
            Parlez naturellement. Notre IA comprend et exécute.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520, margin: '36px auto 0' }}>
            {AI_COMMANDS.map((c) => (
              <div key={c.text} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 12, border: '1px solid #ece9f5', padding: '14px 16px' }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(107,76,255,0.1)', color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <c.Icon size={16} />
                </span>
                <span style={{ fontWeight: 600 }}>{c.text}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start', background: 'rgba(22,163,74,0.1)', color: '#16a34a', borderRadius: 999, padding: '8px 16px', fontWeight: 600, marginTop: 4 }}>
              <Check size={16} /> Action exécutée avec succès
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={sectionPad}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(26px,4vw,36px)', fontWeight: 800, margin: 0 }}>Comment ça marche ?</h2>
        <p style={{ textAlign: 'center', color: '#6b6580', margin: '14px auto 0' }}>3 étapes simples pour transformer votre service.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginTop: 44 }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: PURPLE, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, margin: '0 auto 16px' }}>{s.n}</div>
              <h3 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 6px' }}>{s.title}</h3>
              <p style={{ color: '#6b6580', margin: 0, maxWidth: 280, marginInline: 'auto' }}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: PURPLE, color: 'white' }}>
        <div style={{ ...sectionPad, textAlign: 'center', paddingTop: 56, paddingBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 800, margin: 0 }}>
            Prêt à révolutionner l'expérience de vos clients ?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', maxWidth: 560, margin: '16px auto 0' }}>
            Rejoignez les établissements qui servent plus vite, plus simplement et sans erreur avec Mood Pass.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
            <Link to="/register" style={{ background: 'white', color: '#6b4cff', padding: '14px 28px', borderRadius: 999, fontWeight: 800, textDecoration: 'none' }}>
              Démarrer gratuitement
            </Link>
            <a href="mailto:contact@mood-pass.com" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '14px 28px', borderRadius: 999, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.4)' }}>
              Demander une démo
            </a>
          </div>
          <div style={{ display: 'flex', gap: 22, justifyContent: 'center', flexWrap: 'wrap', marginTop: 26, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
            {['Essai gratuit 14 jours', 'Aucune carte requise', 'Mise en place rapide'].map((t) => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Check size={16} /> {t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#14101f', color: '#c9c4dd' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 20px', display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo light />
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 14 }}>
            <a href="#features" className="lp-footlink">Fonctionnalités</a>
            <a href="#sectors" className="lp-footlink">Secteurs</a>
            <Link to="/register" className="lp-footlink">Inscrire mon restaurant</Link>
            <Link to="/login" className="lp-footlink">Espace gérant</Link>
            <a href="mailto:contact@mood-pass.com" className="lp-footlink">Contact</a>
          </div>
          <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowRight size={14} style={{ opacity: 0 }} /> © {new Date().getFullYear()} Mood Pass — mood-pass.com
          </div>
        </div>
      </footer>
    </div>
  );
}