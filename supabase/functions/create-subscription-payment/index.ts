import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Subscription payment: restaurant -> Mood Pass (the platform fee). Uses Mood
// Pass's OWN CinetPay credentials (platform secrets), not the per-restaurant
// ones. Sandbox mode extends the subscription immediately so the whole flow is
// testable before the platform has a live CinetPay account.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...cors } })

const PLAN_DAYS = 30

function extendedEnd(current: string | null): string {
  const base = current && new Date(current).getTime() > Date.now() ? new Date(current) : new Date()
  base.setDate(base.getDate() + PLAN_DAYS)
  return base.toISOString()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { establishment_id, return_url } = await req.json()
    if (!establishment_id) throw new Error('establishment_id is required')

    const URL = Deno.env.get('SUPABASE_URL') ?? ''
    const admin = createClient(URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    // The caller must own the establishment. Validate the JWT explicitly.
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user } } = await admin.auth.getUser(token)
    if (!user) throw new Error('Not authenticated')
    const { data: est } = await admin.from('establishments').select('owner_id').eq('id', establishment_id).single()
    if (!est || est.owner_id !== user.id) throw new Error('Forbidden')

    const siteId = Deno.env.get('MOODPASS_CINETPAY_SITE_ID')
    const apiKey = Deno.env.get('MOODPASS_CINETPAY_API_KEY')
    const sandbox = (Deno.env.get('MOODPASS_SANDBOX') ?? 'true') !== 'false'
    const price = Math.round(Number(Deno.env.get('MOODPASS_PLAN_PRICE') ?? '10000') / 5) * 5

    // --- Sandbox: extend immediately ---------------------------------------
    if (sandbox || !siteId || !apiKey) {
      const { data: sub } = await admin
        .from('subscriptions').select('current_period_end').eq('establishment_id', establishment_id).maybeSingle()
      await admin.from('subscriptions').update({
        status: 'active', current_period_end: extendedEnd(sub?.current_period_end ?? null), updated_at: new Date().toISOString(),
      }).eq('establishment_id', establishment_id)
      return json({ simulated: true, extended: true })
    }

    // --- Real CinetPay ------------------------------------------------------
    const transactionId = `sub_${establishment_id}_${Date.now()}`
    const notifyUrl = `${URL}/functions/v1/subscription-webhook`
    const cpRes = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: apiKey, site_id: siteId, transaction_id: transactionId, amount: price, currency: 'XOF',
        description: 'Abonnement Mood Pass', notify_url: notifyUrl, return_url: return_url ?? notifyUrl, channels: 'ALL',
      }),
    })
    const cp = await cpRes.json()
    if (cp?.code !== '201' || !cp?.data?.payment_url) throw new Error(cp?.description || 'CinetPay init failed')
    return json({ payment_url: cp.data.payment_url })
  } catch (e) {
    return json({ error: e.message }, 400)
  }
})
