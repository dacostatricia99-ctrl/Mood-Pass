import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// PawaPay callback for Mood Pass SUBSCRIPTION payments (platform account).
// Deploy with --no-verify-jwt. We never trust the body: we re-check the deposit
// via GET /v2/deposits/{depositId} with the PLATFORM token, then extend the sub.

const PLAN_DAYS = 30

function extendedEnd(current: string | null): string {
  const base = current && new Date(current).getTime() > Date.now() ? new Date(current) : new Date()
  base.setDate(base.getDate() + PLAN_DAYS)
  return base.toISOString()
}

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

    const token = Deno.env.get('MOODPASS_PAWAPAY_TOKEN')
    if (!token) return new Response('no platform token', { status: 200 })
    const sandbox = (Deno.env.get('MOODPASS_SANDBOX') ?? 'true') !== 'false'
    const base = sandbox ? 'https://api.sandbox.pawapay.io' : 'https://api.pawapay.io'

    // Verify with PawaPay using the PLATFORM token (never trust the body).
    const res = await fetch(`${base}/v2/deposits/${depositId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const check = await res.json()
    if (check?.data?.status !== 'COMPLETED') return new Response('not completed', { status: 200 })

    // The establishment id was carried in the deposit metadata at creation.
    const meta = check?.data?.metadata
    const entry = Array.isArray(meta) ? meta.find((m: Record<string, unknown>) => m.establishmentId) : null
    const establishmentId = entry ? String(entry.establishmentId) : null
    if (!establishmentId) return new Response('no establishment', { status: 200 })

    const { data: current } = await admin
      .from('subscriptions').select('current_period_end').eq('establishment_id', establishmentId).maybeSingle()

    await admin.from('subscriptions').update({
      status: 'active',
      current_period_end: extendedEnd(current?.current_period_end ?? null),
      updated_at: new Date().toISOString(),
    }).eq('establishment_id', establishmentId)

    return new Response('ok', { status: 200 })
  } catch (_e) {
    return new Response('error', { status: 200 })
  }
})
