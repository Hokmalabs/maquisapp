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
    const { userId, pin, confirmPin } = await req.json()

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
    if (confirmPin !== pin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Les codes ne correspondent pas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ── Vérifier que le profil existe ─────────────────────────────────────────
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (profileErr) {
      console.error('[set-pin] Erreur lecture profil:', profileErr)
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

    // ── Hash + enregistrement ─────────────────────────────────────────────────
    const pinHash = bcrypt.hashSync(pin, bcrypt.genSaltSync(10))
    console.log(`[set-pin] Hash PIN pour userId: ${userId}`)

    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({ pin_hash: pinHash, pin_attempts: 0, pin_locked_until: null })
      .eq('id', userId)

    if (updateErr) {
      console.error('[set-pin] Erreur update profil:', updateErr)
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur enregistrement du code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[set-pin] Code défini avec succès pour userId: ${userId}`)
    return new Response(
      JSON.stringify({ success: true, message: 'Code créé avec succès' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[set-pin] Exception:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
