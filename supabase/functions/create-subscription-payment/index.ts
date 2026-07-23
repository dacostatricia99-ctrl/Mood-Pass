import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Subscription payment: restaurant -> Mood Pass (the platform fee). Uses Mood
// Pass's OWN PawaPay token (platform secret), not the per-restaurant one.
// With no token configured the subscription is extended immediately so the
// whole flow is testable before the platform has a live PawaPay account.

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

    const token = Deno.env.get('MOODPASS_PAWAPAY_TOKEN')
    const sandbox = (Deno.env.get('MOODPASS_SANDBOX') ?? 'true') !== 'false'
    const price = Math.round(Number(Deno.env.get('MOODPASS_PLAN_PRICE') ?? '10000'))

    // --- No token: extend immediately (testable before a live account) -----
    if (!token) {
      const { data: sub } = await admin
        .from('subscriptions').select('current_period_end').eq('establishment_id', establishment_id).maybeSingle()
      await admin.from('subscriptions').update({
        status: 'active', current_period_end: extendedEnd(sub?.current_period_end ?? null), updated_at: new Date().toISOString(),
      }).eq('establishment_id', establishment_id)
      return json({ simulated: true, extended: true })
    }

    // --- Real PawaPay Payment Page -----------------------------------------
    // depositId encodes the establishment so the callback can extend the sub.
    const depositId = crypto.randomUUID()
    const base = sandbox ? 'https://api.sandbox.pawapay.io' : 'https://api.pawapay.io'
    const ppRes = await fetch(`${base}/v2/paymentpage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        depositId,
        returnUrl: return_url ?? URL,
        amountDetails: { amount: String(price), currency: 'XOF' },
        reason: 'Abonnement Mood Pass',
        metadata: [{ establishmentId: String(establishment_id), kind: 'subscription' }],
      }),
    })
    const pp = await ppRes.json()
    if (!ppRes.ok || !pp?.redirectUrl) throw new Error(pp?.failureReason?.failureMessage || pp?.message || 'PawaPay init failed')

    // The establishment is carried in the deposit metadata; the webhook reads it
    // back from PawaPay when it verifies the deposit — no extra column needed.
    return json({ payment_url: pp.redirectUrl })
  } catch (e) {
    return json({ error: e.message }, 400)
  }
})
