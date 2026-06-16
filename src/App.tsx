import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { EstablishmentHome } from './pages/EstablishmentHome';
import { RequireAuth } from './components/RequireAuth';
import { SubscriptionGate } from './components/SubscriptionGate';
import { LanguageProvider, useTranslation } from './i18n/LanguageContext';
import { AuthProvider } from './lib/AuthContext';

// Manager-facing pages are lazy-loaded so the customer menu (the QR target)
// ships the smallest possible bundle.
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard').then((m) => ({ default: m.ManagerDashboard })));
const ManagerHome = lazy(() => import('./pages/ManagerHome').then((m) => ({ default: m.ManagerHome })));
const KitchenDisplay = lazy(() => import('./pages/KitchenDisplay').then((m) => ({ default: m.KitchenDisplay })));
const StatsView = lazy(() => import('./pages/StatsView').then((m) => ({ default: m.StatsView })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const Onboarding = lazy(() => import('./pages/Onboarding').then((m) => ({ default: m.Onboarding })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));

function PageLoader() {
  return (
    <div style={{ display: 'flex', height: '100dvh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--primary-accent)' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ScanPrompt() {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px', gap: 'var(--space-lg)' }}>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 360 }}>{t('home.scanPrompt')}</p>
      <Link to="/app" style={{ color: 'var(--primary-accent)', fontSize: 'var(--font-sm)', fontWeight: 600 }}>
        {t('app.managerArea')}
      </Link>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Customer-facing: anonymous */}
            <Route path="/e/:slug" element={<EstablishmentHome />} />
            {/* Manager-facing: protected (open in demo mode) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Login />} />
            <Route path="/app" element={<RequireAuth><ManagerHome /></RequireAuth>} />
            <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
            <Route path="/manager/:slug" element={<RequireAuth><SubscriptionGate><ManagerDashboard /></SubscriptionGate></RequireAuth>} />
            <Route path="/kitchen/:slug" element={<RequireAuth><SubscriptionGate><KitchenDisplay /></SubscriptionGate></RequireAuth>} />
            <Route path="/stats/:slug" element={<RequireAuth><SubscriptionGate><StatsView /></SubscriptionGate></RequireAuth>} />
            <Route path="/settings/:slug" element={<RequireAuth><SubscriptionGate><SettingsPage /></SubscriptionGate></RequireAuth>} />
            <Route path="*" element={<ScanPrompt />} />
          </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
