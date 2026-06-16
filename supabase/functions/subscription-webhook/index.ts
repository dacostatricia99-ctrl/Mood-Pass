import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// CinetPay notification for Mood Pass SUBSCRIPTION payments (platform account).
// Deploy with --no-verify-jwt. transaction_id is `sub_<establishment_id>_<ts>`.

const PLAN_DAYS = 30

function extendedEnd(current: string | null): string {
  const base = current && new Date(current).getTime() > Date.now() ? new Date(current) : new Date()
  base.setDate(base.getDate() + PLAN_DAYS)
  return base.toISOString()
}

serve(async (req) => {
  try {
    let txId = ''
    const ct = req.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const b = await req.json(); txId = b.cpm_trans_id || b.transaction_id || ''
    } else {
      const f = await req.formData(); txId = String(f.get('cpm_trans_id') || f.get('transaction_id') || '')
    }
    if (!txId.startsWith('sub_')) return new Response('ignored', { status: 200 })
    const establishmentId = txId.split('_')[1]
    if (!establishmentId) return new Response('bad tx', { status: 200 })

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify with CinetPay using the PLATFORM credentials.
    const res = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: Deno.env.get('MOODPASS_CINETPAY_API_KEY'),
        site_id: Deno.env.get('MOODPASS_CINETPAY_SITE_ID'),
        transaction_id: txId,
      }),
    })
    const check = await res.json()
    if (check?.data?.status === 'ACCEPTED') {
      const { data: sub } = await admin
        .from('subscriptions').select('current_period_end').eq('establishment_id', establishmentId).maybeSingle()
      await admin.from('subscriptions').update({
        status: 'active', current_period_end: extendedEnd(sub?.current_period_end ?? null), updated_at: new Date().toISOString(),
      }).eq('establishment_id', establishmentId)
    }
    return new Response('ok', { status: 200 })
  } catch (_e) {
    return new Response('error', { status: 200 })
  }
})
