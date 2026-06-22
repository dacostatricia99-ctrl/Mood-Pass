import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import webpush from 'npm:web-push@3.6.7'

// Sends the customer a Web Push notification when their order is marked ready.
// Called by the manager (authenticated, owner-checked). Best-effort.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...cors } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { order_id } = await req.json()
    if (!order_id) throw new Error('order_id is required')

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Only the establishment's owner may trigger the notification.
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user } } = await admin.auth.getUser(token)
    if (!user) throw new Error('Not authenticated')
    const { data: order } = await admin.from('orders').select('establishment_id').eq('id', order_id).single()
    if (!order) throw new Error('Order not found')
    const { data: est } = await admin.from('establishments').select('owner_id').eq('id', order.establishment_id).single()
    if (!est || est.owner_id !== user.id) throw new Error('Forbidden')

    const { data: sub } = await admin
      .from('push_subscriptions').select('endpoint, p256dh, auth').eq('order_id', order_id).maybeSingle()
    if (!sub) return json({ sent: false, reason: 'no_subscription' })

    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@moodpass.app',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
    )

    const payload = JSON.stringify({
      title: 'Votre commande est prête ! 🎉',
      body: 'Vous pouvez venir la récupérer.',
      url: '/',
    })

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
    } catch (err) {
      // 404/410 = subscription gone; drop it so we don't retry.
      const code = (err as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) {
        await admin.from('push_subscriptions').delete().eq('order_id', order_id)
      }
      return json({ sent: false, reason: 'send_failed', code })
    }

    return json({ sent: true })
  } catch (e) {
    return json({ error: e.message }, 400)
  }
})