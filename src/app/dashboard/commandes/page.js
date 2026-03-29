'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#F5F5F5', white: '#FFFFFF', primary: '#FF6B35', primaryLight: '#FFF0EB',
  dark: '#1A1A2E', gray: '#8A8A9A', grayLight: '#F0F0F5', border: '#E8E8F0',
  green: '#00C851', yellow: '#FFB800', red: '#FF3B30', shadow: 'rgba(0,0,0,0.07)',
}

const STATUTS = ['en_attente', 'valide', 'en_preparation', 'presque_pret', 'servi']
const STATUT_CFG = {
  en_attente:     { label: 'En attente',    color: '#FFB800', bg: '#FFF8E1', icon: '⏳', next: 'valide', nextLabel: 'Valider' },
  valide:         { label: 'Validée',       color: '#00C851', bg: '#E8F5E9', icon: '✅', next: 'en_preparation', nextLabel: 'Préparer' },
  en_preparation: { label: 'En préparation',color: '#FF6B35', bg: '#FFF0EB', icon: '👨‍🍳', next: 'presque_pret', nextLabel: 'Presque prêt' },
  presque_pret:   { label: 'Presque prêt',  color: '#E85520', bg: '#FFE8E0', icon: '🔔', next: 'servi', nextLabel: 'Servir' },
  servi:          { label: 'Servi',         color: '#00C851', bg: '#E8F5E9', icon: '🍽️', next: 'cloture', nextLabel: 'Clôturer' },
}

export default function CommandesPage() {
  const router = useRouter()
  const [restaurant, setRestaurant] = useState(null)
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedCmd, setSelectedCmd] = useState(null)
  const [cmdItems, setCmdItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [updating, setUpdating] = useState(false)
  const timers = useRef({})

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!restaurant) return
    const ch = supabase.channel('commandes-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commandes', filter: `restaurant_id=eq.${restaurant.id}` }, () => {
        refreshCommandes(restaurant.id)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commande_items' }, () => {
        if (selectedCmd) loadItems(selectedCmd.id)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [restaurant, selectedCmd])

  // Chrono
  useEffect(() => {
    const id = setInterval(() => setCommandes(prev => [...prev]), 30000)
    return () => clearInterval(id)
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: profile } = await supabase.from('profiles').select('*, restaurants(*)').eq('id', user.id).single()
    if (!profile) { router.push('/auth/login'); return }
    setRestaurant(profile.restaurants)
    await refreshCommandes(profile.restaurant_id)
    setLoading(false)
  }

  async function refreshCommandes(rid) {
    const { data } = await supabase
      .from('commandes')
      .select('*, tables(numero, zone)')
      .eq('restaurant_id', rid)
      .not('statut', 'in', '("cloture","annule")')
      .order('created_at', { ascending: true })
    setCommandes(data || [])
  }

  async function loadItems(cmdId) {
    setLoadingItems(true)
    const { data } = await supabase.from('commande_items').select('*').eq('commande_id', cmdId)
    setCmdItems(data || [])
    setLoadingItems(false)
  }

  async function openDetail(cmd) {
    setSelectedCmd(cmd)
    loadItems(cmd.id)
  }

  async function changerStatut(cmd, newStatut) {
    setUpdating(true)
    const update = { statut: newStatut }
    if (newStatut === 'valide') update.validated_at = new Date().toISOString()
    if (newStatut === 'servi') update.served_at = new Date().toISOString()
    await supabase.from('commandes').update(update).eq('id', cmd.id)
    // Si clôture, libérer la table
    if (newStatut === 'cloture') {
      await supabase.from('tables').update({ statut: 'libre' }).eq('id', cmd.table_id)
      setSelectedCmd(null)
      setCmdItems([])
    } else {
      setSelectedCmd(prev => ({ ...prev, statut: newStatut }))
    }
    setUpdating(false)
    refreshCommandes(restaurant.id)
  }

  async function supprimerItem(itemId) {
    await supabase.from('commande_items').delete().eq('id', itemId)
    const newItems = cmdItems.filter(i => i.id !== itemId)
    setCmdItems(newItems)
    const newTotal = newItems.reduce((s, i) => s + i.prix_unitaire * i.quantite, 0)
    await supabase.from('commandes').update({ total: newTotal }).eq('id', selectedCmd.id)
    setSelectedCmd(prev => ({ ...prev, total: newTotal }))
  }

  async function annulerCommande(cmd) {
    await supabase.from('commandes').update({ statut: 'annule' }).eq('id', cmd.id)
    await supabase.from('tables').update({ statut: 'libre' }).eq('id', cmd.table_id)
    setSelectedCmd(null)
    setCmdItems([])
    refreshCommandes(restaurant.id)
  }

  const getTemps = (created_at) => {
    const diff = Math.floor((new Date() - new Date(created_at)) / 60000)
    if (diff < 1) return '< 1 min'
    if (diff < 60) return `${diff} min`
    return `${Math.floor(diff / 60)}h${diff % 60 > 0 ? diff % 60 + 'm' : ''}`
  }

  const getTempsColor = (created_at) => {
    const diff = Math.floor((new Date() - new Date(created_at)) / 60000)
    if (diff > 30) return C.red
    if (diff > 15) return C.yellow
    return C.gray
  }

  const formatCFA = (n) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' F'

  const filtered = filter === 'all' ? commandes : commandes.filter(c => c.statut === filter)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: "'DM Sans', system-ui" }}>
      <div style={{ fontSize: 44, animation: 'pulse 1s infinite' }}>📋</div>
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
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.25} }
        .cmd-card:active { transform: scale(0.98); }
        .btn:active { transform: scale(0.97); opacity:.9; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: C.dark, padding: '48px 16px 14px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>←</button>
            <div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 15 }}>Commandes</div>
              <div style={{ color: '#aaa', fontSize: 11 }}>{restaurant?.nom}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#E8F5E9', borderRadius: 20, padding: '4px 10px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, animation: 'blink 1.5s infinite' }}></div>
            <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>Live • {commandes.length}</span>
          </div>
        </div>
      </div>

      {/* FILTRES */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px 0' }}>
        {[
          { id: 'all', label: 'Toutes' },
          { id: 'en_attente', label: '⏳ Attente' },
          { id: 'en_preparation', label: '👨‍🍳 Prépa' },
          { id: 'presque_pret', label: '🔔 Prêt' },
          { id: 'servi', label: '🍽️ Servi' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 50, border: filter === f.id ? 'none' : `1.5px solid ${C.border}`, background: filter === f.id ? C.primary : C.white, color: filter === f.id ? '#fff' : C.dark, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* LISTE COMMANDES */}
      <div style={{ padding: '12px 16px 0' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.gray }}>
            <div style={{ fontSize: 44 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>Aucune commande en cours</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Les nouvelles commandes apparaîtront ici</div>
          </div>
        ) : filtered.map(cmd => {
          const cfg = STATUT_CFG[cmd.statut] || STATUT_CFG.en_attente
          return (
            <div key={cmd.id} className="cmd-card" onClick={() => openDetail(cmd)}
              style={{ background: C.white, borderRadius: 16, padding: '13px 14px', boxShadow: `0 2px 10px ${C.shadow}`, marginBottom: 10, cursor: 'pointer', transition: 'transform .15s', borderLeft: `4px solid ${cfg.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, animation: cmd.statut === 'presque_pret' ? 'pulse 1.2s infinite' : 'none' }}>{cfg.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Table {cmd.tables?.numero}</div>
                    <div style={{ fontSize: 11, color: C.gray, marginTop: 1 }}>{cmd.tables?.zone || 'Salle'}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.dark }}>{formatCFA(cmd.total)}</div>
                  <div style={{ fontSize: 10, color: getTempsColor(cmd.created_at), fontWeight: 600, marginTop: 2 }}>⏱ {getTemps(cmd.created_at)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <div style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>{cfg.label}</div>
                {cfg.next && (
                  <button className="btn" onClick={e => { e.stopPropagation(); changerStatut(cmd, cfg.next) }}
                    style={{ background: cfg.color, border: 'none', borderRadius: 10, padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {cfg.nextLabel} →
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: C.white, borderTop: `1px solid ${C.border}`, display: 'flex', zIndex: 100 }}>
        {[
          { icon: '🏠', label: 'Accueil', path: '/dashboard' },
          { icon: '📋', label: 'Commandes', path: '/dashboard/commandes', active: true },
          { icon: '🍛', label: 'Menu', path: '/dashboard/menu' },
          { icon: '🪑', label: 'Tables', path: '/dashboard/tables' },
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

      {/* MODAL DÉTAIL COMMANDE */}
      {selectedCmd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'fadeIn .2s' }}>
          <div onClick={() => { setSelectedCmd(null); setCmdItems([]) }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)' }}></div>
          <div style={{ position: 'relative', background: C.white, borderRadius: '22px 22px 0 0', maxHeight: '90vh', display: 'flex', flexDirection: 'column', animation: 'slideUp .3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }}></div>
            </div>

            {/* Header modal */}
            <div style={{ padding: '10px 18px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.dark }}>Table {selectedCmd.tables?.numero}</div>
                <div style={{ fontSize: 11, color: C.gray, marginTop: 1 }}>{selectedCmd.tables?.zone || 'Salle'} • {getTemps(selectedCmd.created_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {(() => { const cfg = STATUT_CFG[selectedCmd.statut]; return cfg ? <div style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>{cfg.icon} {cfg.label}</div> : null })()}
                <button onClick={() => { setSelectedCmd(null); setCmdItems([]) }} style={{ background: C.grayLight, border: 'none', borderRadius: 9, width: 30, height: 30, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            </div>

            {/* Articles */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '12px 18px' }}>
              {loadingItems ? (
                <div style={{ textAlign: 'center', padding: '20px', color: C.gray, fontSize: 13 }}>Chargement...</div>
              ) : cmdItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{item.nom_plat}</div>
                    <div style={{ fontSize: 11, color: C.gray, marginTop: 1 }}>×{item.quantite} • {item.prix_unitaire.toLocaleString()} F/u</div>
                    {item.note && <div style={{ fontSize: 11, color: C.primary, marginTop: 2 }}>📝 {item.note}</div>}
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{(item.prix_unitaire * item.quantite).toLocaleString()} F</div>
                    {selectedCmd.statut === 'en_attente' && (
                      <button onClick={() => supprimerItem(item.id)}
                        style={{ background: '#FFEBEE', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red }}>✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer actions */}
            <div style={{ padding: '12px 18px 36px', borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: C.gray }}>Total</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>{formatCFA(selectedCmd.total)}</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={() => annulerCommande(selectedCmd)}
                  style={{ flex: 1, background: '#FFEBEE', border: 'none', borderRadius: 13, padding: '13px', fontSize: 13, fontWeight: 700, color: C.red, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✕ Annuler
                </button>
                {STATUT_CFG[selectedCmd.statut]?.next && (
                  <button className="btn" onClick={() => changerStatut(selectedCmd, STATUT_CFG[selectedCmd.statut].next)} disabled={updating}
                    style={{ flex: 2, background: STATUT_CFG[selectedCmd.statut]?.color || C.primary, border: 'none', borderRadius: 13, padding: '13px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: updating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: updating ? .7 : 1 }}>
                    {updating ? '...' : `${STATUT_CFG[selectedCmd.statut]?.nextLabel} →`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}