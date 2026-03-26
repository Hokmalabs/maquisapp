'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nom_restaurant: '',
    ville: 'Abidjan',
    telephone: '',
    nom_gerant: '',
    prenom_gerant: '',
    email: '',
    password: '',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Générer un slug unique à partir du nom
  const generateSlug = (nom) => {
    return nom
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substr(2, 5)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 1. Créer le compte auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })

      if (authError) throw authError

      const userId = authData.user.id

      // 2. Créer le restaurant
      const slug = generateSlug(form.nom_restaurant)
      const { data: restaurant, error: restoError } = await supabase
        .from('restaurants')
        .insert({
          nom: form.nom_restaurant,
          slug: slug,
          email: form.email,
          telephone: form.telephone,
          ville: form.ville,
        })
        .select()
        .single()

      if (restoError) throw restoError

      // 3. Créer le profil gérant
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          restaurant_id: restaurant.id,
          nom: form.nom_gerant,
          prenom: form.prenom_gerant,
          role: 'gerant',
        })

      if (profileError) throw profileError

      router.push('/dashboard')

    } catch (err) {
      setError(err.message || 'Une erreur est survenue')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🍽️</div>
          <h1 className="text-2xl font-bold text-orange-600">MaquisApp</h1>
          <p className="text-gray-500 text-sm mt-1">Créez votre espace restaurant</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">

          {/* Infos restaurant */}
          <div className="bg-orange-50 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
              🏪 Votre Restaurant
            </h2>
            <input
              name="nom_restaurant"
              value={form.nom_restaurant}
              onChange={handleChange}
              placeholder="Nom du restaurant"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <input
              name="telephone"
              value={form.telephone}
              onChange={handleChange}
              placeholder="Téléphone (ex: 0708091234)"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <select
              name="ville"
              value={form.ville}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option>Abidjan</option>
              <option>Bouaké</option>
              <option>Daloa</option>
              <option>Yamoussoukro</option>
              <option>San-Pédro</option>
              <option>Korhogo</option>
              <option>Man</option>
              <option>Autre</option>
            </select>
          </div>

          {/* Infos gérant */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
              👤 Vos Informations
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <input
                name="prenom_gerant"
                value={form.prenom_gerant}
                onChange={handleChange}
                placeholder="Prénom"
                className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <input
                name="nom_gerant"
                value={form.nom_gerant}
                onChange={handleChange}
                placeholder="Nom"
                required
                className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mot de passe (min. 6 caractères)"
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Création en cours...' : 'Créer mon restaurant'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{' '}
          <Link href="/auth/login" className="text-orange-500 font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}