import { Component, type ReactNode } from 'react';

interface State {
  hasError: boolean;
}

const CHUNK_ERROR = /Loading chunk|dynamically imported module|ChunkLoadError|Importing a module script failed/i;

/**
 * Catches render crashes so the app never shows a blank page. A stale lazy
 * chunk (after a new deploy) is auto-recovered by reloading once with fresh
 * assets; anything else shows a friendly reload screen.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (CHUNK_ERROR.test(error.message) && !sessionStorage.getItem('moodpass-reloaded')) {
      sessionStorage.setItem('moodpass-reloaded', '1');
      window.location.reload();
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 320 }}>
          Une erreur est survenue. Rechargez la page.
        </p>
        <button
          className="btn-primary"
          onClick={() => { sessionStorage.removeItem('moodpass-reloaded'); window.location.reload(); }}
          style={{ padding: '10px 20px' }}
        >
          Recharger
        </button>
      </div>
    );
  }
}
