// Manager-side alerts for incoming orders: a chime, a browser notification,
// and (driven by the caller) an on-screen toast. All best-effort: if audio or
// the Notification API isn't available/allowed, these silently no-op.

let audioCtx: AudioContext | null = null;

/** Plays a short two-tone chime using the Web Audio API (no asset needed). */
export function playOrderChime(): void {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx ??= new Ctor();
    const ctx = audioCtx;
    // Browsers start the context suspended until a user gesture; try to resume.
    void ctx.resume?.();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = now + i * 0.18;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
      osc.start(start);
      osc.stop(start + 0.34);
    });
  } catch {
    /* audio unavailable — ignore */
  }
}

/** Asks for browser-notification permission once (no-op if already decided). */
export function requestNotificationPermission(): void {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  } catch {
    /* ignore */
  }
}

/** Shows a browser notification when permission was granted. */
export function showOrderNotification(title: string, body: string): void {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.svg' });
    }
  } catch {
    /* ignore */
  }
}
