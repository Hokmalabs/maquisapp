'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const ADMIN_EMAIL = 'joelyemian5@gmail.com'

const C = {
  bg: '#F5F5F5', white: '#FFFFFF', primary: '#FF6B35', primaryLight: '#FFF0EB',
  dark: '#1A1A2E', gray: '#8A8A9A', grayLight: '#F0F0F5', border: '#E8E8F0',
  green: '#00C851', yellow: '#FFB800', red: '#FF3B30', shadow: 'rgba(0,0,0,0.07)',
}

const STATUT_COLORS = {
  essai:    { color: '#FFB800', bg: '#FFF8E1', label: 'Essai' },
  actif:    { color: '#00C851', bg: '#E8F5E9', label: 'Actif' },
  expire:   { color: '#FF3B30', bg: '#FFEBEE', label: 'Expiré' },
  suspendu: { color: '#8A8A9A', bg: '#F5F5F5', label: 'Suspendu' },
}

export default function AdminPage() {
  const router = useRouter()
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) {
      router.push('/dashboard')
      return
    }

    const { data: restos } = await supabase
      .from('restaurants')
      .select('*, commandes(id)')
      .order('created_at', { ascending: false })

    // Compter les commandes par resto
    const { data: cmdCounts } = await supabase
      .from('commandes')
      .select('restaurant_id')

    const countMap = {}
    for (const c of (cmdCounts || [])) {
      countMap[c.restaurant_id] = (countMap[c.restaurant_id] || 0) + 1
    }

    setRestaurants((restos || []).map(r => ({ ...r, nb_commandes: countMap[r.id] || 0 })))
    setLoading(false)
  }

  async function activer(restoId, plan) {
    setUpdating(restoId + plan)
    const jours = plan === 'mensuel' ? 30 : 365
    await supabase.from('restaurants').update({
      abonnement_statut: 'actif',
      abonnement_fin: new Date(Date.now() + jours * 24 * 60 * 60 * 1000).toISOString(),
      abonnement_plan: plan,
    }).eq('id', restoId)
    await loadData()
    setUpdating(null)
  }

  async function suspendre(restoId) {
    setUpdating(restoId + 'suspendre')
    await supabase.from('restaurants').update({ abonnement_statut: 'suspendu' }).eq('id', restoId)
    await loadData()
    setUpdating(null)
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: "'DM Sans', system-ui" }}>
      <div style={{ fontSize: 40 }}>⚙️</div>
      <p style={{ color: C.primary, fontWeight: 600, fontSize: 14 }}>Chargement panel admin...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .btn:active { transform: scale(0.97); }
      `}</style>

      {/* HEADER */}
      <div style={{ background: C.dark, padding: '48px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.push('/dashboard')}
              style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: '#fff' }}>←</button>
            <div>
              <div style={{ color: C.white, fontWeight: 800, fontSize: 16 }}>Panel Admin</div>
              <div style={{ color: '#aaa', fontSize: 11 }}>Hokma Labs</div>
            </div>
          </div>
          <div style={{ background: '#FF6B35', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#fff' }}>
            {restaurants.length} restaurants
          </div>
        </div>
      </div>

      {/* LISTE */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px' }}>
        {restaurants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.gray }}>
            <div style={{ fontSize: 40 }}>🏪</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>Aucun restaurant</div>
          </div>
        ) : restaurants.map((resto) => {
          const st = STATUT_COLORS[resto.abonnement_statut] || STATUT_COLORS.expire
          return (
            <div key={resto.id} style={{ background: C.white, borderRadius: 16, boxShadow: `0 2px 10px ${C.shadow}`, marginBottom: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.dark }}>{resto.nom}</div>
                  <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>{resto.email}</div>
                  <div style={{ fontSize: 11, color: C.gray, marginTop: 1 }}>{resto.ville} • {resto.nb_commandes} commandes</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ background: st.bg, color: st.color, borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 700, display: 'inline-block', marginBottom: 4 }}>
                    {st.label}
                  </div>
                  <div style={{ fontSize: 11, color: C.gray }}>
                    {resto.abonnement_plan && <span style={{ marginRight: 6 }}>{resto.abonnement_plan}</span>}
                    fin : {formatDate(resto.abonnement_fin)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn" onClick={() => activer(resto.id, 'mensuel')}
                  disabled={updating === resto.id + 'mensuel'}
                  style={{ background: C.green, border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: updating === resto.id + 'mensuel' ? .6 : 1 }}>
                  ✅ Activer mensuel
                </button>
                <button className="btn" onClick={() => activer(resto.id, 'annuel')}
                  disabled={updating === resto.id + 'annuel'}
                  style={{ background: '#2196F3', border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: updating === resto.id + 'annuel' ? .6 : 1 }}>
                  ✅ Activer annuel
                </button>
                <button className="btn" onClick={() => suspendre(resto.id)}
                  disabled={updating === resto.id + 'suspendre'}
                  style={{ background: '#FFEBEE', border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 11, fontWeight: 700, color: C.red, cursor: 'pointer', fontFamily: 'inherit', opacity: updating === resto.id + 'suspendre' ? .6 : 1 }}>
                  🚫 Suspendre
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
