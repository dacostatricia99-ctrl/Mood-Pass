import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Customer-facing payment check. Called by the app when the customer returns
// from the PawaPay page (and polled while the order is pending), so we never
// depend on the provider callback — which matters when the PawaPay account is
// shared with another project. Given an order_id, we re-verify the deposit with
// PawaPay using the restaurant's own token and mark the order paid if COMPLETED.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { order_id } = await req.json()
    if (!order_id) return json({ paid: false })

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: order } = await admin
      .from('orders')
      .select('id, establishment_id, payment_status, payment_ref')
      .eq('id', order_id)
      .maybeSingle()
    if (!order) return json({ paid: false })
    if (order.payment_status === 'paid') return json({ paid: true })
    if (!order.payment_ref) return json({ paid: false })

    const { data: cfg } = await admin
      .from('payment_configs')
      .select('api_key, sandbox')
      .eq('establishment_id', order.establishment_id)
      .maybeSingle()
    if (!cfg?.api_key) return json({ paid: false })

    const base = cfg.sandbox ? 'https://api.sandbox.pawapay.io' : 'https://api.pawapay.io'
    const res = await fetch(`${base}/v2/deposits/${order.payment_ref}`, {
      headers: { Authorization: `Bearer ${cfg.api_key}` },
    })
    const check = await res.json()
    const status = check?.data?.status
    if (status === 'COMPLETED') {
      await admin.from('orders').update({ payment_status: 'paid' }).eq('id', order.id)
      return json({ paid: true })
    }
    // FAILED / REJECTED are terminal failures; anything else is still in flight.
    const failed = status === 'FAILED' || status === 'REJECTED'
    return json({ paid: false, status: status ?? null, failed })
  } catch (_e) {
    return json({ paid: false })
  }
})
