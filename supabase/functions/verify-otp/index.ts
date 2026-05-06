import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPhoneE164(phone: string, indicatif: string): string {
  // Côte d'Ivoire : garder le 0 initial
  return `${indicatif}${phone}`
}

function generateSlug(nom: string): string {
  return nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// deno-lint-ignore no-explicit-any
async function findFreeSlug(supabaseAdmin: any, base: string): Promise<string> {
  let slug = base || 'restaurant'
  let counter = 1
  const MAX_ATTEMPTS = 100

  while (counter <= MAX_ATTEMPTS) {
    const { data } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!data) return slug
    counter++
    slug = `${base}-${counter}`
  }
  return `${base}-${Date.now()}`
}

// deno-lint-ignore no-explicit-any
async function generateSessionTokens(supabaseAdmin: any, email: string) {
  const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (error || !linkData?.properties?.hashed_token) {
    console.error('[verify-otp] generateLink error:', error)
    return null
  }
  return {
    hashed_token:     linkData.properties.hashed_token,
    email_for_session: email,
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { phone, indicatif, code, prenom, nom, ville, restaurant_nom } = body

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
        JSON.stringify({ success: false, error: 'Code invalide (6 chiffres requis)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const phoneE164 = buildPhoneE164(phone, indicatif)
    console.log(`[verify-otp] Vérification OTP pour ${phoneE164}`)

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
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phoneE164, Code: code }).toString(),
      }
    )

    const checkData = checkRes.ok ? await checkRes.json() : null
    console.log(`[verify-otp] Twilio check — http ${checkRes.status}, status: ${checkData?.status}`)

    if (!checkRes.ok || checkData?.status !== 'approved') {
      return new Response(
        JSON.stringify({ success: false, error: 'Code invalide ou expiré' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, restaurant_id, role')
      .eq('phone', phoneE164)
      .maybeSingle()

    if (existingProfile) {
      console.log(`[verify-otp] CAS A — Connexion user existant: ${existingProfile.id}`)

      const { data: { user }, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(
        existingProfile.id
      )
      if (getUserErr || !user) {
        console.error('[verify-otp] getUserById error:', getUserErr)
        return new Response(
          JSON.stringify({ success: false, error: 'Erreur récupération compte' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const emailForSession = user.email
        ?? `${phoneE164.replace('+', '')}@phone.maquisapp.com`

      const session = await generateSessionTokens(supabaseAdmin, emailForSession)

      const redirectTo = existingProfile.role === 'super_admin' ? '/hokma-admin' : '/dashboard'

      return new Response(
        JSON.stringify({
          success:    true,
          isNewUser:  false,
          userId:     existingProfile.id,
          redirectTo,
          ...(session ?? {}),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CAS B — Nouveau user → INSCRIPTION
    if (!prenom || !nom || !ville || !restaurant_nom) {
      return new Response(
        JSON.stringify({
          success: false,
          error:   'Champs inscription manquants : prenom, nom, ville, restaurant_nom',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[verify-otp] CAS B — Création compte pour ${phoneE164}`)

    const syntheticEmail = `${phoneE164.replace('+', '')}@phone.maquisapp.com`

    const { data: newUserData, error: createUserErr } = await supabaseAdmin.auth.admin.createUser({
      phone:         phoneE164,
      phone_confirm: true,
      email:         syntheticEmail,
      email_confirm: true,
      user_metadata: { prenom, nom, ville },
    })

    if (createUserErr || !newUserData?.user) {
      console.error('[verify-otp] createUser error:', createUserErr)
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur création compte' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = newUserData.user.id
    console.log(`[verify-otp] auth.user créé: ${userId}`)

    const baseSlug = generateSlug(restaurant_nom) || `resto-${userId.slice(0, 8)}`
    const slug     = await findFreeSlug(supabaseAdmin, baseSlug)

    const { data: restaurant, error: restoErr } = await supabaseAdmin
      .from('restaurants')
      .insert({ nom: restaurant_nom, slug })
      .select('id')
      .single()

    if (restoErr || !restaurant) {
      console.error('[verify-otp] Restaurant insert error:', restoErr)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur création restaurant' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const restaurantId = restaurant.id
    console.log(`[verify-otp] Restaurant créé: ${restaurantId} (slug: ${slug})`)

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .insert({
        id:            userId,
        restaurant_id: restaurantId,
        nom,
        prenom,
        role:          'gerant',
        phone:         phoneE164,
        ville,
      })

    if (profileErr) {
      console.error('[verify-otp] Profile insert error:', profileErr)
      await supabaseAdmin.from('restaurants').delete().eq('id', restaurantId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur création profil' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[verify-otp] Profil créé — userId: ${userId}, restaurantId: ${restaurantId}`)

    const session = await generateSessionTokens(supabaseAdmin, syntheticEmail)

    return new Response(
      JSON.stringify({
        success:      true,
        isNewUser:    true,
        userId,
        restaurantId,
        redirectTo:   '/dashboard',
        ...(session ?? {}),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[verify-otp] Exception:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})