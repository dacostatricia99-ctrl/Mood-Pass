import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Creates a mobile-money payment for an order using the establishment's OWN
// PawaPay token (Model A — funds go straight to the restaurant).
//
// With no token configured the payment is simulated server-side (order marked
// paid, { simulated: true }) so the whole flow is testable before the
// restaurant has a live PawaPay account.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { order_id, establishment_id, return_url } = await req.json()
    if (!order_id || !establishment_id) throw new Error('order_id and establishment_id are required')

    // Service-role client: reads the secret config + writes payment status,
    // bypassing RLS. Never exposed to the browser.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select('id, total_amount, payment_status, payment_ref, establishment_id')
      .eq('id', order_id)
      .single()
    if (orderErr || !order) throw new Error('Order not found')
    if (order.establishment_id !== establishment_id) throw new Error('Order/establishment mismatch')
    if (order.payment_status === 'paid') return json({ paid: true })
    if (order.payment_ref) throw new Error('A payment is already in progress for this order')

    // Fail fast before touching anything. The authoritative amount is read back
    // from the locked row further down.
    if (!(Number(order.total_amount) > 0)) throw new Error('Order has no payable amount')

    const { data: cfg } = await admin
      .from('payment_configs')
      .select('api_key, country, sandbox, enabled')
      .eq('establishment_id', establishment_id)
      .maybeSingle()

    if (!cfg || !cfg.enabled) throw new Error('Mobile payment not enabled for this establishment')

    // --- Sandbox simulation (no token configured yet) ----------------------
    // Lets the whole flow be tested before the restaurant has PawaPay keys.
    if (!cfg.api_key) {
      await admin
        .from('orders')
        .update({ payment_status: 'paid', payment_ref: `SIMULATED-${Date.now()}` })
        .eq('id', order_id)
      return json({ simulated: true, paid: true })
    }

    // --- PawaPay Payment Page ----------------------------------------------
    // depositId is a fresh UUID stored on the order so the callback can map back.
    const depositId = crypto.randomUUID()

    // Freeze the basket BEFORE the amount is handed to the provider. Setting
    // payment_ref is what makes the order_items trigger refuse new lines, so
    // arming it first closes the window where a line could be appended after
    // the amount was fixed but before the order was locked — which would have
    // let a customer be served more food than the payment page charges for.
    // The `is null` guard makes this the single winner if two payments race.
    const { data: locked } = await admin
      .from('orders')
      .update({ payment_ref: depositId, payment_status: 'pending' })
      .eq('id', order_id)
      .is('payment_ref', null)
      .select('total_amount')
      .maybeSingle()
    if (!locked) throw new Error('A payment is already in progress for this order')

    // Releases the basket so the customer can retry after a failed attempt.
    // Scoped to our own depositId so a concurrent attempt is never unlocked.
    const releaseLock = () =>
      admin
        .from('orders')
        .update({ payment_ref: null, payment_status: order.payment_status })
        .eq('id', order_id)
        .eq('payment_ref', depositId)

    // Read back from the locked row: no line can be added past this point, so
    // this is the amount the customer will actually owe.
    const amountDue = Number(locked.total_amount)
    if (!Number.isFinite(amountDue) || amountDue <= 0) {
      await releaseLock()
      throw new Error('Order has no payable amount')
    }

    const base = cfg.sandbox ? 'https://api.sandbox.pawapay.io' : 'https://api.pawapay.io'
    // Each country has its own currency. "FCFA" is XOF (West) or XAF (Central);
    // DR Congo uses CDF. Explicit map so the amount is charged in the right one.
    const CURRENCY: Record<string, string> = {
      // XOF (West-African CFA)
      BEN: 'XOF', BFA: 'XOF', CIV: 'XOF', GNB: 'XOF', MLI: 'XOF', NER: 'XOF', SEN: 'XOF', TGO: 'XOF',
      // XAF (Central-African CFA)
      CMR: 'XAF', CAF: 'XAF', TCD: 'XAF', COG: 'XAF', GNQ: 'XAF', GAB: 'XAF',
      // Others
      COD: 'CDF',
    }
    const country = (cfg.country || 'CIV').toUpperCase()
    const currency = CURRENCY[country] ?? 'XOF'
    const amount = String(Math.round(amountDue))

    let redirectUrl: string
    try {
      const ppRes = await fetch(`${base}/v2/paymentpage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.api_key}` },
        body: JSON.stringify({
          depositId,
          returnUrl: return_url ?? Deno.env.get('SUPABASE_URL'),
          amountDetails: { amount, currency },
          country,
          reason: `Commande ${String(order_id).slice(0, 8)}`,
          metadata: [{ orderId: String(order_id) }],
        }),
      })
      const pp = await ppRes.json()
      if (!ppRes.ok || !pp?.redirectUrl) {
        throw new Error(pp?.failureReason?.failureMessage || pp?.message || 'PawaPay init failed')
      }
      redirectUrl = pp.redirectUrl
    } catch (e) {
      // The provider never took the payment, so leave the basket editable.
      await releaseLock()
      throw e
    }

    // The order stays locked on depositId until the callback (or verify-payment)
    // settles it.
    return json({ payment_url: redirectUrl })
  } catch (error) {
    return json({ error: error.message }, 400)
  }
})
