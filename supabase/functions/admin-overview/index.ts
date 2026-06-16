import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Platform (super-admin) overview for Mood Pass. Restricted to the emails in the
// ADMIN_EMAILS secret. Aggregates every establishment, its owner, subscription
// and order count using the service role, and can grant/extend a subscription.

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
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // --- Admin gate ---------------------------------------------------------
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user } } = await admin.auth.getUser(token)
    const allowed = (Deno.env.get('ADMIN_EMAILS') ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
    if (!user?.email || !allowed.includes(user.email.toLowerCase())) {
      return json({ error: 'forbidden' }, 403)
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}

    // --- Action: grant / extend a subscription ------------------------------
    if (body.action === 'grant' && body.establishment_id) {
      const { data: sub } = await admin
        .from('subscriptions').select('current_period_end').eq('establishment_id', body.establishment_id).maybeSingle()
      await admin.from('subscriptions').update({
        status: 'active', current_period_end: extendedEnd(sub?.current_period_end ?? null), updated_at: new Date().toISOString(),
      }).eq('establishment_id', body.establishment_id)
      return json({ ok: true })
    }

    // --- Overview -----------------------------------------------------------
    const price = Number(Deno.env.get('MOODPASS_PLAN_PRICE') ?? '10000')
    const [{ data: ests }, { data: subs }, { data: orders }, usersRes] = await Promise.all([
      admin.from('establishments').select('id, name, slug, created_at, owner_id'),
      admin.from('subscriptions').select('establishment_id, status, current_period_end'),
      admin.from('orders').select('establishment_id'),
      admin.auth.admin.listUsers(),
    ])

    const emailById = new Map<string, string>()
    for (const u of usersRes.data?.users ?? []) emailById.set(u.id, u.email ?? '')

    const subByEst = new Map<string, { status: string; current_period_end: string }>()
    for (const s of subs ?? []) subByEst.set(s.establishment_id, s)

    const orderCount = new Map<string, number>()
    for (const o of orders ?? []) orderCount.set(o.establishment_id, (orderCount.get(o.establishment_id) ?? 0) + 1)

    const now = Date.now()
    const rows = (ests ?? []).map((e) => {
      const sub = subByEst.get(e.id)
      const active = sub ? new Date(sub.current_period_end).getTime() >= now : false
      return {
        id: e.id, name: e.name, slug: e.slug, createdAt: e.created_at,
        ownerEmail: emailById.get(e.owner_id) ?? '—',
        status: sub?.status ?? 'expired',
        currentPeriodEnd: sub?.current_period_end ?? null,
        active,
        orders: orderCount.get(e.id) ?? 0,
      }
    }).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))

    const activePaying = rows.filter((r) => r.active && r.status === 'active').length
    const totals = {
      establishments: rows.length,
      active: rows.filter((r) => r.active && r.status === 'active').length,
      trial: rows.filter((r) => r.active && r.status === 'trial').length,
      expired: rows.filter((r) => !r.active).length,
      orders: orders?.length ?? 0,
      mrr: activePaying * price,
    }

    return json({ totals, establishments: rows })
  } catch (e) {
    return json({ error: e.message }, 400)
  }
})
