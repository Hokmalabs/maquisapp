import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ success: false, error: 'Méthode non autorisée' }, 405)

  const accessToken = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!accessToken) return json({ success: false, error: 'Authentification requise' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ success: false, error: 'Service temporairement indisponible' }, 500)
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken)
  if (authError || !user) return json({ success: false, error: 'Session invalide ou expirée' }, 401)

  let payload: { pin?: unknown; confirmPin?: unknown }
  try {
    payload = await request.json()
  } catch {
    return json({ success: false, error: 'Requête invalide' }, 400)
  }

  const { pin, confirmPin } = payload
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return json({ success: false, error: 'Le code doit contenir exactement 4 chiffres' }, 400)
  }
  if (confirmPin !== pin) {
    return json({ success: false, error: 'Les codes ne correspondent pas' }, 400)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, pin_hash')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) return json({ success: false, error: 'Impossible de vérifier le profil' }, 500)
  if (!profile) return json({ success: false, error: 'Compte introuvable' }, 404)
  if (profile.pin_hash) {
    return json({ success: false, error: 'Un code PIN est déjà configuré pour ce compte' }, 409)
  }

  const pinHash = bcrypt.hashSync(pin, bcrypt.genSaltSync(10))
  const { data: updatedProfile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ pin_hash: pinHash, pin_attempts: 0, pin_locked_until: null })
    .eq('id', user.id)
    .select('id')
    .maybeSingle()
  if (updateError || !updatedProfile) {
    return json({ success: false, error: 'Erreur lors de l’enregistrement du code' }, 500)
  }
  return json({ success: true, message: 'Code créé avec succès' })
})
