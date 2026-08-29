'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { useRestaurant } from '../layout'

const C = {
  bg: '#F5F5F5', white: '#FFFFFF', primary: '#8B1A27', primaryLight: '#FFF0EB',
  dark: '#3D0C11', gray: '#8A8A9A', grayLight: '#F0F0F5', border: '#E8E8F0',
  green: '#00C851', red: '#FF3B30', shadow: 'rgba(0,0,0,0.07)',
}
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maquisapp-xi.vercel.app'

export default function TablesPage() {
  const router = useRouter()
  const { restaurant, restaurantId: ctxRestaurantId, loading: ctxLoading } = useRestaurant()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTable, setEditingTable] = useState(null)
  const [form, setForm] = useState({ numero: '', capacite: '', zone: '', actif: true })
  const [saving, setSaving] = useState(false)
  const [filterZone, setFilterZone] = useState('all')
  const [qrZoom, setQrZoom] = useState(null)
  const qrRefs = useRef({})

  // Le resto vient du contexte partagé (layout). On charge ici uniquement les
  // tables, dès que le contexte a fourni le restaurantId.
  useEffect(() => {
    if (ctxLoading) return
    if (!ctxRestaurantId) { setLoading(false); return }
    loadTables(ctxRestaurantId).then(() => setLoading(false))
  }, [ctxLoading, ctxRestaurantId])

  async function loadTables(rid) {
    const { data: tbls } = await supabase.from('tables').select('*').eq('restaurant_id', rid).order('numero')
    setTables(tbls || [])
  }

  function openModal(table = null) {
    if (table) {
      setEditingTable(table)
      setForm({ numero: table.numero, capacite: table.capacite || '', zone: table.zone || '', actif: table.actif })
    } else {
      setEditingTable(null)
      setForm({ numero: '', capacite: '', zone: '', actif: true })
    }
    setShowModal(true)
  }

  async function saveTable() {
    if (!form.numero || !restaurant) return
    setSaving(true)
    const slug = restaurant.slug
    if (editingTable) {
      await supabase.from('tables').update({
        numero: Number(form.numero),
        capacite: form.capacite ? Number(form.capacite) : null,
        zone: form.zone,
        actif: form.actif,
      }).eq('id', editingTable.id)
    } else {
      const { data: newTable } = await supabase.from('tables').insert({
        restaurant_id: restaurant.id,
        numero: Number(form.numero),
        capacite: form.capacite ? Number(form.capacite) : null,
        zone: form.zone,
        actif: form.actif,
        statut: 'libre',
      }).select().single()
      if (newTable) {
        const url = `${APP_URL}/menu/${slug}/${newTable.id}`
        await supabase.from('tables').update({ qr_code_url: url }).eq('id', newTable.id)
      }
    }
    setSaving(false)
    setShowModal(false)
    setEditingTable(null)
    loadTables(ctxRestaurantId)
  }

  async function deleteTable(table) {
    if (!confirm(`Supprimer la table ${table.numero} ?`)) return
    await supabase.from('tables').delete().eq('id', table.id)
    setTables(prev => prev.filter(t => t.id !== table.id))
  }

  async function toggleActif(table) {
    await supabase.from('tables').update({ actif: !table.actif }).eq('id', table.id)
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, actif: !t.actif } : t))
  }

  async function telechargerQR(table) {
    try {
      const url = table.qr_code_url || `${APP_URL}/menu/${restaurant.slug}/${table.id}`
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = qrUrl
      })
      const QR_SIZE = 300
      const TEXT_HEIGHT = 60
      canvas.width = QR_SIZE
      canvas.height = QR_SIZE + TEXT_HEIGHT
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, QR_SIZE, QR_SIZE)
      ctx.fillStyle = '#8B1A27'
      ctx.font = 'bold 22px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`Scannez - Table ${table.numero}`, QR_SIZE / 2, QR_SIZE + 22)
      ctx.fillStyle = '#8A8A9A'
      ctx.font = '14px Arial'
      ctx.fillText('Scanner pour commander', QR_SIZE / 2, QR_SIZE + 44)
      const link = document.createElement('a')
      link.download = `qr-table-${table.numero}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Erreur téléchargement QR:', err)
      const fallback = table.qr_code_url || `${APP_URL}/menu/${restaurant.slug}/${table.id}`
      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(fallback)}`, '_blank')
    }
  }

  const zones = [...new Set(tables.map(t => t.zone).filter(Boolean))]
  const filtered = filterZone === 'all' ? tables : tables.filter(t => t.zone === filterZone)
  const stats = {
    total: tables.length,
    libres: tables.filter(t => t.statut === 'libre' && t.actif).length,
    occupees: tables.filter(t => t.statut === 'occupee').length,
  }

  if (loading || ctxLoading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: "'DM Sans', system-ui" }}>
      <div style={{ fontSize: 44, animation: 'pulse 1s infinite' }}>🪑</div>
      <p style={{ color: C.primary, fontWeight: 600, fontSize: 14 }}>Chargement...</p>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.1)}}`}</style>
    </div>
  )

  return (
    <div className="pg-root" style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.08)} }
        @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .card:active { transform: scale(0.98); }
        .btn:active { transform: scale(0.97); }
        .tables-grid { grid-template-columns: 1fr 1fr; }
        .pg-desktop-head { display: none; }

        @media (min-width: 900px) {
          .pg-root { max-width: 1180px !important; margin: 0 !important; padding: 24px 28px 40px !important; }
          .pg-mobile-header { display: none !important; }
          .pg-bottomnav { display: none !important; }
          .pg-block { margin-left: 0 !important; margin-right: 0 !important; }
          .pg-block-first { margin-top: 0 !important; }
          .pg-desktop-head { display: flex !important; align-items: center; justify-content: space-between; margin-bottom: 18px; }
          .tables-grid { grid-template-columns: 1fr 1fr 1fr !important; }
        }
      `}</style>

      {/* HEADER MOBILE */}
      <div className="pg-mobile-header" style={{ background: C.dark, padding: '48px 16px 14px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>←</button>
            <div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 15 }}>Tables & QR Codes</div>
              <div style={{ color: '#aaa', fontSize: 11 }}>{stats.libres} libres • {stats.occupees} occupées</div>
            </div>
          </div>
          <button className="btn" onClick={() => openModal()}
            style={{ background: C.primary, border: 'none', borderRadius: 12, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
            + Table
          </button>
        </div>
      </div>

      {/* HEADER DESKTOP (titre + bouton ajouter) */}
      <div className="pg-desktop-head">
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.dark }}>Tables & QR</div>
          <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>{stats.total} tables • {stats.libres} libres • {stats.occupees} occupées</div>
        </div>
        <button className="btn" onClick={() => openModal()}
          style={{ background: C.primary, border: 'none', borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
          + Ajouter une table
        </button>
      </div>

      {/* STATS */}
      <div className="pg-block pg-block-first" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, margin: '14px 16px 0' }}>
        {[
          { val: stats.total, label: 'Total', color: '#5B8DEF', bg: '#EBF5FB' },
          { val: stats.libres, label: 'Libres', color: C.green, bg: '#E8F5E9' },
          { val: stats.occupees, label: 'Occupées', color: C.primary, bg: C.primaryLight },
        ].map((s, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 14, padding: '12px', boxShadow: `0 2px 8px ${C.shadow}`, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 10, color: C.gray, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* FILTRES ZONES */}
      {zones.length > 0 && (
        <div className="pg-block" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px 0' }}>
          {['all', ...zones].map(z => (
            <button key={z} onClick={() => setFilterZone(z)}
              style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 50, border: filterZone === z ? 'none' : `1.5px solid ${C.border}`, background: filterZone === z ? C.primary : C.white, color: filterZone === z ? '#fff' : C.dark, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {z === 'all' ? 'Toutes les zones' : z}
            </button>
          ))}
        </div>
      )}

      {/* GRILLE TABLES */}
      <div className="pg-block tables-grid" style={{ display: 'grid', gap: 10, padding: '14px 16px 0' }}>
        {filtered.map(table => {
          const isOccupee = table.statut === 'occupee'
          const isInactif = !table.actif
          return (
            <div key={table.id} className="card"
              style={{ background: C.white, borderRadius: 16, padding: '14px', boxShadow: `0 2px 10px ${C.shadow}`, opacity: isInactif ? .55 : 1, transition: 'all .2s', border: isOccupee ? `2px solid ${C.primary}` : `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.dark }}>T{table.numero}</div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isOccupee ? C.primary : isInactif ? C.gray : C.green }}></div>
              </div>
              <div style={{ fontSize: 10, color: C.gray, marginBottom: 2 }}>{table.zone || 'Salle principale'}</div>
              {table.capacite && <div style={{ fontSize: 10, color: C.gray, marginBottom: 8 }}>👥 {table.capacite} pers.</div>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ background: isOccupee ? C.primaryLight : '#E8F5E9', color: isOccupee ? C.primary : C.green, borderRadius: 20, padding: '3px 9px', fontSize: 9, fontWeight: 700 }}>
                  {isOccupee ? 'Occupée' : isInactif ? 'Inactive' : 'Libre'}
                </div>
              </div>
              {table.qr_code_url && (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(table.qr_code_url)}`}
                  alt="QR"
                  onClick={() => setQrZoom({ url: `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(table.qr_code_url)}`, numero: table.numero })}
                  style={{ width: '100%', height: 80, objectFit: 'contain', borderRadius: 8, background: C.grayLight, marginBottom: 10, cursor: 'zoom-in' }}
                />
              )}
              <button onClick={() => telechargerQR(table)}
                style={{ width: '100%', background: C.primary, border: 'none', borderRadius: 10, padding: '10px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                ⬇️ Télécharger QR Table {table.numero}
              </button>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => openModal(table)}
                  style={{ flex: 1, background: C.grayLight, border: 'none', borderRadius: 9, padding: '7px', fontSize: 10, fontWeight: 700, color: C.dark, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>✏️ Modifier</button>
                <button onClick={() => deleteTable(table)}
                  style={{ background: '#FFEBEE', border: 'none', borderRadius: 9, width: 30, height: 30, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red, flexShrink: 0 }}>🗑️</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL TABLE */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn .2s' }}>
          <div onClick={() => setShowModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }}></div>
          <div style={{ position: 'relative', width: '100%', maxWidth: 480, margin: '0 auto', background: C.white, borderRadius: '22px 22px 0 0', padding: '18px 18px 40px', animation: 'slideUp .3s ease' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 16 }}>{editingTable ? `Modifier Table ${editingTable.numero}` : 'Nouvelle table'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: C.gray, marginBottom: 5, fontWeight: 600 }}>Numéro *</div>
                <input type="number" value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} placeholder="ex: 5"
                  style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: C.dark }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.gray, marginBottom: 5, fontWeight: 600 }}>Capacité</div>
                <input type="number" value={form.capacite} onChange={e => setForm(p => ({ ...p, capacite: e.target.value }))} placeholder="ex: 4"
                  style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: C.dark }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.gray, marginBottom: 5, fontWeight: 600 }}>Zone</div>
              <input value={form.zone} onChange={e => setForm(p => ({ ...p, zone: e.target.value }))} placeholder="ex: Terrasse, Salle, VIP..."
                style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: C.dark }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 13px', background: C.grayLight, borderRadius: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>Table active</span>
              <button onClick={() => setForm(p => ({ ...p, actif: !p.actif }))}
                style={{ width: 44, height: 24, borderRadius: 12, background: form.actif ? C.green : C.border, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .2s' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.actif ? 23 : 3, transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }}></div>
              </button>
            </div>
            <button className="btn" onClick={saveTable} disabled={saving}
              style={{ width: '100%', background: C.primary, border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? .7 : 1 }}>
              {saving ? 'Enregistrement...' : editingTable ? 'Modifier la table' : 'Créer la table'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL QR ZOOM */}
      {qrZoom && (
        <div onClick={() => setQrZoom(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'pointer', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, textAlign: 'center', maxWidth: 340, width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.primary, marginBottom: 16 }}>
              Table {qrZoom.numero}
            </div>
            <img src={qrZoom.url} alt="QR Code" style={{ width: '100%', borderRadius: 12 }} />
            <div style={{ fontSize: 13, color: C.gray, marginTop: 12 }}>
              Scannez avec votre appareil photo
            </div>
            <button onClick={() => setQrZoom(null)}
              style={{ marginTop: 16, width: '100%', background: C.primary, border: 'none', borderRadius: 12, padding: '12px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}