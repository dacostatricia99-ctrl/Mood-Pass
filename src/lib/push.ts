import { supabase } from './supabase';

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Subscribes the customer's device to Web Push for a given order, so they get a
 * notification when it's ready — even with the app closed. Best-effort: silently
 * no-ops if push isn't supported, permission is denied, or VAPID isn't set.
 */
export async function subscribeOrderPush(orderId: string): Promise<void> {
  try {
    if (!supabase || !VAPID_PUBLIC) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
    });

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys) return;
    await supabase.from('push_subscriptions').upsert({
      order_id: orderId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    });
  } catch {
    /* push unavailable — the in-page tracker still works */
  }
}