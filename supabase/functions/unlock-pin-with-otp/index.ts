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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, indicatif, code, newPin, confirmPin } = await req.json()

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
    if (!code || !/^[0-9]{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Code SMS invalide (6 chiffres requis)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!newPin || !/^[0-9]{4}$/.test(newPin)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Le nouveau code doit contenir exactement 4 chiffres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (confirmPin !== newPin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Les codes ne correspondent pas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const phoneE164 = buildPhoneE164(phone, indicatif)
    console.log(`[unlock-pin-with-otp] Reset PIN pour ${phoneE164}`)

    // ── Vérifier le code OTP via Twilio ──────────────────────────────────────
    const accountSid  = Deno.env.get('TWILIO_ACCOUNT_SID')!
    const authToken   = Deno.env.get('TWILIO_AUTH_TOKEN')!
    const serviceSid  = Deno.env.get('TWILIO_VERIFY_SERVICE_SID')!
    const credentials = btoa(`${accountSid}:${authToken}`)

    const checkRes = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type':  'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phoneE164, Code: code }).toString(),
      }
    )

    const checkData = checkRes.ok ? await checkRes.json() : null
    console.log(`[unlock-pin-with-otp] Twilio check — http ${checkRes.status}, status: ${checkData?.status}`)

    if (!checkRes.ok || checkData?.status !== 'approved') {
      return new Response(
        JSON.stringify({ success: false, error: 'Code SMS invalide ou expiré' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Récupérer le profil ───────────────────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('phone', phoneE164)
      .maybeSingle()

    if (profileErr) {
      console.error('[unlock-pin-with-otp] Erreur lecture profil:', profileErr)
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

    // ── Hash + mise à jour du PIN ─────────────────────────────────────────────
    const pinHash = bcrypt.hashSync(newPin, bcrypt.genSaltSync(10))
    console.log(`[unlock-pin-with-otp] Mise à jour PIN pour userId: ${profile.id}`)

    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({ pin_hash: pinHash, pin_attempts: 0, pin_locked_until: null })
      .eq('id', profile.id)

    if (updateErr) {
      console.error('[unlock-pin-with-otp] Erreur update profil:', updateErr)
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur mise à jour du code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Générer un token de session pour connexion directe après reset ────────
    const { data: { user }, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(profile.id)
    if (getUserErr || !user) {
      console.error('[unlock-pin-with-otp] getUserById error:', getUserErr)
      // PIN mis à jour — retour succès sans auto-session
      return new Response(
        JSON.stringify({
          success:    true,
          message:    'Code mis à jour avec succès',
          userId:     profile.id,
          redirectTo: '/auth?mode=login',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailForSession = user.email ?? `${phoneE164.replace('+', '')}@phone.maquisapp.com`

    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type:  'magiclink',
      email: emailForSession,
    })

    const redirectTo = profile.role === 'super_admin' ? '/hokma-admin' : '/dashboard'

    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error('[unlock-pin-with-otp] generateLink error:', linkErr)
      // PIN mis à jour, session non générée — frontend redirige vers login
      return new Response(
        JSON.stringify({
          success:    true,
          message:    'Code mis à jour avec succès',
          userId:     profile.id,
          redirectTo: '/auth?mode=login',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[unlock-pin-with-otp] Reset réussi + session générée pour userId: ${profile.id}`)
    return new Response(
      JSON.stringify({
        success:           true,
        message:           'Code mis à jour avec succès',
        userId:            profile.id,
        redirectTo,
        hashed_token:      linkData.properties.hashed_token,
        email_for_session: emailForSession,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[unlock-pin-with-otp] Exception:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
