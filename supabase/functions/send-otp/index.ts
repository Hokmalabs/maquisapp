import "@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, indicatif } = await req.json()

    // ── Validation ────────────────────────────────────────────────────────
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

    // ── Construction E.164 (Côte d'Ivoire : garder le 0) ──────────────────
    const phoneE164 = `${indicatif}${phone}`
    console.log(`[send-otp] Envoi OTP vers ${phoneE164}`)

    // ── Secrets Twilio ────────────────────────────────────────────────────
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
    const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN')!
    const serviceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID')!
    const credentials = btoa(`${accountSid}:${authToken}`)

    // ── Appel Twilio Verify ───────────────────────────────────────────────
    const twilioRes = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To:      phoneE164,
          Channel: 'sms',
          Locale:  'fr',
        }).toString(),
      }
    )

    if (!twilioRes.ok) {
      const errBody = await twilioRes.text()
      console.error(`[send-otp] Erreur Twilio (${twilioRes.status}):`, errBody)
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur envoi SMS' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const twilioData = await twilioRes.json()
    console.log(`[send-otp] OTP envoyé — status Twilio: ${twilioData.status}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Code envoyé par SMS' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[send-otp] Exception:', err)
    return new Response(
      JSON.stringify({ success: false, error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})