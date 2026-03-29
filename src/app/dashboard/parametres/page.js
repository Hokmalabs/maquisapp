'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#F5F5F5', white: '#FFFFFF', primary: '#FF6B35', primaryLight: '#FFF0EB',
  dark: '#1A1A2E', gray: '#8A8A9A', grayLight: '#F0F0F5', border: '#E8E8F0',
  green: '#00C851', red: '#FF3B30', shadow: 'rgba(0,0,0,0.07)',
}

export default function ParametresPage() {
  const router = useRouter()
  const [restaurant, setRestaurant] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ nom: '', email: '', telephone: '', ville: '', slug: '' })
  const [profileForm, setProfileForm] = useState({ nom: '', prenom: '' })
  const [activeSection, setActiveSection] = useState('restaurant')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: prof } = await supabase.from('profiles').select('*, restaurants(*)').eq('id', user.id).single()
    if (!prof) { router.push('/auth/login'); return }
    setProfile(prof)
    setRestaurant(prof.restaurants)
    setForm({
      nom: prof.restaurants?.nom || '',
      email: prof.restaurants?.email || '',
      telephone: prof.restaurants?.telephone || '',
      ville: prof.restaurants?.ville || '',
      slug: prof.restaurants?.slug || '',
    })
    setProfileForm({ nom: prof.nom || '', prenom: prof.prenom || '' })
    setLoading(false)
  }

  async function saveRestaurant() {
    if (!restaurant) return
    setSaving(true)
    await supabase.from('restaurants').update({
      nom: form.nom,
      email: form.email,
      telephone: form.telephone,
      ville: form.ville,
    }).eq('id', restaurant.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update({
      nom: profileForm.nom,
      prenom: profileForm.prenom,
    }).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: "'DM Sans', system-ui" }}>
      <div style={{ fontSize: 44, animation: 'pulse 1s infinite' }}>⚙️</div>
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
        @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .btn:active { transform: scale(0.97); }
        input, textarea { transition: border-color .2s; }
        input:focus, textarea:focus { border-color: #FF6B35 !important; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: C.dark, padding: '48px 16px 14px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>←</button>
            <div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 15 }}>Paramètres</div>
              <div style={{ color: '#aaa', fontSize: 11 }}>{restaurant?.nom}</div>
            </div>
          </div>
          {saved && (
            <div style={{ background: '#E8F5E9', color: C.green, borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 700, animation: 'fadeIn .3s' }}>
              ✓ Sauvegardé
            </div>
          )}
        </div>
      </div>

      {/* SECTION TABS */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', padding: '0 16px' }}>
        {[
          { id: 'restaurant', label: '🍽️ Restaurant' },
          { id: 'profil', label: '👤 Profil' },
          { id: 'compte', label: '🔐 Compte' },
        ].map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            style={{ padding: '12px 14px', background: 'none', border: 'none', fontSize: 12, fontWeight: activeSection === s.id ? 700 : 500, color: activeSection === s.id ? C.primary : C.gray, cursor: 'pointer', fontFamily: 'inherit', borderBottom: activeSection === s.id ? `2px solid ${C.primary}` : '2px solid transparent', whiteSpace: 'nowrap' }}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>

        {/* ── SECTION RESTAURANT ─────────────────────────────────────── */}
        {activeSection === 'restaurant' && (
          <div>
            {/* Infos resto */}
            <div style={{ background: C.white, borderRadius: 18, padding: '18px', boxShadow: `0 2px 10px ${C.shadow}`, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Informations du restaurant</div>
              {[
                { key: 'nom', label: 'Nom du restaurant', placeholder: 'Ex: Le Maquis d\'Abidjan', type: 'text' },
                { key: 'email', label: 'Email de contact', placeholder: 'contact@restaurant.ci', type: 'email' },
                { key: 'telephone', label: 'Téléphone', placeholder: '+225 07 00 00 00 00', type: 'tel' },
                { key: 'ville', label: 'Ville', placeholder: 'Abidjan', type: 'text' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: C.gray, fontWeight: 600, marginBottom: 5 }}>{f.label}</div>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: C.dark }}
                  />
                </div>
              ))}
              {/* Slug (lecture seule) */}
              <div style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 11, color: C.gray, fontWeight: 600, marginBottom: 5 }}>Identifiant unique (slug)</div>
                <div style={{ padding: '11px 13px', borderRadius: 12, background: C.grayLight, fontSize: 13, color: C.gray, fontFamily: 'monospace' }}>{form.slug}</div>
                <div style={{ fontSize: 10, color: C.gray, marginTop: 4 }}>Non modifiable — utilisé dans vos QR codes</div>
              </div>
            </div>

            {/* URL Menu public */}
            <div style={{ background: C.white, borderRadius: 18, padding: '16px 18px', boxShadow: `0 2px 10px ${C.shadow}`, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 8 }}>URL de votre menu</div>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: C.primaryLight, fontSize: 11, color: C.primary, fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.5 }}>
                {`${process.env.NEXT_PUBLIC_APP_URL || 'https://maquisapp-xi.vercel.app'}/menu/${form.slug}/[table-id]`}
              </div>
            </div>

            <button className="btn" onClick={saveRestaurant} disabled={saving}
              style={{ width: '100%', background: C.primary, border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? .7 : 1 }}>
              {saving ? 'Enregistrement...' : '💾 Sauvegarder les modifications'}
            </button>
          </div>
        )}

        {/* ── SECTION PROFIL ─────────────────────────────────────────── */}
        {activeSection === 'profil' && (
          <div>
            {/* Avatar */}
            <div style={{ background: C.white, borderRadius: 18, padding: '20px 18px', boxShadow: `0 2px 10px ${C.shadow}`, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: `linear-gradient(135deg, ${C.primary}, #FF8C42)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                {(profileForm.prenom?.[0] || '👤').toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.dark }}>{profileForm.prenom} {profileForm.nom}</div>
                <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>Gérant • {restaurant?.nom}</div>
              </div>
            </div>

            <div style={{ background: C.white, borderRadius: 18, padding: '18px', boxShadow: `0 2px 10px ${C.shadow}`, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Vos informations</div>
              {[
                { key: 'prenom', label: 'Prénom', placeholder: 'Kouassi' },
                { key: 'nom', label: 'Nom', placeholder: 'Konan' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: C.gray, fontWeight: 600, marginBottom: 5 }}>{f.label}</div>
                  <input
                    value={profileForm[f.key]}
                    onChange={e => setProfileForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: C.dark }}
                  />
                </div>
              ))}
            </div>

            <button className="btn" onClick={saveProfile} disabled={saving}
              style={{ width: '100%', background: C.primary, border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? .7 : 1 }}>
              {saving ? 'Enregistrement...' : '💾 Sauvegarder'}
            </button>
          </div>
        )}

        {/* ── SECTION COMPTE ─────────────────────────────────────────── */}
        {activeSection === 'compte' && (
          <div>
            {/* Infos compte */}
            <div style={{ background: C.white, borderRadius: 18, padding: '18px', boxShadow: `0 2px 10px ${C.shadow}`, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Informations du compte</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, color: C.gray }}>Rôle</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.dark, background: C.primaryLight, padding: '3px 10px', borderRadius: 20, color: C.primary }}>Gérant</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                <span style={{ fontSize: 13, color: C.gray }}>Plan</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.green }}>✓ Actif</span>
              </div>
            </div>

            {/* Actions compte */}
            <div style={{ background: C.white, borderRadius: 18, padding: '8px 18px', boxShadow: `0 2px 10px ${C.shadow}`, marginBottom: 14 }}>
              {[
                { label: 'Changer le mot de passe', icon: '🔑', color: C.dark, action: () => {} },
                { label: 'Exporter mes données', icon: '📥', color: C.dark, action: () => {} },
              ].map((item, i) => (
                <button key={i} onClick={item.action}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer', borderBottom: i === 0 ? `1px solid ${C.border}` : 'none', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: item.color, flex: 1, textAlign: 'left' }}>{item.label}</span>
                  <span style={{ color: C.gray, fontSize: 16 }}>›</span>
                </button>
              ))}
            </div>

            {/* Déconnexion */}
            <button className="btn" onClick={() => setShowLogoutConfirm(true)}
              style={{ width: '100%', background: '#FFEBEE', border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, color: C.red, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12 }}>
              🚪 Se déconnecter
            </button>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: C.white, borderTop: `1px solid ${C.border}`, display: 'flex', zIndex: 100 }}>
        {[
          { icon: '🏠', label: 'Accueil', path: '/dashboard' },
          { icon: '📋', label: 'Commandes', path: '/dashboard/commandes' },
          { icon: '🍛', label: 'Menu', path: '/dashboard/menu' },
          { icon: '🪑', label: 'Tables', path: '/dashboard/tables' },
          { icon: '⚙️', label: 'Réglages', path: '/dashboard/parametres', active: true },
        ].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 0 6px', background: 'none', border: 'none', cursor: 'pointer', color: item.active ? C.primary : C.gray, fontSize: 9, fontWeight: item.active ? 700 : 400, fontFamily: 'inherit', position: 'relative' }}>
            {item.active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 3, background: C.primary, borderRadius: '0 0 3px 3px' }}></div>}
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* CONFIRM LOGOUT */}
      {showLogoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn .2s' }}>
          <div onClick={() => setShowLogoutConfirm(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }}></div>
          <div style={{ position: 'relative', width: '100%', background: C.white, borderRadius: '22px 22px 0 0', padding: '24px 20px 40px', animation: 'slideUp .3s ease', textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🚪</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.dark, marginBottom: 6 }}>Se déconnecter ?</div>
            <div style={{ fontSize: 13, color: C.gray, marginBottom: 24 }}>Vous devrez vous reconnecter pour accéder au dashboard.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1, background: C.grayLight, border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, color: C.dark, cursor: 'pointer', fontFamily: 'inherit' }}>
                Annuler
              </button>
              <button onClick={handleLogout}
                style={{ flex: 1, background: C.red, border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                Déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}