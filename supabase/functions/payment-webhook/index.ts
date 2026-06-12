import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// CinetPay payment notification (notify_url). CinetPay does not send a JWT, so
// this function must be deployed with --no-verify-jwt. We never trust the POST
// body for the outcome: we re-check the transaction against CinetPay using the
// establishment's own credentials, then mark the order paid.

serve(async (req) => {
  try {
    // CinetPay posts form-encoded; be lenient and also accept JSON.
    let transactionId = ''
    const ct = req.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const b = await req.json()
      transactionId = b.cpm_trans_id || b.transaction_id || ''
    } else {
      const form = await req.formData()
      transactionId = String(form.get('cpm_trans_id') || form.get('transaction_id') || '')
    }
    if (!transactionId) return new Response('missing transaction', { status: 200 })

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // transaction_id is the order id. Find the order and its establishment config.
    const { data: order } = await admin
      .from('orders')
      .select('id, establishment_id, payment_status')
      .eq('id', transactionId)
      .single()
    if (!order) return new Response('order not found', { status: 200 })
    if (order.payment_status === 'paid') return new Response('already paid', { status: 200 })

    const { data: cfg } = await admin
      .from('payment_configs')
      .select('site_id, api_key')
      .eq('establishment_id', order.establishment_id)
      .maybeSingle()
    if (!cfg?.site_id || !cfg?.api_key) return new Response('no config', { status: 200 })

    // Verify the real outcome with CinetPay (never trust the callback body).
    const checkRes = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apikey: cfg.api_key, site_id: cfg.site_id, transaction_id: transactionId }),
    })
    const check = await checkRes.json()
    if (check?.data?.status === 'ACCEPTED') {
      await admin
        .from('orders')
        .update({ payment_status: 'paid', payment_ref: transactionId })
        .eq('id', transactionId)
    }
    return new Response('ok', { status: 200 })
  } catch (_e) {
    // Always 200 so the provider doesn't retry forever on our errors.
    return new Response('error', { status: 200 })
  }
})
