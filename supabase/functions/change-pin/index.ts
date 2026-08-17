import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ message: 'Méthode non autorisée.' }, 405)

  const accessToken = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!accessToken) return json({ message: 'Authentification requise.' }, 401)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ message: 'Service temporairement indisponible.' }, 500)

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken)
  if (authError || !user) return json({ message: 'Session invalide ou expirée.' }, 401)

  let payload: { currentPin?: unknown; newPin?: unknown; confirmPin?: unknown }
  try { payload = await request.json() } catch { return json({ message: 'Requête invalide.' }, 400) }
  const { currentPin, newPin, confirmPin } = payload
  const pinPattern = /^\d{4}$/
  if (typeof currentPin !== 'string' || !pinPattern.test(currentPin) || typeof newPin !== 'string' || !pinPattern.test(newPin) || typeof confirmPin !== 'string' || !pinPattern.test(confirmPin)) {
    return json({ message: 'Chaque code PIN doit contenir exactement 4 chiffres.' }, 400)
  }
  if (newPin !== confirmPin) return json({ message: 'La confirmation du nouveau code PIN ne correspond pas.' }, 400)
  if (newPin === currentPin) return json({ message: 'Le nouveau code PIN doit être différent de l’ancien.' }, 400)

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: profile, error: profileError } = await admin.from('profiles').select('id, pin_hash').eq('id', user.id).maybeSingle()
  if (profileError) return json({ message: 'Impossible de vérifier le code PIN pour le moment.' }, 500)
  if (!profile) return json({ message: 'Profil introuvable.' }, 404)
  if (!profile.pin_hash) return json({ message: 'Aucun code PIN n’est configuré pour ce compte.' }, 409)
  if (!bcrypt.compareSync(currentPin, profile.pin_hash)) return json({ message: 'Le code PIN actuel est incorrect.' }, 400)

  const pinHash = bcrypt.hashSync(newPin, bcrypt.genSaltSync(10))
  const { data: updatedProfile, error: updateError } = await admin.from('profiles')
    .update({ pin_hash: pinHash, pin_attempts: 0, pin_locked_until: null }).eq('id', user.id).select('id').maybeSingle()
  if (updateError || !updatedProfile) return json({ message: 'Le code PIN n’a pas pu être modifié.' }, 500)
  return json({ message: 'Code PIN modifié avec succès.' })
})
