import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Creates a mobile-money payment for an order using the establishment's OWN
// CinetPay credentials (Model A — funds go straight to the restaurant).
//
// Sandbox mode (or missing real keys): the payment is simulated server-side —
// the order is marked paid and we return { simulated: true } so the whole flow
// is testable before the restaurant has a live CinetPay account.

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
      .select('id, total_amount, payment_status, establishment_id')
      .eq('id', order_id)
      .single()
    if (orderErr || !order) throw new Error('Order not found')
    if (order.establishment_id !== establishment_id) throw new Error('Order/establishment mismatch')
    if (order.payment_status === 'paid') return json({ paid: true })

    const { data: cfg } = await admin
      .from('payment_configs')
      .select('site_id, api_key, sandbox, enabled')
      .eq('establishment_id', establishment_id)
      .maybeSingle()

    if (!cfg || !cfg.enabled) throw new Error('Mobile payment not enabled for this establishment')

    const hasRealKeys = Boolean(cfg.site_id && cfg.api_key)

    // --- Sandbox / simulation path -----------------------------------------
    if (cfg.sandbox || !hasRealKeys) {
      await admin
        .from('orders')
        .update({ payment_status: 'paid', payment_ref: `SIMULATED-${Date.now()}` })
        .eq('id', order_id)
      return json({ simulated: true, paid: true })
    }

    // --- Real CinetPay path -------------------------------------------------
    // XOF amounts must be a multiple of 5.
    const amount = Math.round(Number(order.total_amount) / 5) * 5
    const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`

    const cpRes = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: cfg.api_key,
        site_id: cfg.site_id,
        transaction_id: String(order_id),
        amount,
        currency: 'XOF',
        description: `Commande ${String(order_id).slice(0, 8)}`,
        notify_url: notifyUrl,
        return_url: return_url ?? notifyUrl,
        channels: 'ALL',
      }),
    })
    const cpData = await cpRes.json()
    if (cpData?.code !== '201' || !cpData?.data?.payment_url) {
      throw new Error(cpData?.description || cpData?.message || 'CinetPay init failed')
    }

    await admin.from('orders').update({ payment_ref: String(order_id) }).eq('id', order_id)
    return json({ payment_url: cpData.data.payment_url })
  } catch (error) {
    return json({ error: error.message }, 400)
  }
})
