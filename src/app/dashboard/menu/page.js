'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#F5F5F5', white: '#FFFFFF', primary: '#FF6B35', primaryLight: '#FFF0EB',
  dark: '#1A1A2E', gray: '#8A8A9A', grayLight: '#F0F0F5', border: '#E8E8F0',
  green: '#00C851', red: '#FF3B30', shadow: 'rgba(0,0,0,0.07)',
}

export default function MenuPage() {
  const router = useRouter()
  const [restaurant, setRestaurant] = useState(null)
  const [categories, setCategories] = useState([])
  const [plats, setPlats] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCat, setActiveCat] = useState(null)
  const [showCatModal, setShowCatModal] = useState(false)
  const [showPlatModal, setShowPlatModal] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [editingPlat, setEditingPlat] = useState(null)
  const [catForm, setCatForm] = useState({ nom: '' })
  const [platForm, setPlatForm] = useState({ nom: '', description: '', prix: '', image_url: '', disponible: true, categorie_id: '' })
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: profile } = await supabase.from('profiles').select('*, restaurants(*)').eq('id', user.id).single()
    if (!profile) { router.push('/auth/login'); return }
    setRestaurant(profile.restaurants)
    const rid = profile.restaurant_id
    const [{ data: cats }, { data: pls }] = await Promise.all([
      supabase.from('categories').select('*').eq('restaurant_id', rid).order('ordre'),
      supabase.from('plats').select('*').eq('restaurant_id', rid).order('ordre'),
    ])
    setCategories(cats || [])
    setPlats(pls || [])
    if (cats?.length) setActiveCat(cats[0].id)
    setLoading(false)
  }

  // ── CATÉGORIES ────────────────────────────────────────────────────────────
  async function saveCat() {
    if (!catForm.nom.trim()) return
    setSaving(true)
    if (editingCat) {
      await supabase.from('categories').update({ nom: catForm.nom }).eq('id', editingCat.id)
    } else {
      const ordre = categories.length + 1
      await supabase.from('categories').insert({ restaurant_id: restaurant.id, nom: catForm.nom, ordre })
    }
    setSaving(false)
    setShowCatModal(false)
    setEditingCat(null)
    setCatForm({ nom: '' })
    loadData()
  }

  async function deleteCat(cat) {
    if (!confirm(`Supprimer la catégorie "${cat.nom}" et tous ses plats ?`)) return
    await supabase.from('plats').delete().eq('categorie_id', cat.id)
    await supabase.from('categories').delete().eq('id', cat.id)
    loadData()
  }

  // ── PLATS ─────────────────────────────────────────────────────────────────
  function openPlatModal(plat = null) {
    if (plat) {
      setEditingPlat(plat)
      setPlatForm({ nom: plat.nom, description: plat.description || '', prix: plat.prix, image_url: plat.image_url || '', disponible: plat.disponible, categorie_id: plat.categorie_id })
    } else {
      setEditingPlat(null)
      setPlatForm({ nom: '', description: '', prix: '', image_url: '', disponible: true, categorie_id: activeCat || '' })
    }
    setShowPlatModal(true)
  }

  async function savePlat() {
    if (!platForm.nom.trim() || !platForm.prix) return
    setSaving(true)
    const payload = { nom: platForm.nom, description: platForm.description, prix: Number(platForm.prix), image_url: platForm.image_url, disponible: platForm.disponible, categorie_id: platForm.categorie_id || activeCat }
    if (editingPlat) {
      await supabase.from('plats').update(payload).eq('id', editingPlat.id)
    } else {
      const ordre = plats.filter(p => p.categorie_id === (platForm.categorie_id || activeCat)).length + 1
      await supabase.from('plats').insert({ ...payload, restaurant_id: restaurant.id, ordre })
    }
    setSaving(false)
    setShowPlatModal(false)
    setEditingPlat(null)
    loadData()
  }

  async function toggleDispo(plat) {
    await supabase.from('plats').update({ disponible: !plat.disponible }).eq('id', plat.id)
    setPlats(prev => prev.map(p => p.id === plat.id ? { ...p, disponible: !p.disponible } : p))
  }

  async function deletePlat(plat) {
    if (!confirm(`Supprimer "${plat.nom}" ?`)) return
    await supabase.from('plats').delete().eq('id', plat.id)
    setPlats(prev => prev.filter(p => p.id !== plat.id))
  }

  async function uploadImage(e) {
    const file = e.target.files[0]
    if (!file) return
    const ext = file.name.split('.').pop()
    const path = `plats/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('images').upload(path, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path)
      setPlatForm(prev => ({ ...prev, image_url: publicUrl }))
    }
  }

  const platsDeCat = plats.filter(p => p.categorie_id === activeCat)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: "'DM Sans', system-ui" }}>
      <div style={{ fontSize: 44, animation: 'pulse 1s infinite' }}>🍛</div>
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
        .plat-card:active { transform: scale(0.98); }
        .btn:active { transform: scale(0.97); }
      `}</style>

      {/* HEADER */}
      <div style={{ background: C.dark, padding: '48px 16px 14px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>←</button>
            <div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 15 }}>Menu</div>
              <div style={{ color: '#aaa', fontSize: 11 }}>{plats.filter(p => p.disponible).length} plats disponibles</div>
            </div>
          </div>
          <button className="btn" onClick={() => { setEditingCat(null); setCatForm({ nom: '' }); setShowCatModal(true) }}
            style={{ background: C.primaryLight, border: 'none', borderRadius: 12, padding: '7px 13px', fontSize: 12, fontWeight: 700, color: C.primary, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Catégorie
          </button>
        </div>
      </div>

      {/* CATÉGORIES TABS */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', padding: '0 16px' }}>
          {categories.map(cat => (
            <div key={cat.id} style={{ flexShrink: 0, position: 'relative' }}>
              <button onClick={() => setActiveCat(cat.id)}
                style={{ padding: '12px 16px', background: 'none', border: 'none', fontSize: 13, fontWeight: activeCat === cat.id ? 700 : 500, color: activeCat === cat.id ? C.primary : C.gray, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', borderBottom: activeCat === cat.id ? `2px solid ${C.primary}` : '2px solid transparent' }}>
                {cat.nom}
                <span style={{ marginLeft: 5, fontSize: 10, background: C.grayLight, borderRadius: 10, padding: '1px 6px', color: C.gray }}>{plats.filter(p => p.categorie_id === cat.id).length}</span>
              </button>
              {activeCat === cat.id && (
                <div style={{ position: 'absolute', right: 4, top: 8, display: 'flex', gap: 3 }}>
                  <button onClick={() => { setEditingCat(cat); setCatForm({ nom: cat.nom }); setShowCatModal(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>✏️</button>
                  <button onClick={() => deleteCat(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* PLATS */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{categories.find(c => c.id === activeCat)?.nom || 'Plats'}</div>
          <button className="btn" onClick={() => openPlatModal()}
            style={{ background: C.primary, border: 'none', borderRadius: 12, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
            + Ajouter
          </button>
        </div>

        {platsDeCat.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: C.gray }}>
            <div style={{ fontSize: 40 }}>🍽️</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>Aucun plat dans cette catégorie</div>
            <button onClick={() => openPlatModal()} style={{ marginTop: 14, background: C.primary, border: 'none', borderRadius: 12, padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Ajouter un plat</button>
          </div>
        ) : platsDeCat.map(plat => (
          <div key={plat.id} className="plat-card" style={{ background: C.white, borderRadius: 16, overflow: 'hidden', display: 'flex', boxShadow: `0 2px 10px ${C.shadow}`, marginBottom: 10, opacity: plat.disponible ? 1 : .6, transition: 'all .2s' }}>
            {plat.image_url
              ? <img src={plat.image_url} alt="" style={{ width: 88, height: 88, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 88, height: 88, background: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, flexShrink: 0 }}>🍽️</div>
            }
            <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{plat.nom}</div>
                {plat.description && <div style={{ fontSize: 11, color: C.gray, marginTop: 2, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{plat.description}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.primary }}>{plat.prix.toLocaleString()} F</div>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  {/* Toggle dispo */}
                  <button onClick={() => toggleDispo(plat)}
                    style={{ background: plat.disponible ? '#E8F5E9' : '#FFEBEE', border: 'none', borderRadius: 8, padding: '4px 8px', fontSize: 10, fontWeight: 700, color: plat.disponible ? C.green : C.red, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {plat.disponible ? '✓ Dispo' : '✗ Indispo'}
                  </button>
                  <button onClick={() => openPlatModal(plat)} style={{ background: C.grayLight, border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                  <button onClick={() => deletePlat(plat)} style={{ background: '#FFEBEE', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red }}>🗑️</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: C.white, borderTop: `1px solid ${C.border}`, display: 'flex', zIndex: 100 }}>
        {[
          { icon: '🏠', label: 'Accueil', path: '/dashboard' },
          { icon: '📋', label: 'Commandes', path: '/dashboard/commandes' },
          { icon: '🍛', label: 'Menu', path: '/dashboard/menu', active: true },
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

      {/* MODAL CATÉGORIE */}
      {showCatModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn .2s' }}>
          <div onClick={() => setShowCatModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }}></div>
          <div style={{ position: 'relative', width: '100%', background: C.white, borderRadius: '22px 22px 0 0', padding: '18px 18px 40px', animation: 'slideUp .3s ease' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 16 }}>{editingCat ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</div>
            <input value={catForm.nom} onChange={e => setCatForm({ nom: e.target.value })} placeholder="Nom de la catégorie (ex: Grillades)"
              style={{ width: '100%', padding: '13px 14px', borderRadius: 13, border: `1.5px solid ${C.border}`, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: C.dark, marginBottom: 14 }} />
            <button className="btn" onClick={saveCat} disabled={saving}
              style={{ width: '100%', background: C.primary, border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? .7 : 1 }}>
              {saving ? 'Enregistrement...' : editingCat ? 'Modifier' : 'Créer la catégorie'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL PLAT */}
      {showPlatModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn .2s' }}>
          <div onClick={() => setShowPlatModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }}></div>
          <div style={{ position: 'relative', width: '100%', background: C.white, borderRadius: '22px 22px 0 0', maxHeight: '90vh', display: 'flex', flexDirection: 'column', animation: 'slideUp .3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }}></div>
            </div>
            <div style={{ padding: '10px 18px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.dark }}>{editingPlat ? 'Modifier le plat' : 'Nouveau plat'}</div>
              <button onClick={() => setShowPlatModal(false)} style={{ background: C.grayLight, border: 'none', borderRadius: 9, width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '14px 18px' }}>
              {/* Image */}
              <div style={{ marginBottom: 14 }}>
                <div onClick={() => fileRef.current?.click()}
                  style={{ width: '100%', height: 140, borderRadius: 14, border: `2px dashed ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: C.grayLight }}>
                  {platForm.image_url
                    ? <img src={platForm.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <><div style={{ fontSize: 30 }}>📷</div><div style={{ fontSize: 12, color: C.gray, marginTop: 6 }}>Ajouter une photo</div></>
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={uploadImage} style={{ display: 'none' }} />
              </div>
              {/* Catégorie */}
              <select value={platForm.categorie_id} onChange={e => setPlatForm(p => ({ ...p, categorie_id: e.target.value }))}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 13, border: `1.5px solid ${C.border}`, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: C.dark, marginBottom: 10, background: C.white }}>
                <option value="">Choisir une catégorie</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              {/* Nom */}
              <input value={platForm.nom} onChange={e => setPlatForm(p => ({ ...p, nom: e.target.value }))} placeholder="Nom du plat *"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 13, border: `1.5px solid ${C.border}`, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: C.dark, marginBottom: 10 }} />
              {/* Description */}
              <textarea value={platForm.description} onChange={e => setPlatForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optionnel)" rows={2}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 13, border: `1.5px solid ${C.border}`, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: C.dark, marginBottom: 10, resize: 'none' }} />
              {/* Prix */}
              <input type="number" value={platForm.prix} onChange={e => setPlatForm(p => ({ ...p, prix: e.target.value }))} placeholder="Prix (FCFA) *"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 13, border: `1.5px solid ${C.border}`, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: C.dark, marginBottom: 10 }} />
              {/* Disponible */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: C.grayLight, borderRadius: 13 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>Disponible à la commande</span>
                <button onClick={() => setPlatForm(p => ({ ...p, disponible: !p.disponible }))}
                  style={{ width: 44, height: 24, borderRadius: 12, background: platForm.disponible ? C.green : C.border, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .2s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: platForm.disponible ? 23 : 3, transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }}></div>
                </button>
              </div>
            </div>
            <div style={{ padding: '12px 18px 36px', borderTop: `1px solid ${C.border}` }}>
              <button className="btn" onClick={savePlat} disabled={saving}
                style={{ width: '100%', background: C.primary, border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? .7 : 1 }}>
                {saving ? 'Enregistrement...' : editingPlat ? 'Modifier le plat' : 'Ajouter le plat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}