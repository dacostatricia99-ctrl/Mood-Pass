import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { EstablishmentHome } from './pages/EstablishmentHome';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { KitchenDisplay } from './pages/KitchenDisplay';
import { StatsView } from './pages/StatsView';
import { SettingsPage } from './pages/SettingsPage';
import { Onboarding } from './pages/Onboarding';
import { Login } from './pages/Login';
import { RequireAuth } from './components/RequireAuth';
import { LanguageProvider, useTranslation } from './i18n/LanguageContext';
import { AuthProvider } from './lib/AuthContext';

function ScanPrompt() {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', height: '100dvh', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
      <p>{t('home.scanPrompt')}</p>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Customer-facing: anonymous */}
            <Route path="/e/:slug" element={<EstablishmentHome />} />
            {/* Manager-facing: protected (open in demo mode) */}
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
            <Route path="/manager/:slug" element={<RequireAuth><ManagerDashboard /></RequireAuth>} />
            <Route path="/kitchen/:slug" element={<RequireAuth><KitchenDisplay /></RequireAuth>} />
            <Route path="/stats/:slug" element={<RequireAuth><StatsView /></RequireAuth>} />
            <Route path="/settings/:slug" element={<RequireAuth><SettingsPage /></RequireAuth>} />
            <Route path="*" element={<ScanPrompt />} />
          </Routes>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
