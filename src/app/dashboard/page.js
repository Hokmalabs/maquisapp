'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#F5F5F5',
  white: '#FFFFFF',
  primary: '#FF6B35',
  primaryLight: '#FFF0EB',
  dark: '#1A1A2E',
  gray: '#8A8A9A',
  grayLight: '#F0F0F5',
  border: '#E8E8F0',
  green: '#00C851',
  yellow: '#FFB800',
  red: '#FF3B30',
  shadow: 'rgba(0,0,0,0.07)',
}

const STATUT_CONFIG = {
  en_attente:     { label: 'En attente',     color: '#FFB800', bg: '#FFF8E1', icon: '⏳' },
  valide:         { label: 'Validée',         color: '#00C851', bg: '#E8F5E9', icon: '✅' },
  en_preparation: { label: 'En préparation',  color: '#FF6B35', bg: '#FFF0EB', icon: '👨‍🍳' },
  presque_pret:   { label: 'Presque prêt',    color: '#E85520', bg: '#FFE8E0', icon: '🔔' },
  servi:          { label: 'Servi',           color: '#00C851', bg: '#E8F5E9', icon: '🍽️' },
}

export default function DashboardPage() {
  const router = useRouter()
  const [restaurant, setRestaurant] = useState(null)
  const [restaurantId, setRestaurantId] = useState(null)
  const [stats, setStats] = useState({ commandes: 0, tables: 0, plats: 0, ca_jour: 0 })
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCmdManuelle, setShowCmdManuelle] = useState(false)

  // Commande manuelle
  const [tables, setTables] = useState([])
  const [categories, setCategories] = useState([])
  const [plats, setPlats] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [panier, setPanier] = useState([])
  const [activeCat, setActiveCat] = useState(null)
  const [cmdStep, setCmdStep] = useState('table') // table | menu | confirm
  const [sendingCmd, setSendingCmd] = useState(false)

  useEffect(() => { loadData() }, [])

  // Realtime commandes
  useEffect(() => {
    if (!restaurantId) return
    const ch = supabase.channel('dashboard-cmds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commandes', filter: `restaurant_id=eq.${restaurantId}` }, () => {
        refreshCommandes(restaurantId)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [restaurantId])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: profile } = await supabase
      .from('profiles').select('*, restaurants(*)').eq('id', user.id).single()
    if (!profile) { router.push('/auth/login'); return }

    const resto = profile.restaurants
    setRestaurant(resto)
    setRestaurantId(profile.restaurant_id)

    const rid = profile.restaurant_id
    const today = new Date().toISOString().split('T')[0]

    const [
      { count: cmdCount },
      { count: tableCount },
      { count: platCount },
      { data: cmdActives },
      { data: cmdJour },
      { data: tbls },
      { data: cats },
      { data: pls },
    ] = await Promise.all([
      supabase.from('commandes').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid).not('statut', 'in', '("cloture","annule")'),
      supabase.from('tables').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid).eq('actif', true),
      supabase.from('plats').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid).eq('disponible', true),
      supabase.from('commandes').select('*, tables(numero)').eq('restaurant_id', rid).not('statut', 'in', '("cloture","annule")').order('created_at', { ascending: false }).limit(8),
      supabase.from('commandes').select('total').eq('restaurant_id', rid).eq('statut', 'cloture').gte('created_at', today),
      supabase.from('tables').select('*').eq('restaurant_id', rid).eq('actif', true).order('numero'),
      supabase.from('categories').select('*').eq('restaurant_id', rid).order('ordre'),
      supabase.from('plats').select('*').eq('restaurant_id', rid).eq('disponible', true).order('ordre'),
    ])

    const caJour = cmdJour?.reduce((s, c) => s + (c.total || 0), 0) || 0
    setStats({ commandes: cmdCount || 0, tables: tableCount || 0, plats: platCount || 0, ca_jour: caJour })
    setCommandes(cmdActives || [])
    setTables(tbls || [])
    setCategories(cats || [])
    if (cats?.length) setActiveCat(cats[0].id)
    setPlats(pls || [])
    setLoading(false)
  }

  const refreshCommandes = async (rid) => {
    const today = new Date().toISOString().split('T')[0]
    const [{ data: cmdActives }, { data: cmdJour }, { count }] = await Promise.all([
      supabase.from('commandes').select('*, tables(numero)').eq('restaurant_id', rid).not('statut', 'in', '("cloture","annule")').order('created_at', { ascending: false }).limit(8),
      supabase.from('commandes').select('total').eq('restaurant_id', rid).eq('statut', 'cloture').gte('created_at', today),
      supabase.from('commandes').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid).not('statut', 'in', '("cloture","annule")'),
    ])
    setCommandes(cmdActives || [])
    const caJour = cmdJour?.reduce((s, c) => s + (c.total || 0), 0) || 0
    setStats(prev => ({ ...prev, commandes: count || 0, ca_jour: caJour }))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const getTemps = (created_at) => {
    const diff = Math.floor((new Date() - new Date(created_at)) / 60000)
    if (diff < 1) return '< 1 min'
    if (diff < 60) return `${diff} min`
    return `${Math.floor(diff / 60)}h${diff % 60 > 0 ? diff % 60 + 'm' : ''}`
  }

  const formatCFA = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' F'

  // ── COMMANDE MANUELLE ─────────────────────────────────────────────────────
  const totalPanier = panier.reduce((s, i) => s + i.prix * i.quantite, 0)
  const countPanier = panier.reduce((s, i) => s + i.quantite, 0)

  const ajouterPlat = (plat) => {
    setPanier(prev => {
      const ex = prev.find(i => i.plat_id === plat.id)
      if (ex) return prev.map(i => i.plat_id === plat.id ? { ...i, quantite: i.quantite + 1 } : i)
      return [...prev, { plat_id: plat.id, nom: plat.nom, prix: plat.prix, quantite: 1 }]
    })
  }

  const retirerPlat = (platId) => {
    setPanier(prev => {
      const ex = prev.find(i => i.plat_id === platId)
      if (!ex) return prev
      if (ex.quantite === 1) return prev.filter(i => i.plat_id !== platId)
      return prev.map(i => i.plat_id === platId ? { ...i, quantite: i.quantite - 1 } : i)
    })
  }

  const qte = (platId) => panier.find(i => i.plat_id === platId)?.quantite || 0

  const envoyerCmdManuelle = async () => {
    if (!panier.length || !selectedTable || !restaurant) return
    setSendingCmd(true)
    const { data: cmd, error } = await supabase.from('commandes')
      .insert({ restaurant_id: restaurant.id, table_id: selectedTable.id, statut: 'en_attente', total: totalPanier, paye: false })
      .select().single()
    if (!error && cmd) {
      await supabase.from('commande_items').insert(
        panier.map(i => ({ commande_id: cmd.id, plat_id: i.plat_id, nom_plat: i.nom, prix_unitaire: i.prix, quantite: i.quantite, note: '' }))
      )
    }
    setSendingCmd(false)
    setShowCmdManuelle(false)
    setPanier([])
    setSelectedTable(null)
    setCmdStep('table')
    refreshCommandes(restaurant.id)
  }

  const resetCmdManuelle = () => {
    setShowCmdManuelle(false)
    setPanier([])
    setSelectedTable(null)
    setCmdStep('table')
  }

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: "'DM Sans', system-ui" }}>
      <div style={{ fontSize: 44, animation: 'pulse 1s infinite' }}>🍽️</div>
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
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        .nav-btn:active { transform: scale(0.93); }
        .card-btn:active { transform: scale(0.97); }
      `}</style>

      {/* ── HEADER ───────────────────────────────────────────────────── */}
      <div style={{ background: C.dark, padding: '48px 16px 14px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {restaurant?.logo_url
              ? <img src={restaurant.logo_url} alt="" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover' }} />
              : <div style={{ width: 38, height: 38, borderRadius: 10, background: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍽️</div>
            }
            <div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 15 }}>{restaurant?.nom}</div>
              <div style={{ color: '#aaa', fontSize: 11 }}>{restaurant?.ville || 'Dashboard'}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ background: 'rgba(255,107,53,.15)', border: 'none', color: C.primary, borderRadius: 20, padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div style={{ margin: '14px 16px 0', borderRadius: 18, background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 60%, #FFB347 100%)', padding: '18px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 72, opacity: .12 }}>🍽️</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.85)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Tableau de bord</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 3, lineHeight: 1.25 }}>Bonjour 👋</div>
        <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,.8)' }}>{today.charAt(0).toUpperCase() + today.slice(1)}</div>
      </div>

      {/* ── STATS ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '14px 16px 0' }}>
        <div style={{ background: C.white, borderRadius: 16, padding: '16px', boxShadow: `0 2px 10px ${C.shadow}`, gridColumn: 'span 2' }}>
          <div style={{ fontSize: 11, color: C.gray, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>CA du jour</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.primary }}>{formatCFA(stats.ca_jour)}</div>
        </div>
        {[
          { val: stats.commandes, label: 'Commandes actives', color: C.primary, icon: '📋' },
          { val: stats.plats, label: 'Plats disponibles', color: C.green, icon: '🍛' },
          { val: stats.tables, label: 'Tables actives', color: '#5B8DEF', icon: '🪑' },
        ].map((s, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 16, padding: '14px', boxShadow: `0 2px 10px ${C.shadow}`, gridColumn: i === 2 ? 'span 2' : 'span 1', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: C.gray, marginTop: 1 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── COMMANDE MANUELLE CTA ─────────────────────────────────── */}
      <div style={{ margin: '14px 16px 0' }}>
        <button className="card-btn" onClick={() => setShowCmdManuelle(true)}
          style={{ width: '100%', background: C.dark, border: 'none', borderRadius: 16, padding: '15px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .15s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✍️</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Commande manuelle</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>Pour clients sans smartphone</div>
            </div>
          </div>
          <span style={{ fontSize: 20, color: C.primary }}>›</span>
        </button>
      </div>

      {/* ── COMMANDES EN COURS ───────────────────────────────────────── */}
      {commandes.length > 0 && (
        <div style={{ margin: '20px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Commandes en cours</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#E8F5E9', borderRadius: 20, padding: '3px 10px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, animation: 'blink 1.5s infinite' }}></div>
              <span style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>Live</span>
            </div>
          </div>
          {commandes.map(cmd => {
            const s = STATUT_CONFIG[cmd.statut] || STATUT_CONFIG.en_attente
            return (
              <div key={cmd.id} className="card-btn" onClick={() => router.push('/dashboard/commandes')}
                style={{ background: C.white, borderRadius: 14, padding: '13px 14px', boxShadow: `0 2px 10px ${C.shadow}`, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'transform .15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Table {cmd.tables?.numero}</div>
                    <div style={{ fontSize: 11, color: C.gray, marginTop: 1 }}>⏱ {getTemps(cmd.created_at)}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.dark }}>{formatCFA(cmd.total)}</div>
                  <div style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, marginTop: 3 }}>{s.label}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── NAVIGATION GRID ──────────────────────────────────────────── */}
      <div style={{ margin: '20px 16px 0' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Navigation</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: '📋', label: 'Commandes', desc: 'Suivi temps réel', path: '/dashboard/commandes', accent: '#FFF0EB' },
            { icon: '🍛', label: 'Menu', desc: 'Plats & catégories', path: '/dashboard/menu', accent: '#E8F5E9' },
            { icon: '🪑', label: 'Tables & QR', desc: 'Gérer les tables', path: '/dashboard/tables', accent: '#EBF5FB' },
            { icon: '📊', label: 'Historique', desc: 'CA & rapports', path: '/dashboard/historique', accent: '#F4ECFF' },
          ].map(item => (
            <button key={item.path} className="card-btn" onClick={() => router.push(item.path)}
              style={{ background: C.white, borderRadius: 16, padding: '16px', boxShadow: `0 2px 10px ${C.shadow}`, textAlign: 'left', cursor: 'pointer', border: 'none', fontFamily: 'inherit', transition: 'transform .15s' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: item.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 10 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{item.label}</div>
              <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>{item.desc}</div>
            </button>
          ))}
          <button className="card-btn" onClick={() => router.push('/dashboard/parametres')}
            style={{ gridColumn: 'span 2', background: C.white, borderRadius: 16, padding: '14px 16px', boxShadow: `0 2px 10px ${C.shadow}`, textAlign: 'left', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'inherit', transition: 'transform .15s' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: C.grayLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚙️</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Paramètres restaurant</div>
              <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>Configuration & profil</div>
            </div>
          </button>
        </div>
      </div>

      {/* ── BOTTOM NAV ───────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: C.white, borderTop: `1px solid ${C.border}`, display: 'flex', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[
          { icon: '🏠', label: 'Accueil', path: '/dashboard', active: true },
          { icon: '📋', label: 'Commandes', path: '/dashboard/commandes' },
          { icon: '🍛', label: 'Menu', path: '/dashboard/menu' },
          { icon: '🪑', label: 'Tables', path: '/dashboard/tables' },
          { icon: '⚙️', label: 'Réglages', path: '/dashboard/parametres' },
        ].map(item => (
          <button key={item.path} className="nav-btn" onClick={() => router.push(item.path)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 0 6px', background: 'none', border: 'none', cursor: 'pointer', color: item.active ? C.primary : C.gray, fontSize: 9, fontWeight: item.active ? 700 : 400, fontFamily: 'inherit', transition: 'transform .15s', position: 'relative' }}>
            {item.active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 3, background: C.primary, borderRadius: '0 0 3px 3px' }}></div>}
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* ── MODAL COMMANDE MANUELLE ──────────────────────────────────── */}
      {showCmdManuelle && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'fadeIn .2s' }}>
          <div onClick={resetCmdManuelle} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)' }}></div>
          <div style={{ position: 'relative', background: C.white, borderRadius: '22px 22px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column', animation: 'slideUp .3s ease' }}>

            {/* Header modal */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }}></div>
            </div>
            <div style={{ padding: '10px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.dark }}>
                  {cmdStep === 'table' ? '🪑 Choisir une table' : cmdStep === 'menu' ? '🍛 Sélectionner les plats' : '✅ Confirmer la commande'}
                </div>
                {cmdStep !== 'table' && selectedTable && (
                  <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>Table {selectedTable.numero} • {selectedTable.zone || 'Salle'}</div>
                )}
              </div>
              <button onClick={resetCmdManuelle} style={{ background: C.grayLight, border: 'none', borderRadius: 9, width: 30, height: 30, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Étape 1 : Table */}
            {cmdStep === 'table' && (
              <div style={{ overflowY: 'auto', padding: '14px 18px 30px' }}>
                <div style={{ fontSize: 12, color: C.gray, marginBottom: 12 }}>Sélectionnez la table pour cette commande</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {tables.map(t => (
                    <button key={t.id} onClick={() => { setSelectedTable(t); setCmdStep('menu') }}
                      style={{ background: t.statut === 'occupee' ? '#FFF0EB' : C.white, border: `2px solid ${t.statut === 'occupee' ? C.primary : C.border}`, borderRadius: 14, padding: '14px 8px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{t.statut === 'occupee' ? '🔴' : '🟢'}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Table {t.numero}</div>
                      <div style={{ fontSize: 10, color: C.gray, marginTop: 2 }}>{t.zone || 'Salle'}</div>
                      {t.statut === 'occupee' && <div style={{ fontSize: 9, color: C.primary, marginTop: 3, fontWeight: 600 }}>Occupée</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Étape 2 : Menu */}
            {cmdStep === 'menu' && (
              <>
                {/* Catégories */}
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 18px 0' }}>
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                      style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 50, border: activeCat === cat.id ? 'none' : `1.5px solid ${C.border}`, background: activeCat === cat.id ? C.primary : C.white, color: activeCat === cat.id ? '#fff' : C.dark, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      {cat.nom}
                    </button>
                  ))}
                </div>

                {/* Plats */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '12px 18px' }}>
                  {plats.filter(p => p.categorie_id === activeCat).map(plat => (
                    <div key={plat.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
                      {plat.image_url
                        ? <img src={plat.image_url} alt="" style={{ width: 50, height: 50, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 50, height: 50, borderRadius: 10, background: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🍽️</div>
                      }
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{plat.nom}</div>
                        <div style={{ fontSize: 12, color: C.primary, fontWeight: 700 }}>{plat.prix.toLocaleString()} F</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        {qte(plat.id) > 0 && (
                          <>
                            <button onClick={() => retirerPlat(plat.id)} style={{ width: 26, height: 26, borderRadius: 7, border: `1.5px solid ${C.border}`, background: C.white, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                            <span style={{ fontSize: 13, fontWeight: 700, minWidth: 14, textAlign: 'center' }}>{qte(plat.id)}</span>
                          </>
                        )}
                        <button onClick={() => ajouterPlat(plat)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: C.primary, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer panier */}
                {countPanier > 0 && (
                  <div style={{ padding: '12px 18px 30px', borderTop: `1px solid ${C.border}` }}>
                    <button onClick={() => setCmdStep('confirm')}
                      style={{ width: '100%', background: C.dark, border: 'none', borderRadius: 14, padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'inherit' }}>
                      <div style={{ background: C.primary, borderRadius: 7, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{countPanier}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Voir le récap</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{totalPanier.toLocaleString()} F</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Étape 3 : Confirmation */}
            {cmdStep === 'confirm' && (
              <div style={{ overflowY: 'auto', padding: '14px 18px 30px' }}>
                <div style={{ background: C.grayLight, borderRadius: 14, padding: '14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Récapitulatif</div>
                  {panier.map(item => (
                    <div key={item.plat_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{item.nom}</span>
                        <span style={{ fontSize: 12, color: C.gray }}> ×{item.quantite}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{(item.prix * item.quantite).toLocaleString()} F</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Total</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>{totalPanier.toLocaleString()} FCFA</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setCmdStep('menu')}
                    style={{ flex: 1, background: C.grayLight, border: 'none', borderRadius: 14, padding: '13px', fontSize: 13, fontWeight: 700, color: C.dark, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ← Modifier
                  </button>
                  <button onClick={envoyerCmdManuelle} disabled={sendingCmd}
                    style={{ flex: 2, background: C.primary, border: 'none', borderRadius: 14, padding: '13px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: sendingCmd ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: sendingCmd ? .7 : 1 }}>
                    {sendingCmd ? 'Envoi...' : '✅ Envoyer la commande'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}