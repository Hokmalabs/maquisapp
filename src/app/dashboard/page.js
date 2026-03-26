'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [restaurant, setRestaurant] = useState(null)
  const [stats, setStats] = useState({ commandes: 0, tables: 0, plats: 0, ca_jour: 0 })
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, restaurants(*)')
      .eq('id', user.id)
      .single()

    if (!profile) { router.push('/auth/login'); return }
    setRestaurant(profile.restaurants)

    const rid = profile.restaurant_id
    const today = new Date().toISOString().split('T')[0]

    const [
      { count: cmdCount },
      { count: tableCount },
      { count: platCount },
      { data: cmdActives },
      { data: cmdJour }
    ] = await Promise.all([
      supabase.from('commandes').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid).not('statut', 'in', '("cloture","annule")'),
      supabase.from('tables').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid),
      supabase.from('plats').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid).eq('disponible', true),
      supabase.from('commandes').select('*, tables(numero)').eq('restaurant_id', rid).not('statut', 'in', '("cloture","annule")').order('created_at', { ascending: false }).limit(5),
      supabase.from('commandes').select('total').eq('restaurant_id', rid).eq('statut', 'cloture').gte('created_at', today),
    ])

    const caJour = cmdJour?.reduce((sum, c) => sum + (c.total || 0), 0) || 0
    setStats({ commandes: cmdCount || 0, tables: tableCount || 0, plats: platCount || 0, ca_jour: caJour })
    setCommandes(cmdActives || [])
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const getStatutStyle = (statut) => {
    const styles = {
      en_attente: { bg: '#FFF9E6', color: '#F39C12', label: '⏳ En attente' },
      valide: { bg: '#EBF5FB', color: '#2980B9', label: '✅ Validé' },
      en_preparation: { bg: '#F0E6FF', color: '#8E44AD', label: '👨‍🍳 En préparation' },
      presque_pret: { bg: '#E8F8F5', color: '#1ABC9C', label: '🔔 Presque prêt' },
      servi: { bg: '#EAFAF1', color: '#27AE60', label: '🍽️ Servi' },
    }
    return styles[statut] || { bg: '#F5F5F5', color: '#888', label: statut }
  }

  const getTemps = (created_at) => {
    const diff = Math.floor((new Date() - new Date(created_at)) / 60000)
    if (diff < 1) return '< 1 min'
    if (diff < 60) return `${diff} min`
    return `${Math.floor(diff / 60)}h${diff % 60 > 0 ? diff % 60 + 'm' : ''}`
  }

  const formatCFA = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' F'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FFF8F3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 48 }}>🍽️</div>
      <p style={{ color: '#FF6B35', fontWeight: 500 }}>Chargement...</p>
    </div>
  )

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8F3', fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 80 }}>

      {/* TOPBAR */}
      <div style={{ background: '#1A1A2E', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#FF6B35,#FF4500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🍽️</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{restaurant?.nom}</div>
            <div style={{ color: '#aaa', fontSize: 11 }}>{restaurant?.ville}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{ background: 'rgba(255,107,53,0.15)', border: 'none', color: '#FF6B35', borderRadius: 20, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
          Déconnexion
        </button>
      </div>

      {/* HERO */}
      <div style={{ margin: '16px 16px 0', background: 'linear-gradient(135deg,#FF6B35,#FF4500)', borderRadius: 20, padding: '20px 20px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 60, opacity: 0.15 }}>🍽️</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Bonjour 👋</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 10 }}>Gérez votre restaurant en temps réel</div>
        <div style={{ background: 'rgba(255,255,255,0.2)', display: 'inline-block', borderRadius: 20, padding: '4px 12px', fontSize: 11 }}>
          {today.charAt(0).toUpperCase() + today.slice(1)}
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '14px 16px 0' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px', border: '0.5px solid #F0E8E0', gridColumn: 'span 2' }}>
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>CA du jour</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#FF6B35' }}>{formatCFA(stats.ca_jour)}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px', border: '0.5px solid #F0E8E0', textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#FF6B35' }}>{stats.commandes}</div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Commandes actives</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px', border: '0.5px solid #F0E8E0', textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#27AE60' }}>{stats.plats}</div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Plats disponibles</div>
        </div>
      </div>

      {/* COMMANDES ACTIVES */}
      {commandes.length > 0 && (
        <div style={{ margin: '20px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', textTransform: 'uppercase', letterSpacing: 0.5 }}>Commandes en cours</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#EAFAF1', borderRadius: 20, padding: '3px 10px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#27AE60', animation: 'pulse 1.5s infinite' }}></div>
              <span style={{ fontSize: 10, color: '#27AE60', fontWeight: 500 }}>Live</span>
            </div>
          </div>

          {commandes.map(cmd => {
            const s = getStatutStyle(cmd.statut)
            return (
              <div key={cmd.id} onClick={() => router.push('/dashboard/commandes')}
                style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', border: '0.5px solid #F0E8E0', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <div style={{ background: '#FFF0EB', color: '#FF6B35', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, display: 'inline-block', marginBottom: 4 }}>
                    Table {cmd.tables?.numero}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>⏱️ {getTemps(cmd.created_at)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>{formatCFA(cmd.total)}</div>
                  <div style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 500 }}>{s.label}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* NAV GRID */}
      <div style={{ margin: '20px 16px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Navigation</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: '📋', label: 'Commandes', desc: 'Suivi temps réel', path: '/dashboard/commandes', bg: '#FFF0EB' },
            { icon: '🍛', label: 'Menu', desc: 'Plats & catégories', path: '/dashboard/menu', bg: '#EAFAF1' },
            { icon: '🪑', label: 'Tables & QR', desc: 'Générer les QR codes', path: '/dashboard/tables', bg: '#EBF5FB' },
            { icon: '📊', label: 'Historique', desc: 'Rapports & recettes', path: '/dashboard/historique', bg: '#F4ECFF' },
          ].map(item => (
            <button key={item.path} onClick={() => router.push(item.path)}
              style={{ background: '#fff', borderRadius: 16, padding: '16px', border: '0.5px solid #F0E8E0', textAlign: 'left', cursor: 'pointer', transition: 'transform 0.1s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 10 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>{item.label}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{item.desc}</div>
            </button>
          ))}

          <button onClick={() => router.push('/dashboard/parametres')}
            style={{ gridColumn: 'span 2', background: '#fff', borderRadius: 16, padding: '16px', border: '0.5px solid #F0E8E0', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⚙️</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>Paramètres restaurant</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Configuration & profil</div>
            </div>
          </button>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#fff', borderTop: '0.5px solid #F0E8E0', display: 'flex', zIndex: 50 }}>
        {[
          { icon: '🏠', label: 'Accueil', path: '/dashboard', active: true },
          { icon: '📋', label: 'Commandes', path: '/dashboard/commandes' },
          { icon: '🍛', label: 'Menu', path: '/dashboard/menu' },
          { icon: '🪑', label: 'Tables', path: '/dashboard/tables' },
          { icon: '⚙️', label: 'Réglages', path: '/dashboard/parametres' },
        ].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 0 6px', background: 'none', border: 'none', cursor: 'pointer', color: item.active ? '#FF6B35' : '#bbb', fontSize: 10, fontWeight: item.active ? 600 : 400 }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}