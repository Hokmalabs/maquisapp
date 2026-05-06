import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildPhoneE164(phone: string, indicatif: string): string {
  return `${indicatif}${phone}`
}

const MAX_ATTEMPTS    = 5
const LOCKOUT_MINUTES = 5

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, indicatif, pin } = await req.json()

    // ── Validation ────────────────────────────────────────────────────────────
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Numéro de téléphone invalide (10 chiffres requis)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!indicatif || !/^\+\d{1,4}$/.test(indicatif)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Indicatif pays invalide (ex: +225)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!pin || !/^[0-9]{4}$/.test(pin)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Le code doit contenir exactement 4 chiffres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const phoneE164 = buildPhoneE164(phone, indicatif)
    console.log(`[login-with-pin] Tentative connexion pour ${phoneE164}`)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ── Récupérer le profil ───────────────────────────────────────────────────
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, pin_hash, pin_attempts, pin_locked_until, restaurant_id, role')
      .eq('phone', phoneE164)
      .maybeSingle()

    if (profileErr) {
      console.error('[login-with-pin] Erreur lecture profil:', profileErr)
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur serveur' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    // Message générique pour ne pas révéler si le numéro existe
    if (!profile) {
      console.log(`[login-with-pin] Profil introuvable pour ${phoneE164}`)
      return new Response(
        JSON.stringify({ success: false, error: 'Numéro ou code incorrect' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Vérifier le lockout ───────────────────────────────────────────────────
    if (profile.pin_locked_until) {
      const lockedUntil = new Date(profile.pin_locked_until)
      if (lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000)
        console.log(`[login-with-pin] Compte verrouillé jusqu'à ${lockedUntil.toISOString()}`)
        return new Response(
          JSON.stringify({
            success:     false,
            error:       `Trop de tentatives. Réessayez dans ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
            locked:      true,
            lockedUntil: profile.pin_locked_until,
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      // Lockout expiré — nettoyage implicite lors du reset compteur en fin de succès
    }

    // ── Vérifier que le PIN est défini ────────────────────────────────────────
    if (!profile.pin_hash) {
      console.log(`[login-with-pin] Aucun PIN défini pour ${phoneE164}`)
      return new Response(
        JSON.stringify({ success: false, error: 'Aucun code défini. Veuillez vous inscrire à nouveau.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Comparer le PIN ───────────────────────────────────────────────────────
    const isValid = bcrypt.compareSync(pin, profile.pin_hash)

    if (!isValid) {
      const newAttempts = (profile.pin_attempts ?? 0) + 1
      console.log(`[login-with-pin] PIN incorrect — tentative ${newAttempts}/${MAX_ATTEMPTS}`)

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
        await supabaseAdmin
          .from('profiles')
          .update({ pin_attempts: 0, pin_locked_until: lockedUntil })
          .eq('id', profile.id)

        return new Response(
          JSON.stringify({
            success:     false,
            error:       `Trop de tentatives. Réessayez dans ${LOCKOUT_MINUTES} minutes.`,
            locked:      true,
            lockedUntil,
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await supabaseAdmin
        .from('profiles')
        .update({ pin_attempts: newAttempts })
        .eq('id', profile.id)

      const remaining = MAX_ATTEMPTS - newAttempts
      return new Response(
        JSON.stringify({
          success:           false,
          error:             'Numéro ou code incorrect',
          attemptsRemaining: remaining,
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── PIN valide — reset compteur ───────────────────────────────────────────
    await supabaseAdmin
      .from('profiles')
      .update({ pin_attempts: 0, pin_locked_until: null })
      .eq('id', profile.id)

    // ── Récupérer l'email depuis auth.users ───────────────────────────────────
    const { data: { user }, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(profile.id)
    if (getUserErr || !user) {
      console.error('[login-with-pin] getUserById error:', getUserErr)
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur récupération compte' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailForSession = user.email ?? `${phoneE164.replace('+', '')}@phone.maquisapp.com`

    // ── Générer le token de session (magic link) ──────────────────────────────
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type:  'magiclink',
      email: emailForSession,
    })
    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error('[login-with-pin] generateLink error:', linkErr)
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur ouverture de session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const redirectTo = profile.role === 'super_admin' ? '/admin' : '/dashboard'
    console.log(`[login-with-pin] Connexion réussie pour userId: ${profile.id} → ${redirectTo}`)

    return new Response(
      JSON.stringify({
        success:           true,
        userId:            profile.id,
        redirectTo,
        hashed_token:      linkData.properties.hashed_token,
        email_for_session: emailForSession,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[login-with-pin] Exception:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
