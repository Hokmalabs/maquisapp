'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#F5F5F5', white: '#FFFFFF', primary: '#FF6B35', primaryLight: '#FFF0EB',
  dark: '#1A1A2E', gray: '#8A8A9A', grayLight: '#F0F0F5', border: '#E8E8F0',
  green: '#00C851', yellow: '#FFB800', red: '#FF3B30', shadow: 'rgba(0,0,0,0.07)',
}

const STATUT_CFG = {
  en_attente:     { label: 'En attente',     color: '#FFB800', bg: '#FFF8E1', icon: '⏳', next: 'valide',        nextLabel: 'Valider' },
  valide:         { label: 'Validée',        color: '#00C851', bg: '#E8F5E9', icon: '✅', next: 'en_preparation', nextLabel: 'Préparer' },
  en_preparation: { label: 'En préparation', color: '#FF6B35', bg: '#FFF0EB', icon: '👨‍🍳', next: 'presque_pret',  nextLabel: 'Presque prêt' },
  presque_pret:   { label: 'Presque prêt',   color: '#E85520', bg: '#FFE8E0', icon: '🔔', next: 'servi',         nextLabel: 'Servir' },
  servi:          { label: 'Servi',          color: '#00C851', bg: '#E8F5E9', icon: '🍽️', next: 'cloture',       nextLabel: 'Clôturer' },
}

const MODES_PAIEMENT = [
  { id: 'wave',         label: 'Wave',          icon: '🌊' },
  { id: 'orange_money', label: 'Orange Money',  icon: '🟠' },
  { id: 'mtn_money',   label: 'MTN Money',     icon: '💛' },
  { id: 'cash',        label: 'Espèces',       icon: '💵' },
  { id: 'carte',       label: 'Carte bancaire', icon: '💳' },
]

function jouerSon(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)

    if (type === 'serveur') {
      osc.frequency.value = 880
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    } else if (type === 'addition') {
      osc.frequency.value = 440
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
      setTimeout(() => {
        const ctx2 = new (window.AudioContext || window.webkitAudioContext)()
        const osc2 = ctx2.createOscillator()
        const gain2 = ctx2.createGain()
        osc2.connect(gain2)
        gain2.connect(ctx2.destination)
        gain2.gain.setValueAtTime(0.3, ctx2.currentTime)
        osc2.frequency.value = 440
        osc2.start()
        osc2.stop(ctx2.currentTime + 0.2)
      }, 300)
    }
  } catch (e) {
    console.log('Audio non supporté')
  }
}

export default function CommandesPage() {
  const router = useRouter()
  const [restaurant, setRestaurant] = useState(null)
  const [commandes, setCommandes]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('all')
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupItems, setGroupItems]       = useState({})
  const [loadingItems, setLoadingItems]   = useState(false)
  const [updating, setUpdating]           = useState(false)
  const [showTicket, setShowTicket]       = useState(false)
  const [ticketData, setTicketData]       = useState(null)
  const [demandesPaiement, setDemandesPaiement] = useState([])
  const [showBonCuisine, setShowBonCuisine] = useState(false)
  const [bonCuisineData, setBonCuisineData] = useState(null)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!restaurant) return
    const ch = supabase.channel('commandes-live')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'commandes',
        filter: `restaurant_id=eq.${restaurant.id}`
      }, (payload) => {
        // Détecter une demande de paiement (mode_paiement vient d'être renseigné)
        if (payload.eventType === 'UPDATE' && payload.new?.mode_paiement && !payload.old?.mode_paiement) {
          jouerSon('addition')
          const cmdId = payload.new.id
          supabase.from('commandes').select('*, tables(numero)').eq('id', cmdId).single()
            .then(({ data: cmd }) => {
              if (cmd) {
                setDemandesPaiement(prev => {
                  if (prev.find(d => d.cmdId === cmdId)) return prev
                  return [...prev, { tableNumero: cmd.tables?.numero, modePaiement: payload.new.mode_paiement, cmdId }]
                })
              }
            })
        }
        refreshCommandes(restaurant.id)
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'appels_serveur',
        filter: `restaurant_id=eq.${restaurant.id}`
      }, () => { jouerSon('serveur') })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [restaurant])

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

  function grouperParTable(cmds) {
    const map = {}
    for (const cmd of cmds) {
      const key = cmd.table_id
      if (!map[key]) map[key] = { table: cmd.tables, tableId: cmd.table_id, cmds: [] }
      map[key].cmds.push(cmd)
    }
    return Object.values(map)
  }

  async function ouvrirGroupe(group) {
    setLoadingItems(true)
    setSelectedGroup(group)
    // ─── FIX BUG 3 : charger tous les items en une seule fois ────────────────
    const items = {}
    await Promise.all(group.cmds.map(async (cmd) => {
      const { data } = await supabase.from('commande_items').select('*').eq('commande_id', cmd.id)
      items[cmd.id] = data || []
    }))
    setGroupItems(items)
    setLoadingItems(false)
  }

  async function changerStatut(cmd, newStatut) {
    setUpdating(true)
    const update = { statut: newStatut }
    if (newStatut === 'valide') update.validated_at = new Date().toISOString()
    if (newStatut === 'servi') update.served_at = new Date().toISOString()
    await supabase.from('commandes').update(update).eq('id', cmd.id)

    if (newStatut === 'cloture') {
      const autresCmds = selectedGroup.cmds.filter(c => c.id !== cmd.id)
      const toutesTerminees = autresCmds.every(c => ['cloture','annule'].includes(c.statut))
      if (toutesTerminees || autresCmds.length === 0) {
        await supabase.from('tables').update({ statut: 'libre' }).eq('id', cmd.table_id)
      }
    }

    setUpdating(false)
    await refreshCommandes(restaurant.id)

    if (selectedGroup) {
      const { data: cmdsUpdated } = await supabase
        .from('commandes')
        .select('*, tables(numero, zone)')
        .eq('table_id', cmd.table_id)
        .not('statut', 'in', '("cloture","annule")')
      if (!cmdsUpdated?.length) {
        setSelectedGroup(null)
        setGroupItems({})
      } else {
        setSelectedGroup(prev => ({ ...prev, cmds: cmdsUpdated }))
      }
    }
  }

  async function cloturerTout(group, modePaiement) {
    setUpdating(true)
    for (const cmd of group.cmds) {
      if (!['cloture', 'annule'].includes(cmd.statut)) {
        await supabase.from('commandes')
          .update({ statut: 'cloture', mode_paiement: modePaiement })
          .eq('id', cmd.id)
      }
    }
    const tableId = group.tableId || group.table?.id || group.cmds[0]?.table_id
    if (tableId) {
      await supabase.from('tables').update({ statut: 'libre' }).eq('id', tableId)
    }
    setUpdating(false)
    await refreshCommandes(restaurant.id)
  }

  // ─── FIX BUG 3 : supprimer item sans recharger depuis la DB ────────────────
  async function supprimerItem(itemId, cmdId) {
    await supabase.from('commande_items').delete().eq('id', itemId)
    // Mettre à jour le state local directement (pas de rechargement)
    const newItems = (groupItems[cmdId] || []).filter(i => i.id !== itemId)
    const newTotal = newItems.reduce((s, i) => s + i.prix_unitaire * i.quantite, 0)
    await supabase.from('commandes').update({ total: newTotal }).eq('id', cmdId)
    // Mettre à jour groupItems localement
    setGroupItems(prev => ({ ...prev, [cmdId]: newItems }))
    // Mettre à jour le total dans selectedGroup localement
    setSelectedGroup(prev => ({
      ...prev,
      cmds: prev.cmds.map(c => c.id === cmdId ? { ...c, total: newTotal } : c)
    }))
    // NE PAS appeler refreshCommandes ici → c'est ce qui causait le bug
  }

  async function annulerCommande(cmd) {
    await supabase.from('commandes').update({ statut: 'annule' }).eq('id', cmd.id)
    const restantes = selectedGroup.cmds.filter(c => c.id !== cmd.id && !['annule','cloture'].includes(c.statut))
    if (!restantes.length) {
      await supabase.from('tables').update({ statut: 'libre' }).eq('id', cmd.table_id)
      setSelectedGroup(null)
      setGroupItems({})
    } else {
      setSelectedGroup(prev => ({ ...prev, cmds: prev.cmds.filter(c => c.id !== cmd.id) }))
    }
    await refreshCommandes(restaurant.id)
  }

  // ─── FIX BUG 5 : capturer les données du ticket AVANT de fermer le modal ──
  function preparerEtOuvrirTicket(group, itemsSnapshot) {
    const allItems = []
    for (const cmd of group.cmds) {
      const items = itemsSnapshot[cmd.id] || []
      allItems.push(...items)
    }
    const total = group.cmds.reduce((s, c) => s + (c.total || 0), 0)
    const modePaiement = group.cmds[group.cmds.length - 1]?.mode_paiement || ''
    setTicketData({ group, allItems, total, modePaiement, restaurant, date: new Date() })
    setShowTicket(true)
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
  const groupes = grouperParTable(commandes)
  const groupesFiltres = filter === 'all' ? groupes : groupes.filter(g => g.cmds.some(c => c.statut === filter))

  function statutDominant(cmds) {
    const ordre = ['en_attente', 'valide', 'en_preparation', 'presque_pret', 'servi']
    for (const s of ordre) {
      if (cmds.some(c => c.statut === s)) return s
    }
    return cmds[0]?.statut || 'en_attente'
  }

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
        @media print {
          body * { visibility: hidden; }
          #ticket-print, #ticket-print *, #ticket-cuisine-print, #ticket-cuisine-print * { visibility: visible; }
          #ticket-print, #ticket-cuisine-print { position: fixed; left: 0; top: 0; width: 80mm; font-size: 11px; font-family: monospace; }
          .no-print { display: none !important; }
        }
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
            <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>Live • {groupes.length} table{groupes.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* BANNIÈRES DEMANDES DE PAIEMENT */}
      {demandesPaiement.map((d) => {
        const mode = MODES_PAIEMENT.find(m => m.id === d.modePaiement)
        return (
          <div key={d.cmdId} style={{ margin: '8px 16px 0', background: C.primary, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
              🔔 Table {d.tableNumero} demande l'addition — Mode : {mode ? `${mode.icon} ${mode.label}` : d.modePaiement}
            </span>
            <button onClick={() => setDemandesPaiement(prev => prev.filter(x => x.cmdId !== d.cmdId))}
              style={{ background: 'rgba(255,255,255,.25)', border: 'none', borderRadius: 7, width: 26, height: 26, cursor: 'pointer', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
          </div>
        )
      })}

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

      {/* LISTE GROUPÉE */}
      <div style={{ padding: '12px 16px 0' }}>
        {groupesFiltres.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.gray }}>
            <div style={{ fontSize: 44 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>Aucune commande en cours</div>
          </div>
        ) : groupesFiltres.map((group, gi) => {
          const statut = statutDominant(group.cmds)
          const cfg = STATUT_CFG[statut] || STATUT_CFG.en_attente
          const totalGroupe = group.cmds.reduce((s, c) => s + (c.total || 0), 0)
          const plusAncienne = group.cmds[0]?.created_at
          const toutesServies = group.cmds.every(c => c.statut === 'servi')

          return (
            <div key={gi} className="cmd-card" style={{ background: C.white, borderRadius: 16, boxShadow: `0 2px 10px ${C.shadow}`, marginBottom: 12, overflow: 'hidden', transition: 'transform .15s', borderLeft: `4px solid ${cfg.color}` }}>
              <div style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => ouvrirGroupe(group)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{cfg.icon}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Table {group.table?.numero}</div>
                      <div style={{ fontSize: 11, color: C.gray }}>
                        {group.table?.zone || 'Salle'} •
                        <span style={{ marginLeft: 4, color: group.cmds.length > 1 ? C.primary : C.gray, fontWeight: group.cmds.length > 1 ? 700 : 400 }}>
                          {group.cmds.length} commande{group.cmds.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.dark }}>{formatCFA(totalGroupe)}</div>
                    <div style={{ fontSize: 10, color: getTempsColor(plusAncienne), fontWeight: 600, marginTop: 2 }}>⏱ {getTemps(plusAncienne)}</div>
                  </div>
                </div>
                {group.cmds.length > 1 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {group.cmds.map((c, i) => {
                      const cs = STATUT_CFG[c.statut]
                      return cs ? (
                        <div key={c.id} style={{ background: cs.bg, color: cs.color, borderRadius: 16, padding: '2px 8px', fontSize: 9, fontWeight: 700 }}>
                          {cs.icon} Cmd {i + 1} — {cs.label}
                        </div>
                      ) : null
                    })}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <div style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>{cfg.label}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {toutesServies && (
                      <button className="btn" onClick={e => { e.stopPropagation(); ouvrirGroupe(group) }}
                        style={{ background: C.green, border: 'none', borderRadius: 10, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                        💳 Encaisser
                      </button>
                    )}
                    {!toutesServies && cfg.next && (
                      <button className="btn" onClick={e => {
                        e.stopPropagation()
                        const aAvancer = group.cmds.filter(c => c.statut === statut)
                        aAvancer.forEach(c => changerStatut(c, cfg.next))
                      }}
                        style={{ background: cfg.color, border: 'none', borderRadius: 10, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {cfg.nextLabel} →
                      </button>
                    )}
                  </div>
                </div>
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

      {selectedGroup && (
        <ModalDetailGroupe
          group={selectedGroup}
          groupItems={groupItems}
          loadingItems={loadingItems}
          updating={updating}
          restaurant={restaurant}
          onClose={() => { setSelectedGroup(null); setGroupItems({}) }}
          onChangerStatut={changerStatut}
          onSupprimerItem={supprimerItem}
          onAnnuler={annulerCommande}
          onCloturerTout={cloturerTout}
          onTicket={preparerEtOuvrirTicket}
          onAfficherBonCuisine={(cmd, items) => {
            setBonCuisineData({ cmd, items, table: selectedGroup.table })
            setShowBonCuisine(true)
          }}
          formatCFA={formatCFA}
          getTemps={getTemps}
        />
      )}

      {showTicket && ticketData && (
        <TicketCaisse data={ticketData} onClose={() => setShowTicket(false)} />
      )}

      {showBonCuisine && bonCuisineData && (
        <BonCuisine
          data={bonCuisineData}
          restaurant={restaurant}
          onImprimer={() => window.print()}
          onIgnorer={() => {
            setShowBonCuisine(false)
            changerStatut(bonCuisineData.cmd, 'en_preparation')
            setBonCuisineData(null)
          }}
          onClose={() => { setShowBonCuisine(false); setBonCuisineData(null) }}
        />
      )}
    </div>
  )
}

function ModalDetailGroupe({ group, groupItems, loadingItems, updating, restaurant, onClose, onChangerStatut, onSupprimerItem, onAnnuler, onCloturerTout, onTicket, onAfficherBonCuisine, formatCFA, getTemps }) {
  const [showEncaisser, setShowEncaisser] = useState(false)
  const [modePaiement, setModePaiement] = useState('')

  const totalGroupe = group.cmds.reduce((s, c) => s + (c.total || 0), 0)
  const toutesServies = group.cmds.every(c => c.statut === 'servi')

  // ─── FIX BUG 5 : passer groupItems au ticket AVANT de fermer ─────────────
  async function handleCloturerEtTicket() {
    if (!modePaiement || updating) return
    // Capturer les items actuels avant clôture
    const itemsSnapshot = { ...groupItems }
    const groupSnapshot = { ...group, cmds: [...group.cmds] }
    // Clôturer
    await onCloturerTout(group, modePaiement)
    // Fermer le modal
    onClose()
    // Ouvrir le ticket avec les données capturées
    onTicket(groupSnapshot, itemsSnapshot)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'fadeIn .2s' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)' }}></div>
      <div style={{ position: 'relative', background: C.white, borderRadius: '22px 22px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column', animation: 'slideUp .3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }}></div>
        </div>
        <div style={{ padding: '10px 18px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.dark }}>Table {group.table?.numero}</div>
            <div style={{ fontSize: 11, color: C.gray, marginTop: 1 }}>
              {group.table?.zone || 'Salle'} • {group.cmds.length} commande{group.cmds.length > 1 ? 's' : ''} • {formatCFA(totalGroupe)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onTicket(group, groupItems)}
              style={{ background: C.grayLight, border: 'none', borderRadius: 9, padding: '7px 10px', fontSize: 12, fontWeight: 600, color: C.dark, cursor: 'pointer', fontFamily: 'inherit' }}>
              🖨️ Ticket
            </button>
            <button onClick={onClose} style={{ background: C.grayLight, border: 'none', borderRadius: 9, width: 30, height: 30, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 18px' }}>
          {loadingItems ? (
            <div style={{ textAlign: 'center', padding: '30px', color: C.gray }}>Chargement...</div>
          ) : group.cmds.map((cmd, idx) => {
            const cfg = STATUT_CFG[cmd.statut]
            const items = groupItems[cmd.id] || []
            return (
              <div key={cmd.id} style={{ marginBottom: 16, background: C.grayLight, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ background: cfg?.bg || '#F5F5F5', padding: '9px 13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 16 }}>{cfg?.icon}</span>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: cfg?.color || C.gray }}>
                        Commande {idx + 1} — {cfg?.label}
                      </span>
                      <div style={{ fontSize: 10, color: C.gray }}>{formatCFA(cmd.total)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {cfg?.next && (
                      <button
                        onClick={() => cfg.next === 'en_preparation'
                          ? onAfficherBonCuisine(cmd, groupItems[cmd.id] || [])
                          : onChangerStatut(cmd, cfg.next)}
                        disabled={updating}
                        style={{ background: cfg.color, border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 10, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: updating ? .7 : 1 }}>
                        {cfg.nextLabel}
                      </button>
                    )}
                    <button onClick={() => onAnnuler(cmd)}
                      style={{ background: '#FFEBEE', border: 'none', borderRadius: 7, width: 26, height: 26, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red }}>✕</button>
                  </div>
                </div>
                <div style={{ padding: '8px 13px' }}>
                  {items.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,.05)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{item.nom_plat}</div>
                        <div style={{ fontSize: 10, color: C.gray }}>×{item.quantite} • {item.prix_unitaire.toLocaleString()} F/u</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>{(item.prix_unitaire * item.quantite).toLocaleString()} F</div>
                      {cmd.statut === 'en_attente' && (
                        <button onClick={() => onSupprimerItem(item.id, cmd.id)}
                          style={{ background: '#FFEBEE', border: 'none', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ padding: '12px 18px 36px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: C.gray }}>Total général</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.dark }}>{formatCFA(totalGroupe)}</span>
          </div>

          {!showEncaisser ? (
            <button onClick={() => setShowEncaisser(true)} disabled={!toutesServies}
              style={{ width: '100%', background: toutesServies ? C.green : C.grayLight, border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, color: toutesServies ? '#fff' : C.gray, cursor: toutesServies ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
              {toutesServies ? '💳 Encaisser et clôturer' : '⏳ En attente que tout soit servi'}
            </button>
          ) : (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Mode de paiement</div>
              {MODES_PAIEMENT.map(m => (
                <button key={m.id} onClick={() => setModePaiement(m.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `2px solid ${modePaiement === m.id ? C.primary : C.border}`, background: modePaiement === m.id ? C.primaryLight : C.white, marginBottom: 7, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 18 }}>{m.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{m.label}</span>
                  {modePaiement === m.id && <span style={{ marginLeft: 'auto', color: C.primary }}>✓</span>}
                </button>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowEncaisser(false)}
                  style={{ flex: 1, background: C.grayLight, border: 'none', borderRadius: 13, padding: '12px', fontSize: 13, fontWeight: 700, color: C.dark, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Retour
                </button>
                {/* ─── FIX BUG 5 : utiliser handleCloturerEtTicket ─────────────── */}
                <button onClick={handleCloturerEtTicket} disabled={!modePaiement || updating}
                  style={{ flex: 2, background: modePaiement ? C.primary : C.grayLight, border: 'none', borderRadius: 13, padding: '12px', fontSize: 13, fontWeight: 700, color: modePaiement ? '#fff' : C.gray, cursor: modePaiement ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: updating ? .7 : 1 }}>
                  {updating ? '...' : '✅ Confirmer et clôturer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TicketCaisse({ data, onClose }) {
  const { group, allItems, total, modePaiement, restaurant, date } = data
  const dateStr = new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const modePaie = MODES_PAIEMENT.find(m => m.id === modePaiement)

  const lignes = allItems.reduce((acc, item) => {
    const key = item.nom_plat + '_' + item.prix_unitaire
    if (acc[key]) { acc[key].quantite += item.quantite; acc[key].total += item.prix_unitaire * item.quantite }
    else acc[key] = { nom: item.nom_plat, quantite: item.quantite, prix: item.prix_unitaire, total: item.prix_unitaire * item.quantite }
    return acc
  }, {})

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', background: C.white, borderRadius: '22px 22px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column', animation: 'slideUp .3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }}></div>
        </div>
        <div className="no-print" style={{ padding: '10px 18px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.dark }}>🖨️ Ticket de caisse</div>
          <button onClick={onClose} style={{ background: C.grayLight, border: 'none', borderRadius: 9, width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 18px' }}>
          <div id="ticket-print" style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, maxWidth: 300, margin: '0 auto', background: '#fff', padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{restaurant?.nom?.toUpperCase()}</div>
              {restaurant?.ville && <div>{restaurant.ville}</div>}
              {restaurant?.telephone && <div>{restaurant.telephone}</div>}
              <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }}></div>
              <div>{dateStr}</div>
              <div>Table {group.table?.numero} — {group.table?.zone || 'Salle'}</div>
              {group.cmds.length > 1 && <div>{group.cmds.length} commandes groupées</div>}
              <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }}></div>
            </div>
            {Object.values(lignes).map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{l.nom}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>  {l.quantite} x {l.prix.toLocaleString()}</div>
                </div>
                <div style={{ fontWeight: 700, whiteSpace: 'nowrap', marginLeft: 8 }}>{l.total.toLocaleString()} F</div>
              </div>
            ))}
            <div style={{ borderTop: '1px dashed #ccc', margin: '10px 0' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14 }}>
              <span>TOTAL</span>
              <span>{total.toLocaleString()} FCFA</span>
            </div>
            {modePaie && <div style={{ marginTop: 6, fontSize: 11 }}>Paiement : {modePaie.icon} {modePaie.label}</div>}
            <div style={{ borderTop: '1px dashed #ccc', margin: '10px 0' }}></div>
            <div style={{ textAlign: 'center', fontSize: 11 }}>
              <div>Merci de votre visite !</div>
              <div style={{ marginTop: 4, color: '#aaa' }}>MaquisApp • maquisapp-xi.vercel.app</div>
            </div>
          </div>
        </div>
        <div className="no-print" style={{ padding: '12px 18px 36px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => window.print()}
            style={{ width: '100%', background: C.dark, border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
            🖨️ Imprimer le ticket
          </button>
        </div>
      </div>
    </div>
  )
}

function BonCuisine({ data, restaurant, onImprimer, onIgnorer, onClose }) {
  const { items, table } = data
  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const heureStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', background: C.white, borderRadius: '22px 22px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column', animation: 'slideUp .3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }}></div>
        </div>
        <div className="no-print" style={{ padding: '10px 18px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.dark }}>👨‍🍳 Bon de commande cuisine</div>
          <button onClick={onClose} style={{ background: C.grayLight, border: 'none', borderRadius: 9, width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 18px' }}>
          <div id="ticket-cuisine-print" style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, maxWidth: 300, margin: '0 auto', background: '#fff', padding: '16px', border: '1px solid #eee', borderRadius: 8 }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>╔══════════════════════╗</div>
              <div style={{ fontWeight: 800 }}>   BON DE COMMANDE</div>
              <div style={{ fontWeight: 700 }}>   {restaurant?.nom?.toUpperCase()}</div>
              <div>   {dateStr} {heureStr}</div>
              <div style={{ fontWeight: 700 }}>   Table {table?.numero}</div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>╠══════════════════════╣</div>
            </div>
            {items.map((item, i) => (
              <div key={i} style={{ padding: '2px 0', fontWeight: 600 }}>
                {item.quantite}x {item.nom_plat}
              </div>
            ))}
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 14, fontWeight: 800 }}>╚══════════════════════╝</div>
          </div>
        </div>
        <div className="no-print" style={{ padding: '12px 18px 36px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10 }}>
          <button onClick={onImprimer}
            style={{ flex: 1, background: C.dark, border: 'none', borderRadius: 14, padding: '13px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
            🖨️ Imprimer en cuisine
          </button>
          <button onClick={onIgnorer}
            style={{ flex: 1, background: C.grayLight, border: 'none', borderRadius: 14, padding: '13px', fontSize: 13, fontWeight: 700, color: C.dark, cursor: 'pointer', fontFamily: 'inherit' }}>
            Ignorer et continuer
          </button>
        </div>
      </div>
    </div>
  )
}