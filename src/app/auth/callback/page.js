'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Connexion en cours...')

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    try {
      // Laisser Supabase parser le hash OAuth (#access_token=...) de l'URL
      await new Promise(resolve => setTimeout(resolve, 500))

      let resolved = false

      // Écouter l'événement SIGNED_IN via onAuthStateChange
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (resolved) return
        if (event === 'SIGNED_IN' && session) {
          resolved = true
          subscription.unsubscribe()
          await processSession(session)
        }
      })

      // Fallback : vérifier si session déjà disponible
      const { data: { session } } = await supabase.auth.getSession()
      if (session && !resolved) {
        resolved = true
        subscription.unsubscribe()
        await processSession(session)
        return
      }

      // Timeout de sécurité si SIGNED_IN n'arrive pas
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          subscription.unsubscribe()
          setStatus('Session introuvable, redirection...')
          router.push('/auth/login')
        }
      }, 5000)
    } catch (err) {
      console.error('Callback error:', err)
      setStatus('Erreur, redirection...')
      setTimeout(() => router.push('/auth/login'), 1500)
    }
  }

  async function processSession(session) {
    const user = session.user
    const isRegister = searchParams.get('register') === 'true'

    setStatus('Vérification du profil...')

    // Vérifier si profil existe
    const { data: profile } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('id', user.id)
      .single()

    if (profile?.restaurant_id) {
      // Profil existant → dashboard
      setStatus('Bienvenue ! Redirection...')
      router.push('/dashboard')
      return
    }

    // Nouveau user Google → créer restaurant + profil
    setStatus('Création de votre espace...')

    const prenom = user.user_metadata?.full_name?.split(' ')[0] || ''
    const nomRestaurant = prenom
      ? `Restaurant de ${prenom}`
      : 'Mon Restaurant'

    const slug = nomRestaurant.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substr(2, 5)

    const { data: restaurant, error: restoError } = await supabase
      .from('restaurants')
      .insert({
        nom: nomRestaurant, slug, email: user.email, ville: 'Abidjan',
        abonnement_statut: 'essai',
        abonnement_fin: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        abonnement_plan: null,
      })
      .select().single()

    if (restoError) {
      // Restaurant existe peut-être déjà (double appel) → chercher le profil à nouveau
      const { data: profileRetry } = await supabase
        .from('profiles').select('restaurant_id').eq('id', user.id).single()
      if (profileRetry?.restaurant_id) {
        router.push('/dashboard')
        return
      }
      setStatus('Erreur lors de la création')
      setTimeout(() => router.push('/auth/login'), 2000)
      return
    }

    const nameParts = (user.user_metadata?.full_name || '').split(' ')
    await supabase.from('profiles').upsert({
      id: user.id,
      restaurant_id: restaurant.id,
      nom: nameParts[1] || '',
      prenom: nameParts[0] || '',
      role: 'gerant',
    })

    setStatus('Espace créé ! Redirection...')
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui", gap: 16 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap');
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>
      <div style={{ fontSize: 48, animation: 'float 2s ease-in-out infinite' }}>🍽️</div>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(255,107,53,.2)', borderTop: '3px solid #FF6B35', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', fontWeight: 500 }}>{status}</div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)' }}>Chargement...</div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}