import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, pin } = await req.json()

    // ── Validation ────────────────────────────────────────────────────────────
    if (!userId || !UUID_RE.test(userId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Identifiant utilisateur invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!pin || !/^[0-9]{4}$/.test(pin)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Le code doit contenir exactement 4 chiffres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ── Récupérer le profil ───────────────────────────────────────────────────
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, pin_hash')
      .eq('id', userId)
      .maybeSingle()

    if (profileErr) {
      console.error('[verify-admin-pin] Erreur lecture profil:', profileErr)
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur serveur' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Compte introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!profile.pin_hash) {
      return new Response(
        JSON.stringify({ success: false, error: 'Aucun code défini sur ce compte' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Comparer le PIN ───────────────────────────────────────────────────────
    const isValid = bcrypt.compareSync(pin, profile.pin_hash)

    if (!isValid) {
      console.log(`[verify-admin-pin] PIN incorrect pour userId: ${userId}`)
      return new Response(
        JSON.stringify({ success: false, error: 'Code incorrect' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[verify-admin-pin] Mode admin déverrouillé pour userId: ${userId}`)
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[verify-admin-pin] Exception:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})