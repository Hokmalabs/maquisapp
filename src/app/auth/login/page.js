'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const C = {
  bg: '#0D0D0D', white: '#FFFFFF', primary: '#FF6B35', primaryLight: '#FFF0EB',
  dark: '#1A1A2E', gray: '#8A8A9A', border: '#E8E8F0', red: '#FF3B30',
}

export default function LoginPage() {
  const router = useRouter()
  const [identifiant, setIdentifiant] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError]       = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // ── Email / Password ────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    // Détection : téléphone si pas de "@"
    if (!identifiant.includes('@')) {
      setError('Connexion par téléphone disponible prochainement. Utilisez votre email.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: identifiant, password })
    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoadingGoogle(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError('Erreur de connexion Google')
      setLoadingGoogle(false)
    }
    // Pas besoin de setLoadingGoogle(false) car la page redirige vers Google
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', fontFamily: "'DM Sans', system-ui, sans-serif", position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        input:focus { border-color: #FF6B35 !important; outline: none; }
        .btn-google:hover { background: rgba(255,255,255,.12) !important; }
        .btn-primary:hover { opacity: .92; transform: translateY(-1px); }
        .btn-primary:active, .btn-google:active { transform: scale(0.98); }
      `}</style>

      {/* Blobs déco */}
      <div style={{ position: 'absolute', top: '-10%', left: '-15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,107,53,.15) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,69,0,.1) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }}></div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1, animation: 'fadeUp .5s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, animation: 'float 4s ease-in-out infinite', display: 'inline-block' }}>🍽️</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: C.white, marginTop: 8 }}>MaquisApp</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>Connectez-vous à votre restaurant</p>
        </div>

        {/* Bouton Google */}
        <button className="btn-google" onClick={handleGoogle} disabled={loadingGoogle}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.07)', color: C.white, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, transition: 'all .2s' }}>
          {loadingGoogle ? (
            <span style={{ fontSize: 13 }}>Redirection...</span>
          ) : (
            <>
              {/* Logo Google SVG */}
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuer avec Google
            </>
          )}
        </button>

        {/* Séparateur */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }}></div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', fontWeight: 500 }}>ou avec identifiant</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }}></div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 6 }}>Identifiant</label>
            <input type="text" value={identifiant} onChange={e => setIdentifiant(e.target.value)} placeholder="Email ou numéro de téléphone" required
              style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.07)', color: C.white, fontSize: 14, fontFamily: 'inherit', transition: 'border-color .2s' }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 6 }}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                style={{ width: '100%', padding: '13px 44px 13px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.07)', color: C.white, fontSize: 14, fontFamily: 'inherit', transition: 'border-color .2s' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', fontSize: 16 }}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(255,59,48,.15)', border: '1px solid rgba(255,59,48,.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#FF6B6B', marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}
            style={{ width: '100%', background: 'linear-gradient(135deg, #FF6B35, #FF4500)', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 700, color: C.white, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .2s', opacity: loading ? .7 : 1, boxShadow: '0 8px 24px rgba(255,107,53,.3)' }}>
            {loading ? 'Connexion...' : 'Se connecter →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 24 }}>
          Pas encore de compte ?{' '}
          <Link href="/auth/register" style={{ color: C.primary, fontWeight: 600, textDecoration: 'none' }}>
            Créer mon restaurant
          </Link>
        </p>
      </div>
    </div>
  )
}