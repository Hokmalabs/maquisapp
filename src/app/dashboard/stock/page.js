'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#F5F5F5', white: '#FFFFFF', primary: '#8B1A27', primaryLight: '#FFF0EB',
  dark: '#3D0C11', gray: '#8A8A9A', grayLight: '#F0F0F5', border: '#E8E8F0',
  green: '#00C851', yellow: '#FFB800', red: '#FF3B30', shadow: 'rgba(0,0,0,0.07)',
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function StockPage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [restaurantId, setRestaurantId] = useState(null)
  const [boissons, setBoissons] = useState([])
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [filtre, setFiltre] = useState('tout')
  const [ajustLoading, setAjustLoading] = useState(null)

  // ── Mode admin (verrouillage réappro) ─────────────────────────────────
  const [adminMode, setAdminMode] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState(['', '', '', ''])
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const pinRefs = useRef([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    setUserId(user.id)
    const { data: profile } = await supabase.from('profiles').select('restaurant_id').eq('id', user.id).single()
    if (!profile) { router.push('/auth/login'); return }
    setRestaurantId(profile.restaurant_id)
    await loadBoissons(profile.restaurant_id)
    setLoading(false)
  }

  async function loadBoissons(rid) {
    const { data } = await supabase.from('plats')
      .select('*')
      .eq('restaurant_id', rid)
      .eq('est_boisson', true)
      .order('nom')
    setBoissons(data || [])
  }

  async function ajusterStock(plat, delta) {
    setAjustLoading(plat.id + '_' + delta)
    const nouveau = Math.max(0, (plat.stock_actuel || 0) + delta)
    await supabase.from('plats').update({ stock_actuel: nouveau }).eq('id', plat.id)
    setBoissons(prev => prev.map(p => p.id === plat.id ? { ...p, stock_actuel: nouveau } : p))
    setAjustLoading(null)
  }

  async function reapprovisionner(plat) {
    if (!adminMode) {
      alert('Veuillez activer le mode admin pour réapprovisionner.')
      return
    }
    const val = prompt(`Réapprovisionner "${plat.nom}"\nNouveau stock :`, plat.stock_actuel || 0)
    if (val === null) return
    const n = parseInt(val)
    if (isNaN(n) || n < 0) { alert('Valeur invalide'); return }
    await supabase.from('plats').update({ stock_actuel: n }).eq('id', plat.id)
    setBoissons(prev => prev.map(p => p.id === plat.id ? { ...p, stock_actuel: n } : p))
  }

  async function toggleStockActif(plat) {
    const nv = !plat.stock_actif
    await supabase.from('plats').update({ stock_actif: nv }).eq('id', plat.id)
    setBoissons(prev => prev.map(p => p.id === plat.id ? { ...p, stock_actif: nv } : p))
  }

  // ── PIN admin ─────────────────────────────────────────────────────────
  function openPinModal() {
    setPinInput(['', '', '', ''])
    setPinError('')
    setShowPinModal(true)
    setTimeout(() => pinRefs.current[0]?.focus(), 100)
  }

  function closePinModal() {
    setShowPinModal(false)
    setPinInput(['', '', '', ''])
    setPinError('')
  }

  function handlePinChange(index, value) {
    if (!/^[0-9]?$/.test(value)) return
    const newPin = [...pinInput]
    newPin[index] = value
    setPinInput(newPin)
    setPinError('')

    if (value && index < 3) {
      pinRefs.current[index + 1]?.focus()
    }

    // Auto-submit quand 4 chiffres saisis
    if (index === 3 && value && newPin.every(c => c !== '')) {
      verifyAdminPin(newPin.join(''))
    }
  }

  function handlePinKeyDown(index, e) {
    if (e.key === 'Backspace' && !pinInput[index] && index > 0) {
      pinRefs.current[index - 1]?.focus()
    }
  }

  async function verifyAdminPin(pinStr) {
    if (!userId) return
    setPinLoading(true)
    setPinError('')

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-admin-pin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, pin: pinStr }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setAdminMode(true)
        closePinModal()
      } else {
        setPinError(data.error || 'Code incorrect')
        setPinInput(['', '', '', ''])
        setTimeout(() => pinRefs.current[0]?.focus(), 100)
      }
    } catch (err) {
      setPinError('Erreur réseau, réessayez')
      setPinInput(['', '', '', ''])
    } finally {
      setPinLoading(false)
    }
  }

  function verrouillerMode() {
    setAdminMode(false)
  }

  const boissonsFiltrees = boissons.filter(b => {
    if (recherche && !b.nom.toLowerCase().includes(recherche.toLowerCase())) return false
    if (filtre === 'rupture') return b.stock_actif && (b.stock_actuel || 0) <= 0
    if (filtre === 'alerte') return b.stock_actif && (b.stock_actuel || 0) > 0 && (b.stock_actuel || 0) <= (b.stock_alerte || 10)
    return true
  })

  const stats = {
    total: boissons.length,
    actif: boissons.filter(b => b.stock_actif).length,
    alerte: boissons.filter(b => b.stock_actif && (b.stock_actuel || 0) > 0 && (b.stock_actuel || 0) <= (b.stock_alerte || 10)).length,
    rupture: boissons.filter(b => b.stock_actif && (b.stock_actuel || 0) <= 0).length,
  }

  function getBadge(b) {
    if (!b.stock_actif) return { label: 'Non suivi', bg: C.grayLight, color: C.gray }
    if ((b.stock_actuel || 0) <= 0) return { label: 'Rupture', bg: 'rgba(255,59,48,.12)', color: C.red }
    if ((b.stock_actuel || 0) <= (b.stock_alerte || 10)) return { label: 'Stock faible', bg: 'rgba(255,184,0,.15)', color: '#7A5C00' }
    return { label: 'En stock', bg: 'rgba(0,200,81,.12)', color: C.green }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: "'DM Sans', system-ui" }}>
      <div style={{ fontSize: 44, animation: 'pulse 1s infinite' }}>🥤</div>
      <p style={{ color: C.primary, fontWeight: 600, fontSize: 14 }}>Chargement...</p>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.1)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.08)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        .btn:active { transform: scale(0.96); }
      `}</style>

      {/* HEADER */}
      <div style={{ background: C.dark, padding: '48px 16px 14px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: '#fff', flexShrink: 0 }}>←</button>
          <div>
            <div style={{ color: C.white, fontWeight: 700, fontSize: 15 }}>Stock boissons</div>
            <div style={{ color: '#aaa', fontSize: 11 }}>{stats.actif} boisson{stats.actif !== 1 ? 's' : ''} suivies</div>
          </div>
        </div>
      </div>

      {/* BOUTON MODE ADMIN */}
      <div style={{ margin: '14px 16px 0' }}>
        {!adminMode ? (
          <button onClick={openPinModal}
            style={{ width: '100%', background: 'linear-gradient(135deg, #FFF8E1, #FFE0B2)', border: '1.5px solid #FFB800', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🔒</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#7A5C00' }}>Mode admin verrouillé</div>
                <div style={{ fontSize: 11, color: '#A07700', marginTop: 1 }}>Saisir PIN pour réapprovisionner</div>
              </div>
            </div>
            <span style={{ fontSize: 18, color: '#7A5C00' }}>›</span>
          </button>
        ) : (
          <button onClick={verrouillerMode}
            style={{ width: '100%', background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)', border: `1.5px solid ${C.green}`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🔓</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1B5E20' }}>Mode admin actif</div>
                <div style={{ fontSize: 11, color: '#2E7D32', marginTop: 1 }}>Vous pouvez réapprovisionner — Touchez pour verrouiller</div>
              </div>
            </div>
            <span style={{ fontSize: 14, color: '#1B5E20', fontWeight: 700 }}>🔒</span>
          </button>
        )}
      </div>

      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '14px 16px 0' }}>
        {[
          { val: stats.total, label: 'Total', bg: C.white, color: C.dark },
          { val: stats.actif, label: 'Suivies', bg: C.white, color: '#5B8DEF' },
          { val: stats.alerte, label: 'Alerte', bg: stats.alerte > 0 ? 'rgba(255,184,0,.15)' : C.white, color: stats.alerte > 0 ? '#7A5C00' : C.gray },
          { val: stats.rupture, label: 'Rupture', bg: stats.rupture > 0 ? 'rgba(255,59,48,.1)' : C.white, color: stats.rupture > 0 ? C.red : C.gray },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 14, padding: '12px 10px', boxShadow: `0 2px 8px ${C.shadow}`, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 10, color: C.gray, marginTop: 2, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* SEARCH + FILTRE */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14 }}>🔍</span>
          <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher une boisson..."
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.white, fontSize: 13, outline: 'none', color: C.dark, fontFamily: 'inherit' }} />
          {recherche && <button onClick={() => setRecherche('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.gray }}>✕</button>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'tout', label: 'Tout' },
            { key: 'alerte', label: '⚠️ Alerte' },
            { key: 'rupture', label: '⛔ Rupture' },
          ].map(f => (
            <button key={f.key} onClick={() => setFiltre(f.key)}
              style={{ padding: '6px 14px', borderRadius: 50, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: filtre === f.key ? 'none' : `1.5px solid ${C.border}`, background: filtre === f.key ? C.primary : C.white, color: filtre === f.key ? '#fff' : C.dark }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTE */}
      <div style={{ padding: '12px 16px 0' }}>
        {boissons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.gray }}>
            <div style={{ fontSize: 40 }}>🥤</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10, color: C.dark }}>Aucune boisson</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Marquez vos boissons dans le menu pour les suivre ici</div>
            <button onClick={() => router.push('/dashboard/menu')} style={{ marginTop: 16, background: C.primary, border: 'none', borderRadius: 12, padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Gérer le menu</button>
          </div>
        ) : boissonsFiltrees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.gray }}>
            <div style={{ fontSize: 32 }}>✅</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>Aucune boisson dans ce filtre</div>
          </div>
        ) : boissonsFiltrees.map(b => {
          const badge = getBadge(b)
          return (
            <div key={b.id} style={{ background: C.white, borderRadius: 16, padding: '14px', boxShadow: `0 2px 10px ${C.shadow}`, marginBottom: 10, borderLeft: `4px solid ${(b.stock_actuel || 0) <= 0 && b.stock_actif ? C.red : (b.stock_actuel || 0) <= (b.stock_alerte || 10) && b.stock_actif ? C.yellow : C.green}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{b.nom}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.color }}>{badge.label}</div>
                    {b.stock_actif && <span style={{ fontSize: 11, color: C.gray }}>Seuil : {b.stock_alerte || 10}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.gray }}>Suivi</span>
                  <button onClick={() => toggleStockActif(b)}
                    style={{ width: 40, height: 22, borderRadius: 11, background: b.stock_actif ? C.green : C.border, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: b.stock_actif ? 21 : 3, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }}></div>
                  </button>
                </div>
              </div>

              {b.stock_actif && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className="btn" onClick={() => ajusterStock(b, -1)} disabled={ajustLoading !== null || (b.stock_actuel || 0) <= 0}
                      style={{ width: 34, height: 34, borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.white, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dark, opacity: (b.stock_actuel || 0) <= 0 ? .4 : 1 }}>−</button>
                    <div style={{ textAlign: 'center', minWidth: 52 }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: (b.stock_actuel || 0) <= 0 ? C.red : (b.stock_actuel || 0) <= (b.stock_alerte || 10) ? C.yellow : C.dark, lineHeight: 1 }}>{b.stock_actuel || 0}</div>
                      <div style={{ fontSize: 10, color: C.gray, marginTop: 2 }}>unités</div>
                    </div>
                    <button className="btn" onClick={() => ajusterStock(b, 1)} disabled={ajustLoading !== null}
                      style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: C.primary, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>+</button>
                  </div>
                  <button className="btn" onClick={() => reapprovisionner(b)} disabled={!adminMode}
                    style={{ background: adminMode ? C.primaryLight : C.grayLight, border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: adminMode ? C.primary : C.gray, cursor: adminMode ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: adminMode ? 1 : 0.6 }}>
                    {adminMode ? '📦 Réappro.' : '🔒 Réappro.'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: C.white, borderTop: `1px solid ${C.border}`, display: 'flex', zIndex: 100 }}>
        {[
          { icon: '🏠', label: 'Accueil', path: '/dashboard' },
          { icon: '📋', label: 'Commandes', path: '/dashboard/commandes' },
          { icon: '🍛', label: 'Menu', path: '/dashboard/menu' },
          { icon: '🥤', label: 'Stock', path: '/dashboard/stock', active: true },
          { icon: '⚙️', label: 'Réglages', path: '/dashboard/parametres' },
        ].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 0 6px', background: 'none', border: 'none', cursor: 'pointer', color: item.active ? C.primary : C.gray, fontSize: 9, fontWeight: item.active ? 700 : 400, fontFamily: 'inherit', position: 'relative' }}>
            {item.active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 3, background: C.primary, borderRadius: '0 0 3px 3px' }}></div>}
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* MODAL PIN ADMIN */}
      {showPinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px', animation: 'fadeIn .2s' }} onClick={closePinModal}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', maxWidth: 360, width: '100%', animation: 'slideUp .3s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: C.dark, marginBottom: 6 }}>Mode admin</h3>
              <p style={{ fontSize: 13, color: C.gray }}>Saisissez votre code à 4 chiffres pour déverrouiller la réapprovisionnement</p>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 14, animation: pinError ? 'shake .3s' : 'none' }}>
              {pinInput.map((digit, i) => (
                <input
                  key={i}
                  ref={el => pinRefs.current[i] = el}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handlePinChange(i, e.target.value)}
                  onKeyDown={e => handlePinKeyDown(i, e)}
                  disabled={pinLoading}
                  style={{
                    width: 54, height: 64, textAlign: 'center', fontSize: 26, fontWeight: 800,
                    border: `2px solid ${pinError ? C.red : digit ? C.primary : C.border}`,
                    borderRadius: 12, outline: 'none', background: C.white, color: C.dark,
                    fontFamily: 'inherit'
                  }}
                />
              ))}
            </div>

            {pinError && (
              <div style={{ textAlign: 'center', color: C.red, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
                ⚠️ {pinError}
              </div>
            )}

            {pinLoading && (
              <div style={{ textAlign: 'center', color: C.primary, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
                Vérification...
              </div>
            )}

            <button onClick={closePinModal} disabled={pinLoading}
              style={{ width: '100%', background: C.grayLight, color: C.dark, border: 'none', borderRadius: 12, padding: '12px', fontSize: 13, fontWeight: 700, cursor: pinLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: pinLoading ? 0.6 : 1 }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}