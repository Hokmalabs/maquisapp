const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  CLIENT_PHONE,
  CLIENT_INDICATIF = '+225',
  CLIENT_PIN,
  CLIENT_NOM,
  CLIENT_PRENOM = '',
  CLIENT_VILLE = 'Abidjan',
  CLIENT_RESTAURANT_NOM,
} = process.env

const TRIAL_DAYS = 14

function fail(message) {
  console.error(`ERREUR: ${message}`)
  process.exit(1)
}

function generateSlug(nom) {
  return nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function findFreeSlug(supabase, base) {
  let slug = base || 'restaurant'
  let counter = 1

  while (counter <= 100) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (error) throw error
    if (!data) return slug

    counter++
    slug = `${base}-${counter}`
  }

  return `${base}-${Date.now()}`
}

async function main() {
  if (!SUPABASE_URL) fail('SUPABASE_URL manquant')
  if (!SUPABASE_SERVICE_ROLE_KEY) fail('SUPABASE_SERVICE_ROLE_KEY manquant')
  if (!CLIENT_PHONE || !/^[0-9]{10}$/.test(CLIENT_PHONE)) {
    fail('CLIENT_PHONE doit contenir exactement 10 chiffres')
  }
  if (!CLIENT_INDICATIF || !/^\+\d{1,4}$/.test(CLIENT_INDICATIF)) {
    fail('CLIENT_INDICATIF invalide')
  }
  if (!CLIENT_PIN || !/^[0-9]{4}$/.test(CLIENT_PIN)) {
    fail('CLIENT_PIN doit contenir exactement 4 chiffres')
  }
  if (!CLIENT_NOM) fail('CLIENT_NOM manquant')
  if (!CLIENT_RESTAURANT_NOM) fail('CLIENT_RESTAURANT_NOM manquant')

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const phoneE164 = `${CLIENT_INDICATIF}${CLIENT_PHONE}`
  const syntheticEmail = `${phoneE164.replace('+', '')}@phone.maquisapp.com`

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', phoneE164)
    .maybeSingle()

  if (existingProfileError) throw existingProfileError
  if (existingProfile) {
    fail('Un profil existe déjà avec ce numéro. Aucune modification effectuée.')
  }

  let userId = null
  let restaurantId = null

  try {
    console.log('1/4 Création utilisateur Supabase Auth...')

    const { data: userData, error: userError } =
      await supabase.auth.admin.createUser({
        phone: phoneE164,
        phone_confirm: true,
        email: syntheticEmail,
        email_confirm: true,
        user_metadata: {
          prenom: CLIENT_PRENOM,
          nom: CLIENT_NOM,
          ville: CLIENT_VILLE,
        },
      })

    if (userError || !userData?.user) {
      throw userError || new Error('Utilisateur Auth non créé')
    }

    userId = userData.user.id

    console.log('2/4 Création restaurant...')

    const baseSlug =
      generateSlug(CLIENT_RESTAURANT_NOM) ||
      `resto-${userId.slice(0, 8)}`

    const slug = await findFreeSlug(supabase, baseSlug)

    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        nom: CLIENT_RESTAURANT_NOM,
        slug,
        email: syntheticEmail,
        ville: CLIENT_VILLE,
        abonnement_statut: 'essai',
        abonnement_fin: new Date(
          Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000
        ).toISOString(),
        abonnement_plan: null,
      })
      .select('id')
      .single()

    if (restaurantError || !restaurant) {
      throw restaurantError || new Error('Restaurant non créé')
    }

    restaurantId = restaurant.id

    console.log('3/4 Création profil et PIN...')

    const pinHash = bcrypt.hashSync(CLIENT_PIN, 10)

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        restaurant_id: restaurantId,
        nom: CLIENT_NOM,
        prenom: CLIENT_PRENOM,
        role: 'gerant',
        phone: phoneE164,
        ville: CLIENT_VILLE,
        pin_hash: pinHash,
        pin_attempts: 0,
        pin_locked_until: null,
      })

    if (profileError) throw profileError

    console.log('4/4 Terminé.')
    console.log('Compte client créé avec succès.')
    console.log(`userId: ${userId}`)
    console.log(`restaurantId: ${restaurantId}`)
    console.log('Le PIN n’est volontairement pas affiché.')
  } catch (error) {
    console.error('Échec de création:', error?.message || error)

    if (restaurantId) {
      console.log('Rollback restaurant...')
      await supabase.from('restaurants').delete().eq('id', restaurantId)
    }

    if (userId) {
      console.log('Rollback utilisateur Auth...')
      await supabase.auth.admin.deleteUser(userId)
    }

    fail('Création annulée et rollback demandé.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
