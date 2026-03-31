'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Connexion en cours...')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const user = session.user
          const isRegister = searchParams.get('register') === 'true'

          const { data: profile } = await supabase
            .from('profiles')
            .select('*, restaurants(*)')
            .eq('id', user.id)
            .single()

          if (profile?.restaurant_id) {
            setStatus('Bienvenue ! Redirection...')
            subscription.unsubscribe()
            router.push('/dashboard')
            return
          }

          if (isRegister || !profile) {
            setStatus('Création de votre espace...')

            const nomRestaurant = user.user_metadata?.full_name
              ? `Restaurant de ${user.user_metadata.full_name.split(' ')[0]}`
              : 'Mon Restaurant'

            const slug = nomRestaurant.toLowerCase()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
              + '-' + Math.random().toString(36).substr(2, 5)

            const { data: restaurant, error: restoError } = await supabase
              .from('restaurants')
              .insert({
                nom: nomRestaurant,
                slug,
                email: user.email,
                ville: 'Abidjan',
              })
              .select().single()

            if (restoError) {
              setStatus('Erreur lors de la création')
              setTimeout(() => router.push('/auth/login'), 2000)
              subscription.unsubscribe()
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
            subscription.unsubscribe()
            router.push('/dashboard')
          } else {
            subscription.unsubscribe()
            router.push('/auth/login')
          }
        }
      }
    )

    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      router.push('/auth/login')
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

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