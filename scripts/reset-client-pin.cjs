const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CLIENT_PHONE', 'CLIENT_PIN']
const missing = required.filter((name) => !process.env[name]?.trim())
if (missing.length) {
  console.error(`Variables manquantes : ${missing.join(', ')}`)
  process.exit(1)
}

if (!/^\d{4}$/.test(process.env.CLIENT_PIN)) {
  console.error('CLIENT_PIN doit contenir exactement 4 chiffres.')
  process.exit(1)
}

function normalizePhone(value) {
  const compact = value.trim().replace(/[\s().-]/g, '')
  if (/^\+\d{8,15}$/.test(compact)) return compact
  if (/^225\d{10}$/.test(compact)) return `+${compact}`
  if (/^\d{10}$/.test(compact)) return `+225${compact}`
  throw new Error('CLIENT_PHONE doit être un numéro ivoirien à 10 chiffres ou un numéro au format E.164.')
}

async function main() {
  const phone = normalizePhone(process.env.CLIENT_PHONE)
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: profiles, error: findError } = await supabase
    .from('profiles')
    .select('id, nom, prenom, phone')
    .eq('phone', phone)
    .limit(2)

  if (findError) throw new Error('Recherche du profil impossible.')
  if (profiles.length !== 1) {
    throw new Error(profiles.length === 0 ? 'Aucun profil trouvé : aucune modification effectuée.' : 'Plusieurs profils trouvés : aucune modification effectuée.')
  }

  const profile = profiles[0]
  const pinHash = bcrypt.hashSync(process.env.CLIENT_PIN, 10)
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ pin_hash: pinHash, pin_attempts: 0, pin_locked_until: null })
    .eq('id', profile.id)
    .select('id')
    .maybeSingle()

  if (updateError || !updated) throw new Error('Réinitialisation impossible.')
  const maskedPhone = `${phone.slice(0, 4)}••••${phone.slice(-2)}`
  console.log(`Code PIN réinitialisé pour ${profile.prenom || ''} ${profile.nom || ''} (${maskedPhone}).`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
