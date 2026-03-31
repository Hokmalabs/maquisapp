'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const C = {
  bg: '#0D0D0D', white: '#FFFFFF', primary: '#FF6B35', primaryLight: '#FFF0EB',
  dark: '#1A1A2E', gray: '#8A8A9A', border: '#E8E8F0', red: '#FF3B30',
}

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading]             = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError]                 = useState('')
  const [step, setStep]                   = useState(1) // 1 = resto, 2 = gérant+compte
  const [form, setForm] = useState({
    nom_restaurant: '', ville: 'Abidjan', telephone: '',
    nom_gerant: '', prenom_gerant: '', email: '', password: '',
  })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const generateSlug = (nom) =>
    nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substr(2, 5)

  // ── Google OAuth ─────────────────────────────────────────────────────────
  // Avec Google, on redirige vers /auth/callback qui crée le resto si nécessaire
  const handleGoogle = async () => {
    setLoadingGoogle(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?register=true`,
      },
    })
    if (error) {
      setError('Erreur de connexion Google')
      setLoadingGoogle(false)
    }
  }

  // ── Email / Password ────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault()
    if (step === 1) { setStep(2); return; }
    setLoading(true)
    setError('')
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password })
      if (authError) throw authError
      const userId = authData.user.id
      const slug = generateSlug(form.nom_restaurant)
      const { data: restaurant, error: restoError } = await supabase.from('restaurants')
        .insert({
          nom: form.nom_restaurant, slug, email: form.email, telephone: form.telephone, ville: form.ville,
          abonnement_statut: 'essai',
          abonnement_fin: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          abonnement_plan: null,
        })
        .select().single()
      if (restoError) throw restoError
      const { error: profileError } = await supabase.from('profiles')
        .insert({ id: userId, restaurant_id: restaurant.id, nom: form.nom_gerant, prenom: form.prenom_gerant, role: 'gerant' })
      if (profileError) throw profileError
      router.push('/dashboard')
    } catch (err) {
      setError(err.message || 'Une erreur est survenue')
      setLoading(false)
    }
  }

  const VILLES = ['Abidjan', 'Bouaké', 'Daloa', 'Yamoussoukro', 'San-Pédro', 'Korhogo', 'Man', 'Autre']

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', fontFamily: "'DM Sans', system-ui, sans-serif", position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideLeft { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
        input:focus, select:focus { border-color: #FF6B35 !important; outline: none; }
        .btn-google:hover { background: rgba(255,255,255,.12) !important; }
        .btn-primary:hover { opacity: .92; transform: translateY(-1px); }
        .btn-primary:active, .btn-google:active { transform: scale(0.98); }
        select option { background: #1A1A2E; color: #fff; }
      `}</style>

      {/* Blobs */}
      <div style={{ position: 'absolute', top: '-10%', right: '-15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,107,53,.15) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', left: '-15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,69,0,.1) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }}></div>

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1, animation: 'fadeUp .5s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, animation: 'float 4s ease-in-out infinite', display: 'inline-block' }}>🍽️</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: C.white, marginTop: 8 }}>MaquisApp</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>Créez votre espace restaurant</p>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[1, 2].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: step >= s ? C.primary : 'rgba(255,255,255,.1)', border: `2px solid ${step >= s ? C.primary : 'rgba(255,255,255,.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: step >= s ? '#fff' : 'rgba(255,255,255,.3)', transition: 'all .3s' }}>
                {step > s ? '✓' : s}
              </div>
              <span style={{ fontSize: 11, color: step >= s ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.25)', fontWeight: 600 }}>
                {s === 1 ? 'Votre restaurant' : 'Votre compte'}
              </span>
              {s < 2 && <div style={{ width: 24, height: 1, background: step > s ? C.primary : 'rgba(255,255,255,.1)', transition: 'background .3s' }}></div>}
            </div>
          ))}
        </div>

        {/* Google OAuth (seulement à l'étape 1) */}
        {step === 1 && (
          <>
            <button className="btn-google" onClick={handleGoogle} disabled={loadingGoogle}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '13px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.07)', color: C.white, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 18, transition: 'all .2s' }}>
              {loadingGoogle ? <span style={{ fontSize: 13 }}>Redirection...</span> : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  S'inscrire avec Google
                </>
              )}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }}></div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>ou avec email</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }}></div>
            </div>
          </>
        )}

        {/* Formulaire */}
        <form onSubmit={handleRegister}>

          {/* ÉTAPE 1 — Restaurant */}
          {step === 1 && (
            <div style={{ animation: 'slideLeft .3s ease' }}>
              <div style={{ background: 'rgba(255,107,53,.08)', border: '1px solid rgba(255,107,53,.15)', borderRadius: 16, padding: '16px', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 14 }}>🏪 Votre Restaurant</div>
                <input name="nom_restaurant" value={form.nom_restaurant} onChange={handleChange} placeholder="Nom du restaurant *" required
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.07)', color: C.white, fontSize: 13, fontFamily: 'inherit', marginBottom: 10, transition: 'border-color .2s' }} />
                <input name="telephone" value={form.telephone} onChange={handleChange} placeholder="Téléphone (ex: 0708091234)"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.07)', color: C.white, fontSize: 13, fontFamily: 'inherit', marginBottom: 10, transition: 'border-color .2s' }} />
                <select name="ville" value={form.ville} onChange={handleChange}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.07)', color: C.white, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
                  {VILLES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary"
                style={{ width: '100%', background: 'linear-gradient(135deg, #FF6B35, #FF4500)', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 700, color: C.white, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(255,107,53,.3)', transition: 'all .2s' }}>
                Suivant →
              </button>
            </div>
          )}

          {/* ÉTAPE 2 — Gérant + Compte */}
          {step === 2 && (
            <div style={{ animation: 'slideLeft .3s ease' }}>
              <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '16px', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 14 }}>👤 Vos Informations</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <input name="prenom_gerant" value={form.prenom_gerant} onChange={handleChange} placeholder="Prénom"
                    style={{ padding: '12px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.07)', color: C.white, fontSize: 13, fontFamily: 'inherit', transition: 'border-color .2s' }} />
                  <input name="nom_gerant" value={form.nom_gerant} onChange={handleChange} placeholder="Nom *" required
                    style={{ padding: '12px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.07)', color: C.white, fontSize: 13, fontFamily: 'inherit', transition: 'border-color .2s' }} />
                </div>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email *" required
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.07)', color: C.white, fontSize: 13, fontFamily: 'inherit', marginBottom: 10, transition: 'border-color .2s' }} />
                <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Mot de passe (min. 6 caractères) *" required minLength={6}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.07)', color: C.white, fontSize: 13, fontFamily: 'inherit', transition: 'border-color .2s' }} />
              </div>

              {error && (
                <div style={{ background: 'rgba(255,59,48,.15)', border: '1px solid rgba(255,59,48,.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#FF6B6B', marginBottom: 12 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setStep(1)}
                  style={{ flex: 1, background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.12)', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 600, color: C.white, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ← Retour
                </button>
                <button type="submit" className="btn-primary" disabled={loading}
                  style={{ flex: 2, background: 'linear-gradient(135deg, #FF6B35, #FF4500)', border: 'none', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700, color: C.white, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? .7 : 1, boxShadow: '0 8px 24px rgba(255,107,53,.3)', transition: 'all .2s' }}>
                  {loading ? 'Création...' : '✅ Créer mon restaurant'}
                </button>
              </div>
            </div>
          )}
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 20 }}>
          Déjà un compte ?{' '}
          <Link href="/auth/login" style={{ color: C.primary, fontWeight: 600, textDecoration: 'none' }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}