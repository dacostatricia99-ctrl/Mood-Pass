import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useTranslation } from '../i18n/LanguageContext';
import { LanguageSelect } from '../components/LanguageSelect';

export function Login() {
  const { session, isConfigured, signIn, signUp } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // A shared /register link lands directly on the sign-up form.
  const [mode, setMode] = useState<'signIn' | 'signUp'>(location.pathname === '/register' ? 'signUp' : 'signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const from = (location.state as { from?: string } | null)?.from ?? '/app';

  // Already signed in (or no backend): nothing to do here.
  if (session) return <Navigate to={from} replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setStatus('loading');

    const action = mode === 'signIn' ? signIn : signUp;
    const result = await action(email, password);
    setStatus('idle');

    if (result.error) {
      // Surface the real reason (e.g. "Invalid login credentials") instead of a
      // generic message, so a wrong password is obvious.
      setError(result.error === 'not-configured' ? t('auth.notConfigured') : result.error);
      return;
    }
    if (result.needsConfirmation) {
      setNotice(t('auth.signUpSuccess'));
      setMode('signIn');
      return;
    }
    navigate(from, { replace: true });
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '12px 14px',
    borderRadius: 'var(--radius-sm)',
    border: 'var(--border-glass)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    outline: 'none',
  };

  return (
    <div className="app-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg-color)', padding: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <LanguageSelect />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 400, width: '100%', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <h1 className="text-gradient" style={{ fontSize: 'var(--font-xl)', fontWeight: 'bold' }}>{t('auth.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-sm)' }}>{t('auth.subtitle')}</p>
        </header>

        {!isConfigured && (
          <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', textAlign: 'center', marginBottom: 'var(--space-md)' }}>
            {t('auth.notConfigured')}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.email')}
            autoComplete="email"
            style={inputStyle}
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.password')}
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            style={inputStyle}
          />

          {error && <div style={{ color: 'var(--primary-red, #ef4444)', fontSize: 'var(--font-sm)', textAlign: 'center' }}>{error}</div>}
          {notice && <div style={{ color: '#4cff78', fontSize: 'var(--font-sm)', textAlign: 'center' }}>{notice}</div>}

          <button
            type="submit"
            className="btn-primary"
            disabled={status === 'loading'}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)', opacity: status === 'loading' ? 0.6 : 1, cursor: status === 'loading' ? 'wait' : 'pointer' }}
          >
            {status === 'loading'
              ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> {t('auth.loading')}</>
              : <><LogIn size={18} /> {mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}</>}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setError(''); setNotice(''); }}
          style={{ marginTop: 'var(--space-lg)', background: 'transparent', border: 'none', color: 'var(--primary-accent)', cursor: 'pointer', fontSize: 'var(--font-sm)' }}
        >
          {mode === 'signIn' ? t('auth.toSignUp') : t('auth.toSignIn')}
        </button>
      </div>

      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
