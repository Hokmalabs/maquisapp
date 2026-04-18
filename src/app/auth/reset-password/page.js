'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#3D0C11', white: '#FFFFFF', primary: '#8B1A27',
  dark: '#3D0C11', red: '#FF3B30',
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleReset(e) {
    e.preventDefault()
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', fontFamily: "'DM Sans', system-ui, sans-serif", position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { border-color: #8B1A27 !important; outline: none; }
      `}</style>

      {/* Blobs déco */}
      <div style={{ position: 'absolute', top: '-10%', left: '-15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,107,53,.15) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,69,0,.1) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }}></div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, display: 'inline-block', marginBottom: 8 }}>🔑</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.white, marginTop: 8 }}>Nouveau mot de passe</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>Choisissez un mot de passe sécurisé</p>
        </div>

        {done ? (
          <div style={{ background: 'rgba(0,200,81,.12)', border: '1px solid rgba(0,200,81,.3)', borderRadius: 14, padding: '20px', textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#00C851' }}>
            ✅ Mot de passe mis à jour ! Redirection...
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 6 }}>Nouveau mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
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

            <button type="submit" disabled={loading}
              style={{ width: '100%', background: 'linear-gradient(135deg, #8B1A27, #FF4500)', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 700, color: C.white, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? .7 : 1, boxShadow: '0 8px 24px rgba(255,107,53,.3)' }}>
              {loading ? 'Mise à jour...' : 'Confirmer le mot de passe →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
