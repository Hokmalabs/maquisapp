import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'GET') return json({ message: 'Méthode non autorisée.' }, 405)
  const accessToken = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!accessToken) return json({ message: 'Authentification requise.' }, 401)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ message: 'Service temporairement indisponible.' }, 500)
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken)
  if (authError || !user) return json({ message: 'Session invalide ou expirée.' }, 401)
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: profile, error: profileError } = await admin.from('profiles').select('id, pin_hash').eq('id', user.id).maybeSingle()
  if (profileError) return json({ message: 'Impossible de vérifier le statut du code PIN.' }, 500)
  if (!profile) return json({ message: 'Profil introuvable.' }, 404)
  return json({ hasPin: Boolean(profile.pin_hash) })
})
