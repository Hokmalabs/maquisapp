'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const ADMIN_EMAIL = 'joelyemian5@gmail.com'

const C = {
  bg: '#F5F5F5', white: '#FFFFFF', primary: '#8B1A27', primaryLight: '#FFF0EB',
  dark: '#3D0C11', gray: '#8A8A9A', grayLight: '#F0F0F5', border: '#E8E8F0',
  green: '#00C851', yellow: '#FFB800', red: '#FF3B30', shadow: 'rgba(0,0,0,0.07)',
}

const STATUT_COLORS = {
  essai:    { color: '#FFB800', bg: '#FFF8E1', label: 'Essai' },
  actif:    { color: '#00C851', bg: '#E8F5E9', label: 'Actif' },
  expire:   { color: '#FF3B30', bg: '#FFEBEE', label: 'Expiré' },
  suspendu: { color: '#8A8A9A', bg: '#F5F5F5', label: 'Suspendu' },
}

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export default function AdminPage() {
  const router = useRouter()
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, actifs: 0, essai: 0, suspendus: 0 })
  const [recherche, setRecherche] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [filtrePlan, setFiltrePlan] = useState('tous')
  const [tri, setTri] = useState('recent')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) {
      router.push('/dashboard')
      return
    }

    const { data: restos } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: cmdCounts } = await supabase.from('commandes').select('restaurant_id')
    const countMap = {}
    for (const c of (cmdCounts || [])) {
      countMap[c.restaurant_id] = (countMap[c.restaurant_id] || 0) + 1
    }

    const list = (restos || []).map(r => ({ ...r, nb_commandes: countMap[r.id] || 0 }))

    const today = new Date()
    const actifs = list.filter(r =>
      r.abonnement_statut === 'actif' &&
      r.abonnement_fin && new Date(r.abonnement_fin) > today
    ).length
    const essai = list.filter(r =>
      (r.abonnement_statut === 'essai' || !r.abonnement_statut) &&
      r.abonnement_fin && new Date(r.abonnement_fin) > today
    ).length
    const suspendus = list.filter(r =>
      r.abonnement_statut === 'suspendu' ||
      (r.abonnement_fin && new Date(r.abonnement_fin) <= today)
    ).length

    setStats({ total: list.length, actifs, essai, suspendus })
    setRestaurants(list)
    setLoading(false)
  }

  async function activerAbonnement(resto, plan) {
    if (!confirm(`Activer le plan ${plan} pour ${resto.nom} ?`)) return

    console.log('DEBUG - Activation démarrée', { resto_id: resto.id, plan })

    setActionLoading(true)
    const fin = new Date()
    if (plan === 'mensuel') fin.setMonth(fin.getMonth() + 1)
    else if (plan === 'annuel') fin.setFullYear(fin.getFullYear() + 1)

    const finISO = fin.toISOString()
    console.log('DEBUG - Date fin calculée:', finISO)

    const { data, error } = await supabase
      .from('restaurants')
      .update({
        abonnement_statut: 'actif',
        abonnement_plan: plan,
        abonnement_fin: finISO,
      })
      .eq('id', resto.id)
      .select()

    console.log('DEBUG - Résultat update:', { data, error })

    setActionLoading(false)

    if (error) {
      alert('❌ Erreur : ' + error.message +
        '\n\nCode: ' + error.code +
        '\nDétails: ' + (error.details || 'aucun'))
      return
    }

    if (!data || data.length === 0) {
      alert('⚠️ Aucune ligne mise à jour.\n' +
        'Problème de permission RLS probable.\n' +
        'L\'admin n\'a peut-être pas le droit de modifier ce restaurant.')
      return
    }

    await loadAll()
    alert(`✅ Abonnement ${plan} activé pour ${resto.nom}\nFin : ${fin.toLocaleDateString('fr-FR')}`)
  }

  async function suspendreAbonnement(resto) {
    if (!confirm(`Suspendre ${resto.nom} ?`)) return

    setActionLoading(true)

    const { data, error } = await supabase
      .from('restaurants')
      .update({ abonnement_statut: 'suspendu' })
      .eq('id', resto.id)
      .select()

    console.log('DEBUG - Suspension:', { data, error })

    setActionLoading(false)

    if (error) {
      alert('❌ Erreur : ' + error.message)
      return
    }

    if (!data || data.length === 0) {
      alert('⚠️ Aucune modification. RLS bloque peut-être.')
      return
    }

    await loadAll()
    alert(`✅ ${resto.nom} suspendu`)
  }

  function exporterCSV() {
    const headers = ['Nom', 'Email', 'Ville', 'Statut', 'Plan', 'Date inscription', 'Fin abonnement', 'Nb commandes']
    const rows = restosFiltres.map(r => [
      r.nom || '', r.email || '', r.ville || '',
      r.abonnement_statut || 'essai', r.abonnement_plan || '-',
      r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '',
      r.abonnement_fin ? new Date(r.abonnement_fin).toLocaleDateString('fr-FR') : '',
      r.nb_commandes || 0,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `maquisapp_restaurants_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const restosFiltres = restaurants
    .filter(r => {
      if (recherche) {
        const q = recherche.toLowerCase()
        if (!r.nom?.toLowerCase().includes(q) && !r.email?.toLowerCase().includes(q)) return false
      }
      const today = new Date()
      const finAbo = r.abonnement_fin ? new Date(r.abonnement_fin) : null
      if (filtreStatut === 'actif') return r.abonnement_statut === 'actif' && finAbo && finAbo > today
      if (filtreStatut === 'essai') return (r.abonnement_statut === 'essai' || !r.abonnement_statut) && finAbo && finAbo > today
      if (filtreStatut === 'suspendu') return r.abonnement_statut === 'suspendu' || (finAbo && finAbo <= today)
      if (filtrePlan !== 'tous' && r.abonnement_plan !== filtrePlan) return false
      return true
    })
    .sort((a, b) => {
      if (tri === 'ancien') return new Date(a.created_at) - new Date(b.created_at)
      if (tri === 'nom') return (a.nom || '').localeCompare(b.nom || '')
      return new Date(b.created_at) - new Date(a.created_at)
    })

  const revenusEstimes = stats.actifs > 0 ? (stats.actifs * 15000).toLocaleString('fr-FR') + ' FCFA/mois' : 'Aucun revenu'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: "'DM Sans', system-ui" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      <div style={{ fontSize: 40, animation: 'pulse 1.2s infinite' }}>⚙️</div>
      <p style={{ color: C.primary, fontWeight: 600, fontSize: 14 }}>Chargement panel admin...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .btn:active { transform: scale(0.97); }
        input:focus, select:focus { outline: none; border-color: #8B1A27 !important; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: C.dark, padding: '48px 16px 18px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => router.push('/dashboard')}
                style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: '#fff' }}>←</button>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>Panel Admin</div>
                <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 11 }}>Hokma Labs — accès restreint</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {actionLoading && <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>}
              <div style={{ background: 'rgba(255,255,255,.12)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                {restosFiltres.length} / {stats.total} restaurants
              </div>
            </div>
          </div>

          {/* CARTES STATS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {[
              { label: 'TOTAL', value: stats.total, color: '#fff', borderColor: C.primary, sub: 'inscrits', bg: 'rgba(255,255,255,.08)' },
              { label: 'ACTIFS PAYANTS', value: stats.actifs, color: C.green, borderColor: C.green, sub: revenusEstimes, bg: 'rgba(0,200,81,.1)' },
              { label: 'EN ESSAI', value: stats.essai, color: C.yellow, borderColor: C.yellow, sub: 'essai gratuit', bg: 'rgba(255,184,0,.1)' },
              { label: 'SUSPENDUS', value: stats.suspendus, color: C.red, borderColor: C.red, sub: 'inactifs', bg: 'rgba(255,59,48,.1)' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 14px', borderLeft: `3px solid ${s.borderColor}` }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', fontWeight: 700, letterSpacing: .5, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', marginTop: 3 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px' }}>

        {/* BARRE RECHERCHE + FILTRES */}
        <div style={{ background: C.white, borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: `0 2px 10px ${C.shadow}` }}>
          <input
            type="text"
            placeholder="🔍 Rechercher par nom ou email..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, marginBottom: 10, fontFamily: 'inherit', color: C.dark, transition: 'border-color .2s' }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { val: filtreStatut, set: setFiltreStatut, opts: [['tous','Tous les statuts'],['actif','Actifs payants'],['essai','En essai'],['suspendu','Suspendus']] },
              { val: filtrePlan, set: setFiltrePlan, opts: [['tous','Tous les plans'],['mensuel','Mensuel'],['annuel','Annuel']] },
              { val: tri, set: setTri, opts: [['recent','Plus récent'],['ancien','Plus ancien'],['nom','Nom A-Z']] },
            ].map((s, i) => (
              <select key={i} value={s.val} onChange={e => s.set(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 12, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', color: C.dark, transition: 'border-color .2s' }}>
                {s.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            <button className="btn" onClick={exporterCSV}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', fontSize: 12, background: C.primary, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
              📥 CSV
            </button>
          </div>
        </div>

        {/* LISTE */}
        {restosFiltres.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.gray }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Aucun restaurant trouvé</div>
            <div style={{ fontSize: 12, marginTop: 6, color: C.gray }}>Modifiez les filtres ou la recherche</div>
          </div>
        ) : restosFiltres.map((resto) => {
          const today = new Date()
          const finAbo = resto.abonnement_fin ? new Date(resto.abonnement_fin) : null
          const estExpire = finAbo && finAbo <= today
          const statutEffectif = estExpire ? 'expire' : (resto.abonnement_statut || 'essai')
          const st = STATUT_COLORS[statutEffectif] || STATUT_COLORS.expire
          const joursRestants = finAbo ? Math.ceil((finAbo - today) / (1000 * 60 * 60 * 24)) : null

          return (
            <div key={resto.id} style={{ background: C.white, borderRadius: 16, boxShadow: `0 2px 10px ${C.shadow}`, marginBottom: 12, padding: '14px 16px', borderLeft: `4px solid ${st.color}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.dark }}>{resto.nom}</div>
                  <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>{resto.email}</div>
                  <div style={{ fontSize: 11, color: C.gray, marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {resto.ville && <span>📍 {resto.ville}</span>}
                    <span>📋 {resto.nb_commandes} commandes</span>
                    <span>📅 {formatDate(resto.created_at)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                  <div style={{ background: st.bg, color: st.color, borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 700, display: 'inline-block', marginBottom: 4 }}>
                    {st.label}
                  </div>
                  {resto.abonnement_plan && (
                    <div style={{ fontSize: 10, color: C.gray, marginBottom: 2 }}>
                      Plan {resto.abonnement_plan}
                    </div>
                  )}
                  {finAbo && (
                    <div style={{ fontSize: 10, color: joursRestants !== null && joursRestants <= 7 ? C.red : C.gray }}>
                      {joursRestants !== null && joursRestants > 0
                        ? `J-${joursRestants}`
                        : estExpire ? 'Expiré'
                        : `fin ${formatDate(resto.abonnement_fin)}`}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn" onClick={() => activerAbonnement(resto, 'mensuel')} disabled={actionLoading}
                  style={{ background: C.green, border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: actionLoading ? .6 : 1 }}>
                  ✅ Mensuel
                </button>
                <button className="btn" onClick={() => activerAbonnement(resto, 'annuel')} disabled={actionLoading}
                  style={{ background: '#2196F3', border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: actionLoading ? .6 : 1 }}>
                  ✅ Annuel
                </button>
                <button className="btn" onClick={() => suspendreAbonnement(resto)} disabled={actionLoading}
                  style={{ background: '#FFEBEE', border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 11, fontWeight: 700, color: C.red, cursor: 'pointer', fontFamily: 'inherit', opacity: actionLoading ? .6 : 1 }}>
                  🚫 Suspendre
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
