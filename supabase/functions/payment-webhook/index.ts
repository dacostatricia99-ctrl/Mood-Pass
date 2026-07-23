import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// PawaPay deposit callback. PawaPay POSTs JSON with the depositId when a deposit
// reaches a final status. Deploy with --no-verify-jwt. We never trust the body
// for the outcome: we re-check the deposit via GET /v2/deposits/{depositId}
// using the establishment's own token, then mark the order paid.

serve(async (req) => {
  try {
    let depositId = ''
    try {
      const b = await req.json()
      depositId = b?.depositId || b?.data?.depositId || ''
    } catch {
      const form = await req.formData().catch(() => null)
      depositId = form ? String(form.get('depositId') || '') : ''
    }
    if (!depositId) return new Response('missing depositId', { status: 200 })

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // The depositId was stored on the order's payment_ref at creation.
    const { data: order } = await admin
      .from('orders')
      .select('id, establishment_id, payment_status')
      .eq('payment_ref', depositId)
      .maybeSingle()
    if (!order) return new Response('order not found', { status: 200 })
    if (order.payment_status === 'paid') return new Response('already paid', { status: 200 })

    const { data: cfg } = await admin
      .from('payment_configs')
      .select('api_key, sandbox')
      .eq('establishment_id', order.establishment_id)
      .maybeSingle()
    if (!cfg?.api_key) return new Response('no config', { status: 200 })

    // Verify the real outcome with PawaPay (never trust the callback body).
    const base = cfg.sandbox ? 'https://api.sandbox.pawapay.io' : 'https://api.pawapay.io'
    const res = await fetch(`${base}/v2/deposits/${depositId}`, {
      headers: { Authorization: `Bearer ${cfg.api_key}` },
    })
    const check = await res.json()
    const status = check?.data?.status
    if (status === 'COMPLETED') {
      await admin.from('orders').update({ payment_status: 'paid' }).eq('id', order.id)
    }
    return new Response('ok', { status: 200 })
  } catch (_e) {
    // Always 200 so PawaPay doesn't retry forever on our errors.
    return new Response('error', { status: 200 })
  }
})
