'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function jouerSonCuisine() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.frequency.value = 660
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch (e) {
    console.log('Audio non supporté')
  }
}

export default function CuisinePage({ params }) {
  const { restaurantId } = params
  const [restaurant, setRestaurant] = useState(null)
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    if (!restaurantId) return
    loadRestaurant()
    loadCommandes()
    const tick = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(tick)
  }, [restaurantId])

  // Realtime
  useEffect(() => {
    if (!restaurantId) return
    const ch = supabase.channel(`cuisine-${restaurantId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'commandes',
        filter: `restaurant_id=eq.${restaurantId}`
      }, async (payload) => {
        if (payload.new?.statut === 'en_preparation') {
          jouerSonCuisine()
        }
        await loadCommandes()
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [restaurantId])

  async function loadRestaurant() {
    const { data } = await supabase
      .from('restaurants').select('*').eq('id', restaurantId).single()
    if (data) setRestaurant(data)
  }

  async function loadCommandes() {
    const { data, error } = await supabase
      .from('commandes')
      .select('*, tables(numero, zone), commande_items(*)')
      .eq('restaurant_id', restaurantId)
      .in('statut', ['en_preparation', 'presque_pret'])
      .order('created_at', { ascending: true })
    if (!error) setCommandes(data || [])
    setLoading(false)
  }

  const getTemps = (created_at) => {
    const diff = Math.floor((now - new Date(created_at)) / 60000)
    if (diff < 1) return '< 1 min'
    if (diff < 60) return `${diff} min`
    return `${Math.floor(diff / 60)}h${diff % 60 > 0 ? diff % 60 + 'm' : ''}`
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: "'DM Sans', system-ui" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');`}</style>
      <div style={{ fontSize: 56 }}>👨‍🍳</div>
      <div style={{ color: '#FF6B35', fontSize: 16, fontWeight: 600 }}>Chargement cuisine...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#1A1A2E', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '16px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '8px 0' }}>
        <div>
          <div style={{ color: '#FF6B35', fontSize: 14, fontWeight: 700, marginBottom: 2 }}>ÉCRAN CUISINE</div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>{restaurant?.nom || '...'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.08)', borderRadius: 12, padding: '8px 14px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C851', animation: 'pulse 1.5s infinite' }}></div>
          <span style={{ color: '#00C851', fontSize: 13, fontWeight: 700 }}>Live • {commandes.length} cmd{commandes.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* GRILLE */}
      {commandes.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
          <div style={{ fontSize: 72 }}>✅</div>
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 22, fontWeight: 700 }}>Aucune commande en cours</div>
          <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 14 }}>La cuisine est à jour !</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {commandes.map((cmd) => {
            const items = cmd.commande_items || []
            const estPresquePret = cmd.statut === 'presque_pret'
            return (
              <div key={cmd.id} style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,.3)', animation: 'fadeIn .3s ease', borderTop: `5px solid ${estPresquePret ? '#FF6B35' : '#FFB800'}` }}>
                <div style={{ padding: '14px 18px 10px', background: estPresquePret ? '#FFF0EB' : '#FFF8E1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#1A1A2E' }}>Table {cmd.tables?.numero}</div>
                    <div style={{ fontSize: 13, color: '#8A8A9A', marginTop: 2 }}>{cmd.tables?.zone || 'Salle'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: estPresquePret ? '#FF6B35' : '#FFB800', background: estPresquePret ? '#FFF0EB' : '#FFF8E1', border: `1.5px solid ${estPresquePret ? '#FF6B35' : '#FFB800'}`, borderRadius: 8, padding: '3px 8px', marginBottom: 4 }}>
                      {estPresquePret ? '🔔 Presque prêt' : '👨‍🍳 En préparation'}
                    </div>
                    <div style={{ fontSize: 12, color: '#8A8A9A', fontWeight: 600 }}>⏱ {getTemps(cmd.created_at)}</div>
                  </div>
                </div>
                <div style={{ padding: '10px 18px 16px' }}>
                  {items.length === 0 ? (
                    <div style={{ color: '#8A8A9A', fontSize: 14 }}>Aucun article</div>
                  ) : items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '6px 0', borderBottom: i < items.length - 1 ? '1px solid #F0F0F5' : 'none' }}>
                      <span style={{ fontSize: 26, fontWeight: 800, color: '#FF6B35', minWidth: 32 }}>{item.quantite}x</span>
                      <span style={{ fontSize: 22, fontWeight: 600, color: '#1A1A2E' }}>{item.nom_plat}</span>
                    </div>
                  ))}
                  {items.some(i => i.note) && (
                    <div style={{ marginTop: 10, background: '#FFF8E1', borderRadius: 8, padding: '6px 10px' }}>
                      {items.filter(i => i.note).map((item, i) => (
                        <div key={i} style={{ fontSize: 13, color: '#8A8A9A' }}>💬 {item.nom_plat} : {item.note}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
