'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const C = {
  bg: '#3D0C11', white: '#FFFFFF', primary: '#8B1A27',
  primaryLight: '#FFF0EB', dark: '#3D0C11', gray: '#8A8A9A',
  border: '#E8E8F0', red: '#FF3B30',
}

const INDICATIFS = [
  { code: '+225', pays: "Côte d'Ivoire" },
  { code: '+226', pays: 'Burkina Faso' },
  { code: '+221', pays: 'Sénégal' },
  { code: '+229', pays: 'Bénin' },
  { code: '+228', pays: 'Togo' },
  { code: '+223', pays: 'Mali' },
  { code: '+227', pays: 'Niger' },
]

const VILLES = ['Abidjan', 'Bouaké', 'Daloa', 'Yamoussoukro', 'San-Pédro', 'Korhogo', 'Man', 'Autre']

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ─────────────────────────────────────────────────────────────────────────────

function AuthPageContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const initMode     = searchParams.get('mode') === 'register' ? 'register' : 'login'

  const [mode,          setMode]          = useState(initMode)
  const [step,          setStep]          = useState(1)
  const [indicatif,     setIndicatif]     = useState('+225')
  const [phone,         setPhone]         = useState('')
  const [otp,           setOtp]           = useState(['', '', '', '', '', ''])
  const [savedCode,     setSavedCode]     = useState('')
  const [prenom,        setPrenom]        = useState('')
  const [nom,           setNom]           = useState('')
  const [email,         setEmail]         = useState('')
  const [restaurantNom, setRestaurantNom] = useState('')
  const [ville,         setVille]         = useState('Abidjan')
  const [acceptCGU,     setAcceptCGU]     = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error,         setError]         = useState('')
  const [resendTimer,   setResendTimer]   = useState(0)
  const [pin,        setPin]        = useState(['', '', '', ''])
  const [pinConfirm, setPinConfirm] = useState(['', '', '', ''])
  const [savedUserId,    setSavedUserId]    = useState('')
  const [savedRedirectTo, setSavedRedirectTo] = useState('')
  const [savedOtpReset,  setSavedOtpReset]  = useState('')

  const otpRefs        = useRef([])
  const pinRefs        = useRef([])
  const pinConfirmRefs = useRef([])

  // Décompte "Renvoyer le code"
  useEffect(() => {
    if (resendTimer <= 0) return
    const id = setTimeout(() => setResendTimer(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [resendTimer])

  // ── Switch mode Login / Register ────────────────────────────────────────────
  const handleModeSwitch = (newMode) => {
    setMode(newMode)
    setStep(1)
    setOtp(['', '', '', '', '', ''])
    setSavedCode('')
    setError('')
    setPin(['', '', '', ''])
    setPinConfirm(['', '', '', ''])
    setSavedUserId('')
    setSavedRedirectTo('')
    setSavedOtpReset('')
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoadingGoogle(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback${mode === 'register' ? '?register=true' : ''}`,
      },
    })
    if (error) {
      setError('Erreur Google OAuth')
      setLoadingGoogle(false)
    }
  }

  // ── Envoi OTP (step 1 → step 2) ───────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e?.preventDefault()
    setError('')

    if (!/^[0-9]{10}$/.test(phone)) {
      setError('Numéro invalide — 10 chiffres requis (ex: 0708091234)')
      return
    }

    setLoading(true)
    try {
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone, indicatif }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Erreur envoi SMS')
        return
      }
      setOtp(['', '', '', '', '', ''])
      setStep(2)
      setResendTimer(30)
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch {
      setError('Réseau indisponible — vérifiez votre connexion')
    } finally {
      setLoading(false)
    }
  }

  // ── Vérification OTP + session ─────────────────────────────────────────────
  // login → appelé depuis step 2 (auto ou bouton)
  // register → appelé depuis step 3 (soumission formulaire)
  const handleVerifyOtp = async (codeStr) => {
    setError('')
    setLoading(true)

    const body = { phone, indicatif, code: codeStr }
    if (mode === 'register') {
      Object.assign(body, {
        prenom:         prenom || undefined,
        nom,
        email:          email  || undefined,
        ville,
        restaurant_nom: restaurantNom,
      })
    }

    try {
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/verify-otp`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()

      if (!data.success) {
        const msg = data.error === 'Code invalide ou expiré'
          ? 'Code incorrect ou expiré — renvoyez un nouveau code'
          : (data.error || 'Erreur vérification')
        setError(msg)
        // Code refusé → retour step 2 pour saisir à nouveau
        setOtp(['', '', '', '', '', ''])
        setSavedCode('')
        if (mode === 'register' && step === 3) setStep(2)
        setTimeout(() => otpRefs.current[0]?.focus(), 100)
        return
      }

      // Ouvrir la session via magic link token
      if (data.hashed_token) {
        const { error: authErr } = await supabase.auth.verifyOtp({
          token_hash: data.hashed_token,
          type:       'magiclink',
        })
        if (authErr) {
          setError('Erreur ouverture de session — réessayez')
          return
        }
      }

      if (mode === 'register') {
        setSavedUserId(data.userId || '')
        setSavedRedirectTo(data.redirectTo || '/dashboard')
        setPin(['', '', '', ''])
        setPinConfirm(['', '', '', ''])
        setStep(4)
      } else {
        router.push(data.redirectTo || '/dashboard')
      }
    } catch {
      setError('Réseau indisponible — vérifiez votre connexion')
    } finally {
      setLoading(false)
    }
  }

  // ── Gestion saisie OTP (input par input) ──────────────────────────────────
  const handleOtpChange = (idx, value) => {
    const digit  = value.replace(/\D/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[idx]  = digit
    setOtp(newOtp)

    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus()

    const code = newOtp.join('')
    if (newOtp.every(d => d !== '')) {
      if (mode === 'login') {
        handleVerifyOtp(code)
      } else if (mode === 'reset') {
        setSavedOtpReset(code)
        setTimeout(() => setStep(3), 80)
      } else {
        setSavedCode(code)
        setTimeout(() => setStep(3), 80)
      }
    }
  }

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      const newOtp  = [...otp]
      newOtp[idx - 1] = ''
      setOtp(newOtp)
      otpRefs.current[idx - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length !== 6) return
    const digits = pasted.split('')
    setOtp(digits)
    otpRefs.current[5]?.focus()
    if (mode === 'login') {
      handleVerifyOtp(pasted)
    } else if (mode === 'reset') {
      setSavedOtpReset(pasted)
      setTimeout(() => setStep(3), 80)
    } else {
      setSavedCode(pasted)
      setTimeout(() => setStep(3), 80)
    }
  }

  // ── Renvoyer le code ───────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0 || loading) return
    setError('')
    setLoading(true)
    try {
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone, indicatif }),
      })
      const data = await res.json()
      if (data.success) {
        setResendTimer(30)
        setOtp(['', '', '', '', '', ''])
        setSavedCode('')
        setTimeout(() => otpRefs.current[0]?.focus(), 100)
      } else {
        setError(data.error || 'Erreur renvoi SMS')
      }
    } catch {
      setError('Réseau indisponible')
    } finally {
      setLoading(false)
    }
  }

  // ── Soumission formulaire step 3 (register) ───────────────────────────────
  const handleRegisterSubmit = (e) => {
    e.preventDefault()
    if (!acceptCGU) { setError("Acceptez les conditions d'utilisation pour continuer"); return }
    if (!nom.trim()) { setError('Le nom est obligatoire'); return }
    if (!restaurantNom.trim()) { setError('Le nom du restaurant est obligatoire'); return }
    handleVerifyOtp(savedCode)
  }

  // ── Login avec PIN ─────────────────────────────────────────────────────────
  const handleLoginPin = async (pinStr) => {
    setError('')
    if (!/^[0-9]{10}$/.test(phone)) {
      setError('Numéro invalide — 10 chiffres requis (ex: 0708091234)')
      return
    }
    setLoading(true)
    try {
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/login-with-pin`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone, indicatif, pin: pinStr }),
      })
      const data = await res.json()
      if (data.success && data.hashed_token) {
        const { error: authErr } = await supabase.auth.verifyOtp({
          token_hash: data.hashed_token,
          type:       'magiclink',
        })
        if (authErr) { setError('Erreur ouverture de session — réessayez'); setLoading(false); return }
        router.push(data.redirectTo || '/dashboard')
      } else {
        if (data.locked) {
          setError('Trop de tentatives. Réessayez plus tard.')
        } else if (data.attemptsRemaining != null) {
          setError(`Code incorrect. ${data.attemptsRemaining} tentatives restantes.`)
        } else {
          setError(data.error || 'Erreur connexion')
        }
        setPin(['', '', '', ''])
        setTimeout(() => pinRefs.current[0]?.focus(), 100)
      }
    } catch {
      setError('Réseau indisponible — vérifiez votre connexion')
      setPin(['', '', '', ''])
    } finally {
      setLoading(false)
    }
  }

  const handlePinChange = (idx, value) => {
    const digit  = value.replace(/\D/g, '').slice(-1)
    const newPin = [...pin]
    newPin[idx]  = digit
    setPin(newPin)
    if (digit && idx < 3) pinRefs.current[idx + 1]?.focus()
    if (newPin.every(d => d !== '') && mode === 'login') handleLoginPin(newPin.join(''))
  }

  const handlePinKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
      const newPin    = [...pin]
      newPin[idx - 1] = ''
      setPin(newPin)
      pinRefs.current[idx - 1]?.focus()
    }
  }

  const handlePinConfirmChange = (idx, value) => {
    const digit  = value.replace(/\D/g, '').slice(-1)
    const newPin = [...pinConfirm]
    newPin[idx]  = digit
    setPinConfirm(newPin)
    if (digit && idx < 3) pinConfirmRefs.current[idx + 1]?.focus()
  }

  const handlePinConfirmKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !pinConfirm[idx] && idx > 0) {
      const newPin    = [...pinConfirm]
      newPin[idx - 1] = ''
      setPinConfirm(newPin)
      pinConfirmRefs.current[idx - 1]?.focus()
    }
  }

  // ── Création PIN (register étape 4) ───────────────────────────────────────
  const handleSetPin = async (e) => {
    e.preventDefault()
    setError('')
    const pinStr     = pin.join('')
    const confirmStr = pinConfirm.join('')
    if (pinStr.length < 4) { setError('Saisissez un code à 4 chiffres'); return }
    if (pinStr !== confirmStr) { setError('Les codes ne correspondent pas, vérifiez'); return }
    setLoading(true)
    try {
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/set-pin`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: savedUserId, pin: pinStr, confirmPin: confirmStr }),
      })
      const data = await res.json()
      if (data.success) {
        router.push(savedRedirectTo || '/dashboard')
      } else {
        setError(data.error || 'Erreur création du code')
      }
    } catch {
      setError('Réseau indisponible — vérifiez votre connexion')
    } finally {
      setLoading(false)
    }
  }

  // ── Reset PIN via OTP (mode reset, étape 3) ──────────────────────────────
  const handleResetPin = async (e) => {
    e.preventDefault()
    setError('')
    const pinStr     = pin.join('')
    const confirmStr = pinConfirm.join('')
    if (pinStr.length < 4) { setError('Saisissez un code à 4 chiffres'); return }
    if (pinStr !== confirmStr) { setError('Les codes ne correspondent pas, vérifiez'); return }
    setLoading(true)
    try {
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/unlock-pin-with-otp`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone, indicatif, code: savedOtpReset, newPin: pinStr, confirmPin: confirmStr }),
      })
      const data = await res.json()
      if (data.success) {
        if (data.hashed_token) {
          const { error: authErr } = await supabase.auth.verifyOtp({
            token_hash: data.hashed_token,
            type:       'magiclink',
          })
          if (!authErr) { router.push(data.redirectTo || '/dashboard'); return }
        }
        handleModeSwitch('login')
      } else {
        setError(data.error || 'Erreur mise à jour du code')
        if (data.error?.toLowerCase().includes('invalide') || data.error?.toLowerCase().includes('expiré')) {
          setSavedOtpReset('')
          setOtp(['', '', '', '', '', ''])
          setStep(1)
        }
      }
    } catch {
      setError('Réseau indisponible — vérifiez votre connexion')
    } finally {
      setLoading(false)
    }
  }

  // ── Helpers UI ─────────────────────────────────────────────────────────────
  const totalSteps  = 4
  const stepLabels  = ['Téléphone', 'Code SMS', 'Informations', 'Code PIN']

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 12,
    border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.07)',
    color: C.white, fontSize: 13, fontFamily: 'inherit', transition: 'border-color .2s',
  }

  const ErrorBanner = ({ msg }) => msg ? (
    <div style={{ background: 'rgba(255,59,48,.15)', border: '1px solid rgba(255,59,48,.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#FF6B6B', marginBottom: 12 }}>
      {msg}
    </div>
  ) : null

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', fontFamily: "'DM Sans', system-ui, sans-serif", position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideLeft{ from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
        input:focus, select:focus { border-color: #8B1A27 !important; outline: none; }
        .btn-google:hover { background: rgba(255,255,255,.12) !important; }
        .btn-primary:hover { opacity:.92; transform:translateY(-1px); }
        .btn-primary:active, .btn-google:active { transform:scale(0.98); }
        select option { background: #3D0C11; color: #fff; }
        .otp-inp:focus { border-color: #8B1A27 !important; outline: none; }
      `}</style>

      {/* Blobs déco */}
      <div style={{ position: 'absolute', top: '-10%', right: '-15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,107,53,.15) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', left: '-15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,69,0,.1) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }}></div>

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1, animation: 'fadeUp .5s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 44, animation: 'float 4s ease-in-out infinite', display: 'inline-block' }}>🍽️</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: C.white, marginTop: 8 }}>MaquisApp</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>
            {mode === 'login' ? 'Connectez-vous à votre restaurant' : mode === 'reset' ? "Récupérez l'accès à votre compte" : 'Créez votre espace restaurant'}
          </p>
        </div>

        {/* Toggle Login / Register */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,.06)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {[{ id: 'login', label: 'Connexion' }, { id: 'register', label: 'Inscription' }].map(m => (
            <button key={m.id} onClick={() => handleModeSwitch(m.id)}
              style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: (m.id === 'login' ? (mode === 'login' || mode === 'reset') : mode === m.id) ? C.primary : 'transparent', color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Stepper */}
        {mode === 'register' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {stepLabels.map((label, i) => {
            const s = i + 1
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: step >= s ? C.primary : 'rgba(255,255,255,.1)', border: `2px solid ${step >= s ? C.primary : 'rgba(255,255,255,.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: step >= s ? '#fff' : 'rgba(255,255,255,.3)', transition: 'all .3s' }}>
                    {step > s ? '✓' : s}
                  </div>
                  <span style={{ fontSize: 9, color: step >= s ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.2)', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
                </div>
                {s < totalSteps && (
                  <div style={{ width: 38, height: 1, background: step > s ? C.primary : 'rgba(255,255,255,.1)', transition: 'background .3s', marginBottom: 14 }}></div>
                )}
              </div>
            )
          })}
        </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            MODE LOGIN — Téléphone + PIN (1 page unique)
        ═══════════════════════════════════════════════════════════════ */}
        {mode === 'login' && (
          <div style={{ animation: 'slideLeft .3s ease' }}>
            <button className="btn-google" onClick={handleGoogle} disabled={loadingGoogle}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '13px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.07)', color: C.white, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, transition: 'all .2s' }}>
              {loadingGoogle ? <span style={{ fontSize: 13 }}>Redirection...</span> : (
                <>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }}></div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>ou avec téléphone</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }}></div>
            </div>

            <form onSubmit={e => { e.preventDefault(); handleLoginPin(pin.join('')) }}>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Numéro de téléphone
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select value={indicatif} onChange={e => setIndicatif(e.target.value)}
                  style={{ padding: '12px 10px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.07)', color: C.white, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0 }}>
                  {INDICATIFS.map(i => (
                    <option key={i.code} value={i.code}>{i.code} {i.pays}</option>
                  ))}
                </select>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="0708091234" autoFocus
                  style={{ ...inputStyle, flex: 1 }} />
              </div>

              <label style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Code à 4 chiffres
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                {pin.map((digit, idx) => (
                  <input
                    key={idx}
                    className="otp-inp"
                    ref={el => { pinRefs.current[idx] = el }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handlePinChange(idx, e.target.value)}
                    onKeyDown={e => handlePinKeyDown(idx, e)}
                    disabled={loading}
                    style={{ width: 58, height: 58, borderRadius: 12, border: `2px solid ${digit ? C.primary : 'rgba(255,255,255,.15)'}`, background: digit ? 'rgba(139,26,39,.25)' : 'rgba(255,255,255,.07)', color: C.white, fontSize: 22, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', transition: 'all .15s', cursor: 'text' }}
                  />
                ))}
              </div>

              <ErrorBanner msg={error} />

              <button type="submit" className="btn-primary" disabled={loading}
                style={{ width: '100%', background: 'linear-gradient(135deg, #8B1A27, #FF4500)', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 700, color: C.white, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .2s', opacity: loading ? .7 : 1, boxShadow: '0 8px 24px rgba(255,107,53,.3)' }}>
                {loading ? 'Connexion...' : 'Se connecter →'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button onClick={() => {
                if (!/^[0-9]{10}$/.test(phone)) {
                  setError("Saisissez d'abord votre numéro de téléphone")
                  return
                }
                setError('')
                setOtp(['', '', '', '', '', ''])
                setSavedOtpReset('')
                setPin(['', '', '', ''])
                setPinConfirm(['', '', '', ''])
                setMode('reset')
                setStep(1)
              }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                PIN oublié ?
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 16 }}>
              Pas encore de compte ?{' '}
              <button onClick={() => handleModeSwitch('register')}
                style={{ background: 'none', border: 'none', color: C.primary, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
                Créer mon restaurant
              </button>
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STEP 1 — Saisie du numéro (register)
        ═══════════════════════════════════════════════════════════════ */}
        {step === 1 && mode === 'register' && (
          <div style={{ animation: 'slideLeft .3s ease' }}>

            {/* Google OAuth */}
            <button className="btn-google" onClick={handleGoogle} disabled={loadingGoogle}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '13px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.07)', color: C.white, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, transition: 'all .2s' }}>
              {loadingGoogle ? <span style={{ fontSize: 13 }}>Redirection...</span> : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {mode === 'register' ? "S'inscrire avec Google" : 'Continuer avec Google'}
                </>
              )}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }}></div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>ou par SMS</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }}></div>
            </div>

            <form onSubmit={handleSendOtp}>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Numéro de téléphone
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select value={indicatif} onChange={e => setIndicatif(e.target.value)}
                  style={{ padding: '12px 10px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.07)', color: C.white, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0 }}>
                  {INDICATIFS.map(i => (
                    <option key={i.code} value={i.code}>{i.code} {i.pays}</option>
                  ))}
                </select>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="0708091234" required autoFocus
                  style={{ ...inputStyle, flex: 1 }} />
              </div>

              <ErrorBanner msg={error} />

              <button type="submit" className="btn-primary" disabled={loading}
                style={{ width: '100%', background: 'linear-gradient(135deg, #8B1A27, #FF4500)', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 700, color: C.white, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .2s', opacity: loading ? .7 : 1, boxShadow: '0 8px 24px rgba(255,107,53,.3)' }}>
                {loading ? 'Envoi...' : 'Recevoir le code SMS →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 20 }}>
              {mode === 'login' ? (
                <>Pas encore de compte ?{' '}
                  <button onClick={() => handleModeSwitch('register')}
                    style={{ background: 'none', border: 'none', color: C.primary, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
                    Créer mon restaurant
                  </button>
                </>
              ) : (
                <>Déjà un compte ?{' '}
                  <button onClick={() => handleModeSwitch('login')}
                    style={{ background: 'none', border: 'none', color: C.primary, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
                    Se connecter
                  </button>
                </>
              )}
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STEP 2 — Code OTP (6 inputs)
        ═══════════════════════════════════════════════════════════════ */}
        {step === 2 && mode === 'register' && (
          <div style={{ animation: 'slideLeft .3s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>
                Code envoyé au <span style={{ color: C.white, fontWeight: 700 }}>{indicatif} {phone}</span>
              </div>
            </div>

            {/* 6 inputs séparés */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  className="otp-inp"
                  ref={el => { otpRefs.current[idx] = el }}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(idx, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(idx, e)}
                  onPaste={idx === 0 ? handleOtpPaste : undefined}
                  disabled={loading}
                  style={{ width: 46, height: 54, borderRadius: 12, border: `2px solid ${digit ? C.primary : 'rgba(255,255,255,.15)'}`, background: digit ? 'rgba(139,26,39,.25)' : 'rgba(255,255,255,.07)', color: C.white, fontSize: 22, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', transition: 'all .15s', cursor: 'text' }}
                />
              ))}
            </div>

            {loading && (
              <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 12 }}>Vérification...</div>
            )}

            <ErrorBanner msg={error} />

            {/* Timer / Renvoyer */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              {resendTimer > 0 ? (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>Renvoyer dans {resendTimer}s</span>
              ) : (
                <button onClick={handleResend} disabled={loading}
                  style={{ background: 'none', border: 'none', color: C.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Renvoyer le code
                </button>
              )}
            </div>

            <button onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setError('') }}
              style={{ width: '100%', background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.12)', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 600, color: C.white, cursor: 'pointer', fontFamily: 'inherit' }}>
              ← Changer de numéro
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STEP 3 — Infos perso + restaurant (register uniquement)
        ═══════════════════════════════════════════════════════════════ */}
        {step === 3 && mode === 'register' && (
          <div style={{ animation: 'slideLeft .3s ease' }}>
            <form onSubmit={handleRegisterSubmit}>

              {/* Bloc personnel */}
              <div style={{ background: 'rgba(255,107,53,.08)', border: '1px solid rgba(255,107,53,.15)', borderRadius: 16, padding: '16px', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>👤 Vos informations</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <input value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Prénom (optionnel)"
                    style={inputStyle} />
                  <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom *" required
                    style={inputStyle} />
                </div>

                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (optionnel)"
                  style={inputStyle} />
              </div>

              {/* Bloc restaurant */}
              <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '16px', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>🏪 Votre restaurant</div>

                <input value={restaurantNom} onChange={e => setRestaurantNom(e.target.value)} placeholder="Nom du restaurant *" required
                  style={{ ...inputStyle, marginBottom: 10 }} />

                <select value={ville} onChange={e => setVille(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  {VILLES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              {/* CGU */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                <input type="checkbox" checked={acceptCGU} onChange={e => setAcceptCGU(e.target.checked)}
                  style={{ marginTop: 2, accentColor: '#8B1A27', width: 16, height: 16, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.5 }}>
                  J'accepte les{' '}
                  <Link href="/legal/conditions" target="_blank" style={{ color: C.primary, textDecoration: 'none' }}>Conditions d'utilisation</Link>
                  {' '}et la{' '}
                  <Link href="/legal/confidentialite" target="_blank" style={{ color: C.primary, textDecoration: 'none' }}>Politique de confidentialité</Link>
                </span>
              </div>

              <ErrorBanner msg={error} />

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => { setStep(2); setError('') }}
                  style={{ flex: 1, background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.12)', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 600, color: C.white, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ← Retour
                </button>
                <button type="submit" className="btn-primary" disabled={loading}
                  style={{ flex: 2, background: 'linear-gradient(135deg, #8B1A27, #FF4500)', border: 'none', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700, color: C.white, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? .7 : 1, boxShadow: '0 8px 24px rgba(255,107,53,.3)', transition: 'all .2s' }}>
                  {loading ? 'Création...' : '✅ Créer mon restaurant'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STEP 4 — Création du PIN (register uniquement)
        ═══════════════════════════════════════════════════════════════ */}
        {step === 4 && mode === 'register' && (
          <div style={{ animation: 'slideLeft .3s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.white, marginBottom: 6 }}>Créez votre code à 4 chiffres</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>Vous l'utiliserez à chaque connexion. Notez-le bien.</p>
            </div>

            <form onSubmit={handleSetPin}>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Votre code
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                {pin.map((digit, idx) => (
                  <input
                    key={idx}
                    className="otp-inp"
                    ref={el => { pinRefs.current[idx] = el }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handlePinChange(idx, e.target.value)}
                    onKeyDown={e => handlePinKeyDown(idx, e)}
                    disabled={loading}
                    autoFocus={idx === 0}
                    style={{ width: 58, height: 58, borderRadius: 12, border: `2px solid ${digit ? C.primary : 'rgba(255,255,255,.15)'}`, background: digit ? 'rgba(139,26,39,.25)' : 'rgba(255,255,255,.07)', color: C.white, fontSize: 22, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', transition: 'all .15s', cursor: 'text' }}
                  />
                ))}
              </div>

              <label style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Confirmez votre code
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
                {pinConfirm.map((digit, idx) => (
                  <input
                    key={idx}
                    className="otp-inp"
                    ref={el => { pinConfirmRefs.current[idx] = el }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handlePinConfirmChange(idx, e.target.value)}
                    onKeyDown={e => handlePinConfirmKeyDown(idx, e)}
                    disabled={loading}
                    style={{ width: 58, height: 58, borderRadius: 12, border: `2px solid ${digit ? C.primary : 'rgba(255,255,255,.15)'}`, background: digit ? 'rgba(139,26,39,.25)' : 'rgba(255,255,255,.07)', color: C.white, fontSize: 22, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', transition: 'all .15s', cursor: 'text' }}
                  />
                ))}
              </div>

              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', textAlign: 'center', marginBottom: 16 }}>
                Notez bien ce code, vous l'utiliserez à chaque connexion
              </p>

              <ErrorBanner msg={error} />

              <button type="submit" className="btn-primary" disabled={loading}
                style={{ width: '100%', background: 'linear-gradient(135deg, #8B1A27, #FF4500)', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 700, color: C.white, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .2s', opacity: loading ? .7 : 1, boxShadow: '0 8px 24px rgba(255,107,53,.3)' }}>
                {loading ? 'Création...' : '🎉 Créer mon compte'}
              </button>
            </form>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            MODE RESET — Étape 1 : Confirmation envoi SMS
        ═══════════════════════════════════════════════════════════════ */}
        {mode === 'reset' && step === 1 && (
          <div style={{ animation: 'slideLeft .3s ease' }}>
            <div style={{ background: 'rgba(255,107,53,.08)', border: '1px solid rgba(255,107,53,.15)', borderRadius: 16, padding: '20px', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📱</div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: C.white, marginBottom: 8 }}>Récupération de votre code</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', marginBottom: 4 }}>Un code SMS sera envoyé au</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.white }}>{indicatif} {phone}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 8 }}>
                Vérifiez que c'est bien votre numéro avant de continuer
              </p>
            </div>

            <ErrorBanner msg={error} />

            <button onClick={handleSendOtp} disabled={loading} className="btn-primary"
              style={{ width: '100%', background: 'linear-gradient(135deg, #8B1A27, #FF4500)', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 700, color: C.white, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .2s', opacity: loading ? .7 : 1, boxShadow: '0 8px 24px rgba(255,107,53,.3)', marginBottom: 12 }}>
              {loading ? 'Envoi...' : 'Envoyer le code SMS'}
            </button>

            <button onClick={() => handleModeSwitch('login')}
              style={{ width: '100%', background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.12)', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 600, color: C.white, cursor: 'pointer', fontFamily: 'inherit' }}>
              ← Changer de numéro
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            MODE RESET — Étape 2 : Saisie OTP
        ═══════════════════════════════════════════════════════════════ */}
        {mode === 'reset' && step === 2 && (
          <div style={{ animation: 'slideLeft .3s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>
                Code envoyé au <span style={{ color: C.white, fontWeight: 700 }}>{indicatif} {phone}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  className="otp-inp"
                  ref={el => { otpRefs.current[idx] = el }}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(idx, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(idx, e)}
                  onPaste={idx === 0 ? handleOtpPaste : undefined}
                  disabled={loading}
                  style={{ width: 46, height: 54, borderRadius: 12, border: `2px solid ${digit ? C.primary : 'rgba(255,255,255,.15)'}`, background: digit ? 'rgba(139,26,39,.25)' : 'rgba(255,255,255,.07)', color: C.white, fontSize: 22, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', transition: 'all .15s', cursor: 'text' }}
                />
              ))}
            </div>

            <ErrorBanner msg={error} />

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              {resendTimer > 0 ? (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>Renvoyer dans {resendTimer}s</span>
              ) : (
                <button onClick={handleResend} disabled={loading}
                  style={{ background: 'none', border: 'none', color: C.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Renvoyer le code
                </button>
              )}
            </div>

            <button onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setError('') }}
              style={{ width: '100%', background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.12)', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 600, color: C.white, cursor: 'pointer', fontFamily: 'inherit' }}>
              ← Étape précédente
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            MODE RESET — Étape 3 : Nouveau PIN
        ═══════════════════════════════════════════════════════════════ */}
        {mode === 'reset' && step === 3 && (
          <div style={{ animation: 'slideLeft .3s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔑</div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.white, marginBottom: 6 }}>Créez votre nouveau code</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>Choisissez un code que vous retiendrez bien.</p>
            </div>

            <form onSubmit={handleResetPin}>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Nouveau code
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                {pin.map((digit, idx) => (
                  <input
                    key={idx}
                    className="otp-inp"
                    ref={el => { pinRefs.current[idx] = el }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handlePinChange(idx, e.target.value)}
                    onKeyDown={e => handlePinKeyDown(idx, e)}
                    disabled={loading}
                    autoFocus={idx === 0}
                    style={{ width: 58, height: 58, borderRadius: 12, border: `2px solid ${digit ? C.primary : 'rgba(255,255,255,.15)'}`, background: digit ? 'rgba(139,26,39,.25)' : 'rgba(255,255,255,.07)', color: C.white, fontSize: 22, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', transition: 'all .15s', cursor: 'text' }}
                  />
                ))}
              </div>

              <label style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Confirmez votre code
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                {pinConfirm.map((digit, idx) => (
                  <input
                    key={idx}
                    className="otp-inp"
                    ref={el => { pinConfirmRefs.current[idx] = el }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handlePinConfirmChange(idx, e.target.value)}
                    onKeyDown={e => handlePinConfirmKeyDown(idx, e)}
                    disabled={loading}
                    style={{ width: 58, height: 58, borderRadius: 12, border: `2px solid ${digit ? C.primary : 'rgba(255,255,255,.15)'}`, background: digit ? 'rgba(139,26,39,.25)' : 'rgba(255,255,255,.07)', color: C.white, fontSize: 22, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', transition: 'all .15s', cursor: 'text' }}
                  />
                ))}
              </div>

              <ErrorBanner msg={error} />

              <button type="submit" className="btn-primary" disabled={loading}
                style={{ width: '100%', background: 'linear-gradient(135deg, #8B1A27, #FF4500)', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 700, color: C.white, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .2s', opacity: loading ? .7 : 1, boxShadow: '0 8px 24px rgba(255,107,53,.3)' }}>
                {loading ? 'Mise à jour...' : 'Mettre à jour mon code →'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}

// Suspense requis pour useSearchParams en Next.js 14 App Router
export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#3D0C11', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 44, animation: 'float 2s ease-in-out infinite' }}>🍽️</div>
        <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  )
}
